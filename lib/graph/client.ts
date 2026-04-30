import { Client } from '@microsoft/microsoft-graph-client'
import 'isomorphic-fetch'

export function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  })
}

export async function getCalendarEvents(accessToken: string) {
  const client = getGraphClient(accessToken)
  const now = new Date().toISOString()
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  return client
    .api('/me/calendarView')
    .query({ startDateTime: now, endDateTime: end })
    .select('id,subject,start,end,attendees,bodyPreview')
    .orderby('start/dateTime')
    .get()
}

export async function findMeetingTimes(accessToken: string, attendeeEmails: string[]) {
  const client = getGraphClient(accessToken)
  return client.api('/me/findMeetingTimes').post({
    attendees: attendeeEmails.map((email) => ({
      type: 'required',
      emailAddress: { address: email },
    })),
    meetingDuration: 'PT30M',
  })
}

export async function createTeamsChannel(accessToken: string, teamId: string, projectName: string) {
  const client = getGraphClient(accessToken)
  return client.api(`/teams/${teamId}/channels`).post({
    displayName: projectName,
    description: `Syncia project channel for ${projectName}`,
    membershipType: 'private',
  })
}
