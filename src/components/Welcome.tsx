import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Welcome = () => {
  const navigate = useNavigate();
  const [showFloatingNav, setShowFloatingNav] = useState(false);

  // Scroll detection for floating navbar
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Show floating navbar when scrolled past 100px
      setShowFloatingNav(scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: "🧠",
      title: "Master AI Tools",
      description: "Learn Cursor, GPT, Claude, and automation tools that make old software obsolete"
    },
    {
      icon: "⚡",
      title: "Build 10x Faster",
      description: "Create projects in hours, not weeks using AI-powered workflows"
    },
    {
      icon: "🚀",
      title: "Future-Proof Skills",
      description: "Stay ahead while others struggle with outdated methods"
    },
    {
      icon: "🎯",
      title: "Learn by Doing",
      description: "Real projects, not boring theory. Build while you learn"
    }
  ];

  const stats = [
    { number: "10x", label: "⚡ Faster Results" },
    { number: "50+", label: "🤖 AI Tools Mastered" },
    { number: "0%", label: "🙅‍♂️ Boring Theory" },
    { number: "1000+", label: "🚀 Lives Changed" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Original Header - Hidden when floating */}
      <motion.div 
        className="relative z-20 sticky top-0"
        animate={{
          opacity: showFloatingNav ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-black">opsa</span>
          </div>
          <div className="space-x-4">
            <Button variant="ghost" onClick={() => navigate('/login')} className="text-black hover:bg-black/5 rounded-full">
              Login
            </Button>
            <Button onClick={() => navigate('/signup')} className="bg-black text-white hover:bg-gray-800 rounded-full px-6">
              Get Started
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Floating Rounded Navbar */}
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ 
          y: showFloatingNav ? 0 : -100, 
          opacity: showFloatingNav ? 1 : 0 
        }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="fixed top-6 right-6 z-50"
      >
        <div className="bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl rounded-full px-8 py-4">
          <div className="flex items-center justify-between space-x-8">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-black">opsa</span>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')} 
                className="text-black hover:bg-black/10 rounded-full px-4 py-2 text-sm"
              >
                Login
              </Button>
              <Button 
                onClick={() => navigate('/signup')} 
                className="bg-black text-white hover:bg-gray-800 rounded-full px-5 py-2 text-sm"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-white overflow-hidden">
        {/* Eye Image - positioned on the right side */}
        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-8 pointer-events-none select-none">
          <div 
            className="w-[500px] h-[500px] bg-contain bg-no-repeat bg-center filter grayscale opacity-60"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1582203401567-e7e1c0d1a3b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80')`,
              maskImage: 'radial-gradient(circle at center, black 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 70%)',
            }}
          />
        </div>
        
        {/* Hero Content */}
        <div className="container mx-auto px-6 py-8 relative z-10 -mt-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center space-y-8 max-w-5xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <Badge variant="outline" className="text-sm px-6 py-3 rounded-full border-black/20 bg-gray-50">
                🤖 The Future is AI - Are You Ready?
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-6xl md:text-7xl font-bold text-black leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
              >
                Forget Old Tools,
              </motion.span>
              <motion.span 
                className="block mt-4 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              >
                Educate Yourself on AI
              </motion.span>
            </motion.h1>
            
            <motion.p 
              className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.8 }}
            >
              Stop wasting time with outdated methods. Master Cursor, GPT, Claude, and the latest AI tools 
              through hands-on courses that actually teach you to build the future. 🚀
            </motion.p>

            <motion.div 
              className="flex justify-center pt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              <Button size="lg" className="text-lg px-10 py-6 bg-black text-white hover:bg-gray-800 rounded-full" onClick={() => navigate('/signup')}>
                Educate Yourself Now 🔥
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl font-bold text-black">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-8 max-w-4xl mx-auto"
          >
            <h2 className="text-5xl font-bold text-black">
              Still Using Old Tools? 🤔
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8 pt-12">
              <Card className="p-8 border-0 bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="p-0 pb-6">
                  <div className="text-4xl mb-4">😴</div>
                  <CardTitle className="text-2xl text-black">Stuck in the Past</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-gray-600">Using outdated software while AI does the same work in seconds</p>
                </CardContent>
              </Card>

              <Card className="p-8 border-0 bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="p-0 pb-6">
                  <div className="text-4xl mb-4">⏰</div>
                  <CardTitle className="text-2xl text-black">Wasting Time</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-gray-600">Spending hours on tasks that AI can complete in minutes</p>
                </CardContent>
              </Card>

              <Card className="p-8 border-0 bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="p-0 pb-6">
                  <div className="text-4xl mb-4">📉</div>
                  <CardTitle className="text-2xl text-black">Getting Left Behind</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <p className="text-gray-600">Watching others build incredible things while you're stuck with old methods</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center space-y-8 max-w-4xl mx-auto"
          >
            <h2 className="text-5xl font-bold text-black">
              Ditch the Old, Master the New 🔥
            </h2>
            <p className="text-xl text-gray-600">
              Step-by-step courses that teach you the AI tools actually worth knowing
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 pt-16">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-8 h-full border-0 bg-gray-50 rounded-3xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                    <CardHeader className="p-0 pb-6">
                      <div className="text-4xl mb-4">{feature.icon}</div>
                      <CardTitle className="text-xl text-black">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-black">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-8 max-w-3xl mx-auto"
          >
            <h2 className="text-5xl font-bold text-white">
              Ready to Upgrade Your Brain? 🧠
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands who've ditched old tools and embraced the AI revolution 🚀
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
              <Button size="lg" variant="secondary" className="text-lg px-10 py-6 bg-white text-black hover:bg-gray-100 rounded-full" onClick={() => navigate('/signup')}>
                Start Your AI Education 🎓
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
              <div className="flex items-center text-gray-300">
                <Star className="h-5 w-5 fill-current mr-2" />
                <span>🔥 Loved by 1000+ learners</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-16">
        <div className="container mx-auto px-6 text-center text-gray-600">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <span className="text-lg font-semibold text-black">opsa</span>
          </div>
          <p>&copy; 2024 opsa. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;