import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
    /** Microsoft Graph delegated access token (for Calendar API) */
    accessToken?: string
    /** Azure AD Object ID of the authenticated user */
    aadObjectId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    aadObjectId?: string
  }
}
