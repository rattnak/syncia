import NextAuth from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { createClient } from '@/lib/supabase/server'

const handler = NextAuth({
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email offline_access Calendars.Read ChannelMessage.Read.All',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.azureId = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.user.azureId = token.azureId as string
      return session
    },
    async signIn({ user, account }) {
      if (!user.email || !account) return false
      const supabase = createClient()
      const { error } = await supabase.from('users').upsert(
        {
          azure_id: account.providerAccountId,
          email: user.email,
          name: user.name ?? '',
        },
        { onConflict: 'azure_id' }
      )
      if (error) console.error('Failed to upsert user:', error)
      return true
    },
  },
  pages: {
    signIn: '/login',
  },
})

export { handler as GET, handler as POST }
