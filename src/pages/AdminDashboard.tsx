import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Star,
  Settings,
  FileText,
  Search,
  Edit,
  Trash2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/supabase";
import { AdminChatInterface } from "@/components/AdminChatInterface";


interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  created_at: string;
  mentorship_status?: string;
}

interface Session {
  id: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  student_id: string;
  admin_id: string;
  student?: User;
  admin?: User;
}

interface Document {
  id: string;
  title: string;
  description?: string;
  content?: string;
  file_url?: string;
  file_type?: string;
  shared_with_user_id?: string;
  is_public: boolean;
  created_at: string;
  shared_with?: User;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  
  // State for users
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  
  // State for sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  
  // State for documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    title: "",
    description: "",
    content: "",
    shared_with_user_id: "",
    is_public: false
  });
  

  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sessionNotes, setSessionNotes] = useState<{[sessionId: string]: string}>({});
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
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

  // Redirect if not admin
  useEffect(() => {
    console.log('AdminDashboard useEffect:', { user: !!user, isAdmin, loading });
    
    if (!user && !loading) {
      navigate('/login');
      return;
    }
    
    if (user && !loading && !isAdmin) {
      navigate('/dashboard');
      return;
    }
  }, [user, loading, navigate, isAdmin]);

  // Load admin data
  useEffect(() => {
    const loadAdminData = async () => {
      if (!user || !isAdmin) return;

      try {
        // Load all users
        const { data: usersData } = await db.getAllUsers();
        setUsers(usersData || []);
        setFilteredUsers(usersData || []);

        // Load all sessions
        const { data: sessionsData } = await db.getAllSessions();
        setSessions(sessionsData || []);
        setAllSessions(sessionsData || []);

        // Load all documents
        const { data: documentsData } = await db.getAllDocuments();
        setDocuments(documentsData || []);

      } catch (error) {
        console.error('Error loading admin data:', error);
        toast({
          title: "Error",
          description: "Failed to load admin data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [user, isAdmin]);

  // Filter users based on search
  useEffect(() => {
    if (!userSearchQuery) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(userSearchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [userSearchQuery, users]);

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



  const handleCreateDocument = async () => {
    if (!documentForm.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a document title.",
        variant: "destructive",
      });
      return;
    }

    try {
      const documentData = {
        ...documentForm,
        created_by_admin_id: user?.id,
      };

      const { error } = await db.createDocument(documentData);

      if (error) {
        throw error;
      }

      toast({
        title: "Document Created! 📄",
        description: "Document has been created and shared successfully.",
      });

      // Reset form and reload documents
      setDocumentForm({
        title: "",
        description: "",
        content: "",
        shared_with_user_id: "",
        is_public: false
      });
      setShowDocumentForm(false);

      // Reload documents
      const { data: documentsData } = await db.getAllDocuments();
      setDocuments(documentsData || []);

    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: "Failed to create document. Please try again.",
        variant: "destructive",
      });
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No user found. Redirecting...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Not authorized. Redirecting...</p>
        </div>
      </div>
    );
  }

  const totalUsers = users.length;
  const regularUsers = users.filter(u => u.role !== 'admin').length;
  const totalSessions = allSessions.length;
  const upcomingSessions = allSessions.filter(s => new Date(s.scheduled_at) > new Date() && s.status === 'scheduled').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative z-20 sticky top-0">
        <div className="container mx-auto px-6 py-6">
          <div className="bg-white shadow-2xl border-2 border-gray-200 p-4 rounded-full backdrop-blur-md ring-1 ring-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span 
                className="text-2xl font-bold text-black cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate('/admin')}
              >
                opsa
              </span>
              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 rounded-full">
                Admin
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleSignOut} className="text-black hover:bg-black/5 rounded-full">
                👋 Sign Out
              </Button>
              <Avatar 
                className="ring-2 ring-gray-200 cursor-pointer hover:ring-black transition-all duration-200" 
                onClick={() => navigate('/profile')}
              >
                <AvatarImage src="" />
                <AvatarFallback className="bg-black text-white">
                  AD
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
                Admin Dashboard 👑
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage users, sessions, and content for your mentorship platform
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Users", value: totalUsers, emoji: "👥", color: "text-black" },
              { label: "Regular Users", value: regularUsers, emoji: "🧑‍💼", color: "text-black" },
              { label: "Total Sessions", value: totalSessions, emoji: "📅", color: "text-black" },
              { label: "Upcoming Sessions", value: upcomingSessions, emoji: "⏰", color: "text-black" }
            ].map((stat, index) => (
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
            <div className="bg-white shadow-md border border-gray-200 p-3 rounded-full min-w-[900px] grid grid-cols-5 gap-2 backdrop-blur-md">
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
                onClick={() => setSelectedTab("chat")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "chat"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setSelectedTab("users")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "users"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                👥 Users
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
              <button
                onClick={() => setSelectedTab("documents")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "documents"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                📄 Documents
              </button>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2">
                <Card className="border-0 bg-white rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-black text-xl">
                      📈 Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {allSessions && allSessions.length > 0 ? (
                        allSessions
                          .sort((a, b) => new Date(b.created_at || b.scheduled_at).getTime() - new Date(a.created_at || a.scheduled_at).getTime())
                          .slice(0, 5)
                          .map((session, index) => (
                        <div key={session.id} className="flex items-center space-x-4 p-4 border border-gray-100 rounded-xl">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Video className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-black">{session.title}</h4>
                            <p className="text-sm text-gray-600">
                              {session.student?.first_name || session.student?.email} • 
                              Scheduled for {new Date(session.scheduled_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Booked {new Date(session.created_at || session.scheduled_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Show "NEW" badge if session was created recently (within last hour) */}
                            {session.created_at && new Date().getTime() - new Date(session.created_at).getTime() < 3600000 && (
                              <Badge className="bg-blue-500 text-white rounded-full text-xs">
                                NEW
                              </Badge>
                            )}
                            <Badge variant="outline" className={`rounded-full ${
                              session.status === 'scheduled' ? 'border-green-200 text-green-600 bg-green-50' :
                              session.status === 'completed' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                              'border-red-200 text-red-600 bg-red-50'
                            }`}>
                              {session.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-2">📊</div>
                          <p className="text-gray-500">No sessions found</p>
                          <p className="text-xs text-gray-400">Sessions will appear here once they are booked</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    ⚡ Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full bg-black text-white hover:bg-gray-800 rounded-full"
                    onClick={() => setSelectedTab("users")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-black/20 text-black hover:bg-gray-50 rounded-full"
                    onClick={() => setSelectedTab("calendar")}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Calendar
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full border-black/20 text-black hover:bg-gray-50 rounded-full"
                    onClick={() => setSelectedTab("documents")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Share Documents
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <div className="grid gap-6">
              <Card className="border-0 bg-white rounded-2xl shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-black text-xl">
                    💬 Mentorship Chat
                  </CardTitle>
                  <CardDescription>
                    Communicate directly with your mentees through real-time messaging
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <AdminChatInterface />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black text-xl">
                  👥 User Management
                </CardTitle>
                <CardDescription>
                  Manage your mentorship platform users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search Users */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-10 rounded-full"
                    />
                  </div>
                </div>

                {/* Users List */}
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-gray-100 text-gray-600">
                            {user.first_name?.[0] || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-black">
                            {user.first_name && user.last_name 
                              ? `${user.first_name} ${user.last_name}` 
                              : user.email
                            }
                          </h4>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className={`rounded-full text-xs ${
                              user.role === 'admin' 
                                ? 'border-red-200 text-red-600 bg-red-50' 
                                : 'border-blue-200 text-blue-600 bg-blue-50'
                            }`}>
                              {user.role}
                            </Badge>
                            {user.mentorship_status && (
                              <Badge variant="outline" className="rounded-full text-xs border-green-200 text-green-600 bg-green-50">
                                {user.mentorship_status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {user.role !== 'admin' && (
                          <Button 
                            size="sm" 
                            className="bg-black text-white hover:bg-gray-800 rounded-full"
                            onClick={() => handleBookSession(user)}
                          >
                            Book Session
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-black/20 text-black hover:bg-gray-50 rounded-full"
                        >
                          View Profile
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black text-xl">
                  📄 Document Management
                </CardTitle>
                <CardDescription>
                  Share documents and resources with your mentees
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Create Document Button */}
                <div className="mb-6">
                  <Button 
                    className="bg-black text-white hover:bg-gray-800 rounded-full"
                    onClick={() => setShowDocumentForm(!showDocumentForm)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Document
                  </Button>
                </div>

                {/* Document Creation Form */}
                {showDocumentForm && (
                  <Card className="mb-6 border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg">Create New Document</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-black">Title</label>
                        <Input
                          value={documentForm.title}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Document title..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-black">Description</label>
                        <Input
                          value={documentForm.description}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-black">Content</label>
                        <Textarea
                          value={documentForm.content}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Document content..."
                          rows={5}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-black">Share with User</label>
                        <select
                          value={documentForm.shared_with_user_id}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, shared_with_user_id: e.target.value }))}
                          className="mt-1 w-full p-2 border border-gray-200 rounded-lg"
                        >
                          <option value="">Select a user (or leave empty for public)</option>
                          {users.filter(u => u.role !== 'admin').map(user => (
                            <option key={user.id} value={user.id}>
                              {user.first_name && user.last_name 
                                ? `${user.first_name} ${user.last_name} (${user.email})` 
                                : user.email
                              }
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="is_public"
                          checked={documentForm.is_public}
                          onChange={(e) => setDocumentForm(prev => ({ ...prev, is_public: e.target.checked }))}
                          className="rounded"
                        />
                        <label htmlFor="is_public" className="text-sm text-gray-600">
                          Make this document public (visible to all users)
                        </label>
                      </div>
                      <div className="flex space-x-3">
                        <Button onClick={handleCreateDocument} className="bg-black text-white hover:bg-gray-800 rounded-full">
                          Create Document
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowDocumentForm(false)}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Documents List */}
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-6 border border-gray-100 rounded-2xl hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-black text-lg mb-2">{doc.title}</h3>
                          {doc.description && (
                            <p className="text-gray-600 mb-3">{doc.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <FileText className="h-4 w-4 mr-1" />
                              {doc.is_public ? 'Public' : 'Private'}
                            </span>
                            {doc.shared_with && (
                              <span className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                Shared with {doc.shared_with.first_name || doc.shared_with.email}
                              </span>
                            )}
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge variant="outline" className={`rounded-full flex-shrink-0 ${
                            doc.is_public 
                              ? 'border-green-200 text-green-600 bg-green-50' 
                              : 'border-blue-200 text-blue-600 bg-blue-50'
                          }`}>
                            {doc.is_public ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button size="sm" className="bg-black text-white hover:bg-gray-800 rounded-full">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" className="border-black/20 text-black hover:bg-gray-50 rounded-full">
                          View
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 rounded-full">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar Tab */}
          {selectedTab === "calendar" && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Calendar View */}
                <div className="lg:col-span-2">
                  <Card className="border-0 bg-white rounded-2xl shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center text-black text-xl">
                        📅 Session Calendar
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        View all mentorship sessions across users
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
                                      ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-200'
                                      : isToday 
                                        ? 'bg-black text-white border-black' 
                                        : hasSession
                                          ? 'bg-blue-50 border-blue-200 text-black hover:bg-blue-100'
                                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={() => isCurrentMonth && selectDate(dayNumber)}
                              >
                                {isCurrentMonth && dayNumber}
                                {/* Session indicator */}
                                {hasSession && isCurrentMonth && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
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
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span>Has Sessions</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Selected Date Details */}
                <Card className="border-0 bg-white rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-black text-xl">
                      📋 Session Details
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {selectedDate 
                        ? `Selected: ${selectedDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}`
                        : 'Select a date to view sessions'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedDate ? (
                      <>
                        {/* Sessions on selected date */}
                        {(() => {
                          const sessionsOnDate = getSessionsForDate(selectedDate.getDate());
                          
                          if (sessionsOnDate.length > 0) {
                            return (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-black">📞 Sessions</h4>
                                {sessionsOnDate.map((session: Session) => {
                                  const sessionTime = new Date(session.scheduled_at);
                                  return (
                                    <div key={session.id} className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <span className="text-2xl">🎯</span>
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-black">{session.title}</h4>
                                          <p className="text-gray-600 text-sm">
                                            {sessionTime.toLocaleTimeString('en-US', { 
                                              hour: 'numeric', 
                                              minute: '2-digit',
                                              hour12: true 
                                            })} • {session.duration_minutes} min
                                          </p>
                                          <p className="text-gray-600 text-sm">
                                            Student: {session.student?.first_name || session.student?.email}
                                          </p>
                                        </div>
                                      </div>
                                      {session.description && (
                                        <p className="text-gray-700 text-sm mb-3">{session.description}</p>
                                      )}
                                      <div className="flex items-center space-x-2 mb-3">
                                        <Badge variant="outline" className="text-xs">
                                          {session.status === 'scheduled' ? '📅 Scheduled' : 
                                           session.status === 'completed' ? '✅ Completed' : 
                                           session.status === 'cancelled' ? '❌ Cancelled' : session.status}
                                        </Badge>
                                      </div>
                                      
                                      {/* Session Notes */}
                                      <div className="mt-3 pt-3 border-t border-blue-200">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="text-sm font-medium text-black">📝 Session Notes</h5>
                                          {editingNotes !== session.id && (
                                            <Button 
                                              size="sm" 
                                              variant="outline" 
                                              className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-full text-xs"
                                              onClick={() => {
                                                setEditingNotes(session.id);
                                                setNoteText(session.notes || '');
                                              }}
                                            >
                                              {session.notes ? 'Edit' : 'Add Note'}
                                            </Button>
                                          )}
                                        </div>
                                        
                                        {editingNotes === session.id ? (
                                          <div className="space-y-2">
                                            <Textarea
                                              value={noteText}
                                              onChange={(e) => setNoteText(e.target.value)}
                                              placeholder="Add session notes..."
                                              className="w-full text-sm"
                                              rows={3}
                                            />
                                            <div className="flex space-x-2">
                                              <Button 
                                                size="sm" 
                                                className="bg-black text-white hover:bg-gray-800 rounded-full text-xs"
                                                onClick={async () => {
                                                  setSavingNote(true);
                                                  try {
                                                    const { error } = await db.updateSessionNotes(session.id, noteText);
                                                    
                                                    if (error) {
                                                      console.error('Error saving session notes:', error);
                                                      toast({
                                                        title: "Error saving notes ❌",
                                                        description: "Failed to save session notes. Please try again.",
                                                        variant: "destructive",
                                                      });
                                                      return;
                                                    }

                                                    // Update local session data
                                                    setAllSessions(prev => prev.map(s => 
                                                      s.id === session.id ? { ...s, notes: noteText } : s
                                                    ));
                                                    setSessions(prev => prev.map(s => 
                                                      s.id === session.id ? { ...s, notes: noteText } : s
                                                    ));
                                                    
                                                    setEditingNotes(null);
                                                    toast({
                                                      title: "Notes saved! 📝",
                                                      description: "Session notes have been updated successfully.",
                                                    });
                                                  } catch (error) {
                                                    console.error('Error saving session notes:', error);
                                                    toast({
                                                      title: "Error saving notes ❌",
                                                      description: "Failed to save session notes. Please try again.",
                                                      variant: "destructive",
                                                    });
                                                  } finally {
                                                    setSavingNote(false);
                                                  }
                                                }}
                                                disabled={savingNote}
                                              >
                                                {savingNote ? 'Saving...' : 'Save'}
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-full text-xs"
                                                onClick={() => {
                                                  setEditingNotes(null);
                                                  setNoteText('');
                                                }}
                                                disabled={savingNote}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div>
                                            {session.notes ? (
                                              <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                                                {session.notes}
                                              </p>
                                            ) : (
                                              <p className="text-gray-500 text-sm italic">No notes added yet</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          } else {
                            return (
                              <div className="text-center py-8">
                                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">No sessions scheduled for this date</p>
                                <p className="text-gray-400 text-sm mt-2">Students can now message you directly through the chat system</p>
                              </div>
                            );
                          }
                        })()}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">Select a date to view session details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </Tabs>
      </div>


    </div>
  );
};

export default AdminDashboard;