import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle,
  Send,
  Clock,
  CheckCheck,
  User,
  Crown,
  Reply,
  CornerDownLeft,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db, supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  message_type: string;
  created_at: string;
  read_at: string | null;
  reply_to_id: string | null;
}

interface MentorshipChatProps {
  className?: string;
}

export const MentorshipChat: React.FC<MentorshipChatProps> = ({ className = "" }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = (force = false) => {
    if (force) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    
    // Auto-scroll only if user is near bottom or it's their own message
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Load admin user ID and user profile
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;

      try {
        // Get admin user ID (Miguel)
        const { adminId } = await db.getAdminUserId();
        setAdminUserId(adminId);

        // Get user profile
        const { data: profile } = await db.getUserProfile(user.id);
        setUserProfile(profile);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [user]);

  // Load chat messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!user || !adminUserId) return;

      try {
        setLoading(true);
        console.log('Loading messages between:', user.id, 'and', adminUserId);
        const { data: messagesData, error } = await db.getChatMessages(user.id, adminUserId);
        
        console.log('Messages response:', { messagesData, error });
        
        if (error) {
          console.error('Error loading messages:', error);
          toast({
            title: "Error loading messages",
            description: "Please try refreshing the page.",
            variant: "destructive",
          });
          return;
        }

        console.log('Setting messages:', messagesData);
        setMessages(messagesData || []);
        
        // Scroll to bottom after loading messages
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [user, adminUserId, toast]);

  // Setup real-time subscription
  useEffect(() => {
    if (!user || !adminUserId) {
      console.log('Skipping real-time setup - missing user or adminUserId:', { user: !!user, adminUserId });
      return;
    }

    console.log('Setting up real-time subscription for user:', user.id, 'and admin:', adminUserId);
    
    const channel = supabase
      .channel('mentorship_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mentorship_messages'
        },
        (payload) => {
          console.log('Real-time message update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Add new message to state
            const newMessage = payload.new as Message;
            console.log('Adding new message to state:', newMessage);
            setMessages(prevMessages => [...prevMessages, newMessage]);
            setTimeout(scrollToBottom, 100);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing message (e.g., read status)
            const updatedMessage = payload.new as Message;
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
        }
      )
      .subscribe();

    console.log('Real-time channel subscribed');

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, adminUserId]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !adminUserId || !user || sending) return;

    try {
      setSending(true);
      
      console.log('Sending message:', {
        sender_id: user.id,
        receiver_id: adminUserId,
        message_text: newMessage.trim()
      });
      
      const { data, error } = await db.sendMessage({
        sender_id: user.id,
        receiver_id: adminUserId,
        message_text: newMessage.trim(),
        reply_to_id: replyingTo?.id || null
      });

      console.log('Send message response:', { data, error });

      if (error) {
        console.error('Send message error:', error);
        toast({
          title: "Failed to send message",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setNewMessage("");
      setReplyingTo(null); // Clear reply state
      scrollToBottom(true); // Force scroll to bottom for sent messages
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  // Determine if current user is mentor (Miguel)
  const isMentor = user?.email === 'miguelfortesmartins4@gmail.com';
  const mentorName = "Miguel";
  const menteeName = userProfile?.first_name || user?.email?.split('@')[0] || 'You';

  if (loading) {
    return (
      <Card className={`border-0 bg-white rounded-2xl shadow-lg ${className}`}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 bg-white rounded-2xl shadow-lg ${className}`}>
      <CardHeader className="pb-4 border-b border-gray-100">
        <CardTitle className="flex items-center justify-between text-black text-xl">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6" />
            <span>Mentorship Chat</span>
          </div>
          <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Live
          </Badge>
        </CardTitle>
        <p className="text-gray-600 text-sm">
          {isMentor 
            ? `Chat with ${menteeName}` 
            : `Direct line to ${mentorName} - get instant help and guidance`
          }
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Messages Area */}
        <ScrollArea className="h-96 p-6" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No messages yet</p>
                <p className="text-gray-400 text-sm">
                  {isMentor 
                    ? "Send a message to start the conversation"
                    : "Start by sending Miguel a message - he's here to help!"
                  }
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((message, index) => {
                        const isFromCurrentUser = message.sender_id === user?.id;
                        const isFromMentor = message.sender_id === adminUserId;
                        const nextMessage = messages[index + 1];
                        const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
                        const prevMessage = messages[index - 1];
                        const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
                        
                        return (
                          <motion.div
                            key={message.id}
                            id={`message-${message.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex items-end gap-2 mb-1 ${isFromCurrentUser ? 'flex-row-reverse' : 'flex-row'} transition-colors duration-300`}
                          >
                            {/* Avatar - only show on last message in group */}
                            {isLastInGroup && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarFallback className={`text-xs ${
                                  isFromMentor 
                                    ? 'bg-black text-white' 
                                    : isFromCurrentUser
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-300 text-gray-700'
                                }`}>
                                  {isFromMentor ? <Crown className="h-4 w-4" /> : 
                                   isFromCurrentUser ? menteeName[0]?.toUpperCase() : 'U'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            {/* Spacer for grouped messages */}
                            {!isLastInGroup && <div className="w-8 h-8 flex-shrink-0" />}
                            
                            {/* Message bubble with reply functionality */}
                            <div className={`flex items-end gap-2 max-w-[70%] ${isFromCurrentUser ? 'flex-row-reverse' : 'flex-row'} group relative`}>
                              {/* Reply button - appears on hover for mentor messages */}
                              {isFromMentor && (
                                <motion.button
                                  onClick={() => setReplyingTo(message)}
                                  className={`opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-100 flex-shrink-0 order-last`}
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <Reply className="h-4 w-4 text-gray-500" />
                                </motion.button>
                              )}
                              
                              {/* Message content */}
                              <div className={`flex flex-col ${isFromCurrentUser ? 'items-end' : 'items-start'}`}>
                              <div className={`relative px-4 py-2 break-words ${
                                isFromCurrentUser 
                                  ? 'bg-blue-500 text-white rounded-3xl rounded-br-lg' 
                                  : isFromMentor
                                    ? 'bg-gray-900 text-white rounded-3xl rounded-bl-lg'
                                    : 'bg-gray-100 text-gray-900 rounded-3xl rounded-bl-lg'
                              } ${!isFirstInGroup ? 'mt-1' : 'mt-2'}`}>
                                
                                {/* Reply context if this is a reply */}
                                {message.reply_to_id && (
                                  <div className={`mb-2 p-2 rounded border-l-4 ${
                                    isFromCurrentUser 
                                      ? 'bg-blue-600 border-blue-200' 
                                      : isFromMentor
                                        ? 'bg-gray-800 border-gray-400'
                                        : 'bg-white border-blue-500'
                                  }`}>
                                    <p className={`text-xs opacity-70 ${
                                      isFromCurrentUser ? 'text-blue-100' : 
                                      isFromMentor ? 'text-gray-300' : 'text-gray-600'
                                    }`}>
                                      {/* Find and display the original message */}
                                      {messages.find(m => m.id === message.reply_to_id)?.message_text || 'Original message'}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Message text with inline timestamp */}
                                <div className="flex items-end gap-2 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {message.message_text}
                                    </p>
                                  </div>
                                  
                                  {/* Inline timestamp and status */}
                                  <div className={`flex items-center gap-1 text-xs flex-shrink-0 ${
                                    isFromCurrentUser 
                                      ? 'text-blue-100' 
                                      : isFromMentor 
                                        ? 'text-gray-300'
                                        : 'text-gray-500'
                                  }`}>
                                    <span>
                                      {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    
                                    {/* Read receipts for user messages */}
                                    {isFromCurrentUser && (
                                      <div className="flex items-center">
                                        {message.read_at ? (
                                          <CheckCheck className="h-3 w-3 text-blue-200" />
                                        ) : (
                                          <CheckCheck className="h-3 w-3 text-blue-300" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Show sender name for first message in group (mentor only) */}
                              {isFromMentor && isFirstInGroup && (
                                <span className="text-xs text-gray-500 mt-1 ml-3 flex items-center gap-1">
                                  <Crown className="h-3 w-3" />
                                  {mentorName}
                                </span>
                              )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t border-gray-100 p-6">
          {/* Reply Preview with Jump-to-Message */}
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CornerDownLeft className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">
                    Replying to {replyingTo.sender_id === user?.id ? 'yourself' : 'Miguel'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(null)}
                  className="h-6 w-6 p-0 hover:bg-gray-200 rounded-full"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <motion.button
                onClick={() => {
                  // Jump to original message
                  const messageElement = document.getElementById(`message-${replyingTo.id}`);
                  if (messageElement) {
                    messageElement.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'center' 
                    });
                    // Add highlight effect
                    messageElement.style.backgroundColor = '#fef3c7';
                    setTimeout(() => {
                      messageElement.style.backgroundColor = '';
                    }, 1000);
                  }
                }}
                className="w-full text-left mt-2 p-2 rounded hover:bg-gray-100 transition-colors duration-150"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <p className="text-sm text-gray-600 truncate">
                  {replyingTo.message_text}
                </p>
              </motion.button>
            </motion.div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                replyingTo 
                  ? "Reply to Miguel..."
                  : (isMentor ? "Type a message to your mentee..." : "Ask Miguel anything...")
              }
              className="flex-1 rounded-full border-gray-200 focus:border-black focus:ring-1 focus:ring-black"
              disabled={sending}
            />
            <Button 
              type="submit" 
              size="sm" 
              className="bg-black text-white hover:bg-gray-800 rounded-full px-6"
              disabled={!newMessage.trim() || sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {isMentor 
              ? "Provide guidance and support to help your mentee succeed"
              : "Miguel typically responds within a few hours during business days"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};