import { createClient } from '@supabase/supabase-js'
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Supabase project credentials
const supabaseUrl = 'https://gmolljzhuzlhwbcjjyrd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb2xsanpodXpsaHdiY2pqeXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjA0MzgsImV4cCI6MjA2NjY5NjQzOH0.VuyczDKczaMxv5fQqK2DDTvfRZ-V8uThP4p-TSKVJSM'

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
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    
    return { isAdmin: data?.role === 'admin', error }
  },

  makeUserAdmin: async (userId: string) => {
    return await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userId)
  },

  getAllUsers: async () => {
    return await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at, mentorship_status')
      .order('created_at', { ascending: false })
  },

  // Sessions functions
  getAllSessions: async () => {
    return await supabase
      .from('mentorship_sessions')
      .select(`
        id,
        title,
        description,
        scheduled_at,
        duration_minutes,
        status,
        student_id,
        admin_id,
        notes,
        created_at,
        student:student_id(id, email, first_name, last_name),
        admin:admin_id(id, email, first_name, last_name)
      `)
      .order('scheduled_at', { ascending: false })
  },

  createSession: async (sessionData: any) => {
    return await supabase
      .from('mentorship_sessions')
      .insert(sessionData)
  },

  createMentorshipSession: async (sessionData: any) => {
    return await supabase
      .from('mentorship_sessions')
      .insert(sessionData)
  },

  updateSessionNotes: async (sessionId: string, notes: string) => {
    return await supabase
      .from('mentorship_sessions')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
  },

  // Documents functions
  getAllDocuments: async () => {
    return await supabase
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
      .order('created_at', { ascending: false })
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'miguelfortesmartins4@gmail.com')
      .single()
    
    if (error) {
      console.error('Error finding admin user:', error);
    }
    
    return { adminId: data?.id, error }
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