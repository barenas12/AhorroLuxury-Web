export interface ViewerUser {
  id?: number
  partnerId?: number | null
  username?: string
  full_name?: string
  name?: string
  lastName?: string
  user?: string
  profile?: number | string
  resetPassword?: number
  status?: number
}

export interface ModuleAvailability {
  hasUsers: boolean
  hasSavings: boolean
  hasLoans: boolean
  hasRifa1: boolean
  hasRifa2: boolean
  hasPayments: boolean
}

export function getUserProfile(user?: ViewerUser | null): 1 | 2 | 3 {
  const p = Number(user?.profile)
  if (p === 1) return 1
  if (p === 2) return 2
  return 3
}

export function isAdminUser(user?: ViewerUser | null): boolean {
  return getUserProfile(user) === 1
}

export function isReadOnlyUser(user?: ViewerUser | null): boolean {
  return getUserProfile(user) !== 1
}
