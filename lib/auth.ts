import type { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      // Request delegated Graph scopes for Phase 4 (calendar)
      authorization: {
        params: {
          scope: [
            'openid',
            'profile',
            'email',
            'offline_access',
            // Calendar
            'Calendars.Read',
            'Calendars.ReadWrite',
            // Teams channels (delegated — scoped to channels the user owns/belongs to)
            'Channel.ReadBasic.All',
            'Channel.Create',
            'ChannelMember.ReadWrite.All',
            'ChannelMessage.Read.All',
          ].join(' '),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // Restrict sign-in to @fhsu.edu accounts only
      const email =
        (profile as { email?: string; preferred_username?: string })?.email ??
        (profile as { preferred_username?: string })?.preferred_username ??
        ''
      return email.toLowerCase().endsWith('@fhsu.edu')
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
      return token
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
