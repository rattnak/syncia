import { createClient } from './supabase.js'
import { WEB_APP_URL } from '../config.js'

const root = document.getElementById('root')

async function render() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    root.innerHTML = `
      <div style="padding:20px;display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;height:100vh;">
        <h1 style="font-size:18px;font-weight:700;color:#111827;">Syncia</h1>
        <p style="font-size:13px;color:#6b7280;text-align:center;">Sign in to the Syncia web app first, then reopen this panel.</p>
        <a href="${getWebAppUrl()}/login" target="_blank"
           style="background:#2563eb;color:#fff;font-size:13px;font-weight:500;padding:8px 16px;border-radius:8px;text-decoration:none;">
          Open Syncia
        </a>
      </div>
    `
    return
  }

  const { data: memberships } = await supabase
    .from('project_members')
    .select('role, projects(id, name)')
    .eq('user_id', session.user.id)
    .eq('status', 'active')

  const projects = memberships?.map((m) => m.projects) ?? []

  root.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100vh;">
      <header style="background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-weight:700;font-size:15px;color:#111827;">Syncia</span>
        <span style="font-size:11px;color:#9ca3af;">${session.user.email}</span>
      </header>
      <main style="flex:1;overflow-y:auto;padding:16px;">
        <p style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Your projects</p>
        ${projects.length === 0
          ? `<p style="font-size:13px;color:#9ca3af;">No active projects. <a href="${getWebAppUrl()}/projects/new" target="_blank" style="color:#2563eb;">Create one</a>.</p>`
          : projects.map((p) => `
              <a href="${getWebAppUrl()}/projects/${p.id}" target="_blank"
                 style="display:block;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:12px;margin-bottom:8px;text-decoration:none;color:#111827;font-size:13px;font-weight:500;">
                ${p.name}
              </a>
            `).join('')
        }
      </main>
      <footer style="padding:10px 16px;border-top:1px solid #e5e7eb;text-align:center;">
        <a href="${getWebAppUrl()}/dashboard" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;">
          Open full dashboard →
        </a>
      </footer>
    </div>
  `
}

function getWebAppUrl() {
  return WEB_APP_URL
}

render()
