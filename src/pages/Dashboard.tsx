import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BookOpen, 
  Wrench, 
  TrendingUp, 
  Award, 
  Clock, 
  Users, 
  Play,
  Download,
  Star,
  ChevronRight,
  Zap,
  Target,
  CheckCircle,
  LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/supabase";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarNotes, setCalendarNotes] = useState<{[key: string]: string}>({});
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [notesLoading, setNotesLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Load user profile data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Load user profile
        const { data: profile } = await db.getUserProfile(user.id);
        setUserProfile(profile);

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

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

  // Featured courses data with real progress
  const [courseProgress, setCourseProgress] = useState([
    {
      id: 'fc67bc80-0ab4-4ef5-b0db-26e9daac2b09',
      title: "Prompting is 🔑",
      description: "Master automated content creation and scale your agency's output.",
      progress: 0,
      duration: "4h 20m",
      lessons: 6,
      completed: 0,
      difficulty: "Beginner",
      category: "Content Creation"
    },
    {
      id: 2,
      title: "Cursor for Web Development",
      description: "Build faster with AI-assisted coding",
      progress: 0,
      duration: "3h 45m",
      lessons: 8,
      completed: 0,
      difficulty: "Intermediate",
      category: "Development"
    }
  ]);

  // Load real progress data using direct Supabase calls
  const loadProgress = async () => {
    if (!user) return;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Get all modules for the Prompting course
      const { data: modules } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', 'fc67bc80-0ab4-4ef5-b0db-26e9daac2b09');

      // Get completed modules for this user
      const { data: completedModules } = await supabase
        .from('user_module_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('module_id', modules?.map(m => m.id) || []);

      const totalModules = modules?.length || 0;
      const completed = completedModules?.length || 0;
      const promptingProgress = totalModules > 0 ? Math.round((completed / totalModules) * 100) : 0;
      
      setCourseProgress(prev => prev.map(course => 
        course.id === 'fc67bc80-0ab4-4ef5-b0db-26e9daac2b09' 
          ? { ...course, progress: promptingProgress, completed: completed }
          : course
      ));
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  useEffect(() => {
    loadProgress();
  }, [user]);

  // Refresh progress when returning to the page
  useEffect(() => {
    const handleFocus = () => {
      loadProgress();
    };

    window.addEventListener('focus', handleFocus);
    
    // Also refresh when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const aiTools = [
    {
      name: "Lovable",
      description: "Build something Lovable - Create apps and websites by chatting with AI",
      url: "https://lovable.dev/#via=897192",
      category: "Development",
      emoji: "💖",
      rating: "4.9",
      downloads: "10k+",
      unlocked: true
    },
    {
      name: "Replit",
      description: "Code, create, and learn together in the browser with instant environments",
      url: "https://replit.com/refer/bobbyio",
      category: "Development", 
      emoji: "🔧",
      rating: "4.8",
      downloads: "50k+",
      unlocked: true
    },
    {
      name: "Bolt",
      description: "AI-powered development platform for rapid prototyping and deployment",
      url: "https://bolt.new/?rid=9cce34",
      category: "Deployment",
      emoji: "⚡",
      rating: "4.7",
      downloads: "25k+",
      unlocked: true
    },
    {
      name: "v0",
      description: "Generate UI components with AI - Vercel's design-to-code platform",
      url: "https://v0.dev/",
      category: "Design",
      emoji: "🎨",
      rating: "4.9",
      downloads: "30k+",
      unlocked: true
    },
    {
      name: "Tempo",
      description: "Modern AI-powered development workflow and collaboration platform",
      url: "https://www.tempo.new/",
      category: "Workflow",
      emoji: "🚀",
      rating: "4.6",
      downloads: "15k+",
      unlocked: true
    },
    {
      name: "Same",
      description: "AI development assistant for seamless coding and project management",
      url: "https://same.dev/",
      category: "Development",
      emoji: "🤖",
      rating: "4.8",
      downloads: "20k+",
      unlocked: true
    },
    {
      name: "Onlook",
      description: "Visual development environment with AI-powered design capabilities",
      url: "https://onlook.com/",
      category: "Visual",
      emoji: "👁️",
      rating: "4.7",
      downloads: "12k+",
      unlocked: true
    }
  ];

  const recentActivity: any[] = []; // Empty until we track real activity

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

  const stats = [
    { label: "Courses Completed", value: 0, emoji: "📚", color: "text-black" },
    { label: "Tools Unlocked", value: 0, emoji: "🛠️", color: "text-black" },
    { label: "Learning Points", value: 0, emoji: "⭐", color: "text-black" },
    { label: "Time Saved", value: "0h", emoji: "⏰", color: "text-black" }
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
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-black">opsa</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/')} className="text-black hover:bg-black/5 rounded-full">
              Home
            </Button>
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
                Continue your AI transformation journey with {companyName}
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-6 py-3 border-black/20 text-black rounded-full">
              Getting Started
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
            <div className="bg-white shadow-lg p-1 rounded-full min-w-[650px] grid grid-cols-5 gap-1">
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
                onClick={() => setSelectedTab("courses")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "courses"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                📚 Courses
              </button>
              <button
                onClick={() => setSelectedTab("tools")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "tools"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                🤖 AI Tools
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
              {/* Continue Learning */}
              <div className="lg:col-span-2">
                <Card className="border-0 bg-white rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-black text-xl">
                      ▶️ Continue Learning
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {courseProgress.length > 0 ? (
                      courseProgress.slice(0, 2).map((course) => (
                        <div key={course.id} className="p-6 border border-gray-100 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-black text-lg mb-2">{course.title}</h3>
                              <p className="text-gray-600 mb-4">{course.description}</p>
                            </div>
                            <Badge variant="outline" className="border-black/20 text-black rounded-full ml-4 flex-shrink-0">{course.difficulty}</Badge>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-black">Progress</span>
                                <span className="text-sm text-gray-600">{course.progress}%</span>
                              </div>
                              <Progress value={course.progress} className="h-3 rounded-full mb-2" />
                              <p className="text-sm text-gray-500">
                                {course.completed}/{course.lessons} modules • {course.progress}% complete
                              </p>
                            </div>
                            <Button size="sm" className="bg-black text-white hover:bg-gray-800 rounded-full px-6 flex-shrink-0" onClick={() => navigate(`/course/${course.id}`)}>
                              Start Course
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">📚</div>
                        <h3 className="text-lg font-medium text-black mb-2">No Courses Available</h3>
                        <p className="text-gray-600">New courses will appear here when available.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    📈 Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentActivity.length > 0 ? (
                    <div className="space-y-4">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-3 h-3 bg-black rounded-full mt-2"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-black">{activity.action}</p>
                            <p className="text-sm text-gray-600">{activity.detail}</p>
                            <p className="text-xs text-gray-400">{activity.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-5xl mb-3">📊</div>
                      <h3 className="text-sm font-medium text-black mb-1">No Activity Yet</h3>
                      <p className="text-xs text-gray-600">Your learning activity will appear here.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courseProgress.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full border-0 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
                    <CardHeader className="pb-4 flex-grow">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="outline" className="border-black/20 text-black rounded-full">{course.category}</Badge>
                        <Badge variant="outline" className="border-gray-300 text-gray-600 rounded-full">{course.difficulty}</Badge>
                      </div>
                      <CardTitle className="text-xl text-black mb-3">{course.title}</CardTitle>
                      <CardDescription className="text-gray-600 flex-grow">{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{course.lessons} modules</span>
                          <span>{course.duration}</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-black">Progress</span>
                            <span className="text-sm text-gray-600">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-3 rounded-full mb-4" />
                        </div>
                        <Button className="w-full bg-black text-white hover:bg-gray-800 rounded-full py-3" onClick={() => navigate(`/course/${course.id}`)}>
                          {course.progress > 0 ? 'Continue' : 'Start Course'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            {aiTools.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {aiTools.map((tool, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className={`border-0 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer ${!tool.unlocked ? 'opacity-60' : ''}`}
                      onClick={() => tool.unlocked && window.open(tool.url, '_blank')}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="border-black/20 text-black rounded-full">{tool.category}</Badge>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-black text-black" />
                            <span className="text-sm font-medium">{tool.rating}</span>
                          </div>
                        </div>
                        <CardTitle className="flex items-center text-black text-xl">
                          <span className="text-2xl mr-3">{tool.emoji}</span>
                          {tool.name}
                        </CardTitle>
                        <CardDescription className="text-gray-600">{tool.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Download className="h-4 w-4 mr-1" />
                              {tool.downloads}
                            </span>
                          </div>
                          <Button 
                            disabled={!tool.unlocked}
                            variant={tool.unlocked ? "default" : "outline"}
                            className={tool.unlocked ? "bg-black text-white hover:bg-gray-800 rounded-full" : "border-gray-300 text-gray-600 rounded-full"}
                            onClick={() => tool.unlocked && window.open(tool.url, '_blank')}
                          >
                            {tool.unlocked ? 'Visit Tool' : 'Unlock'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🛠️</div>
                    <h3 className="text-lg font-medium text-black mb-2">No AI Tools Available</h3>
                    <p className="text-gray-600">AI tools and templates will be available as you progress through courses.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    🎯 Learning Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-black">Complete Your First Course</h3>
                      <span className="text-2xl">✅</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-black">Progress</span>
                        <span className="text-sm text-gray-600">0%</span>
                      </div>
                      <Progress value={0} className="h-3 rounded-full" />
                      <p className="text-sm text-gray-600">0/{courseProgress.length} completed</p>
                    </div>
                  </div>
                  <div className="p-6 border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-black">Start Learning Journey</h3>
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-black">Progress</span>
                        <span className="text-sm text-gray-600">0%</span>
                      </div>
                      <Progress value={0} className="h-3 rounded-full" />
                      <p className="text-sm text-gray-600">Begin your first lesson</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    🏆 Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🏅</div>
                    <h3 className="text-lg font-medium text-black mb-2">No Achievements Yet</h3>
                    <p className="text-gray-600">Complete modules and courses to earn achievements.</p>
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
                          const hasStream = isCurrentMonth && hasStreamOnDate(dayNumber);
                          const hasNote = isCurrentMonth && hasNoteOnDate(dayNumber);
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
                                    ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-200'
                                    : isToday 
                                      ? 'bg-black text-white border-black' 
                                      : hasStream 
                                        ? 'bg-red-50 border-red-200 text-black hover:bg-red-100' 
                                        : hasNote
                                          ? 'bg-green-50 border-green-200 text-black hover:bg-green-100'
                                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                              onClick={() => isCurrentMonth && selectDate(dayNumber)}
                            >
                              {isCurrentMonth && dayNumber}
                              {/* Stream indicator */}
                              {hasStream && isCurrentMonth && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                              )}
                              {/* Note indicator */}
                              {hasNote && isCurrentMonth && !hasStream && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
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
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Live Stream</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Has Note</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Selected</span>
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
                            stream.color === 'blue' ? 'bg-blue-100' : 
                            'bg-green-100'
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
                              stream.color === 'blue' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                              'border-green-200 text-green-600 bg-green-50'
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