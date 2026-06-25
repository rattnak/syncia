import { NextResponse } from 'next/server'

export async function GET() {
  const vars = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'MISSING',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
    AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID ?? 'MISSING',
    AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET ? 'SET' : 'MISSING',
    AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID ?? 'MISSING',
    NODE_ENV: process.env.NODE_ENV,
  }

  // Test that the Azure AD discovery document is reachable from this server
  let discovery: string
  try {
    const res = await fetch(
      `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      { signal: AbortSignal.timeout(5000) }
    )
    discovery = res.ok ? `OK (${res.status})` : `FAILED (${res.status})`
  } catch (e) {
    discovery = `ERROR: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({ vars, discovery })
}
