import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Building, 
  Users, 
  Save, 
  ArrowLeft,
  Camera,
  Shield,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/supabase";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company_name: '',
    company_size: '',
    avatar_url: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data: profile } = await db.getUserProfile(user.id);
        if (profile) {
          setUserProfile(profile);
          setFormData({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            company_name: profile.company_name || '',
            company_size: profile.company_size || '',
            avatar_url: profile.avatar_url || ''
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...formData,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "✅ Profile Updated!",
        description: "Your profile has been saved successfully.",
      });

      // Refresh profile data
      const { data: updatedProfile } = await db.getUserProfile(user.id);
      setUserProfile(updatedProfile);

    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "❌ Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "👋 Signed out",
        description: "You've been successfully signed out.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const companySizeOptions = [
    'Just me (1)',
    'Small team (2-5)',
    'Medium team (6-20)',
    'Large team (21-50)',
    'Enterprise (50+)'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const displayName = userProfile?.first_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative z-20 sticky top-0 bg-white/95 backdrop-blur">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-black hover:bg-black/5 rounded-full p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-2xl font-bold text-black">opsa</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-black hover:bg-black/5 rounded-full">
              Dashboard
            </Button>
            <Button variant="ghost" onClick={handleSignOut} className="text-black hover:bg-black/5 rounded-full">
              👋 Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-black">
                Profile Settings ⚙️
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Manage your account and personalize your opsa experience
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-6 py-3 border-black/20 text-black rounded-full">
              {user.email}
            </Badge>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24 ring-4 ring-gray-100">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="bg-black text-white text-2xl">
                        {formData.first_name?.[0]}{formData.last_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-2 -right-2 h-8 w-8 p-0 bg-black text-white hover:bg-gray-800 rounded-full"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-xl text-black">
                  {displayName} 👤
                </CardTitle>
                <p className="text-gray-600">{user.email}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3 mb-2">
                    <Building className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-black">Company</span>
                  </div>
                  <p className="text-gray-600">
                    {formData.company_name || 'Not specified'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3 mb-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-black">Team Size</span>
                  </div>
                  <p className="text-gray-600">
                    {formData.company_size || 'Not specified'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 bg-white rounded-2xl shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-black text-xl">
                  <Settings className="h-6 w-6 mr-3" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name Fields */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="first_name" className="text-black font-medium">
                      First Name 👤
                    </Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      placeholder="Enter your first name"
                      className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="last_name" className="text-black font-medium">
                      Last Name 👤
                    </Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      placeholder="Enter your last name"
                      className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                    />
                  </div>
                </div>

                <Separator />

                {/* Company Information */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-black flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Company Information 🏢
                  </h3>
                  
                  <div className="space-y-3">
                    <Label htmlFor="company_name" className="text-black font-medium">
                      Company Name
                    </Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => handleInputChange('company_name', e.target.value)}
                      placeholder="Enter your company name"
                      className="rounded-xl border-gray-200 focus:border-black focus:ring-black"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="company_size" className="text-black font-medium">
                      Company Size 👥
                    </Label>
                    <select
                      id="company_size"
                      value={formData.company_size}
                      onChange={(e) => handleInputChange('company_size', e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    >
                      <option value="">Select company size</option>
                      {companySizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Separator />

                {/* Account Security */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-black flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Account Security 🔒
                  </h3>
                  
                  <div className="p-6 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <Mail className="h-5 w-5 text-gray-600" />
                          <span className="font-medium text-black">Email Address</span>
                        </div>
                        <p className="text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-500 mt-1">This is your login email</p>
                      </div>
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 rounded-full">
                        ✅ Verified
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-black text-white hover:bg-gray-800 rounded-full px-8 py-3"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes 💾
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 