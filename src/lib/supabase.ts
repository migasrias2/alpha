import { createClient } from '@supabase/supabase-js'
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

// Real Supabase project credentials
const supabaseUrl = 'https://gmolljzhuzlhwbcjjyrd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtb2xsanpodXpsaHdiY2pqeXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMjA0MzgsImV4cCI6MjA2NjY5NjQzOH0.VuyczDKczaMxv5fQqK2DDTvfRZ-V8uThP4p-TSKVJSM'

export const supabase = createClient(supabaseUrl, supabaseKey)

interface UserMetadata {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_size?: string;
}

interface ProfileData {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string;
  company_size?: string;
  avatar_url?: string;
  created_at?: string;
}

interface ProfileUpdates {
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_size?: string;
  avatar_url?: string;
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
      .select('*')
      .eq('id', userId)
      .single()
  },

  createUserProfile: async (userId: string, profileData: ProfileData) => {
    return await supabase
      .from('profiles')
      .insert({
        id: userId,
        ...profileData,
        created_at: new Date().toISOString()
      })
  },

  updateUserProfile: async (userId: string, updates: ProfileUpdates) => {
    return await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
  },

  // Courses
  getCourses: async () => {
    return await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false })
  },

  getCourse: async (courseId: string) => {
    return await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()
  },

  // Course modules
  getCourseModules: async (courseId: string) => {
    return await supabase
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_number', { ascending: true })
  },

  // Lessons
  getCourseLessons: async (courseId: string) => {
    return await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_number', { ascending: true })
  },

  // User progress
  getUserProgress: async (userId: string) => {
    return await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
  },

  getUserModuleProgress: async (userId: string) => {
    return await supabase
      .from('user_module_progress')
      .select('*')
      .eq('user_id', userId)
  },

  // Get complete course progress with modules and lessons
  getCourseProgress: async (userId: string, courseId: string) => {
    // Get course info
    const courseResponse = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()

    // Get modules with progress
    const modulesResponse = await supabase
      .from('modules')
      .select(`
        *,
        user_module_progress!left(completed, completed_at)
      `)
      .eq('course_id', courseId)
      .eq('user_module_progress.user_id', userId)
      .order('order_number', { ascending: true })

    // Get lessons with progress  
    const lessonsResponse = await supabase
      .from('lessons')
      .select(`
        *,
        user_progress!left(completed, completed_at)
      `)
      .eq('course_id', courseId)
      .eq('user_progress.user_id', userId)
      .order('order_number', { ascending: true })

    return {
      course: courseResponse.data,
      modules: modulesResponse.data,
      lessons: lessonsResponse.data,
      courseError: courseResponse.error,
      modulesError: modulesResponse.error,
      lessonsError: lessonsResponse.error
    }
  },

  updateLessonProgress: async (userId: string, lessonId: string, completed: boolean) => {
    return await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        completed,
        completed_at: completed ? new Date().toISOString() : null
      })
  },

  updateModuleProgress: async (userId: string, moduleId: string, completed: boolean) => {
    return await supabase
      .from('user_module_progress')
      .upsert({
        user_id: userId,
        module_id: moduleId,
        completed,
        completed_at: completed ? new Date().toISOString() : null
      })
  },

  // Calculate progress percentage for a course
  calculateCourseProgress: async (userId: string, courseId: string) => {
    const { data: modules } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId)

    const { data: completedModules } = await supabase
      .from('user_module_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('completed', true)
      .in('module_id', modules?.map(m => m.id) || [])

    const totalModules = modules?.length || 0
    const completed = completedModules?.length || 0
    
    return totalModules > 0 ? Math.round((completed / totalModules) * 100) : 0
  }
}

export default supabase 