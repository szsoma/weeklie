import { nanoid } from 'nanoid'

export function createId(): string {
  return nanoid()
}

export function createShareToken(): string {
  return nanoid(32)
}
