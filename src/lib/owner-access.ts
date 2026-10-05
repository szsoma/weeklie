import type { Session } from '@supabase/supabase-js'

export function isOwnerSession(
  session: Pick<Session, 'user'> | null,
  expectedEmail: string,
): boolean {
  const ownerEmail = expectedEmail.trim().toLowerCase()
  return ownerEmail.length > 0 && session?.user.email?.trim().toLowerCase() === ownerEmail
}
