import { supabase } from './supabase';

export type ChatMessage = {
  id: string;
  projectId: string;
  sender: "client" | "designer" | "system";
  text: string;
  ts: number;
  attachments?: {
    type: "image" | "file";
    url: string;
    name: string;
    size?: number;
    thumbnailUrl?: string;
  }[];
  meetingInfo?: {
    id: string;
    date: string;
    time: string;
    duration: number;
    link: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    participants?: string[];
  };
  source?: string;
  relatedId?: string;
  isWelcome?: boolean; // Flag for auto-generated welcome message
};

export type Meeting = {
  id: string;
  projectId: string;
  date: string;
  time: string;
  duration: number;
  link: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  participants?: string[];
  title?: string;
  description?: string;
};

// Supabase-backed storage
class Storage {
  // Simple in-memory cache to reduce repeated queries
  private messageCache: Map<string, { data: ChatMessage[], timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds cache
  
  // Message methods
  async getMessages(projectId: string): Promise<ChatMessage[]> {
    // Check cache first
    const cached = this.messageCache.get(projectId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    
    try {
      const { data, error } = await supabase
        .from('project_chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      // Map Supabase format to ChatMessage format
      const messages = (data || []).map(msg => {
        // Parse attachments - handle both string and object
        let attachments = undefined;
        if (msg.attachments) {
          try {
            attachments = typeof msg.attachments === 'string' 
              ? JSON.parse(msg.attachments) 
              : msg.attachments;
          } catch (e) {
            console.error('Error parsing attachments:', e, msg.attachments);
          }
        }

        // Parse meeting info - handle both string and object
        let meetingInfo = undefined;
        if (msg.meeting_info) {
          try {
            meetingInfo = typeof msg.meeting_info === 'string'
              ? JSON.parse(msg.meeting_info)
              : msg.meeting_info;
          } catch (e) {
            console.error('Error parsing meeting_info:', e, msg.meeting_info);
          }
        }

        return {
          id: msg.id,
          projectId: msg.project_id,
          sender: msg.sender_type as "client" | "designer" | "system",
          text: msg.message,
          ts: new Date(msg.created_at).getTime(),
          source: msg.source,
          relatedId: msg.related_id,
          attachments,
          meetingInfo,
        };
      });

      // Add welcome message at the beginning if no messages exist
      if (messages.length === 0) {
        messages.unshift({
          id: `welcome_${projectId}`,
          projectId,
          sender: 'system',
          text: `Hi! 👋 Welcome to your project chat. Feel free to share your requirements, upload files, or ask any questions about your project.`,
          ts: Date.now(),
          isWelcome: true,
        });
      }

      // Cache the result
      this.messageCache.set(projectId, { data: messages, timestamp: Date.now() });
      
      return messages;
    } catch (err) {
      console.error('Error in getMessages:', err);
      // Return welcome message on error
      return [{
        id: `welcome_${projectId}`,
        projectId,
        sender: 'system',
        text: `Hi! 👋 Welcome to your project chat. Feel free to share your requirements, upload files, or ask any questions about your project.`,
        ts: Date.now(),
        isWelcome: true,
      }];
    }
  }

  async saveMessage(message: ChatMessage): Promise<void> {
    // Don't save welcome messages to database
    if (message.isWelcome) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Determine sender_type and sender_id
      let senderType = message.sender;
      let senderId = user?.id || null;
      
      // If it's a system message (like meeting scheduled), no sender_id
      if (message.sender === 'system') {
        senderId = null;
      }

      const insertData: any = {
        project_id: message.projectId,
        sender_type: senderType,
        sender_id: senderId,
        message: message.text,
        source: message.source || 'chat',
        related_id: message.relatedId || null,
        attachments: message.attachments ? JSON.stringify(message.attachments) : null,
        meeting_info: message.meetingInfo ? JSON.stringify(message.meetingInfo) : null,
      };

      const { data, error } = await supabase
        .from('project_chat_messages')
        .insert([insertData])
        .select();

      if (error) {
        console.error('Supabase error saving message:', error);
        throw error;
      }

      // Invalidate cache for this project
      this.messageCache.delete(message.projectId);

      // If message has meeting info, save to localStorage for now
      if (message.meetingInfo) {
        const meetings = await this.getMeetings(message.projectId);
        meetings.push(message.meetingInfo);
        localStorage.setItem(`meetings:${message.projectId}`, JSON.stringify(meetings));
      }
    } catch (err) {
      console.error('Error in saveMessage:', err);
      throw err;
    }
  }



  async updateMessage(projectId: string, messageId: string, updates: Partial<ChatMessage>): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.text) updateData.message = updates.text;
      if (updates.source) updateData.source = updates.source;
      if (updates.relatedId) updateData.related_id = updates.relatedId;
      if (updates.attachments) updateData.attachments = JSON.stringify(updates.attachments);
      if (updates.meetingInfo) updateData.meeting_info = JSON.stringify(updates.meetingInfo);

      const { error } = await supabase
        .from('project_chat_messages')
        .update(updateData)
        .eq('id', messageId)
        .eq('project_id', projectId);

      if (error) {
        console.error('Error updating message:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error in updateMessage:', err);
      throw err;
    }
  }


  // Meeting methods
  async createMeeting(meeting: Meeting): Promise<Meeting> {
    try {
      // Store meeting info in localStorage for now (can be moved to separate table)
      const meetings = await this.getMeetings(meeting.projectId);
      meetings.push(meeting);
      localStorage.setItem(`meetings:${meeting.projectId}`, JSON.stringify(meetings));
      return meeting;
    } catch (err) {
      console.error('Error in createMeeting:', err);
      throw err;
    }
  }

  async getMeetings(projectId: string): Promise<Meeting[]> {
    try {
      const stored = localStorage.getItem(`meetings:${projectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error in getMeetings:', err);
      return [];
    }
  }

  async updateMeeting(projectId: string, meetingId: string, updates: Partial<Meeting>): Promise<Meeting | null> {
    try {
      const meetings = await this.getMeetings(projectId);
      const index = meetings.findIndex(m => m.id === meetingId);
      if (index !== -1) {
        meetings[index] = { ...meetings[index], ...updates };
        localStorage.setItem(`meetings:${projectId}`, JSON.stringify(meetings));
        return meetings[index];
      }
      return null;
    } catch (err) {
      console.error('Error in updateMeeting:', err);
      return null;
    }
  }

  async deleteMeeting(projectId: string, meetingId: string): Promise<boolean> {
    try {
      const meetings = await this.getMeetings(projectId);
      const index = meetings.findIndex(m => m.id === meetingId);
      if (index !== -1) {
        meetings.splice(index, 1);
        localStorage.setItem(`meetings:${projectId}`, JSON.stringify(meetings));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error in deleteMeeting:', err);
      return false;
    }
  }
}

export const storage = new Storage();