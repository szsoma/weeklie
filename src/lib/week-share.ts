import { createId, createShareToken } from '../nanoid'
import type { SharedWeekResponse, WeekShare } from '../types'
import { supabase } from './supabase'

type WeekShareRow = WeekShare & {
  user_id: string;
}

type WeekShareInput = {
  weekId: string;
  weekStart: string;
}

export function buildShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`
}

export async function getOrCreateWeekShare({
  weekId,
  weekStart,
}: WeekShareInput): Promise<WeekShare> {
  const { data: existing, error: selectError } = await supabase
    .from('week_shares')
    .select('id, week_id, week_start, token, revoked_at, created_at, updated_at')
    .eq('week_start', weekStart)
    .maybeSingle()

  if (selectError) {
    throw new Error(selectError.message)
  }

  if (existing && !existing.revoked_at) {
    return existing as WeekShare
  }

  if (existing) {
    const { data, error } = await supabase
      .from('week_shares')
      .update({
        token: createShareToken(),
        revoked_at: null,
        week_id: weekId,
      })
      .eq('id', existing.id)
      .select('id, week_id, week_start, token, revoked_at, created_at, updated_at')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data as WeekShare
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    throw new Error(userError?.message ?? 'You must be signed in to share a week.')
  }

  const insertRow: WeekShareRow = {
    id: createId(),
    user_id: userData.user.id,
    week_id: weekId,
    week_start: weekStart,
    token: createShareToken(),
    revoked_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('week_shares')
    .insert(insertRow)
    .select('id, week_id, week_start, token, revoked_at, created_at, updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as WeekShare
}

export async function revokeWeekShare(weekStart: string): Promise<void> {
  const { error } = await supabase
    .from('week_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('week_start', weekStart)

  if (error) {
    throw new Error(error.message)
  }
}

export async function loadSharedWeek(token: string): Promise<SharedWeekResponse> {
  const { data, error } = await supabase.rpc('get_shared_week', {
    share_token: token,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data as SharedWeekResponse
}
