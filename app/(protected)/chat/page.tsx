"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjects } from "@/lib/contexts/projectsContext";
import { Button, Input } from "@/components/UI";
import { Paperclip, CalendarDays, Image, Send, X } from 'lucide-react';
import { storage, type ChatMessage } from "@/lib/storage";
import { uploadFiles, UploadError, type UploadedFile } from "@/lib/uploadAdapter";
import CenterModal from "@/components/CenterModal";
import { supabase } from "@/lib/supabase";

type ChatMsg = {
  id: string;
  projectId: string;
  sender: "designer" | "agent";
  text: string;
  ts: number;
  attachments?: {
    type: "image" | "file";
    url: string;
    name: string;
    size?: number;
  }[];
  meetingInfo?: {
    date: string;
    time: string;
    duration: number;
    link: string;
  };
};

const AGENT_NAME = "Agent";

export default function chatPage() {
  const { projects } = useProjects();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  // Load messages
  const loadMessages = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      const msgs = await storage.getMessages(projectId);
      setMessages(msgs); // Welcome message is automatically added by storage.getMessages()
    } catch (err) {
      setError('Failed to load messages');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const [activeProjectId, setActiveProjectId] = useState("");
  
  // Set initial project when projects load
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);
  const thread = useMemo(
    () => messages.filter((m) => m.projectId === activeProjectId).sort((a,b)=>a.ts-b.ts),
    [messages, activeProjectId]
  );

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeProjectId) {
      loadMessages(activeProjectId);
    }
  }, [activeProjectId, loadMessages]);

  // Listen for new chat messages via realtime
  useEffect(() => {
    if (!activeProjectId) return;

    const channel = supabase
      .channel(`chat_${activeProjectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_chat_messages',
          filter: `project_id=eq.${activeProjectId}`
        },
        async (payload) => {
          console.log('New chat message received:', payload);
          // Reload all messages to include the new one
          await loadMessages(activeProjectId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeProjectId, loadMessages]);

  // Messages are now handled by the storage service

  async function sendMessage(text: string, attachments?: UploadedFile[], meetingInfo?: ChatMessage['meetingInfo']) {
    try {
      // Map UploadedFile to ChatMessage attachment format
      const mappedAttachments = attachments?.map(att => ({
        type: att.type,
        url: att.url,
        name: att.name,
        size: att.size,
        thumbnailUrl: att.thumbnailUrl
      }));

      const msg: ChatMessage = {
        id: `m_${Date.now()}`,
        projectId: activeProjectId,
        sender: "client",
        text: text.trim(),
        ts: Date.now(),
        ...(mappedAttachments && { attachments: mappedAttachments }),
        ...(meetingInfo && { meetingInfo }),
      };

      console.log('Sending message with attachments:', msg);

      await storage.saveMessage(msg);
      setMessages(prev => [...prev, msg]);
      setDraft("");
    } catch (err) {
      setError('Failed to send message');
      console.error(err);
    }
  }

  async function handleUpload(files: FileList, type: 'image' | 'file') {
    try {
      setIsLoading(true);
      const uploaded = await uploadFiles(
        Array.from(files).map(file => ({
          file,
          type,
          projectId: activeProjectId
        }))
      );
      // Send attachments without the "Shared X files/images" text
      await sendMessage(
        "",
        uploaded
      );
    } catch (err) {
      if (err instanceof UploadError) {
        setError(err.message);
      } else {
        setError('Failed to upload files');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function scheduleMeeting() {
    if (!meetingDate || !meetingTime) {
      setError('Please select both date and time');
      return;
    }

    try {
      setIsLoading(true);

      const meetingInfo = {
        id: `meeting_${Date.now()}`,
        projectId: activeProjectId,
        date: meetingDate,
        time: meetingTime,
        duration: 30,
        link: '#',
        status: 'scheduled' as const
      };

      await sendMessage(
        "",
        undefined,
        meetingInfo
      );

      setMeetingDate("");
      setMeetingTime("");
      setScheduleMeetingOpen(false);
      setError(null);
    } catch (err) {
      setError('Failed to schedule meeting');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Projects list */}
        <aside className="rounded-2xl border border-zinc-200 bg-[#f2f0ed] p-3">
          <h2 className="text-sm font-semibold text-[#2e2e2e] mb-2">Projects</h2>
          <div className="space-y-1">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p>No projects yet.</p>
                <p className="mt-2">Create a project from the dashboard to start chatting with your team!</p>
              </div>
            ) : (
              projects.map((p) => {
                const active = p.id === activeProjectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => setActiveProjectId(p.id)}
                    className={`w-full text-left px-3 py-2 rounded-2xl text-sm ${
                      active
                        ? "bg-[#d96857] text-white"
                        : "bg-white text-[#2e2e2e] border border-zinc-200 hover:bg-white/70"
                    }`}
                  >
                    {p.name}
                    <div className="text-xs opacity-80">{p.scope}</div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat thread */}
        <section className="md:col-span-2 rounded-2xl border border-zinc-200 overflow-hidden">
          {!activeProjectId || projects.length === 0 ? (
            <div className="flex items-center justify-center h-[70vh] text-gray-500">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No Project Selected</div>
                <p className="text-sm">Create a project from the dashboard to start chatting with your team.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-zinc-200 bg-white">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1.5 rounded-full bg-[#d96857]" />
                  <div>
                    <div className="text-sm font-semibold text-[#2e2e2e]">
                      {projects.find((p) => p.id === activeProjectId)?.name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      Team Chat - Design Collaboration
                    </div>
                  </div>
                </div>
              </div>

          <div className="h-[60vh] overflow-y-auto bg-gradient-to-b from-[#f9f9f8] to-white p-4 rounded-2xl border border-zinc-100">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
                <span>{error}</span>
                <button
                  className="p-1 hover:bg-red-100 rounded-full"
                  onClick={() => setError(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {thread.map((m) => {
              const hasAttachments = m.attachments && m.attachments.length > 0;
              const hasMeeting = m.meetingInfo;
              const isClient = m.sender === "client";
              const useNeutral = isClient && (hasAttachments || hasMeeting);
              
              return (
                <div
                  key={m.id}
                  className={`mb-5 flex ${isClient ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[70%] space-y-2.5">
                    {/* Text Message */}
                    {!hasMeeting && m.text && m.text.trim() && (
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm ${
                          useNeutral
                            ? "bg-zinc-100 text-[#2e2e2e] border border-zinc-200"
                            : isClient
                            ? "bg-[#d96857] text-white"
                            : "bg-white text-[#2e2e2e] border border-zinc-200"
                        }`}
                      >
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
                      </div>
                    )}
                    
                    {/* Meeting Info */}
                    {hasMeeting && (
                      <div className="bg-white text-[#2e2e2e] rounded-2xl p-4 shadow-sm border border-zinc-200">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="p-2 rounded-lg bg-[#d96857]/10">
                            <CalendarDays className="w-4 h-4 text-[#d96857]" />
                          </div>
                          <span className="font-semibold text-sm">Meeting Scheduled</span>
                        </div>
                        <div className="text-sm space-y-2 pl-10">
                          <div className="flex items-start gap-3">
                            <span className="text-zinc-500 font-medium min-w-[50px]">Date:</span>
                            <span className="font-semibold text-[#2e2e2e]">{m.meetingInfo.date}</span>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="text-zinc-500 font-medium min-w-[50px]">Time:</span>
                            <span className="font-semibold text-[#2e2e2e]">{m.meetingInfo.time}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Attachments */}
                    {hasAttachments && (
                      <div className="space-y-2">
                        {m.attachments.map((att, idx) => (
                          <div 
                            key={idx} 
                            className="bg-white rounded-xl p-3 flex items-center gap-3 border border-zinc-200 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="p-2 rounded-lg bg-[#d96857]/10">
                              {att.type === 'image' ? (
                                <Image className="w-4 h-4 text-[#d96857]" />
                              ) : (
                                <Paperclip className="w-4 h-4 text-[#d96857]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[#2e2e2e] truncate">{att.name}</div>
                              {att.size && (
                                <div className="text-xs text-zinc-500 mt-0.5">
                                  {Math.round(att.size / 1024)}KB
                                </div>
                              )}
                            </div>
                            <a 
                              href={att.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
                            >
                              <svg className="w-4 h-4 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                              </svg>
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className={`text-[10px] text-zinc-400 ${isClient ? 'text-right' : 'text-left'} px-1`}>
                      {new Date(m.ts).toLocaleString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-zinc-200 bg-white">
            {/* Quick Actions */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-100">
              <button
                className="flex items-center gap-1.5 text-xs bg-white hover:bg-[#d96857]/5 text-[#d96857] px-3 py-1.5 rounded-full font-medium transition-all border border-[#d96857] disabled:opacity-50"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip';
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files?.length) {
                      handleUpload(files, 'file');
                    }
                  };
                  input.click();
                }}
                disabled={isLoading}
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span>Add Files</span>
              </button>
              
              <button
                className="flex items-center gap-1.5 text-xs bg-white hover:bg-[#d96857]/5 text-[#d96857] px-3 py-1.5 rounded-full font-medium transition-all border border-[#d96857] disabled:opacity-50"
                onClick={() => setScheduleMeetingOpen(true)}
                disabled={isLoading}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Schedule Meeting</span>
              </button>
              
              <button
                className="flex items-center gap-1.5 text-xs bg-white hover:bg-[#d96857]/5 text-[#d96857] px-3 py-1.5 rounded-full font-medium transition-all border border-[#d96857] disabled:opacity-50"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.multiple = true;
                  input.onchange = (e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files?.length) {
                      handleUpload(files, 'image');
                    }
                  };
                  input.click();
                }}
                disabled={isLoading}
              >
                <Image className="w-3.5 h-3.5" />
                <span>Add Images</span>
              </button>
            </div>

            {/* Message Input */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-full rounded-2xl"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (draft.trim()) {
                      sendMessage(draft);
                    }
                  }
                }}
              />
              <Button
                onClick={() => draft.trim() && sendMessage(draft)}
                disabled={isLoading || !draft.trim()}
                className="rounded-2xl bg-[#d96857] text-white px-4 py-2 flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </Button>
            </div>
          </div>
            </>
          )}
        </section>
      </div>

      {/* Schedule Meeting Modal */}
      <CenterModal
        open={scheduleMeetingOpen}
        onClose={() => {
          setScheduleMeetingOpen(false);
          setMeetingDate("");
          setMeetingTime("");
          setError(null);
        }}
        title="Schedule Meeting"
        size="medium"
      >
        <div className="p-5">
          <div className="space-y-3.5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#2e2e2e]">
                Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-[#f9f9f8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 focus:border-[#d96857]/30 text-[#2e2e2e] text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#2e2e2e]">
                Time
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-[#f9f9f8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 focus:border-[#d96857]/30 text-[#2e2e2e] text-sm transition-all"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3.5 p-2.5 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2.5 mt-5">
            <button
              onClick={() => {
                setScheduleMeetingOpen(false);
                setMeetingDate("");
                setMeetingTime("");
                setError(null);
              }}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-zinc-300 hover:bg-zinc-50 transition-all"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={scheduleMeeting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#d96857] text-white hover:bg-[#c85746] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all shadow-sm"
              disabled={isLoading || !meetingDate || !meetingTime}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </div>
              ) : (
                'Schedule'
              )}
            </button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}
