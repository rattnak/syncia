import { NextResponse } from 'next/server'

export async function GET() {
  const tenantId = process.env.AZURE_AD_TENANT_ID
  const clientId = process.env.AZURE_AD_CLIENT_ID

  // Test discovery
  let discovery: unknown
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(5000) }
    )
    const json = await res.json() as Record<string, unknown>
    discovery = { status: res.status, authorization_endpoint: json.authorization_endpoint, token_endpoint: json.token_endpoint }
  } catch (e) {
    discovery = `ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  // Try to manually build the authorization URL the same way NextAuth does
  let authUrl: unknown
  try {
    const params = new URLSearchParams({
      client_id: clientId!,
      response_type: 'code',
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`,
      scope: 'openid profile email offline_access Calendars.Read Calendars.ReadWrite ChannelMessage.Read.All',
      response_mode: 'query',
      state: 'test',
      nonce: 'test',
    })
    authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`
  } catch (e) {
    authUrl = `ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  // Check if NEXTAUTH_URL matches what Vercel thinks the URL is
  const nextauthUrl = process.env.NEXTAUTH_URL
  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'not set'

  return NextResponse.json({
    nextauthUrl,
    vercelUrl,
    clientId,
    tenantId,
    discovery,
    authUrl,
  })
}
