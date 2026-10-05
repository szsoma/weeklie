import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const migration = fileURLToPath(new URL('../supabase/migrations/20261005000000_habit_integrity.sql', import.meta.url))
const hardening = fileURLToPath(new URL('../supabase/migrations/20261005010000_harden_habit_rpc_execute.sql', import.meta.url))
const setup = fileURLToPath(new URL('./fixtures/habit-rpc-setup.sql', import.meta.url))
const owner = '00000000-0000-0000-0000-000000000001'
const other = '00000000-0000-0000-0000-000000000002'

test('habit RPCs create atomically, deduplicate, enforce ownership, and remove future instances across weeks', {
  skip: process.env.WEEKLIE_PG_TEST !== '1',
}, () => {
  const db = `weeklie_habit_${randomUUID().replaceAll('-', '').slice(0, 12)}`
  const run = (sql, user = owner) => execFileSync('psql', [
    '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-d', db, '-c',
    `set role authenticated; set request.jwt.claim.sub = '${user}'; ${sql}`,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split('\n').at(-1)
  const admin = (sql) => execFileSync('psql', ['-X', '-At', '-v', 'ON_ERROR_STOP=1', '-d', db, '-c', sql], { encoding: 'utf8' }).trim()

  execFileSync('createdb', [db])
  try {
    execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-d', db, '-f', setup], { stdio: 'ignore' })
    execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-d', db, '-f', migration], { stdio: 'ignore' })
    execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-d', db, '-f', hardening], { stdio: 'ignore' })
    assert.equal(admin("select has_function_privilege('anon', 'public.create_habit_occurrence(text,text,text,text,text,text)', 'EXECUTE')"), 'f')
    assert.equal(admin("select has_function_privilege('anon', 'public.remove_habit_template_for_task(text,text)', 'EXECUTE')"), 'f')

    const create = (task, instance, date, user = owner) => run(
      `select public.create_habit_occurrence('template','${task}','${instance}','event-${task}','${date}','${date}')`, user,
    )
    assert.match(create('future-one', 'instance-one', '2099-10-12'), /future-one/)
    assert.equal(create('duplicate', 'instance-duplicate', '2099-10-12'), '')
    assert.equal(admin("select count(*) from public.tasks where id = 'duplicate'"), '0')

    admin(`create function public.fail_instance() returns trigger language plpgsql as $$begin if new.id = 'instance-fail' then raise exception 'forced instance failure'; end if; return new; end$$; create trigger fail_instance before insert on public.habit_instances for each row execute function public.fail_instance()`)
    assert.throws(() => create('failed-task', 'instance-fail', '2099-10-13'), /forced instance failure/)
    assert.equal(admin("select count(*) from public.tasks where id = 'failed-task'"), '0')

    assert.throws(() => create('other-task', 'other-instance', '2099-10-14', other), /Habit template unavailable/)
    assert.match(create('future-two', 'instance-two', '2099-10-19'), /future-two/)
    assert.match(create('past', 'instance-past', '2099-10-05'), /past/)

    assert.throws(() => run("begin; select public.remove_habit_template_for_task('base', null); rollback"), /Habit dates must use YYYY-MM-DD/)
    assert.match(run("select public.remove_habit_template_for_task('base', '2099-10-10')"), /future-one/)
    assert.equal(admin("select count(*) from public.habit_templates where id = 'template'"), '0')
    assert.equal(admin("select count(*) from public.habit_instances where habit_template_id = 'template'"), '0')
    assert.equal(admin("select count(*) from public.tasks where id in ('future-one','future-two') and deleted_at is not null"), '2')
    assert.equal(admin("select count(*) from public.tasks where id = 'past' and deleted_at is null"), '1')
    assert.equal(admin("select count(*) from public.task_events where type = 'deleted' and task_id in ('future-one','future-two')"), '2')
  } finally {
    execFileSync('dropdb', [db])
  }
})
