export type UserRole = 'member' | 'supervisor' | 'admin'
export type MemberRole = 'leader' | 'member'
export type MemberStatus = 'pending' | 'active' | 'declined' | 'left' | 'removed'
export type ProgressStatus = 'not_started' | 'in_progress' | 'done'
export type MilestoneStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high'
export type NotificationType = 'task_overdue' | 'task_assigned' | 'project_stale' | 'milestone_due' | 'invite_received'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string           // references auth.users.id
          email: string
          full_name: string | null
          role: UserRole
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string | null
          created_at: string
          teams_channel_id: string | null
          teams_channel_url: string | null
        }
        Insert: {
          name: string
          description?: string | null
          created_by?: string | null
          teams_channel_id?: string | null
          teams_channel_url?: string | null
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: MemberRole
          status: MemberStatus
          share_with_supervisor: boolean
          supervisor_id: string | null
          joined_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['project_members']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['project_members']['Insert']>
        Relationships: []
      }
      invites: {
        Row: {
          id: string
          project_id: string
          invited_email: string
          invited_by: string
          token: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
          expires_at: string
        }
        Insert: Omit<Database['public']['Tables']['invites']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['invites']['Insert']>
        Relationships: []
      }
      availability: {
        Row: {
          id: string
          user_id: string
          project_id: string
          is_focused: boolean
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['availability']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['availability']['Insert']>
        Relationships: []
      }
      progress_logs: {
        Row: {
          id: string
          project_id: string
          user_id: string
          title: string
          description: string | null
          status: ProgressStatus
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['progress_logs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['progress_logs']['Insert']> & { updated_at?: string }
        Relationships: []
      }
      hearts: {
        Row: {
          id: string
          user_id: string
          remaining: number
          daily_limit: number
          last_reset: string
        }
        Insert: Omit<Database['public']['Tables']['hearts']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['hearts']['Insert']>
        Relationships: []
      }
      ai_audit_log: {
        Row: {
          id: string
          requester_id: string | null
          subject_user_id: string | null
          project_id: string | null
          query: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_audit_log']['Row'], 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
      milestones: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          target_date: string | null
          status: MilestoneStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['milestones']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['milestones']['Row'], 'id' | 'created_at'>> & { updated_at?: string }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          milestone_id: string | null
          title: string
          description: string | null
          assignee_id: string | null
          due_date: string | null
          priority: TaskPriority
          status: TaskStatus
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at'>> & { updated_at?: string }
        Relationships: []
      }
      subtasks: {
        Row: {
          id: string
          task_id: string
          title: string
          is_completed: boolean
          assignee_id: string | null
          due_date: string | null
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['subtasks']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['subtasks']['Row'], 'id' | 'created_at'>>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          payload: Record<string, unknown>
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Pick<Database['public']['Tables']['notifications']['Row'], 'is_read'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
