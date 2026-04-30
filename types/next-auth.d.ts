import 'next-auth'

declare module 'next-auth' {
  interface Session {
    accessToken: string
    user: {
      azureId: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
