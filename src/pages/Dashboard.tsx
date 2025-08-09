import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar,
  MessageCircle,
  Target,
  TrendingUp, 
  Award, 
  Clock, 
  Users, 
  Video,
  CheckCircle,
  Plus,
  ChevronRight,
  Zap,
  LogOut,
  BookOpen,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db, supabase } from "@/lib/supabase";
import { MentorshipChat } from "@/components/MentorshipChat";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Mentorship-specific state
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [userGoals, setUserGoals] = useState<any[]>([]);
  const [mentorshipStats, setMentorshipStats] = useState<any>(null);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarNotes, setCalendarNotes] = useState<{[key: string]: string}>({});
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notesLoading, setNotesLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  


  // Redirect if not authenticated or if admin
  useEffect(() => {
    if (!user && !loading) {
      navigate('/login');
      return;
    }
    
    // Redirect admin users to admin dashboard
    console.log('🔍 Dashboard redirect check:', { user: user?.email, isAdmin, loading });
    
    // Special handling for Miguel's admin account
    if (user?.email === 'miguelfortesmartins4@gmail.com' && !loading) {
      console.log('👑 Miguel detected - forcing admin redirect');
      navigate('/admin');
      return;
    }
    
    if (user && isAdmin && !loading) {
      console.log('🚀 Admin user redirect');
      navigate('/admin');
      return;
    }
  }, [user, loading, navigate, isAdmin]);

  // Load mentorship data
  useEffect(() => {
    const loadMentorshipData = async () => {
      if (!user) return;

      try {
        // Load user profile
        const { data: profile } = await db.getUserProfile(user.id);
        setUserProfile(profile);

        // Load mentorship statistics
        const stats = await db.getMentorshipStats(user.id);
        setMentorshipStats(stats);

        // Load upcoming sessions and all sessions for calendar rendering
        const { data: upcoming } = await db.getUpcomingSessions(user.id);
        setUpcomingSessions(upcoming || []);
        const { data: past } = await db.getPastSessions(user.id);
        setRecentSessions(past || []);
        const combined = [...(upcoming || []), ...(past || [])];
        setAllSessions(combined);

        // Load active goals
        const { data: goals } = await db.getActiveGoals(user.id);
        setUserGoals(goals || []);

      } catch (error) {
        console.error('Error loading mentorship data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMentorshipData();
  }, [user]);

  // Realtime: update upcoming sessions when bookings change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-sessions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentorship_sessions', filter: `student_id=eq.${user.id}` },
        async () => {
          const { data: upcoming } = await db.getUpcomingSessions(user.id);
          setUpcomingSessions(upcoming || []);
          const { data: past } = await db.getPastSessions(user.id);
          setAllSessions([...(upcoming || []), ...(past || [])]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Load calendar notes from database
  useEffect(() => {
    const loadCalendarNotes = async () => {
      if (!user) {
        setNotesLoading(false);
        return;
      }

      try {
        const { data: notes, error } = await db.getCalendarNotes(user.id);
        
        if (error) {
          console.error('Error loading calendar notes:', error);
          return;
        }

        // Convert notes array to object for easier lookup
        const notesObject: {[key: string]: string} = {};
        notes?.forEach(note => {
          notesObject[note.date_key] = note.note_text;
        });
        
        setCalendarNotes(notesObject);
      } catch (error) {
        console.error('Error loading calendar notes:', error);
      } finally {
        setNotesLoading(false);
      }
    };

    loadCalendarNotes();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You've been successfully signed out.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };







  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const selectDate = (day: number) => {
    const selected = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(selected);
    const dateKey = formatDateKey(selected);
    setNoteText(calendarNotes[dateKey] || "");
  };

  const saveNote = async () => {
    if (selectedDate && user) {
      const dateKey = formatDateKey(selectedDate);
      setSavingNote(true);
      
      try {
        const { error } = await db.saveCalendarNote(user.id, dateKey, noteText);
        
        if (error) {
          console.error('Error saving note:', error);
          toast({
            title: "Error saving note ❌",
            description: "Failed to save note. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Update local state
        setCalendarNotes(prev => ({
          ...prev,
          [dateKey]: noteText
        }));
        setIsAddingNote(false);
        
        toast({
          title: "Note saved! 📝",
          description: `Note added for ${selectedDate.toLocaleDateString()}`,
        });
      } catch (error) {
        console.error('Error saving note:', error);
        toast({
          title: "Error saving note ❌",
          description: "Failed to save note. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSavingNote(false);
      }
    }
  };

  const deleteNote = async () => {
    if (selectedDate && user) {
      const dateKey = formatDateKey(selectedDate);
      
      try {
        const { error } = await db.deleteCalendarNote(user.id, dateKey);
        
        if (error) {
          console.error('Error deleting note:', error);
          toast({
            title: "Error deleting note ❌",
            description: "Failed to delete note. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Update local state
        setCalendarNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[dateKey];
          return newNotes;
        });
        setNoteText("");
        
        toast({
          title: "Note deleted 🗑️",
          description: `Note removed from ${selectedDate.toLocaleDateString()}`,
        });
      } catch (error) {
        console.error('Error deleting note:', error);
        toast({
          title: "Error deleting note ❌",
          description: "Failed to delete note. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Sample live stream data
  const liveStreams = [
    {
      date: new Date(2024, 11, 15), // Dec 15, 2024
      title: "AI Prompting Masterclass",
      description: "Interactive Q&A and live prompting session",
      time: "3:00 PM EST",
      type: "live",
      emoji: "🎥",
      color: "red"
    },
    {
      date: new Date(2024, 11, 22), // Dec 22, 2024
      title: "Cursor Deep Dive",
      description: "Advanced coding techniques with AI assistance", 
      time: "2:00 PM EST",
      type: "scheduled",
      emoji: "🤖",
      color: "blue"
    },
    {
      date: new Date(2024, 11, 29), // Dec 29, 2024
      title: "AI Tools Showcase",
      description: "Latest AI tools and automation workflows",
      time: "4:00 PM EST", 
      type: "scheduled",
      emoji: "💡",
      color: "green"
    }
  ];

  const hasStreamOnDate = (day: number) => {
    return liveStreams.some(stream => 
      stream.date.getFullYear() === currentDate.getFullYear() &&
      stream.date.getMonth() === currentDate.getMonth() &&
      stream.date.getDate() === day
    );
  };

  const hasNoteOnDate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = formatDateKey(date);
    return !!calendarNotes[dateKey];
  };

  const hasSessionOnDate = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return allSessions.some(session => {
      const sessionDate = new Date(session.scheduled_at);
      return sessionDate.getFullYear() === checkDate.getFullYear() &&
             sessionDate.getMonth() === checkDate.getMonth() &&
             sessionDate.getDate() === checkDate.getDate();
    });
  };

  const getSessionsForDate = (day: number) => {
    const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return allSessions.filter(session => {
      const sessionDate = new Date(session.scheduled_at);
      return sessionDate.getFullYear() === checkDate.getFullYear() &&
             sessionDate.getMonth() === checkDate.getMonth() &&
             sessionDate.getDate() === checkDate.getDate();
    });
  };

  const stats = [
    { 
      label: "Sessions Completed", 
      value: mentorshipStats?.total_sessions_completed || 0, 
      emoji: "🎯", 
      color: "text-black" 
    },
    { 
      label: "Goals Achieved", 
      value: mentorshipStats?.goals_completed || 0, 
      emoji: "🏆", 
      color: "text-black" 
    },
    { 
      label: "Mentorship Hours", 
      value: `${Math.round(mentorshipStats?.total_mentorship_hours || 0)}h`, 
      emoji: "⏰", 
      color: "text-black" 
    },
    { 
      label: "Active Goals", 
      value: userGoals.length, 
      emoji: "🎯", 
      color: "text-black" 
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const displayName = userProfile?.first_name || user.email?.split('@')[0] || 'User';
  const companyName = userProfile?.company_name || 'Your Agency';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative z-20 sticky top-0">
        <div className="container mx-auto px-6 py-6">
          <div className="bg-white shadow-2xl border-2 border-gray-200 p-4 rounded-full backdrop-blur-md ring-1 ring-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span 
              className="text-2xl font-bold text-black cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => navigate('/dashboard')}
            >
              opsa
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={handleSignOut} className="text-black hover:bg-black/5 rounded-full">
              👋 Sign Out
            </Button>
            <Avatar 
              className="ring-2 ring-gray-200 cursor-pointer hover:ring-black transition-all duration-200" 
              onClick={() => navigate('/profile')}
            >
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-black text-white">
                {userProfile?.first_name?.[0]}{userProfile?.last_name?.[0] || user.email?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-black">
                Welcome back, {displayName}! 👋
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Your personal AI mentorship dashboard - let's achieve your goals together
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-6 py-3 border-black/20 text-black rounded-full">
              {userProfile?.mentorship_status === 'new' ? 'Welcome!' : 
               userProfile?.mentorship_status === 'onboarded' ? 'Getting Started' :
               userProfile?.mentorship_status === 'active' ? 'Active Mentee' :
               userProfile?.mentorship_status === 'paused' ? 'On Break' :
               'Growing'}
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-0 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                        <p className="text-3xl font-bold text-black">{stat.value}</p>
                      </div>
                      <div className="text-4xl">{stat.emoji}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="flex justify-center mb-8">
            <div className="bg-white shadow-md border border-gray-200 p-3 rounded-full min-w-[750px] grid grid-cols-5 gap-2 backdrop-blur-md">
              <button
                onClick={() => setSelectedTab("overview")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "overview"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setSelectedTab("sessions")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "sessions"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                🎯 Sessions
              </button>
              <button
                onClick={() => setSelectedTab("goals")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "goals"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                🏆 Goals
              </button>
              <button
                onClick={() => setSelectedTab("progress")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "progress"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                📈 Progress
              </button>
              <button
                onClick={() => setSelectedTab("calendar")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "calendar"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                📅 Calendar
              </button>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Mentorship Chat */}
              <div className="lg:col-span-2">
                <MentorshipChat />
              </div>

              {/* Recent Sessions & Goals */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    📈 Recent Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Recent Sessions */}
                    {recentSessions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-black mb-3">Latest Sessions</h4>
                        {recentSessions.slice(0, 2).map((session, index) => (
                          <div key={index} className="flex items-start space-x-3 mb-3">
                            <div className="flex-shrink-0 w-3 h-3 bg-black rounded-full mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-black">{session.title || 'Mentorship Session'}</p>
                              <p className="text-xs text-gray-600">{new Date(session.scheduled_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Active Goals */}
                    {userGoals.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-black mb-3">Active Goals</h4>
                        {userGoals.slice(0, 3).map((goal, index) => (
                          <div key={index} className="flex items-start space-x-3 mb-3">
                            <div className="flex-shrink-0 w-3 h-3 bg-gray-600 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-black">{goal.title}</p>
                              <div className="flex items-center mt-1">
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5 mr-2">
                                  <div 
                                    className="bg-black h-1.5 rounded-full" 
                                    style={{ width: `${goal.progress_percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500">{goal.progress_percentage}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Empty State */}
                    {recentSessions.length === 0 && userGoals.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-5xl mb-3">🚀</div>
                        <h3 className="text-sm font-medium text-black mb-1">Ready to Start?</h3>
                        <p className="text-xs text-gray-600">Book your first session to begin!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            <div className="grid gap-6">
              {/* Book New Session */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    💬 Direct Mentorship
                  </CardTitle>
                  <CardDescription>
                    Get instant mentorship support through direct messaging
                  </CardDescription>
                </CardHeader>
                <CardContent>
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Ready for your next breakthrough?</h3>
                        <p className="text-gray-600">Chat with Miguel directly using the live chat above for instant guidance and support</p>
                      </div>
                      <div className="text-4xl">💬</div>
                    </div>
                    <Button 
                      className="bg-black text-white hover:bg-gray-800 rounded-full px-6"
                      onClick={() => setSelectedTab("overview")}
                    >
                      Start Chatting
                      <MessageCircle className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Sessions */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    🎯 Upcoming Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingSessions.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingSessions.map((session, index) => (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-semibold text-black text-lg mb-2">{session.title || 'Mentorship Session'}</h3>
                                <p className="text-gray-600 mb-3">{session.description || 'One-on-one mentorship session'}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {new Date(session.scheduled_at).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1" />
                                    {new Date(session.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                  <span className="flex items-center">
                                    <Video className="h-4 w-4 mr-1" />
                                    {session.duration_minutes} min
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="border-green-200 text-green-600 bg-green-50 rounded-full">
                                {session.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button size="sm" className="bg-black text-white hover:bg-gray-800 rounded-full">
                                Join Session
                                <Video className="h-4 w-4 ml-1" />
                              </Button>
                              <Button size="sm" variant="outline" className="border-black/20 text-black hover:bg-gray-50 rounded-full">
                                Reschedule
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-full">
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">💬</div>
                      <h3 className="text-lg font-medium text-black mb-2">No Scheduled Sessions</h3>
                      <p className="text-gray-600 mb-4">Get instant support through the live chat with Miguel</p>
                      <Button 
                        className="bg-black text-white hover:bg-gray-800 rounded-full px-6"
                        onClick={() => setSelectedTab("overview")}
                      >
                        Open Chat
                        <MessageCircle className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Sessions */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    📝 Recent Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentSessions.length > 0 ? (
                    <div className="space-y-4">
                      {recentSessions.map((session, index) => (
                        <div key={session.id} className="p-6 border border-gray-100 rounded-2xl">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-black text-lg mb-1">{session.title || 'Mentorship Session'}</h3>
                              <p className="text-gray-600 text-sm mb-2">{new Date(session.scheduled_at).toLocaleDateString()}</p>
                            </div>
                            <Badge variant="outline" className="border-green-200 text-green-600 bg-green-50 rounded-full">
                              Completed
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline" className="border-black/20 text-black hover:bg-gray-50 rounded-full">
                            View Notes
                            <MessageCircle className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-3">📝</div>
                      <h3 className="text-sm font-medium text-black mb-1">No Sessions Yet</h3>
                      <p className="text-xs text-gray-600">Your completed sessions will appear here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="grid gap-6">
              {/* Add New Goal */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    🎯 Set New Goal
                  </CardTitle>
                  <CardDescription>
                    Define your mentorship objectives and track your progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-black mb-2">Ready to level up?</h3>
                        <p className="text-gray-600">Set specific, measurable goals to maximize your mentorship experience</p>
                      </div>
                      <div className="text-4xl">🚀</div>
                    </div>
                    <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-6">
                      Add Goal
                      <Plus className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Active Goals */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    🏆 Active Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userGoals.length > 0 ? (
                    <div className="space-y-4">
                      {userGoals.map((goal, index) => (
                        <motion.div
                          key={goal.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <div className="p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="font-semibold text-black text-lg">{goal.title}</h3>
                                  <Badge variant="outline" className={`rounded-full ${
                                    goal.priority === 'high' ? 'border-red-200 text-red-600 bg-red-50' :
                                    goal.priority === 'medium' ? 'border-yellow-200 text-yellow-600 bg-yellow-50' :
                                    'border-green-200 text-green-600 bg-green-50'
                                  }`}>
                                    {goal.priority} priority
                                  </Badge>
                                </div>
                                <p className="text-gray-600 mb-3">{goal.description}</p>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                  <span className="flex items-center">
                                    <Target className="h-4 w-4 mr-1" />
                                    {goal.category}
                                  </span>
                                  {goal.target_date && (
                                    <span className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      Target: {new Date(goal.target_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-black">Progress</span>
                                <span className="text-sm text-gray-600">{goal.progress_percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3">
                                <div 
        className="bg-gradient-to-r from-black to-gray-700 h-3 rounded-full transition-all duration-300"
                                  style={{ width: `${goal.progress_percentage}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Button size="sm" className="bg-black text-white hover:bg-gray-800 rounded-full">
                                Update Progress
                              </Button>
                              <Button size="sm" variant="outline" className="border-black/20 text-black hover:bg-gray-50 rounded-full">
                                Edit Goal
                              </Button>
                              {goal.progress_percentage === 100 && (
                                <Button size="sm" variant="outline" className="border-gray-200 text-black hover:bg-gray-50 rounded-full">
                                  Mark Complete
                                  <CheckCircle className="h-4 w-4 ml-1" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎯</div>
                      <h3 className="text-lg font-medium text-black mb-2">No Goals Set</h3>
                      <p className="text-gray-600 mb-4">Start by setting your first mentorship goal</p>
                      <Button 
                        className="bg-black text-white hover:bg-gray-800 rounded-full px-6"
                        onClick={() => {
                          // TODO: Add goal creation functionality
                          toast({
                            title: "Coming Soon! 🚀",
                            description: "Goal management feature will be available soon.",
                          });
                        }}
                      >
                        Add Your First Goal
                        <Plus className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Completed Goals */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    ✅ Completed Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-5xl mb-3">🏆</div>
                    <h3 className="text-sm font-medium text-black mb-1">No Completed Goals Yet</h3>
                    <p className="text-xs text-gray-600">Your achievements will appear here as you reach your goals.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    📊 Mentorship Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-black">Sessions Completed</h3>
                      <span className="text-2xl">🎯</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-black">Total Sessions</span>
                        <span className="text-sm text-gray-600">{mentorshipStats?.total_sessions_completed || 0}</span>
                      </div>
                      <Progress value={Math.min((mentorshipStats?.total_sessions_completed || 0) * 10, 100)} className="h-3 rounded-full" />
                      <p className="text-sm text-gray-600">{Math.round(mentorshipStats?.total_mentorship_hours || 0)} hours of mentorship</p>
                    </div>
                  </div>
                  <div className="p-6 border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-black">Goals Achievement</h3>
                      <span className="text-2xl">🏆</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-black">Completed Goals</span>
                        <span className="text-sm text-gray-600">{mentorshipStats?.goals_completed || 0}</span>
                      </div>
                      <Progress value={Math.min((mentorshipStats?.goals_completed || 0) * 20, 100)} className="h-3 rounded-full" />
                      <p className="text-sm text-gray-600">{userGoals.length} active goals in progress</p>
                    </div>
                  </div>
                  <div className="p-6 border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-black">Mentorship Journey</h3>
                      <span className="text-2xl">🚀</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-black">Days Since Start</span>
                        <span className="text-sm text-gray-600">
                          {mentorshipStats?.mentorship_started_at 
                            ? Math.floor((new Date().getTime() - new Date(mentorshipStats.mentorship_started_at).getTime()) / (1000 * 60 * 60 * 24))
                            : 0
                          } days
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {mentorshipStats?.last_session_date ? (
                          <span>Last session: {new Date(mentorshipStats.last_session_date).toLocaleDateString()}</span>
                        ) : (
                          <span>Ready to schedule your first session!</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    🏆 Milestones & Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Milestones based on actual progress */}
                    {(mentorshipStats?.total_sessions_completed || 0) >= 1 && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-sm font-bold">
                          ✓
                        </div>
                        <div>
                          <p className="font-medium text-black">First Session Complete</p>
                          <p className="text-sm text-gray-600">Welcome to your mentorship journey!</p>
                        </div>
                      </div>
                    )}
                    
                    {(mentorshipStats?.total_sessions_completed || 0) >= 5 && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          5
                        </div>
                        <div>
                          <p className="font-medium text-black">5 Sessions Milestone</p>
                          <p className="text-sm text-gray-600">Building momentum!</p>
                        </div>
                      </div>
                    )}
                    
                    {(mentorshipStats?.goals_completed || 0) >= 1 && (
                      <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-xl">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          🎯
                        </div>
                        <div>
                          <p className="font-medium text-black">Goal Achiever</p>
                          <p className="text-sm text-gray-600">First goal completed!</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Empty state */}
                    {(mentorshipStats?.total_sessions_completed || 0) === 0 && (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">🏅</div>
                        <h3 className="text-lg font-medium text-black mb-2">Your Journey Starts Here</h3>
                        <p className="text-gray-600">Complete sessions and achieve goals to unlock milestones!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Calendar View */}
              <div className="lg:col-span-2">
                <Card className="border-0 bg-white rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-black text-xl">
                      📅 Interactive Calendar
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      View live streams, add notes, and manage your schedule
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-black">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h2>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-full border-black/20 hover:bg-gray-50"
                          onClick={() => navigateMonth('prev')}
                        >
                          ← Prev
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-full border-black/20 hover:bg-gray-50"
                          onClick={() => navigateMonth('next')}
                        >
                          Next →
                        </Button>
                      </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {/* Day Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
                          {day}
                        </div>
                      ))}

                      {/* Calendar Days */}
                      {(() => {
                        const daysInMonth = getDaysInMonth(currentDate);
                        const firstDay = getFirstDayOfMonth(currentDate);
                        const totalCells = 42; // 6 weeks * 7 days
                        const today = new Date();
                        
                        return Array.from({ length: totalCells }, (_, i) => {
                          const dayNumber = i - firstDay + 1;
                          const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                          const isToday = isCurrentMonth && 
                            dayNumber === today.getDate() && 
                            currentDate.getMonth() === today.getMonth() && 
                            currentDate.getFullYear() === today.getFullYear();
                          const hasStream = false; // remove mock streams from calendar color logic
                          const hasNote = isCurrentMonth && hasNoteOnDate(dayNumber);
                          const hasSession = isCurrentMonth && hasSessionOnDate(dayNumber);
                          const isSelected = selectedDate && isCurrentMonth &&
                            dayNumber === selectedDate.getDate() &&
                            currentDate.getMonth() === selectedDate.getMonth() &&
                            currentDate.getFullYear() === selectedDate.getFullYear();
                          
                          return (
                            <div 
                              key={i} 
                              className={`relative p-3 text-center text-sm rounded-xl border transition-all cursor-pointer ${
                                !isCurrentMonth 
                                  ? 'text-gray-300 border-transparent cursor-default' 
                                  : isSelected
                                    ? 'bg-black text-white border-black ring-2 ring-gray-200'
                                    : isToday 
                                      ? 'bg-black text-white border-black' 
                                      : hasSession
                                        ? 'bg-gray-50 border-gray-200 text-black hover:bg-gray-100'
                                      : hasStream 
                                        ? 'bg-red-50 border-red-200 text-black hover:bg-red-100' 
                                        : hasNote
                                          ? 'bg-gray-50 border-gray-200 text-black hover:bg-gray-100'
                                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => isCurrentMonth && selectDate(dayNumber)}
                            >
                              {isCurrentMonth && dayNumber}
                              {/* Session indicator (highest priority) */}
                              {hasSession && isCurrentMonth && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full"></div>
                              )}
                              {/* Stream indicator (disabled) */}
                              {/* Note indicator */}
                              {hasNote && isCurrentMonth && !hasSession && !hasStream && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-600 rounded-full"></div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 text-xs text-gray-600 justify-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-black rounded-full"></div>
                        <span>Today</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-black rounded-full"></div>
                        <span>Mentorship Session</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Live Stream</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                        <span>Has Note</span>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Selected Date Details */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    📝 Date Details
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {selectedDate 
                      ? `Selected: ${selectedDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}`
                      : 'Select a date to view details'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedDate ? (
                    <>
                      {/* Stream on selected date */}
                      {(() => {
                        const streamOnDate = liveStreams.find(stream => 
                          stream.date.getDate() === selectedDate.getDate() &&
                          stream.date.getMonth() === selectedDate.getMonth() &&
                          stream.date.getFullYear() === selectedDate.getFullYear()
                        );
                        
                        if (streamOnDate) {
                          return (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-2xl">{streamOnDate.emoji}</span>
                                <div>
                                  <h4 className="font-semibold text-black">{streamOnDate.title}</h4>
                                  <p className="text-gray-600 text-sm">{streamOnDate.time}</p>
                                </div>
                              </div>
                              <p className="text-gray-700 text-sm">{streamOnDate.description}</p>
                              <Button size="sm" className="bg-black text-white hover:bg-gray-800 rounded-full mt-3">
                                {streamOnDate.type === 'live' ? 'Join Stream' : 'Set Reminder'}
                              </Button>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Sessions on selected date */}
                      {(() => {
                        const sessionsOnDate = getSessionsForDate(selectedDate.getDate());
                        
                        if (sessionsOnDate.length > 0) {
                          return (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-black">🎯 Mentorship Sessions</h4>
                              {sessionsOnDate.map((session: any) => {
                                const sessionTime = new Date(session.scheduled_at);
                                return (
                                  <div key={session.id} className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <span className="text-2xl">📞</span>
                                      <div>
                                        <h4 className="font-semibold text-black">{session.title}</h4>
                                        <p className="text-gray-600 text-sm">
                                          {sessionTime.toLocaleTimeString('en-US', { 
                                            hour: 'numeric', 
                                            minute: '2-digit',
                                            hour12: true 
                                          })} • {session.duration_minutes} min
                                        </p>
                                      </div>
                                    </div>
                                    {session.description && (
                                      <p className="text-gray-700 text-sm mb-3">{session.description}</p>
                                    )}
                                    <Badge variant="outline" className="text-xs">
                                      {session.status === 'scheduled' ? '📅 Scheduled' : 
                                       session.status === 'completed' ? '✅ Completed' : 
                                       session.status === 'cancelled' ? '❌ Cancelled' : session.status}
                                    </Badge>
                                    {session.meeting_link && (
                                      <Button size="sm" className="bg-black text-white hover:bg-gray-800 rounded-full mt-3 ml-2">
                                        Join Session
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Notes Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-black">📝 Notes</h4>
                          {!isAddingNote && !notesLoading && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-black/20 text-black hover:bg-gray-50 rounded-full"
                              onClick={() => setIsAddingNote(true)}
                            >
                              {calendarNotes[formatDateKey(selectedDate)] ? 'Edit Note' : 'Add Note'}
                            </Button>
                          )}
                        </div>

                        {isAddingNote ? (
                          <div className="space-y-3">
                            <textarea
                              value={noteText}
                              onChange={(e) => setNoteText(e.target.value)}
                              placeholder="Add your note for this date..."
                              className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-black/20"
                              rows={4}
                            />
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                className="bg-black text-white hover:bg-gray-800 rounded-full"
                                onClick={saveNote}
                                disabled={savingNote || !noteText.trim()}
                              >
                                {savingNote ? 'Saving...' : 'Save Note'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-full"
                                onClick={() => {
                                  setIsAddingNote(false);
                                  setNoteText(calendarNotes[formatDateKey(selectedDate)] || "");
                                }}
                                disabled={savingNote}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : notesLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                            <span className="ml-2 text-gray-600">Loading notes...</span>
                          </div>
                        ) : (
                          <div>
                            {calendarNotes[formatDateKey(selectedDate)] ? (
                              <div className="p-3 bg-gray-50 rounded-xl">
                                <p className="text-gray-700 whitespace-pre-wrap">
                                  {calendarNotes[formatDateKey(selectedDate)]}
                                </p>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-red-200 text-red-600 hover:bg-red-50 rounded-full mt-3"
                                  onClick={deleteNote}
                                >
                                  Delete Note
                                </Button>
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">No notes for this date.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">📅</div>
                      <h3 className="text-lg font-medium text-black mb-2">Select a Date</h3>
                      <p className="text-gray-600">Click on any date to view details and add notes.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Streams Section */}
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black text-xl">
                  🔴 Upcoming Live Streams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {liveStreams.map((stream, index) => (
                    <div key={index} className="p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            stream.color === 'red' ? 'bg-red-100' : 
                                                                    stream.color === 'blue' ? 'bg-gray-100' :
                                        'bg-gray-100'
                          }`}>
                            <span className="text-2xl">{stream.emoji}</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-black">{stream.title}</h4>
                            <p className="text-gray-600 text-sm">{stream.description}</p>
                            <p className="text-gray-500 text-xs">
                              {stream.date.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })} • {stream.time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={`rounded-full ${
                              stream.color === 'red' ? 'border-red-200 text-red-600 bg-red-50' :
                                                                    stream.color === 'blue' ? 'border-gray-200 text-black bg-gray-50' :
                                      'border-gray-200 text-black bg-gray-50'
                            }`}
                          >
                            {stream.type === 'live' ? '🔴 Live' : '📅 Scheduled'}
                          </Badge>
                          <Button 
                            size="sm" 
                            className={stream.type === 'live' 
                              ? "bg-black text-white hover:bg-gray-800 rounded-full"
                              : "border-black/20 text-black hover:bg-gray-50 rounded-full"
                            }
                            variant={stream.type === 'live' ? 'default' : 'outline'}
                            onClick={() => {
                              toast({
                                title: stream.type === 'live' ? "Joining stream... 🔴" : "Reminder set! ⏰",
                                description: stream.type === 'live' 
                                  ? `Opening ${stream.title}` 
                                  : `You'll be notified before ${stream.title}`,
                              });
                            }}
                          >
                            {stream.type === 'live' ? 'Join Stream' : 'Set Reminder'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stream Statistics */}
                <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-black">{liveStreams.length}</div>
                      <div className="text-sm text-gray-600">🎥 Total Streams</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-black">847</div>
                      <div className="text-sm text-gray-600">👥 Average Viewers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-black">4.9</div>
                      <div className="text-sm text-gray-600">⭐ Stream Rating</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>


    </div>
  );
};

export default Dashboard; 