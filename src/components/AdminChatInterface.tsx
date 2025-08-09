import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle,
  Send,
  Clock,
  CheckCheck,
  User,
  Crown,
  Menu,
  X,
  Reply,
  CornerDownLeft
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

interface Conversation {
  mentee_id: string;
  mentee_name: string;
  mentee_email: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: Message[];
}

interface AdminChatInterfaceProps {
  className?: string;
}

export const AdminChatInterface: React.FC<AdminChatInterfaceProps> = ({ className = "" }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // Load all conversations (mentees with messages)
  const loadConversations = async () => {
    if (!user) {
      console.log('No user found, skipping conversation load');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading conversations for admin user:', user.id);
      
      // Get all messages where current user (Miguel) is either sender or receiver
      // Use a more explicit query structure
      let { data: allMessages, error } = await supabase
        .from('mentorship_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      // Also try an alternative query as backup
      if (!allMessages || allMessages.length === 0) {
        console.log('Primary query returned no results, trying alternative query...');
        const { data: alternativeMessages, error: altError } = await supabase
          .from('mentorship_messages')
          .select('*')
          .order('created_at', { ascending: true });
        
        console.log('Alternative query (all messages):', alternativeMessages);
        console.log('Filtering for user ID:', user.id);
        
        // Filter manually
        const filteredMessages = (alternativeMessages || []).filter(msg => 
          msg.sender_id === user.id || msg.receiver_id === user.id
        );
        
        console.log('Manually filtered messages:', filteredMessages);
        
        if (filteredMessages.length > 0) {
          allMessages = filteredMessages;
        }
      }

      console.log('Raw messages from database:', allMessages);
      console.log('Query error:', error);

      if (error) {
        console.error('Error loading conversations:', error);
        toast({
          title: "Error loading conversations",
          description: "Please try refreshing the page.",
          variant: "destructive",
        });
        return;
      }

      // Group messages by mentee
      const menteeIds = new Set<string>();
      (allMessages || []).forEach((msg) => {
        // If Miguel is sender, the other person is receiver; if Miguel is receiver, the other person is sender
        const menteeId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        menteeIds.add(menteeId);
      });

      console.log('Unique mentee IDs found:', Array.from(menteeIds));

      // Get mentee profiles
      const menteeProfiles = await Promise.all(
        Array.from(menteeIds).map(async (menteeId) => {
          console.log('Fetching profile for mentee ID:', menteeId);
          const { data: profile, error: profileError } = await db.getUserProfile(menteeId);
          console.log('Profile result:', { profile, profileError });
          return profile;
        })
      );

      console.log('Mentee profiles:', menteeProfiles);

      // Build conversations with message data
      const validProfiles = menteeProfiles.filter(profile => profile);
      console.log('Valid profiles after filtering:', validProfiles);
      
      const conversationsData: Conversation[] = validProfiles
        .map((profile) => {
          const menteeMessages = (allMessages || []).filter(
            (msg) => msg.sender_id === profile.id || msg.receiver_id === profile.id
          );

          const lastMessage = menteeMessages[menteeMessages.length - 1];
          
          // Count unread messages (messages sent by mentee that Miguel hasn't read)
          const unreadCount = menteeMessages.filter(
            (msg) => msg.sender_id === profile.id && msg.receiver_id === user.id && !msg.read_at
          ).length;

          const conversation = {
            mentee_id: profile.id,
            mentee_name: profile.first_name || profile.email?.split('@')[0] || 'User',
            mentee_email: profile.email || '',
            last_message: lastMessage?.message_text || 'No messages yet',
            last_message_time: lastMessage?.created_at || '',
            unread_count: unreadCount,
            messages: menteeMessages
          };

          console.log('Built conversation for:', profile.email, conversation);
          return conversation;
        })
        .sort((a, b) => {
          // Sort by last message time, most recent first
          if (!a.last_message_time) return 1;
          if (!b.last_message_time) return -1;
          return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
        });

      console.log('Final conversations data:', conversationsData);
      setConversations(conversationsData);
      
      // Auto-select first conversation if none selected
      if (!selectedMenteeId && conversationsData.length > 0) {
        setSelectedMenteeId(conversationsData[0].mentee_id);
      }

    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load conversations on mount
  useEffect(() => {
    console.log('AdminChatInterface mounted with user:', user?.email, user?.id);
    loadConversations();
  }, [user]);

  // Setup real-time subscription for all messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('admin_messages')
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
            const newMessage = payload.new as Message;
            
            // If this message involves the current admin user, update conversations optimally
            if (newMessage.sender_id === user.id || newMessage.receiver_id === user.id) {
              // Update conversations without full reload
              setConversations(prevConversations => {
                const updatedConversations = prevConversations.map(conv => {
                  const isThisConversation = conv.mentee_id === newMessage.sender_id || conv.mentee_id === newMessage.receiver_id;
                  
                  if (isThisConversation) {
                    return {
                      ...conv,
                      messages: [...conv.messages, newMessage],
                      last_message: newMessage.message_text,
                      last_message_time: newMessage.created_at,
                      unread_count: newMessage.sender_id !== user.id ? conv.unread_count + 1 : conv.unread_count
                    };
                  }
                  return conv;
                });
                
                // Sort by last message time
                return updatedConversations.sort((a, b) => 
                  new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
                );
              });
              
              // Always scroll to bottom for new messages
              setTimeout(() => scrollToBottom(true), 100);
            }
          } else if (payload.eventType === 'UPDATE') {
            // Handle read receipt updates
            const updatedMessage = payload.new as Message;
            
            setConversations(prevConversations => 
              prevConversations.map(conv => ({
                ...conv,
                messages: conv.messages.map(msg => 
                  msg.id === updatedMessage.id ? updatedMessage : msg
                )
              }))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Mark conversation as read
  const markConversationAsRead = async (menteeId: string) => {
    if (!user) return;

    try {
      // Get unread messages from this mentee
      const unreadMessages = conversations
        .find(c => c.mentee_id === menteeId)
        ?.messages.filter(msg => msg.sender_id === menteeId && !msg.read_at) || [];

      // Mark each unread message as read
      for (const message of unreadMessages) {
        await db.markMessageAsRead(message.id);
      }

      // Update local state
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.mentee_id === menteeId 
            ? {
                ...conv,
                unread_count: 0,
                messages: conv.messages.map(msg => 
                  msg.sender_id === menteeId && !msg.read_at 
                    ? { ...msg, read_at: new Date().toISOString() }
                    : msg
                )
              }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Send message to selected mentee
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedMenteeId || !user || sending) return;

    try {
      setSending(true);
      
      const { error } = await db.sendMessage({
        sender_id: user.id,
        receiver_id: selectedMenteeId,
        message_text: newMessage.trim(),
        reply_to_id: replyingTo?.id || null
      });

      if (error) {
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

  const selectedConversation = conversations.find(c => c.mentee_id === selectedMenteeId);

  if (loading) {
    return (
      <Card className={`border-0 bg-white rounded-2xl shadow-lg h-[600px] ${className}`}>
        <CardContent className="p-8 flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border border-gray-200/50 bg-white rounded-3xl shadow-xl h-[600px] ${className} backdrop-blur-sm`}>
      <div className="flex h-full overflow-hidden rounded-3xl">
        {/* Sidebar - Mentee List */}
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200/50 bg-gray-50/30`}>
          <div className="p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Messages</h3>
                <p className="text-xs text-gray-500 mt-1">Active conversations</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden hover:bg-gray-100 rounded-full p-2"
              >
                <X className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100%-80px)]">
            <div className="p-4">
              {conversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No conversations yet</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <motion.div
                    key={conversation.mentee_id}
                    onClick={() => {
                      setSelectedMenteeId(conversation.mentee_id);
                      setSidebarOpen(false); // Close sidebar on mobile after selection
                      markConversationAsRead(conversation.mentee_id); // Mark as read when selected
                    }}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 mb-3 border ${
                      selectedMenteeId === conversation.mentee_id
                        ? 'bg-gray-900 text-white border-gray-800 shadow-lg'
                        : 'bg-white border-gray-200/60 hover:border-gray-300 hover:shadow-sm'
                    }`}
                    whileHover={{ scale: selectedMenteeId === conversation.mentee_id ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="w-12 h-12 flex-shrink-0">
                          <AvatarFallback className={`font-medium ${
                            selectedMenteeId === conversation.mentee_id
                              ? 'bg-gray-700 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {conversation.mentee_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1">
        <Badge className="bg-black text-white text-xs rounded-full min-w-[22px] h-6 flex items-center justify-center p-0 border-2 border-white font-medium">
                              {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`font-semibold text-sm truncate ${
                            selectedMenteeId === conversation.mentee_id ? 'text-white' : 'text-gray-900'
                          }`}>
                            {conversation.mentee_name}
                          </p>
                          {conversation.last_message_time && (
                            <p className={`text-xs font-medium ${
                              selectedMenteeId === conversation.mentee_id ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              {formatDistanceToNow(new Date(conversation.last_message_time), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        
                        <p className={`text-sm truncate leading-relaxed ${
                          selectedMenteeId === conversation.mentee_id ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {conversation.last_message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-6 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {!sidebarOpen && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="hover:bg-gray-100 rounded-full p-2"
                >
                  <Menu className="h-4 w-4 text-gray-600" />
                </Button>
              )}
              
              {selectedConversation ? (
                <>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gray-100 text-gray-700 font-medium">
                      {selectedConversation.mentee_name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">{selectedConversation.mentee_name}</h4>
                    <p className="text-xs text-gray-500">{selectedConversation.mentee_email}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-lg">Select a conversation</h4>
                    <p className="text-xs text-gray-500">Choose a mentee to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          {selectedConversation ? (
            <>
              <ScrollArea 
                className="flex-1 p-4"
                onFocus={() => {
                  // Mark messages as read when viewing conversation
                  if (selectedConversation) {
                    markConversationAsRead(selectedConversation.mentee_id);
                  }
                }}
              >
                <div className="space-y-4">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No messages yet</p>
                      <p className="text-gray-400 text-sm">Start the conversation with {selectedConversation.mentee_name}</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {selectedConversation.messages.map((message, index) => {
                        const isFromMentor = message.sender_id === user?.id;
                        const nextMessage = selectedConversation.messages[index + 1];
                        const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
                        const prevMessage = selectedConversation.messages[index - 1];
                        const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
                        
                        return (
                          <motion.div
                            key={message.id}
                            id={`message-${message.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex items-end gap-2 mb-1 ${isFromMentor ? 'flex-row-reverse' : 'flex-row'} transition-colors duration-300`}
                          >
                            {/* Avatar - only show on last message in group */}
                            {isLastInGroup && (
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarFallback className={`text-xs ${
                                  isFromMentor 
                                    ? 'bg-black text-white' 
                                    : 'bg-gray-300 text-gray-700'
                                }`}>
                                  {isFromMentor ? 'M' : selectedConversation.mentee_name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            
                            {/* Spacer for grouped messages */}
                            {!isLastInGroup && <div className="w-8 h-8 flex-shrink-0" />}
                            
                            {/* Message bubble with reply functionality */}
                            <div className={`flex items-end gap-2 max-w-[70%] ${isFromMentor ? 'flex-row-reverse' : 'flex-row'} group relative`}>
                              {/* Reply button - appears on hover/always visible on mobile */}
                              <motion.button
                                onClick={() => setReplyingTo(message)}
                                className={`opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-gray-100 flex-shrink-0 ${
                                  isFromMentor ? 'order-first' : 'order-last'
                                }`}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Reply className="h-4 w-4 text-gray-500" />
                              </motion.button>
                              
                              {/* Message content */}
                              <div className={`flex flex-col ${isFromMentor ? 'items-end' : 'items-start'}`}>
                                <div className={`relative px-4 py-2 break-words ${
                                isFromMentor 
                                  ? 'bg-black text-white rounded-3xl rounded-br-lg' 
                                  : 'bg-gray-100 text-gray-900 rounded-3xl rounded-bl-lg'
                              } ${!isFirstInGroup ? 'mt-1' : 'mt-2'}`}>
                                
                                {/* Reply context if this is a reply */}
                                {message.reply_to_id && (
                                  <div className={`mb-2 p-2 rounded border-l-4 ${
                                    isFromMentor 
                                      ? 'bg-white border-gray-400' 
                                      : 'bg-white border-black'
                                  }`}>
                                    <p className={`text-xs opacity-70 ${
                                      isFromMentor ? 'text-gray-600' : 'text-gray-600'
                                    }`}>
                                      {/* Find and display the original message */}
                                      {selectedConversation.messages.find(m => m.id === message.reply_to_id)?.message_text || 'Original message'}
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
                                    isFromMentor ? 'text-gray-300' : 'text-gray-500'
                                  }`}>
                                    <span>
                                      {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    
                                    {/* Read receipts for mentor messages */}
                                    {isFromMentor && (
                                      <div className="flex items-center">
                                        {message.read_at ? (
                                          <CheckCheck className="h-3 w-3 text-blue-400" />
                                        ) : (
                                          <CheckCheck className="h-3 w-3 text-gray-400" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                </div>
                                
                                {/* Show sender name for first message in group (mentee only) */}
                                {!isFromMentor && isFirstInGroup && (
                                  <span className="text-xs text-gray-500 mt-1 ml-3">
                                    {selectedConversation.mentee_name}
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
              <div className="border-t border-gray-200/50 bg-white/50 backdrop-blur-sm p-6">
                {/* Reply Preview with Jump-to-Message */}
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="mb-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-200/50 shadow-sm backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CornerDownLeft className="h-4 w-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-700">
                          Replying to {replyingTo.sender_id === user?.id ? 'yourself' : selectedConversation.mentee_name}
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
                
                <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                      replyingTo 
                        ? `Reply to ${selectedConversation.mentee_name}...`
                        : `Message ${selectedConversation.mentee_name}...`
                    }
                    className="flex-1 rounded-2xl border-gray-200/50 bg-gray-50/50 focus:border-gray-300 focus:ring-2 focus:ring-gray-200/50 py-3 px-4 backdrop-blur-sm"
                    disabled={sending}
                  />
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="bg-gray-900 text-white hover:bg-gray-800 rounded-2xl px-6 py-3 font-medium transition-all duration-200 shadow-sm"
                    disabled={!newMessage.trim() || sending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-black mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a mentee from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};