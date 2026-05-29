# Syncia

A project collaboration platform for FHSU student teams — built with Next.js 15, Supabase, and Microsoft Graph.

## Features

- **Azure AD SSO** — sign-in restricted to `@fhsu.edu` accounts
- **Project workspace** — create projects, invite team members, track tasks and milestones
- **Microsoft Graph integration**
  - Outlook Calendar: view upcoming meetings matched to your projects
  - Teams channels: auto-create a private Teams channel per project
- **AI assistant** — project-aware chat powered by Claude

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | NextAuth.js + Azure AD (MSAL) |
| Database | Supabase (Postgres + RLS) |
| Graph API | Microsoft Graph v1.0 (delegated tokens) |
| Styling | Tailwind CSS |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- An Azure AD app registration with the following **delegated** permissions (admin-consented):
  - `Calendars.Read`, `Calendars.ReadWrite`
  - `Channel.ReadBasic.All`, `Channel.Create`
  - `ChannelMember.ReadWrite.All`, `ChannelMessage.Read.All`

### Environment variables

Create a `.env.local` file:

```env
# Azure AD
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# Microsoft Teams — object ID of the FHSU-wide Team
GRAPH_TEAM_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Optional: enable demo mode (no real auth required)
DEMO_MODE=false
```

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Authentication & Token Refresh

Sign-in uses Azure AD via NextAuth. The JWT callback stores the Graph `access_token` and `refresh_token`. When the access token is within 60 seconds of expiry, it is silently refreshed using the refresh token against the Azure AD `/oauth2/v2.0/token` endpoint — no re-login required.

If refresh fails (e.g. the refresh token itself expires after 90 days of inactivity), the session is tagged with `error: "RefreshAccessTokenError"` and the user is prompted to sign in again.

## Project Structure

```
app/             # Next.js App Router pages and API routes
  api/
    calendar/    # Graph calendar endpoints
    projects/    # Project CRUD
components/      # Shared React components
lib/
  auth.ts        # NextAuth config with token refresh
  graph/         # Microsoft Graph API client
  supabase/      # Supabase client helpers
types/           # TypeScript type extensions
```

## Deployment

Deploy to Vercel. Set all environment variables in the Vercel project settings. Set `NEXTAUTH_URL` to your production URL.
