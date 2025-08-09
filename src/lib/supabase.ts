import { createClient } from '@supabase/supabase-js'
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Supabase project credentials (env-first, fallback to hardcoded for local dev)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? 'https://gmolljzhuzlhwbcjjyrd.supabase.co'
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb2xsanpodXpsaHdiY2pqeXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjA0MzgsImV4cCI6MjA2NjY5NjQzOH0.VuyczDKczaMxv5fQqK2DDTvfRZ-V8uThP4p-TSKVJSM'

export const supabase = createClient(supabaseUrl, supabaseKey)

interface UserMetadata {
  first_name?: string;
  last_name?: string;
}

interface ProfileData {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: 'user' | 'admin';
  created_at?: string;
}

interface ProfileUpdates {
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'admin';
}

// Helper functions for authentication
export const auth = {
  signUp: async (email: string, password: string, metadata?: UserMetadata) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  getCurrentUser: () => {
    return supabase.auth.getUser()
  },

  getSession: () => {
    return supabase.auth.getSession()
  },

  onAuthStateChange: (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Helper functions for database operations
export const db = {
  // User profiles
  getUserProfile: async (userId: string) => {
    return await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at')
      .eq('id', userId)
      .single()
  },

  createUserProfile: async (userId: string, profileData: ProfileData) => {
    return await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: profileData.email,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        role: profileData.role || 'user',
        created_at: new Date().toISOString()
      })
  },

  updateUserProfile: async (userId: string, updates: ProfileUpdates) => {
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
  },

  // Admin functions
  isUserAdmin: async (userId: string) => {
    try {
      // First check if it's Miguel's email (hardcoded admin)
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === 'miguelfortesmartins4@gmail.com') {
        return { isAdmin: true, error: null }
      }

      // Otherwise check the role in profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false, error }
      }
      
      return { isAdmin: data?.role === 'admin', error: null }
    } catch (err) {
      console.error('Error in isUserAdmin:', err);
      return { isAdmin: false, error: err }
    }
  },

  makeUserAdmin: async (userId: string) => {
    return await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)
  },

  getAllUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, mentorship_status')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching users:', error);
      return { data: [], error };
    }
    
    return { data, error: null };
  },

  // Sessions functions
  getAllSessions: async () => {
    // Note: We intentionally avoid nested selects to profiles here because
    // mentorship_sessions.student_id/admin_id reference auth.users. We'll enrich
    // these on the client using the already-fetched profiles list.
    const { data, error } = await supabase
      .from('mentorship_sessions')
      .select(
        `id, title, description, scheduled_at, duration_minutes, status, student_id, admin_id, notes, created_at, updated_at`
      )
      .order('scheduled_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sessions:', error);
      return { data: [], error };
    }
    
    return { data, error: null };
  },

  createSession: async (sessionData: any) => {
    return await supabase
      .from('mentorship_sessions')
      .insert(sessionData)
      .select('*')
      .single()
  },

  createMentorshipSession: async (sessionData: any) => {
    return await supabase
      .from('mentorship_sessions')
      .insert(sessionData)
      .select('*')
      .single()
  },

  updateSessionNotes: async (sessionId: string, notes: string) => {
    return await supabase
      .from('mentorship_sessions')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  },

  // Cancel a session
  cancelSession: async (sessionId: string) => {
    const { data, error } = await supabase
      .from('mentorship_sessions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .select('*')
      .single()
    return { data, error }
  },

  // Reschedule a session
  rescheduleSession: async (sessionId: string, newDateISO: string, newDuration?: number) => {
    const updates: any = { scheduled_at: newDateISO, updated_at: new Date().toISOString() }
    if (typeof newDuration === 'number') updates.duration_minutes = newDuration
    const { data, error } = await supabase
      .from('mentorship_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select('*')
      .single()
    return { data, error }
  },

  // Documents functions
  getAllDocuments: async () => {
    const { data, error } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        description,
        content,
        file_url,
        file_type,
        shared_with_user_id,
        created_by_admin_id,
        is_public,
        created_at,
        shared_with:shared_with_user_id(id, email, first_name, last_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching documents:', error);
      return { data: [], error };
    }
    
    return { data, error: null };
  },

  createDocument: async (documentData: any) => {
    return await supabase
      .from('documents')
      .insert(documentData)
  },

  updateDocument: async (documentId: string, updates: any) => {
    return await supabase
      .from('documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', documentId)
  },

  deleteDocument: async (documentId: string) => {
    return await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
  },

  // Chat/Messaging functions
  getChatMessages: async (userId: string, otherUserId: string) => {
    return await supabase
      .from('mentorship_messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        message_text,
        message_type,
        created_at,
        read_at,
        reply_to_id
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true })
  },

  sendMessage: async (messageData: { sender_id: string, receiver_id: string, message_text: string, message_type?: string, reply_to_id?: string | null }) => {
    return await supabase
      .from('mentorship_messages')
      .insert({
        sender_id: messageData.sender_id,
        receiver_id: messageData.receiver_id,
        message_text: messageData.message_text,
        message_type: messageData.message_type || 'text',
        reply_to_id: messageData.reply_to_id || null
      })
  },

  markMessageAsRead: async (messageId: string) => {
    return await supabase
      .from('mentorship_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
  },

  getUnreadMessageCount: async (userId: string) => {
    return await supabase
      .from('mentorship_messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId)
      .is('read_at', null)
  },

  // Get admin user ID (Miguel's ID) for chat functionality
  getAdminUserId: async () => {
    // Prefer RPC to avoid RLS issues and speed up lookup
    const { data, error } = await supabase.rpc('get_miguel_id')
    if (error) {
      console.error('Error finding admin user via RPC:', error)
      return { adminId: null, error }
    }
    return { adminId: data as unknown as string | null, error: null }
  },

  // Additional functions needed by Dashboard
  getMentorshipStats: async (userId: string) => {
    // For now, return mock stats - you can implement actual stats calculation later
    return {
      totalSessions: 0,
      completedGoals: 0,
      activeGoals: 0,
      nextSession: null
    }
  },

  getUpcomingSessions: async (userId: string) => {
    return await supabase
      .from('mentorship_sessions')
      .select('*')
      .eq('student_id', userId)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
  },

  getPastSessions: async (userId: string) => {
    return await supabase
      .from('mentorship_sessions')
      .select('*')
      .eq('student_id', userId)
      .eq('status', 'completed')
      .lt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: false })
  },

  getActiveGoals: async (userId: string) => {
    return await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
  },

  getCalendarNotes: async (userId: string) => {
    return await supabase
      .from('calendar_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  },

  saveCalendarNote: async (userId: string, dateKey: string, noteText: string) => {
    return await supabase
      .from('calendar_notes')
      .upsert({ 
        user_id: userId, 
        date_key: dateKey, 
        note_text: noteText,
        updated_at: new Date().toISOString()
      })
  },

  deleteCalendarNote: async (userId: string, dateKey: string) => {
    return await supabase
      .from('calendar_notes')
      .delete()
      .eq('user_id', userId)
      .eq('date_key', dateKey)
  }
}

export default supabase