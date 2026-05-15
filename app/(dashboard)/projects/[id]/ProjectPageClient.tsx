'use client'

import { useState } from 'react'
import Link from 'next/link'
import InviteMemberForm from './InviteMemberForm'
import { EditProjectForm, LeaveProjectButton, RemoveMemberButton, ChangeRoleButton } from './ProjectActions'
import ProgressLogForm from '@/components/ProgressLogForm'
import AIQueryBox from '@/components/AIQueryBox'
import SharingSettings from '@/components/SharingSettings'
import MeetingScheduler from '@/components/MeetingScheduler'

interface Profile {
  id: string
  full_name: string | null
  email: string
  role?: string
}

interface Member {
  user_id: string
  role: string
  status: string
  profile: Profile | null
}

interface Log {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
  user_id: string
  author: { id: string; full_name: string | null; email: string } | null
}

interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
  teams_channel_id: string | null
  teams_channel_url: string | null
}

interface Props {
  project: Project
  myMembership: { role: string; status: string; share_with_supervisor: boolean; supervisor_id: string | null; user_id: string }
  members: Member[]
  availMap: Record<string, boolean>
  logs: Log[]
  supervisors: Array<{ id: string; name: string; email: string }>
  isLeader: boolean
  memberEmailsForScheduler: string[]
  membersForAI: Array<{ user_id: string; name: string }>
}

export default function ProjectPageClient({
  project: initialProject,
  myMembership,
  members: initialMembers,
  availMap,
  logs,
  supervisors,
  isLeader,
  memberEmailsForScheduler,
  membersForAI,
}: Props) {
  const [project, setProject] = useState(initialProject)
  const [members, setMembers] = useState(initialMembers)
  const [editing, setEditing] = useState(false)

  function handleProjectSaved(name: string, description: string | null) {
    setProject((p) => ({ ...p, name, description }))
    setEditing(false)
  }

  function handleMemberRemoved(userId: string) {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId))
  }

  function handleRoleChanged(userId: string, newRole: string) {
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: newRole } : m))
  }

  const activeMembers = members.filter((m) => m.status === 'active')

  return (
    <div>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition mb-3">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {editing ? (
              <EditProjectForm
                projectId={project.id}
                currentName={project.name}
                currentDescription={project.description}
                onSaved={handleProjectSaved}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 leading-tight">{project.name}</h1>
                  {project.description && (
                    <p className="text-gray-500 text-sm mt-1">{project.description}</p>
                  )}
                </div>
                {isLeader && !editing && (
                  <button
                    onClick={() => setEditing(true)}
                    title="Edit project"
                    className="mt-1 shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {project.teams_channel_url && (
              <a
                href={project.teams_channel_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition font-medium"
              >
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.19 8.12a3 3 0 00-4.24 0L12 11.07 9.05 8.12a3 3 0 10-4.24 4.24L7.76 15.3l-1.95 1.95a3 3 0 104.24 4.24L12 19.54l2.95 2.95a3 3 0 004.24-4.24L17.24 16.3l1.95-1.95a3 3 0 000-3.18z" />
                </svg>
                Open in Teams
              </a>
            )}
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize font-medium">
              {myMembership.role}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: progress logs + AI + scheduler */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Progress Logs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-sm">Progress Logs</h2>
              <p className="text-xs text-gray-400 mt-0.5">Track what the team is working on.</p>
            </div>
            <div className="p-5">
              <ProgressLogForm
                projectId={project.id}
                currentUserId={myMembership.user_id}
                initialLogs={logs}
              />
            </div>
          </div>

          {/* AI Agent (leaders only) */}
          {isLeader && (
            <AIQueryBox projectId={project.id} members={membersForAI} />
          )}

          {/* Meeting Scheduler (leaders with 2+ members) */}
          {isLeader && memberEmailsForScheduler.length > 1 && (
            <MeetingScheduler
              projectId={project.id}
              memberEmails={memberEmailsForScheduler}
              projectName={project.name}
            />
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">

          {/* Team panel */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm">Team</h2>
              <span className="text-xs text-gray-400">{activeMembers.length} active</span>
            </div>
            <div className="p-4 flex flex-col gap-0.5">
              {members.map((m) => {
                const isFocused = availMap[m.user_id]
                const name = m.profile?.full_name ?? m.profile?.email ?? m.user_id
                const isMe = m.user_id === myMembership.user_id
                const canManage = isLeader && !isMe && m.status === 'active'

                return (
                  <div key={m.user_id} className="group flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar initials */}
                      <div className="h-7 w-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
                        {(m.profile?.full_name ?? m.profile?.email ?? '?')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{name}{isMe && <span className="text-gray-400"> (you)</span>}</p>
                          {m.status === 'pending' ? (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">pending</span>
                          ) : (
                            <span
                              className={`h-1.5 w-1.5 rounded-full shrink-0 ${isFocused ? 'bg-green-400' : 'bg-gray-300'}`}
                              title={isFocused ? 'Focused on this project' : 'Not currently focused here'}
                            />
                          )}
                        </div>
                        <p className="text-xs text-gray-400 capitalize">{m.role}</p>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <ChangeRoleButton
                          projectId={project.id}
                          targetUserId={m.user_id}
                          currentRole={m.role}
                          onRoleChanged={(newRole) => handleRoleChanged(m.user_id, newRole)}
                        />
                        <RemoveMemberButton
                          projectId={project.id}
                          targetUserId={m.user_id}
                          targetName={name}
                          onRemoved={() => handleMemberRemoved(m.user_id)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            <div className="px-5 pb-4 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />focused</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" />away</span>
            </div>
          </div>

          {/* Invite member (leaders only) */}
          {isLeader && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800 text-sm">Invite member</h2>
                <p className="text-xs text-gray-400 mt-0.5">FHSU accounts only.</p>
              </div>
              <div className="p-5">
                <InviteMemberForm projectId={project.id} />
              </div>
            </div>
          )}

          {/* Sharing settings */}
          <SharingSettings projectId={project.id} supervisors={supervisors} />

          {/* Leave project */}
          <div className="flex justify-center pt-1 pb-2">
            <LeaveProjectButton projectId={project.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
