export type UserRole = 'member' | 'supervisor' | 'admin'
export type MemberRole = 'leader' | 'member'
export type MemberStatus = 'pending' | 'active' | 'declined'
export type ProgressStatus = 'not_started' | 'in_progress' | 'done'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          azure_id: string
          email: string
          name: string | null
          role: UserRole
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          teams_channel_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
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
        Update: Partial<Database['public']['Tables']['progress_logs']['Insert']>
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
      }
    }
  }
}
