import { redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import type { AppUser } from '@libs/permissions'
import { authClientReact } from '@libs/auth/authClient'

type GuardUser = { id: string; role?: string | null }

/**
 * Server function to read the session from request headers.
 *
 * Used during SSR (full page loads / first paint). On *client-side* navigation
 * TanStack server-fn results don't deserialize reliably in this setup (the call
 * resolves to `undefined` even though the user is authenticated), which made
 * `beforeLoad` guards bounce logged-in users to /signin. The client paths below
 * therefore read the session via the better-auth client instead.
 */
const getAuthSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { withDbContext } = await import('@/lib/with-request-db')
  return withDbContext(async () => {
    try {
      const { getRequest } = await import('@tanstack/react-start/server')
      const { auth } = await import('@libs/auth')
      const request = getRequest()
      const session = await auth.api.getSession({
        headers: new Headers(request.headers),
      })
      return {
        user: session?.user
          ? { id: session.user.id, role: session.user.role }
          : null,
      }
    } catch (error) {
      console.error('[auth-guard] getAuthSession failed:', error)
      return { user: null }
    }
  })
})

/**
 * Server function to get auth + subscription access state (SSR path).
 */
const getSubscriptionAccess = createServerFn({ method: 'GET' }).handler(async () => {
  const { withDbContext } = await import('@/lib/with-request-db')
  return withDbContext(async () => {
    try {
      const { getRequest } = await import('@tanstack/react-start/server')
      const { auth } = await import('@libs/auth')
      const { checkSubscriptionStatus } = await import('@libs/database/utils/subscription')
      const request = getRequest()
      const session = await auth.api.getSession({
        headers: new Headers(request.headers),
      })

      if (!session?.user) {
        return { user: null, hasSubscription: false }
      }

      const sub = await checkSubscriptionStatus(session.user.id)
      return {
        user: { id: session.user.id, role: session.user.role },
        hasSubscription: !!sub,
      }
    } catch (error) {
      console.error('[auth-guard] getSubscriptionAccess failed:', error)
      return { user: null, hasSubscription: false }
    }
  })
})

/**
 * Resolve the current user. SSR uses the server function; the browser uses the
 * better-auth client (server-fn results are unreliable on client navigation).
 */
async function resolveUser(): Promise<GuardUser | null> {
  if (typeof window === 'undefined') {
    const result = await getAuthSession()
    return result?.user ?? null
  }
  try {
    const { data } = await authClientReact.getSession()
    if (!data?.user) return null
    return { id: data.user.id, role: (data.user as { role?: string | null }).role ?? null }
  } catch {
    return null
  }
}

/**
 * Resolve user + subscription state. SSR uses the server function; the browser
 * resolves the user via the better-auth client and the subscription flag via
 * the status API.
 */
async function resolveSubscription(): Promise<{ user: GuardUser | null; hasSubscription: boolean }> {
  if (typeof window === 'undefined') {
    const result = await getSubscriptionAccess()
    return { user: result?.user ?? null, hasSubscription: !!result?.hasSubscription }
  }
  const user = await resolveUser()
  if (!user) return { user: null, hasSubscription: false }
  try {
    const res = await fetch('/api/subscription/status')
    if (!res.ok) return { user, hasSubscription: false }
    const data = await res.json()
    return { user, hasSubscription: !!data?.hasSubscription }
  } catch {
    return { user, hasSubscription: false }
  }
}

/**
 * Redirect authenticated users away from auth pages (signin, signup, etc.)
 * to the dashboard. Use in `beforeLoad` of auth routes.
 */
export async function redirectIfAuthenticated({
  params,
}: {
  params: { lang: string }
}) {
  const user = await resolveUser()
  if (user) {
    throw redirect({
      to: '/$lang/dashboard',
      params: { lang: params.lang },
    })
  }
}

/**
 * Require authentication. Redirects to signin if no session.
 * Use in `beforeLoad` of protected routes.
 */
export async function requireAuth({
  params,
}: {
  params: { lang: string }
}) {
  const user = await resolveUser()
  if (!user) {
    throw redirect({
      to: '/$lang/signin',
      params: { lang: params.lang },
    })
  }
  return { user }
}

/**
 * Require admin role. Redirects to signin or home page.
 * Use in `beforeLoad` of admin routes.
 */
export async function requireAdmin({
  params,
}: {
  params: { lang: string }
}) {
  const { user } = await requireAuth({ params })
  const { can, Action, Subject, Role } = await import('@libs/permissions')
  const appUser = {
    ...user,
    role: (user.role as (typeof Role)[keyof typeof Role]) || Role.NORMAL,
  } as AppUser

  if (!can(appUser, Action.MANAGE, Subject.ALL)) {
    throw redirect({
      to: '/$lang',
      params: { lang: params.lang },
    })
  }

  return { user }
}

/**
 * Require active subscription. Redirects to signin or pricing.
 * Use in `beforeLoad` of subscription-protected routes.
 */
export async function requireSubscription({
  params,
}: {
  params: { lang: string }
}) {
  const { user, hasSubscription } = await resolveSubscription()
  if (!user) {
    throw redirect({
      to: '/$lang/signin',
      params: { lang: params.lang },
    })
  }

  if (!hasSubscription) {
    throw redirect({
      to: '/$lang/pricing',
      params: { lang: params.lang },
    })
  }

  return { user }
}
