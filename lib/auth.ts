import type { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

async function refreshAccessToken(token: Record<string, unknown>) {
  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
        scope: [
          'openid', 'profile', 'email', 'offline_access',
          'Calendars.Read', 'Calendars.ReadWrite',
          'ChannelMessage.Read.All',
        ].join(' '),
      }),
    })

    const refreshed = await res.json()
    if (!res.ok) throw refreshed

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expires_in as number),
    }
  } catch {
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: [
            'openid',
            'profile',
            'email',
            'offline_access',
            'Calendars.Read',
            'Calendars.ReadWrite',
            'ChannelMessage.Read.All',
          ].join(' '),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const p = profile as { email?: string; preferred_username?: string; upn?: string } | undefined
      const email = (p?.email ?? p?.preferred_username ?? p?.upn ?? '').toLowerCase()
      console.log('[auth] signIn profile email:', email)
      if (!email.endsWith('@fhsu.edu')) {
        console.log('[auth] signIn rejected — not an @fhsu.edu address')
        return false
      }
      return true
    },
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      if (profile) {
        const p = profile as {
          email?: string
          preferred_username?: string
          oid?: string
        }
        token.email = p.email ?? p.preferred_username ?? (token.email as string)
        token.aadObjectId = p.oid
      }

      // No expiry set yet (first sign-in) or token still valid — return as-is
      const expiresAt = token.expiresAt as number | undefined
      if (!expiresAt || Date.now() / 1000 < expiresAt - 60) {
        return token
      }

      // Access token expired — attempt silent refresh
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      session.accessToken = token.accessToken as string | undefined
      session.aadObjectId = token.aadObjectId as string | undefined
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}
