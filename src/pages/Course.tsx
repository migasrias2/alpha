import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Play, Star, Users, Clock, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/supabase';

interface CourseData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: string;
  created_at?: string;
}

interface ModuleProgress {
  completed: boolean;
  completed_at: string | null;
  homework_submission?: string | null;
  homework_submitted_at?: string | null;
}

interface ModuleData {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  duration: string;
  order_number: number;
  homework: string;
  user_module_progress?: ModuleProgress[];
}

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("lessons");
  const [currentLesson, setCurrentLesson] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set()); 
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState<ModuleData | null>(null);
  const [viewingModule, setViewingModule] = useState(false);
  const [homeworkText, setHomeworkText] = useState('');
  const [submittingHomework, setSubmittingHomework] = useState(false);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // Load course data from Supabase
  useEffect(() => {
    const loadCourseData = async () => {
      if (!user || !courseId) return;

      try {
        // For now, hardcode the course ID we created - later this will come from URL params
        const actualCourseId = 'fc67bc80-0ab4-4ef5-b0db-26e9daac2b09';
        
        const courseResponse = await db.getCourseProgress(user.id, actualCourseId);
        
        if (courseResponse.course) {
          setCourse(courseResponse.course);
          setModules(courseResponse.modules || []);
          
          // Calculate progress
          const progressPercentage = await db.calculateCourseProgress(user.id, actualCourseId);
          setProgress(progressPercentage);
          
          // Expand first module by default
          if (courseResponse.modules && courseResponse.modules.length > 0) {
            setExpandedModules(new Set([courseResponse.modules[0].id]));
          }
        }
      } catch (error) {
        console.error('Error loading course data:', error);
        toast({
          title: "Error",
          description: "Failed to load course data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [user, courseId, toast]);

  // Toggle module completion using direct Supabase MCP
  const toggleModuleCompletion = async (moduleId: string, currentlyCompleted: boolean) => {
    if (!user) return;

    try {
      const newCompletionStatus = !currentlyCompleted;
      const completedAt = newCompletionStatus ? new Date().toISOString() : null;
      
      // Use direct SQL to ensure reliable database updates
      const { supabase } = await import('@/lib/supabase');
      
      // First check if record exists
      const { data: existingRecord } = await supabase
        .from('user_module_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .single();

      let error;
      
      if (existingRecord) {
        // Update existing record
        const updateResult = await supabase
          .from('user_module_progress')
          .update({
            completed: newCompletionStatus,
            completed_at: completedAt
          })
          .eq('user_id', user.id)
          .eq('module_id', moduleId);
        error = updateResult.error;
      } else {
        // Insert new record
        const insertResult = await supabase
          .from('user_module_progress')
          .insert({
            user_id: user.id,
            module_id: moduleId,
            completed: newCompletionStatus,
            completed_at: completedAt,
            created_at: new Date().toISOString()
          });
        error = insertResult.error;
      }

      if (error) {
        throw error;
      }
      
      // If marking incomplete, reset subsequent modules
      if (!newCompletionStatus) {
        const currentModule = modules.find(m => m.id === moduleId);
        if (currentModule) {
          const subsequentModules = modules.filter(m => m.order_number > currentModule.order_number);
          
          for (const subsequentModule of subsequentModules) {
            await supabase
              .from('user_module_progress')
              .update({
                completed: false,
                completed_at: null
              })
              .eq('user_id', user.id)
              .eq('module_id', subsequentModule.id);
          }
        }
      }
      
      // Calculate updated modules
      const updatedModules = modules.map(module => {
        if (module.id === moduleId) {
          return {
            ...module,
            user_module_progress: [{
              completed: newCompletionStatus,
              completed_at: completedAt
            }]
          };
        } else if (!newCompletionStatus) {
          const currentModule = modules.find(m => m.id === moduleId);
          if (currentModule && module.order_number > currentModule.order_number) {
            return {
              ...module,
              user_module_progress: [{
                completed: false,
                completed_at: null
              }]
            };
          }
        }
        return module;
      });

      // Update the local state for instant UI feedback
      setModules(updatedModules);

      // Update current module if it's the one being toggled
      if (currentModule && currentModule.id === moduleId) {
        setCurrentModule(prev => ({
          ...prev,
          user_module_progress: [{
            completed: newCompletionStatus,
            completed_at: completedAt
          }]
        }));
      }
      
      // Calculate progress immediately from updated modules
      const completedCount = updatedModules.filter(m => m.user_module_progress?.[0]?.completed).length;
      const totalModules = updatedModules.length;
      const newProgress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
      
      setProgress(newProgress);

      toast({
        title: newCompletionStatus ? "Module Complete! 🎉" : "Module Marked Incomplete",
        description: newCompletionStatus ? "Great job! Keep up the momentum." : "Module marked as incomplete.",
      });
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Submit homework for current module
  const submitHomework = async (moduleId: string, homeworkText: string) => {
    if (!user || !homeworkText.trim()) {
      toast({
        title: "Error",
        description: "Please enter your homework submission.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingHomework(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Submit homework
      const result = await db.submitHomework(user.id, moduleId, homeworkText.trim());
      
      if (result.error) {
        throw result.error;
      }

      // Update local state to reflect homework submission
      const updatedModules = modules.map(module => {
        if (module.id === moduleId) {
          return {
            ...module,
            user_module_progress: [{
              completed: module.user_module_progress?.[0]?.completed || false,
              completed_at: module.user_module_progress?.[0]?.completed_at || null,
              homework_submission: homeworkText.trim(),
              homework_submitted_at: new Date().toISOString()
            }]
          };
        }
        return module;
      });

      setModules(updatedModules);

      // Update current module if it's the one being updated
      if (currentModule && currentModule.id === moduleId) {
        setCurrentModule(prev => ({
          ...prev,
          user_module_progress: [{
            completed: prev.user_module_progress?.[0]?.completed || false,
            completed_at: prev.user_module_progress?.[0]?.completed_at || null,
            homework_submission: homeworkText.trim(),
            homework_submitted_at: new Date().toISOString()
          }]
        }));
      }

      // Clear the homework text
      setHomeworkText('');

      toast({
        title: "Homework Submitted! 🎉",
        description: "Your assignment has been saved. You can now complete the module.",
      });
    } catch (error) {
      console.error('Error submitting homework:', error);
      toast({
        title: "Error",
        description: "Failed to submit homework. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmittingHomework(false);
    }
  };

  // Start/Open module
  const openModule = (module: ModuleData) => {
    setCurrentModule(module);
    setViewingModule(true);
    // Load existing homework if any
    setHomeworkText(module.user_module_progress?.[0]?.homework_submission || '');
  };

  // Close module viewer
  const closeModule = async () => {
    setViewingModule(false);
    setCurrentModule(null);
    
    // Reload course data to reflect any changes made in the module viewer
    if (user) {
      try {
        const actualCourseId = 'fc67bc80-0ab4-4ef5-b0db-26e9daac2b09';
        const courseResponse = await db.getCourseProgress(user.id, actualCourseId);
        
        if (courseResponse.course) {
          setModules(courseResponse.modules || []);
          
          // Recalculate progress
          const progressPercentage = await db.calculateCourseProgress(user.id, actualCourseId);
          setProgress(progressPercentage);
        }
      } catch (error) {
        console.error('Error reloading course data:', error);
      }
    }
  };

  // Navigate to next module
    const nextModule = async () => {
    if (!currentModule) return;
    const currentIndex = modules.findIndex(m => m.id === currentModule.id);
    const currentProgress = currentModule.user_module_progress?.[0];
    
    // First check if current module homework is submitted
    if (!currentProgress?.homework_submission) {
      toast({
        title: "Homework Required! 📚",
        description: "You need to submit your homework before proceeding to the next module.",
        variant: "destructive",
      });
      return;
    }

    // Then check if current module is completed
    if (!currentProgress?.completed) {
      toast({
        title: "Complete Current Module! ✅",
        description: "Please mark the current module as complete before proceeding.",
        variant: "destructive",
      });
        return;
      }
    
    // Check if there's a next module
    if (currentIndex >= modules.length - 1) {
      toast({
        title: "Congratulations! 🎉",
        description: "You've completed all available modules!",
      });
      return;
    }

    // Get the next module and refresh data to ensure it's unlocked
    try {
      if (user) {
        const actualCourseId = 'fc67bc80-0ab4-4ef5-b0db-26e9daac2b09';
        const courseResponse = await db.getCourseProgress(user.id, actualCourseId);
        
        if (courseResponse.course) {
          const updatedModules = courseResponse.modules || [];
          setModules(updatedModules);
          
          // Get the next module from updated data
          const nextMod = updatedModules[currentIndex + 1];
          if (nextMod) {
            setCurrentModule(nextMod);
            // Clear homework text for new module
            setHomeworkText(nextMod.user_module_progress?.[0]?.homework_submission || '');
            
    toast({
              title: "Module Unlocked! 🚀",
              description: `Welcome to ${nextMod.title}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading next module:', error);
      toast({
        title: "Error",
        description: "Failed to load next module. Please try again.",
        variant: "destructive",
    });
    }
  };

  // Navigate to previous module
  const previousModule = () => {
    if (!currentModule) return;
    const currentIndex = modules.findIndex(m => m.id === currentModule.id);
    if (currentIndex > 0) {
      setCurrentModule(modules[currentIndex - 1]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-4">Course Not Found</h2>
          <Button onClick={() => navigate('/dashboard')} className="bg-black text-white rounded-full">
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Static data for course goals and other content
  const courseGoal = {
    title: "🧠 Course Goal",
    description: "By the end of this course, students will:",
    objectives: [
      "Understand the fundamentals of prompting and AI copywriting",
      "Create high-quality landing page copy, emails, SEO content, and ad copy using AI",
      "Use proven prompt templates that get consistent results",
      "Learn to build workflows to generate content at scale with AI"
    ]
  };

  const finalProject = {
    title: "🧪 Final Project: Real World Content Task",
    description: "Use GPT to deliver copy for a full client brief.",
    options: [
      "Write a full landing page for a brand",
      "Generate a lead gen email campaign",
      "Create a 3-post content pack for Instagram"
    ]
  };

  const resources = [
    {
      name: "Complete Prompt Library",
      type: "download",
      description: "150+ tested prompts for every copywriting scenario",
      emoji: "📚"
    },
    {
      name: "Brand Voice Templates", 
      type: "download",
      description: "Capture any brand personality with these prompts",
      emoji: "🎭"
    },
    {
      name: "Content Calendar Generator",
      type: "tool",
      description: "AI prompts to create 6 months of content ideas",
      emoji: "📅"
    },
    {
      name: "ROI Calculator",
      type: "tool", 
      description: "Show clients the value of AI-powered copywriting",
      emoji: "💰"
    }
  ];

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'video':
        return "🎥";
      case 'resource':
        return "📄";
      case 'code':
        return "💻";
      default:
        return "📄";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative z-20 sticky top-0 py-4">
        <div className="container mx-auto px-6 space-y-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-black">opsa</span>
              </div>
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-black hover:bg-black/5 rounded-full">
                ← Back to Dashboard
              </Button>
            </div>
            <button 
              onClick={() => {
                // TODO: Navigate to profile settings page
                toast({
                  title: "Profile Settings",
                  description: "Profile settings coming soon!",
                });
              }}
              className="hover:scale-105 transition-transform duration-200"
            >
              <Avatar className="ring-2 ring-gray-200 hover:ring-black/20 transition-all">
                <AvatarImage src="" />
                <AvatarFallback className="bg-black text-white">JD</AvatarFallback>
              </Avatar>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-semibold text-black">Your Progress</span>
              <span className="text-lg font-bold text-black">{progress}% complete</span>
            </div>
            <Progress value={progress} className="h-3 rounded-full mb-2 [&>div]:bg-black" />
            <p className="text-gray-600 text-sm">
              {modules.filter(m => m.user_module_progress?.[0]?.completed).length}/{modules.length} modules completed
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Course Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Course Info */}
            <div>
              <div className="mb-6">
                <Badge variant="outline" className="mb-4 border-black/20 text-black rounded-full">{course.category}</Badge>
                <h1 className="text-5xl font-bold text-black mb-6">{course.title}</h1>
                <p className="text-xl text-gray-600 mb-8">{course.description}</p>
              </div>

              {/* Course Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">👥</span>
                  <span className="font-medium">1,247 students</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⭐</span>
                  <span className="font-medium">4.9 rating</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">⏰</span>
                  <span className="font-medium">{course.duration}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎥</span>
                  <span className="font-medium">{modules.length} modules</span>
                </div>
                <Badge variant="outline" className="border-black/20 text-black rounded-full">{course.difficulty}</Badge>
              </div>
            </div>

            {/* Course Video Preview */}
            <div className="aspect-[4/3] relative rounded-2xl overflow-hidden">
              <iframe 
                className="w-full h-full border-0 pointer-events-none rounded-2xl"
                src="https://www.tella.tv/video/cmctjwj2s001e0ckzdu1u50ba/embed?b=0&title=0&a=0&loop=0&t=0&muted=1&wt=0&autoplay=0&controls=0" 
                allowTransparency
                title="Course Preview"
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Course Goal Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="border-0 bg-white rounded-2xl shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl text-black">{courseGoal.title}</CardTitle>
              <CardDescription className="text-lg text-gray-600">{courseGoal.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {courseGoal.objectives.map((objective, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                      ✓
                    </div>
                    <p className="text-gray-700">{objective}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Course Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="flex justify-center mb-8">
            <div className="bg-white shadow-lg p-1 rounded-full min-w-[400px] grid grid-cols-3 gap-1">
              <button
                onClick={() => setSelectedTab("lessons")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "lessons"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                Lessons
              </button>
              <button
                onClick={() => setSelectedTab("resources")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "resources"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                Resources
              </button>
              <button
                onClick={() => setSelectedTab("community")}
                className={`px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  selectedTab === "community"
                    ? "bg-black text-white"
                    : "text-gray-600 hover:text-black hover:bg-gray-50"
                }`}
              >
                Community
              </button>
            </div>
          </div>

          {/* Lessons Tab */}
          <TabsContent value="lessons" className="space-y-6">
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-2xl text-black">
                  ▶️ Course Curriculum
                </CardTitle>
                <CardDescription className="text-lg">
                  {modules.length} modules • {course.duration} total
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modules.map((module, index) => {
                  const isExpanded = expandedModules.has(module.id);
                  const isCompleted = module.user_module_progress?.[0]?.completed || false;
                  
                  // Sequential unlocking logic - ALL previous modules must be completed AND have homework submitted
                  const isUnlocked = index === 0 || modules.slice(0, index).every(prevModule => {
                    const progress = prevModule.user_module_progress?.[0];
                    return progress?.completed && progress?.homework_submission;
                  });
                  const isLocked = !isUnlocked;
                  
                  // Demo lesson structure for each module
                  const demoLessons = [
                    "What is a \"prompt\" and why it matters",
                    "Anatomy of a great prompt",
                    "Output quality = Input quality",
                    "Types of prompts and when to use them"
                  ];

                  return (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`border-2 rounded-2xl transition-all duration-300 ${
                        isLocked 
                          ? 'border-gray-100 bg-gray-50/50 opacity-60' 
                          : isCompleted 
                            ? 'border-green-200 bg-green-50/50 hover:shadow-lg' 
                            : 'border-gray-200 hover:border-black/20 hover:shadow-lg'
                      }`}>
                        <CardHeader 
                          className={`pb-4 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          onClick={() => !isLocked && toggleModule(module.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                                isLocked 
                                  ? 'bg-gray-200' 
                                  : isCompleted 
                                    ? 'bg-green-100' 
                                    : 'bg-gray-100'
                              }`}>
                                {isLocked ? '🔒' : isCompleted ? '✅' : module.emoji}
                              </div>
                                                              <div>
                                  <h3 className={`text-xl font-bold ${isLocked ? 'text-gray-400' : 'text-black'}`}>
                                    Module {module.order_number}: {module.title} {isLocked ? '' : module.emoji}
                                  </h3>
                                  <p className={`${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {isLocked ? 'Complete previous module to unlock' : module.subtitle}
                                  </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {isLocked ? (
                                <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50 rounded-full">
                                  🔒 Locked
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-gray-300 text-gray-600 rounded-full">
                                  {module.duration}
                                </Badge>
                              )}
                              {isCompleted && !isLocked && (
                                <Badge className="bg-green-600 text-white rounded-full">Completed</Badge>
                              )}
                              {!isLocked && (
                                <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}>
                                  ↓
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        
                        {!isLocked && (
                          <motion.div
                            initial={false}
                            animate={{ 
                              height: isExpanded ? "auto" : 0,
                              opacity: isExpanded ? 1 : 0
                            }}
                            transition={{ duration: 0.3 }}
                            style={{ overflow: "hidden" }}
                          >
                          <CardContent className="space-y-4 pt-0">
                            <div>
                              <h4 className="font-semibold text-black mb-3">What You'll Learn:</h4>
                              <div className="space-y-2">
                                {demoLessons.map((lesson, lessonIndex) => (
                                  <div key={lessonIndex} className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                                    <p className="text-gray-700">{lesson}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-black">📝 Homework:</h4>
                                {module.user_module_progress?.[0]?.homework_submission && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                    ✅ Submitted
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700">{module.homework}</p>
                            </div>

                            <div className="flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <span className="text-2xl">🎥</span>
                                <span className="text-gray-600">{demoLessons.length} lessons</span>
                              </div>
                              <div className="flex space-x-3">
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isLocked) openModule(module);
                                  }}
                                  disabled={isLocked}
                                  className={`rounded-full px-6 ${
                                    isLocked 
                                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                      : 'bg-black hover:bg-gray-800 text-white'
                                  }`}
                                >
                                  {isLocked ? '🔒 Locked' : isCompleted ? 'Review' : 'Start'} Module
                                </Button>
                                <Button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isLocked) toggleModuleCompletion(module.id, isCompleted);
                                  }}
                                  disabled={isLocked || (!module.user_module_progress?.[0]?.homework_submission && !isCompleted)}
                                  variant="outline"
                                  className={`rounded-full px-6 ${
                                    isLocked
                                      ? 'border-gray-300 text-gray-500 cursor-not-allowed'
                                      : (!module.user_module_progress?.[0]?.homework_submission && !isCompleted)
                                      ? 'border-gray-300 text-gray-500 cursor-not-allowed'
                                      : isCompleted 
                                        ? 'border-green-600 text-green-600 hover:bg-green-50' 
                                        : 'border-black text-black hover:bg-gray-50'
                                  }`}
                                >
                                  {isLocked 
                                    ? '🔒 Locked' 
                                    : (!module.user_module_progress?.[0]?.homework_submission && !isCompleted)
                                      ? '📝 Need Homework'
                                      : isCompleted 
                                        ? 'Uncomplete' 
                                        : 'Mark Complete'
                                  }
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                          </motion.div>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}

                {/* Final Project */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: modules.length * 0.1 }}
                >
                  <Card className="border-2 border-black/20 rounded-2xl bg-gradient-to-br from-black to-gray-800 text-white">
                    <CardHeader className="pb-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                          🧪
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{finalProject.title}</h3>
                          <p className="text-gray-300">{finalProject.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-3">Choose Your Project:</h4>
                        <div className="space-y-2">
                          {finalProject.options.map((option, index) => (
                            <div key={index} className="flex items-start space-x-3">
                              <div className="w-6 h-6 bg-white/20 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                                {index + 1}
                              </div>
                              <p className="text-gray-200">{option}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button className="bg-white text-black hover:bg-gray-100 rounded-full px-8">
                        Start Final Project
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-2xl text-black">
                  📥 Course Resources
                </CardTitle>
                <CardDescription className="text-lg">
                  Templates, tools, and downloads to accelerate your learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {resources.map((resource, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-gray-200 rounded-2xl hover:shadow-lg transition-all duration-300 hover:border-black/20">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">
                                {resource.emoji}
                              </div>
                              <div>
                                <h3 className="font-bold text-black text-lg">{resource.name}</h3>
                                <p className="text-gray-600">{resource.description}</p>
                              </div>
                            </div>
                          </div>
                          <Button className="w-full bg-black text-white hover:bg-gray-800 rounded-full">
                            Download Resource
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-2xl text-black">
                  👥 Course Community
                </CardTitle>
                <CardDescription className="text-lg">
                  Connect with fellow students and get help from the instructor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">👥</div>
                  <h3 className="text-2xl font-bold text-black mb-4">Community Coming Soon</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                    We're building a community space where you can ask questions, share wins, and learn from other agency owners who are crushing it with AI.
                  </p>
                  <Button className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3">
                    Join Waitlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Module Viewer */}
      {viewingModule && currentModule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-black">
                  Module {currentModule.order_number}: {currentModule.title} {currentModule.emoji}
                </h2>
                <p className="text-gray-600 mt-1">{currentModule.subtitle}</p>
              </div>
              
              {/* Navigation Controls */}
              <div className="flex items-center space-x-3 ml-6">
                <Button 
                  onClick={previousModule}
                  disabled={modules.findIndex(m => m.id === currentModule.id) === 0}
                  variant="outline"
                  size="sm"
                  className="rounded-full border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  ← Prev
                </Button>
                <Button 
                  onClick={nextModule}
                  disabled={
                    modules.findIndex(m => m.id === currentModule.id) === modules.length - 1 ||
                    !currentModule.user_module_progress?.[0]?.homework_submission ||
                    !currentModule.user_module_progress?.[0]?.completed
                  }
                  variant="outline"
                  size="sm"
                  className="rounded-full border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  {!currentModule.user_module_progress?.[0]?.homework_submission 
                    ? '📚 Homework'
                    : !currentModule.user_module_progress?.[0]?.completed
                      ? '✅ Complete'
                      : modules.findIndex(m => m.id === currentModule.id) === modules.length - 1
                        ? '🎉 Done'
                        : 'Next →'
                  }
                </Button>
              <Button 
                variant="ghost" 
                onClick={closeModule}
                  className="rounded-full hover:bg-gray-100 ml-2"
              >
                ✕
              </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex overflow-hidden">
              {/* Video/Content Area */}
              <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                {/* Video Player */}
                <div className="w-full max-w-3xl mx-auto mb-6">
                  <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                  {currentModule.order_number === 1 ? (
                    // First module - Tella.tv video
                    <iframe 
                      className="w-full h-full border-0" 
                      src="https://www.tella.tv/video/cmctjwj2s001e0ckzdu1u50ba/embed?b=0&title=1&a=1&loop=0&t=0&muted=0&wt=0" 
                      allowFullScreen 
                      allowTransparency
                      title="Module 1: Introduction to AI Prompting"
                    />
                  ) : (
                    // Placeholder for other modules
                    <div className="w-full h-full flex items-center justify-center text-center text-white">
                      <div>
                          <div className="text-6xl mb-4">▶️</div>
                          <h3 className="text-xl font-bold mb-2">Video Coming Soon</h3>
                        <p className="text-gray-300">Module {currentModule.order_number} content will be available soon</p>
                  </div>
                    </div>
                  )}
                  </div>
                </div>

                {/* Content Grid (Description & Homework) */}
                <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-6 items-start mb-6">
                {/* Module Description */}
                  <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-black mb-3">About This Module</h3>
                    <p className="text-gray-700 mb-4 leading-relaxed">{currentModule.subtitle}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                    <span>⏰ {currentModule.duration}</span>
                    <span>🎥 4 lessons</span>
                  </div>
                    
                    {/* What You'll Learn Section */}
                    <div>
                      <h4 className="font-semibold text-black mb-3">What You'll Learn:</h4>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 text-sm">What is a "prompt" and why it matters</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 text-sm">Anatomy of a great prompt</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 text-sm">Output quality = Input quality</p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 text-sm">Types of prompts and when to use them</p>
                        </div>
                      </div>
                  </div>
                </div>

                {/* Homework Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-black mb-3">📝 Module Assignment</h3>
                    <p className="text-gray-700 mb-4 leading-relaxed">{currentModule.homework}</p>

                    {/* Assignment Submission */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          💡 Paste your 3 prompts here to mark complete
                        </label>
                        <textarea
                          value={homeworkText}
                          onChange={(e) => setHomeworkText(e.target.value)}
                          className="w-full h-28 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
                          placeholder={
                            `Paste your 3 CTA prompt variations here...\n\nExample:\n1. Your first prompt variation\n2. Your second prompt variation\n3. Your third prompt variation`
                          }
                          disabled={submittingHomework}
                        />
                </div>

                      {/* Show submission status */}
                      {currentModule?.user_module_progress?.[0]?.homework_submission && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600">✅</span>
                            <span className="text-green-800 font-medium text-sm">Homework Submitted</span>
                            <span className="text-green-600 text-xs">
                              {new Date(currentModule.user_module_progress[0].homework_submitted_at || '').toLocaleDateString()}
                            </span>
              </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                    <Button 
                          className="w-full bg-black hover:bg-gray-800 text-white rounded-full disabled:bg-gray-400 text-sm py-2"
                          onClick={() => currentModule && submitHomework(currentModule.id, homeworkText)}
                          disabled={submittingHomework || !homeworkText.trim()}
                        >
                          {submittingHomework ? '🔄 Submitting...' : '📚 Submit Assignment'}
                    </Button>
                    <Button 
                      variant="outline"
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full disabled:opacity-50 text-sm py-2"
                          onClick={() => {
                            setHomeworkText('');
                            toast({
                              title: 'Draft Cleared',
                              description: 'Your draft has been cleared.',
                            });
                          }}
                          disabled={submittingHomework}
                        >
                          🗑️ Clear Draft
                    </Button>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

              {/* Sidebar */}
              <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
                {/* Progress */}
                <div className="flex-1 p-6">
                  <h3 className="text-lg font-semibold text-black mb-4">Progress</h3>
                  <div className="space-y-2">
                    {modules.map((module, index) => {
                      const isCompleted = module.user_module_progress?.[0]?.completed || false;
                      const isCurrent = module.id === currentModule.id;
                      const isUnlocked = index === 0 || modules.slice(0, index).every(prevModule => {
                        const progress = prevModule.user_module_progress?.[0];
                        return progress?.completed && progress?.homework_submission;
                      });
                      const isLocked = !isUnlocked;
                      
                      return (
                        <div 
                          key={module.id} 
                          className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                            isLocked 
                              ? 'opacity-40 cursor-not-allowed' 
                              : isCurrent 
                                ? 'bg-black text-white shadow-md' 
                                : 'hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200'
                          }`}
                          onClick={() => !isLocked && setCurrentModule(module)}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium ${
                            isLocked 
                              ? 'bg-gray-100 text-gray-400' 
                              : isCompleted 
                                ? 'bg-green-100 text-green-600' 
                                : isCurrent 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isLocked ? '🔒' : isCompleted ? '✅' : module.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${
                              isLocked 
                                ? 'text-gray-400' 
                                : isCurrent 
                                  ? 'text-white' 
                                  : 'text-black'
                            }`}>
                              Module {module.order_number}
                            </p>
                            <p className={`text-xs truncate ${
                              isLocked 
                                ? 'text-gray-400' 
                                : isCurrent 
                                  ? 'text-gray-300' 
                                  : 'text-gray-500'
                            }`}>
                              {isLocked ? 'Locked' : module.title}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Module Status & Actions */}
                <div className="p-6 border-t border-gray-100 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-black mb-3">Module Status</h3>
                  <Button 
                    onClick={() => {
                      const isCompleted = currentModule.user_module_progress?.[0]?.completed || false;
                      toggleModuleCompletion(currentModule.id, isCompleted);
                    }}
                      disabled={!currentModule.user_module_progress?.[0]?.homework_submission && !currentModule.user_module_progress?.[0]?.completed}
                      className={`w-full rounded-full py-3 font-medium ${
                      currentModule.user_module_progress?.[0]?.completed 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : currentModule.user_module_progress?.[0]?.homework_submission
                            ? 'bg-black hover:bg-gray-800 text-white'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                      {currentModule.user_module_progress?.[0]?.completed 
                        ? 'Mark Incomplete' 
                        : currentModule.user_module_progress?.[0]?.homework_submission
                          ? 'Mark Complete'
                          : 'Submit Homework First'
                      }
                  </Button>
                </div>

                <Button 
                  onClick={closeModule}
                  variant="outline"
                    className="w-full rounded-full border-gray-200 hover:bg-gray-50 py-3"
                >
                  ← Back to Course
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Course; 