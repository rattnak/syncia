/**
 * Microsoft Graph API client
 *
 * Required env vars:
 *   AZURE_AD_CLIENT_ID
 *   AZURE_AD_CLIENT_SECRET
 *   AZURE_AD_TENANT_ID
 *   GRAPH_TEAM_ID  — the object ID of the FHSU-wide Team to create channels inside
 *
 * ── Token strategy ────────────────────────────────────────────────────────────
 * ALL Teams channel operations (create, add member, read messages) use the
 * DELEGATED access token from the signed-in user's NextAuth session.
 *
 * Why: Teams.Create and TeamMember.ReadWrite.All were intentionally NOT granted
 * as Application permissions. Using delegated tokens means operations are scoped
 * to channels the user owns, with no tenant-wide access.
 *
 * Required delegated permissions (admin-consented, no application permissions needed):
 *   Channel.Create                — create private channels in teams the user belongs to
 *   ChannelMember.ReadWrite.All   — add/remove members from owned channels
 *   ChannelMessage.Read.All       — read channel messages for AI context
 *   Calendars.Read                — read the user's calendar
 *   Calendars.ReadWrite           — create calendar events / find meeting times
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

// ─── GRAPH FETCH HELPERS ──────────────────────────────────────────────────────

async function graphGet(path: string, accessToken: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...extraHeaders },
  })
  if (!res.ok) throw new Error(`Graph GET ${path} failed: ${res.status}`)
  return res.json()
}

async function graphPost(path: string, body: unknown, accessToken: string) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph POST ${path} failed: ${res.status} – ${err}`)
  }
  return res.json()
}

// ─── TEAMS CHANNEL ────────────────────────────────────────────────────────────

/**
 * Create a private channel in the FHSU team for a Syncia project.
 *
 * Uses the creating user's DELEGATED token — the operation runs as that user,
 * so they are automatically added as the channel owner. This requires only
 * Channel.Create (delegated), not Teams.Create (application).
 *
 * @param userToken  The signed-in leader's Graph access_token from their session.
 */
export async function createTeamsChannel(
  channelDisplayName: string,
  description: string,
  userToken: string
): Promise<{ id: string; webUrl: string }> {
  const teamId = process.env.GRAPH_TEAM_ID
  if (!teamId) throw new Error('GRAPH_TEAM_ID is not set. Add it to .env.local.')

  const channel = await graphPost(`/teams/${teamId}/channels`, {
    displayName: channelDisplayName,
    description,
    membershipType: 'private',
    // The calling user is added as owner automatically by Graph when using a
    // delegated token — no need to specify members here.
  }, userToken)

  return { id: channel.id, webUrl: channel.webUrl }
}

/**
 * Add a member to an existing private Teams channel.
 *
 * Call this with the CHANNEL OWNER's delegated token (the project leader who
 * created the channel). A channel owner can add others without needing
 * TeamMember.ReadWrite.All (Application).
 *
 * @param userToken  Delegated token of a channel owner (typically the project leader).
 */
export async function addTeamsChannelMember(
  channelId: string,
  memberAadId: string,
  userToken: string
): Promise<void> {
  const teamId = process.env.GRAPH_TEAM_ID
  if (!teamId) throw new Error('GRAPH_TEAM_ID is not set.')

  await graphPost(`/teams/${teamId}/channels/${channelId}/members`, {
    '@odata.type': '#microsoft.graph.aadUserConversationMember',
    roles: [],
    'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${memberAadId}')`,
  }, userToken)
}

/**
 * Read the last N messages from a Teams channel (for AI context).
 *
 * Uses the signed-in user's delegated token — they can only read channels
 * they are already a member of, which is exactly the right scope.
 */
export async function getChannelMessages(
  channelId: string,
  userToken: string,
  limit = 20
): Promise<Array<{ from: string; body: string; createdAt: string }>> {
  const teamId = process.env.GRAPH_TEAM_ID
  if (!teamId) throw new Error('GRAPH_TEAM_ID is not set.')

  const data = await graphGet(
    `/teams/${teamId}/channels/${channelId}/messages?$top=${limit}&$orderby=createdDateTime desc`,
    userToken
  )

  return (data.value ?? []).map((m: {
    from?: { user?: { displayName?: string } }
    body?: { content?: string }
    createdDateTime?: string
  }) => ({
    from: m.from?.user?.displayName ?? 'Unknown',
    body: m.body?.content ?? '',
    createdAt: m.createdDateTime ?? '',
  }))
}

// ─── CALENDAR ─────────────────────────────────────────────────────────────────

/**
 * Fetch the signed-in user's upcoming calendar events.
 * Requires Calendars.Read (delegated).
 */
export async function getUserCalendarEvents(
  accessToken: string,
  daysAhead = 7
): Promise<Array<{
  id: string
  subject: string
  start: string
  end: string
  attendeeEmails: string[]
  onlineMeetingUrl?: string
}>> {
  // Start from beginning of today (UTC) so we don't miss morning events
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const startDateTime = startOfToday.toISOString()
  const endDateTime = new Date(startOfToday.getTime() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

  // calendarView returns events in the user's mailbox timezone — request UTC via Prefer header
  const data = await graphGet(
    `/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=id,subject,start,end,attendees,onlineMeetingUrl&$top=50`,
    accessToken,
    { 'Prefer': 'outlook.timezone="UTC"' }
  )

  return (data.value ?? []).map((e: {
    id: string
    subject?: string
    start?: { dateTime?: string; timeZone?: string }
    end?: { dateTime?: string; timeZone?: string }
    attendees?: Array<{ emailAddress?: { address?: string } }>
    onlineMeetingUrl?: string
  }) => {
    // Graph returns dateTime without Z when using Prefer UTC — add it explicitly
    const startRaw = e.start?.dateTime ?? ''
    const endRaw = e.end?.dateTime ?? ''
    const toISO = (dt: string) => dt.endsWith('Z') ? dt : dt + 'Z'
    return {
      id: e.id,
      subject: e.subject ?? '(No subject)',
      start: toISO(startRaw),
      end: toISO(endRaw),
      attendeeEmails: (e.attendees ?? []).map((a) => a.emailAddress?.address ?? '').filter(Boolean),
      onlineMeetingUrl: e.onlineMeetingUrl,
    }
  })
}

/**
 * Find mutual availability slots for a group of attendees.
 * Requires Calendars.Read (delegated).
 */
export async function findMeetingTimes(
  accessToken: string,
  attendeeEmails: string[],
  durationMinutes = 60
): Promise<Array<{ start: string; end: string; confidence: number }>> {
  const now = new Date()
  const end = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const data = await graphPost('/me/findMeetingTimes', {
    attendees: attendeeEmails.map((email) => ({
      emailAddress: { address: email },
      type: 'required',
    })),
    timeConstraint: {
      activityDomain: 'work',
      timeslots: [
        {
          start: { dateTime: now.toISOString(), timeZone: 'UTC' },
          end: { dateTime: end.toISOString(), timeZone: 'UTC' },
        },
      ],
    },
    meetingDuration: `PT${durationMinutes}M`,
    maxCandidates: 5,
    isOrganizerOptional: false,
    returnSuggestionReasons: true,
    minimumAttendeePercentage: 100,
  }, accessToken)

  return (data.meetingTimeSuggestions ?? []).map((s: {
    meetingTimeSlot?: { start?: { dateTime?: string }, end?: { dateTime?: string } }
    confidence?: number
  }) => ({
    start: s.meetingTimeSlot?.start?.dateTime ?? '',
    end: s.meetingTimeSlot?.end?.dateTime ?? '',
    confidence: s.confidence ?? 0,
  }))
}

/**
 * Book a calendar event on the user's calendar with a Teams meeting link.
 * Requires Calendars.ReadWrite (delegated).
 */
export async function bookMeeting(
  accessToken: string,
  subject: string,
  start: string,
  end: string,
  attendeeEmails: string[],
  body?: string
): Promise<{ id: string; webLink: string }> {
  const event = await graphPost('/me/events', {
    subject,
    body: { contentType: 'Text', content: body ?? '' },
    start: { dateTime: start, timeZone: 'UTC' },
    end: { dateTime: end, timeZone: 'UTC' },
    attendees: attendeeEmails.map((email) => ({
      emailAddress: { address: email },
      type: 'required',
    })),
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
  }, accessToken)

  return { id: event.id, webLink: event.webLink }
}
