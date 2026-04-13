const AUTH_CALLBACK_QUERY_PARAMS = ['code', 'state'] as const
const LEGACY_AUTH_HASH_PARAMS = [
  'access_token',
  'refresh_token',
  'token_type',
  'expires_in',
  'expires_at',
  'provider_token',
  'provider_refresh_token',
] as const

const normalizeSearch = (search = '') =>
  search.startsWith('?') ? search.slice(1) : search

const normalizeHash = (hash = '') =>
  hash.startsWith('#') ? hash.slice(1) : hash

export function isAuthCallbackRequest(search = ''): boolean {
  return new URLSearchParams(normalizeSearch(search)).has('code')
}

export function stripAuthCallbackState(search = '', hash = '') {
  const searchParams = new URLSearchParams(normalizeSearch(search))
  let changed = false

  for (const key of AUTH_CALLBACK_QUERY_PARAMS) {
    if (searchParams.has(key)) {
      searchParams.delete(key)
      changed = true
    }
  }

  let nextHash = hash
  const normalizedHash = normalizeHash(hash)

  if (normalizedHash.includes('=')) {
    const hashParams = new URLSearchParams(normalizedHash)
    let hashChanged = false

    for (const key of LEGACY_AUTH_HASH_PARAMS) {
      if (hashParams.has(key)) {
        hashParams.delete(key)
        hashChanged = true
      }
    }

    if (hashChanged) {
      const serializedHash = hashParams.toString()
      nextHash = serializedHash ? `#${serializedHash}` : ''
      changed = true
    }
  }

  const serializedSearch = searchParams.toString()

  return {
    search: serializedSearch ? `?${serializedSearch}` : '',
    hash: nextHash,
    changed,
  }
}

export function shouldShowAuthCallbackLoading({
  isLoading,
  hasUser,
  isAuthCallbackPending,
}: {
  isLoading: boolean
  hasUser: boolean
  isAuthCallbackPending: boolean
}): boolean {
  return isLoading || (isAuthCallbackPending && !hasUser)
}

export function getPostAuthRedirectPath({
  isLoading,
  isAuthCallbackPending,
  hasUser,
  hasCompletedProfile,
}: {
  isLoading: boolean
  isAuthCallbackPending: boolean
  hasUser: boolean
  hasCompletedProfile: boolean
}): string | null {
  if (isLoading || !hasUser) return null
  if (isAuthCallbackPending) return '/dashboard'
  return hasCompletedProfile ? '/dashboard' : '/onboarding'
}
