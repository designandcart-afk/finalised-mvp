"use client";

import AuthGuard from "@/components/AuthGuard";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  demoProjects,
  demoRenders,
  demoProducts,
  demoProjectProducts,
  demoProductsAll,
} from "@/lib/demoData";
import { supabase } from '@/lib/supabase';
import { useProjects } from '@/lib/contexts/projectsContext';
import { Button, Badge, Input } from "@/components/UI";
import { MessageCircle, ClipboardList, FolderOpen, ChevronLeft, ChevronRight, X, Send, Paperclip, CalendarDays, Image as ImageIcon, PlusCircle, Trash2, FileText } from "lucide-react";
import ProductSlidePanel from "@/components/ProductSlidePanel";
import CenterModal from "@/components/CenterModal";
import ChatMessage from "@/components/chat/ChatMessage";
import { storage, type ChatMessage as StorageChatMessage } from "@/lib/storage";
import { uploadFiles, UploadError, type UploadedFile } from "@/lib/uploadAdapter";

// Razorpay type declaration
declare global {
  interface Window {
    Razorpay: any;
  }
}
import { meetingService } from "@/lib/meetingService";

// Lazy load heavy components for better initial load performance
const AreaCard = lazy(() => import("@/components/project/AreaCard"));
const ProductsList = lazy(() => import("@/components/project/ProductsList"));
const ImageLightbox = lazy(() => import("@/components/project/ImageLightbox"));

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id as string;
  const router = useRouter();

  const { getProject, deleteProject: deleteProjectFromContext } = useProjects();
  const project = useMemo(() => {
    // Prefer project from context (real/demo), fallback to seeded demoProjects
    return getProject(projectId) ?? (demoProjects ?? []).find((p) => p.id === projectId);
  }, [projectId, getProject]);

  // Memoize isDemoProject check - used in many places
  const isDemoProject = useMemo(() => project?.id?.startsWith('demo_') ?? false, [project?.id]);

  // All hooks must be called before any early returns
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [openAreaSide, setOpenAreaSide] = useState<'left' | 'right'>('right');
  const [chatOpen, setChatOpen] = useState(false);
  const [meetOpen, setMeetOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [finalFilesOpen, setFinalFilesOpen] = useState(false);
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [isLoadingQuotesBills, setIsLoadingQuotesBills] = useState(false);
  const [quotesTab, setQuotesTab] = useState<'quotes' | 'bills'>('quotes');
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingSummaries, setMeetingSummaries] = useState<any[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; meetingId: string } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [activeTab, setActiveTab] = useState<Record<string, 'renders' | 'screenshots'>>({});
  const [activeSlides, setActiveSlides] = useState<Record<string, { renders: number; screenshots: number }>>({});
  const [approvalStatus, setApprovalStatus] = useState<Record<string, {
    renders: Record<number, 'approved' | 'requested-change' | null>;
    screenshots: Record<number, 'approved' | 'requested-change' | null>;
  }>>({});
  
  // Lightbox state for fullscreen image view
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<Array<{ id: string; imageUrl: string }>>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxType, setLightboxType] = useState<'renders' | 'screenshots'>('renders');

  // Real chat functionality
  const [messages, setMessages] = useState<StorageChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Payment functionality
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'advance' | 'balance'>('advance');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [rendersUnlocked, setRendersUnlocked] = useState(false);
  const [finalFilesUnlocked, setFinalFilesUnlocked] = useState(false);
  const [generatingEstimate, setGeneratingEstimate] = useState(false);

  // Projects context hook - must be called early
  const { updateProject } = useProjects();

  // Function to generate estimates - TEMPORARY SIMPLE VERSION
  const handleGenerateEstimate = async () => {
    if (!projectId || isDemoProject) return;
    
    setGeneratingEstimate(true);
    try {
      console.log('Calling simple estimates API for project:', projectId);
      const response = await fetch(`/api/projects/${projectId}/generate-simple-estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log('Simple estimates API response:', data);
      
      if (data.success && data.estimates) {
        setQuotes(data.estimates);
        console.log('✅ Generated estimates successfully:', data.estimates.length);
      } else {
        console.error('❌ Failed to generate estimates:', data.error, data.details);
      }
    } catch (error) {
      console.error('❌ Error generating estimates:', error);
    } finally {
      setGeneratingEstimate(false);
    }
  };

  // Load estimates when Quotes & Bills modal opens, auto-generate if none exist
  useEffect(() => {
    const loadEstimates = async () => {
      if (!projectId || isDemoProject || !quotesOpen) return;
      
      setIsLoadingQuotesBills(true);
      try {
        // Load estimates from project_design_estimates table
        const { data: estimates, error } = await supabase
          .from('project_design_estimates')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading estimates:', error);
          setQuotes([]);
        } else {
          setQuotes(estimates || []);
          console.log('Loaded estimates:', estimates);
          
          // Auto-generate estimate if none exist
          if (!estimates || estimates.length === 0) {
            console.log('No estimates found, auto-generating...');
            await handleGenerateEstimate();
          }
        }

        // Load bills from both project_design_payments (3D work) and project_quotes_bills (product purchases)
        const [paymentsData, billsData] = await Promise.all([
          supabase
            .from('project_design_payments')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false }),
          supabase
            .from('project_quotes_bills')
            .select('*')
            .eq('project_id', projectId)
            .eq('document_type', 'bill')
            .order('created_at', { ascending: false })
        ]);
        
        // Combine both types of bills
        const allBills = [
          ...(paymentsData.data || []),
          ...(billsData.data || [])
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setBills(allBills);
        console.log('Loaded bills:', { payments: paymentsData.data, productBills: billsData.data });
      } catch (error) {
        console.error('Error in loadEstimates:', error);
        setQuotes([]);
        setBills([]);
      } finally {
        setIsLoadingQuotesBills(false);
      }
    };

    if (quotesOpen) {
      loadEstimates();
    }
  }, [projectId, quotesOpen, isDemoProject]);

  // Load meeting summaries
  useEffect(() => {
    const loadMeetingSummaries = async () => {
      if (!projectId) return;
      
      setIsLoadingMeetings(true);
      try {
        const { data, error } = await supabase
          .from('meeting_summaries')
          .select('*')
          .eq('project_id', projectId)
          .order('meeting_date', { ascending: false });
        
        if (error) {
          console.error('Error loading meeting summaries:', error);
          // If table doesn't exist, use demo data
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            setMeetingSummaries([
              {
                id: 'demo-1',
                project_id: projectId,
                meeting_name: 'Initial Design Discussion',
                meeting_date: '2025-12-01',
                mom_points: [
                  'Discussed color palette preferences - client prefers warm tones',
                  'Confirmed budget allocation for living room renovation',
                  'Selected 3 initial design concepts for further development',
                  'Next meeting scheduled to review mood boards'
                ],
                status: 'pending',
                client_feedback: null
              },
              {
                id: 'demo-2',
                project_id: projectId,
                meeting_name: 'Material Selection Review',
                meeting_date: '2025-11-28',
                mom_points: [
                  'Reviewed flooring options - hardwood vs engineered wood',
                  'Discussed sustainable material alternatives',
                  'Client requested samples for marble countertop options',
                  'Confirmed timeline for material procurement'
                ],
                status: 'approved',
                client_feedback: null
              }
            ]);
          }
        } else {
          console.log('Loaded meeting summaries:', data);
          setMeetingSummaries(data || []);
        }
      } catch (error) {
        console.error('Error loading meeting summaries:', error);
      } finally {
        setIsLoadingMeetings(false);
      }
    };

    if (meetOpen) {
      loadMeetingSummaries();
    }
  }, [projectId, meetOpen]);

  // Listen for new meeting summaries and send chat notifications
  useEffect(() => {
    if (!projectId || project?.id.startsWith('demo_')) return;

    console.log('Setting up polling for new meeting summaries:', projectId);

    let lastCheck = Date.now();
    
    // Only poll when tab is visible to save resources
    const checkVisibility = () => document.visibilityState === 'visible';
    
    // Check for new meeting summaries every 30 seconds
    const interval = setInterval(async () => {
      // Skip if tab is not visible
      if (!checkVisibility()) return;
      
      try {
        const { data, error } = await supabase
          .from('meeting_summaries')
          .select('*')
          .eq('project_id', projectId)
          .gt('created_at', new Date(lastCheck).toISOString())
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          console.log('Found new meeting summaries:', data);
          
          // Send notification for each new meeting
          for (const newMeeting of data) {
            const notificationText = `📋 New meeting summary added: "${newMeeting.meeting_name}" (${new Date(newMeeting.meeting_date).toLocaleDateString()})`;
            
            await supabase
              .from('project_chat_messages')
              .insert([{
                project_id: projectId,
                sender_type: 'system',
                sender_id: null,
                message: notificationText,
                source: 'meeting_summary',
                related_id: newMeeting.id,
              }]);
            
            console.log('Notification sent for:', newMeeting.meeting_name);
          }
          
          // Reload messages
          const msgs = await storage.getMessages(projectId);
          setMessages(msgs);
          
          // Update meeting summaries if modal is open
          if (meetOpen) {
            const { data: allMeetings } = await supabase
              .from('meeting_summaries')
              .select('*')
              .eq('project_id', projectId)
              .order('meeting_date', { ascending: false });
            
            if (allMeetings) {
              setMeetingSummaries(allMeetings);
            }
          }
        }
        
        lastCheck = Date.now();
      } catch (error) {
        console.error('Error checking for new meetings:', error);
      }
    }, 30000); // Check every 30 seconds to reduce load

    return () => {
      console.log('Cleaning up polling interval');
      clearInterval(interval);
    };
  }, [projectId, project, meetOpen]);

  // Load chat messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      if (!projectId) return;
      setIsLoadingChat(true);
      try {
        const msgs = await storage.getMessages(projectId);
        setMessages(msgs);
      } catch (error) {
        console.error('Error loading chat messages:', error);
      } finally {
        setIsLoadingChat(false);
      }
    };
    
    loadMessages();
  }, [projectId]);

  // Handle payment click
  const handlePaymentClick = (type: 'advance' | 'balance') => {
    setPaymentType(type);
    setPaymentModalOpen(true);
  };

  // Handle payment success
  const handlePaymentSuccess = async () => {
    // Reload payment status
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const response = await fetch(`/api/projects/${projectId}/payment-status`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (data.success) {
      setPaymentStatus(data.status);
      setCurrentEstimate(data.estimate);
      setRendersUnlocked(data.status.rendersUnlocked);
      setFinalFilesUnlocked(data.status.finalFilesUnlocked);
    }

    setPaymentModalOpen(false);
  };

  // Load payment status
  useEffect(() => {
    const loadPaymentStatus = async () => {
      if (!projectId || isDemoProject) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`/api/projects/${projectId}/payment-status`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setPaymentStatus(data.status);
          setCurrentEstimate(data.estimate);
          setRendersUnlocked(data.status.rendersUnlocked);
          setFinalFilesUnlocked(data.status.finalFilesUnlocked);
          
          // Auto-generate estimate in background if none exists (non-blocking)
          if (!data.estimate) {
            setTimeout(() => {
              handleGenerateEstimate();
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error loading payment status:', error);
      }
    };

    loadPaymentStatus();
  }, [projectId, isDemoProject]);

  // Load quotes/estimates when quotes modal opens
  useEffect(() => {
    const loadQuotes = async () => {
      if (!quotesOpen || isDemoProject) return;
      
      setIsLoadingQuotesBills(true);
      try {
        const { data: estimates, error } = await supabase
          .from('project_design_estimates')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (!error && estimates) {
          setQuotes(estimates);
          
          // Auto-generate if no estimates exist
          if (estimates.length === 0) {
            await handleGenerateEstimate();
            // Reload after generation
            const { data: newEstimates } = await supabase
              .from('project_design_estimates')
              .select('*')
              .eq('project_id', projectId)
              .order('created_at', { ascending: false });
            if (newEstimates) setQuotes(newEstimates);
          }
        }
      } catch (error) {
        console.error('Error loading quotes:', error);
      } finally {
        setIsLoadingQuotesBills(false);
      }
    };

    loadQuotes();
  }, [quotesOpen, projectId, isDemoProject]);

  // Area management
  const [addingArea, setAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // File upload state
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [driveLink, setDriveLink] = useState('');
  const [savingDriveLink, setSavingDriveLink] = useState(false);

  // Request change modal state
  const [requestChangeModal, setRequestChangeModal] = useState<{
    open: boolean;
    area: string;
    type: 'renders' | 'screenshots';
    index: number;
  } | null>(null);
  const [changeNotes, setChangeNotes] = useState("");

  // Force refresh of linked products when localStorage changes
  const [productRefreshKey, setProductRefreshKey] = useState(0);

  // Load linked products - must be before early return
  const [linked, setLinked] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [renders, setRenders] = useState<any[]>([]);
  const [projectFiles, setProjectFiles] = useState<any[]>([]);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [finalFiles, setFinalFiles] = useState<any[]>([]);

  // Helper function to convert Google Drive URLs to proxied URLs
  const getDirectImageUrl = (url: string) => {
    if (!url) {
      console.warn('getDirectImageUrl: URL is null or undefined');
      return null;
    }
    
    console.log('getDirectImageUrl input:', url);
    
    // Handle Google Drive URLs by proxying them through our API
    if (url.includes('drive.google.com')) {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      console.log('getDirectImageUrl: Using proxy:', proxyUrl);
      return proxyUrl;
    }
    
    // Return original URL for non-Google Drive URLs
    console.log('getDirectImageUrl: Returning original URL:', url);
    return url;
  };

  // Define functions that will be used in useEffect
  async function loadChatMessages() {
    if (!projectId) return;
    try {
      setIsLoadingChat(true);
      const msgs = await storage.getMessages(projectId);
      setMessages(msgs); // Welcome message is automatically added by storage.getMessages()
    } catch (err) {
      setChatError('Failed to load messages');
      console.error(err);
    } finally {
      setIsLoadingChat(false);
    }
  }

  // Handle approval
  const handleApprove = async (area: string, type: 'renders' | 'screenshots', index: number) => {
    setApprovalStatus(prev => ({
      ...prev,
      [area]: {
        ...prev[area],
        [type]: {
          ...prev[area]?.[type],
          [index]: 'approved'
        }
      }
    }));

    // Update Supabase
    if (!isDemoProject) {
      const items = type === 'renders' ? rendersForArea(area) : screenshotsFor(area);
      const item = items[index];
      if (item?.id) {
        const tableName = type === 'renders' ? 'project_renders' : 'project_screenshots';
        await supabase
          .from(tableName)
          .update({ 
            status: 'approved',
            notes: null,
            decided_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }
  };

  // Handle request change - open modal
  const handleRequestChange = (area: string, type: 'renders' | 'screenshots', index: number) => {
    setRequestChangeModal({ open: true, area, type, index });
    setChangeNotes("");
  };

  // Submit request change with notes
  const submitRequestChange = async () => {
    if (!requestChangeModal) return;
    const { area, type, index } = requestChangeModal;
    
    setApprovalStatus(prev => ({
      ...prev,
      [area]: {
        ...prev[area],
        [type]: {
          ...prev[area]?.[type],
          [index]: 'requested-change'
        }
      }
    }));

    // Update Supabase
    if (!isDemoProject) {
      const items = type === 'renders' ? rendersForArea(area) : screenshotsFor(area);
      const item = items[index];
      if (item?.id) {
        const tableName = type === 'renders' ? 'project_renders' : 'project_screenshots';
        await supabase
          .from(tableName)
          .update({ 
            status: 'change_requested',
            notes: changeNotes.trim(),
            decided_at: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }

    // Save the change request as a chat message
    if (changeNotes.trim() && projectId) {
      const msg: StorageChatMessage = {
        id: `m_${Date.now()}`,
        projectId,
        sender: "designer",
        text: `🔄 Change requested for ${area} - ${type}:\n${changeNotes}`,
        ts: Date.now(),
      };
      await storage.saveMessage(msg);
      setMessages(prev => [...prev, msg]);
    }

    setRequestChangeModal(null);
    setChangeNotes("");
  };

  // Get status buttons for renders/screenshots
  const getStatusButtons = (area: string, type: 'renders' | 'screenshots', index: number) => {
    // Check Supabase data first for real projects
    if (!isDemoProject) {
      const items = type === 'renders' ? rendersForArea(area) : screenshotsFor(area);
      const item = items[index];
      if (item?.status) {
        if (item.status === 'approved') {
          return (
            <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              ✓ Approved
            </div>
          );
        }
        if (item.status === 'change_requested') {
          return (
            <div className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              🔄 Change Requested
            </div>
          );
        }
      }
    }
    
    // Fallback to local state for demo projects
    const status = approvalStatus[area]?.[type]?.[index];
    
    if (status === 'approved') {
      return (
        <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          ✓ Approved
        </div>
      );
    }
    
    if (status === 'requested-change') {
      return (
        <div className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          🔄 Change Requested
        </div>
      );
    }
    
    return (
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleApprove(area, type, index);
          }}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-lg"
        >
          ✓ Approve
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRequestChange(area, type, index);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-lg"
        >
          🔄 Request Change
        </button>
      </div>
    );
  };

  // Listen for changes to project products in localStorage
  useEffect(() => {
    if (!project) return; // Guard against null project
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dc:projectProducts') {
        setProductRefreshKey(prev => prev + 1);
      }
    };
    
    // Also listen for custom refresh events from same window
    const handleRefresh = () => {
      setProductRefreshKey(prev => prev + 1);
    };
    
    // Refresh when page becomes visible (user comes back from another tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setProductRefreshKey(prev => prev + 1);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('projectProductsUpdated', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial refresh on mount
    setProductRefreshKey(prev => prev + 1);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('projectProductsUpdated', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [project]);

  // Load messages when chat opens
  useEffect(() => {
    if (chatOpen && projectId) {
      loadChatMessages();
    }
  }, [chatOpen, projectId]);

  // Load project files from project_folder_url
  useEffect(() => {
    if (!project) return;
    
    console.log('Loading project files. Project:', project.id);
    console.log('project_folder_url:', (project as any).project_folder_url);
    
    // For demo projects, use mock files
    if (isDemoProject) {
      setProjectFiles([
        { id: 'file1', projectId: project.id, type: 'pdf', url: 'https://example.com/floor-plan.pdf', name: 'Floor Plan.pdf' },
        { id: 'file2', projectId: project.id, type: 'dwg', url: 'https://example.com/technical-drawing.dwg', name: 'Technical Drawing.dwg' }
      ]);
      console.log('Using mock files for demo project');
      return;
    }
    
    // For real projects, parse project_folder_url
    const folderUrl = (project as any).project_folder_url;
    if (folderUrl && typeof folderUrl === 'string') {
      console.log('Parsing folder URL:', folderUrl);
      const urls = folderUrl.split(',').map(url => url.trim()).filter(url => url.length > 0);
      const files = urls.map((url, index) => {
        const fileName = url.split('/').pop() || 'File';
        const extension = fileName.split('.').pop()?.toLowerCase() || 'file';
        return {
          id: `file_${index}`,
          projectId: project.id,
          type: extension,
          url: url,
          name: fileName
        };
      });
      console.log('Parsed files:', files);
      setProjectFiles(files);
    } else {
      console.log('No project_folder_url found or invalid format');
      setProjectFiles([]);
    }
  }, [project, isDemoProject]);

  // Load screenshots and renders from Supabase
  useEffect(() => {
    if (!project || project.id.startsWith('demo_')) return;
    
    async function loadScreenshotsAndRenders() {
      try {
        // Load both screenshots and renders in parallel for faster loading
        const [screenshotsResult, rendersResult] = await Promise.all([
          supabase
            .from('project_screenshots')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: true }),
          supabase
            .from('project_renders')
            .select('*')
            .eq('project_id', project.id)
            .order('created_at', { ascending: true })
        ]);
        
        if (screenshotsResult.error) {
          console.error('Error loading screenshots:', screenshotsResult.error);
        } else {
          setScreenshots(screenshotsResult.data || []);
        }
        
        if (rendersResult.error) {
          console.error('Error loading renders:', rendersResult.error);
        } else {
          setRenders(rendersResult.data || []);
        }
      } catch (err) {
        console.error('Error loading screenshots/renders:', err);
      }
    }

    loadScreenshotsAndRenders();
  }, [project]);

  // Load user uploaded files from Supabase
  useEffect(() => {
    if (!project || isDemoProject) return;
    
    async function loadUserFiles() {
      try {
        const { data, error } = await supabase
          .from('project_user_files')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading user files:', error);
          setUserFiles([]);
        } else {
          setUserFiles(data || []);
        }
      } catch (err) {
        console.error('Error loading user files:', err);
        setUserFiles([]);
      }
    }

    loadUserFiles();
  }, [project, isDemoProject]);

  // Load final files from Supabase
  useEffect(() => {
    if (!project || isDemoProject) return;
    
    async function loadFinalFiles() {
      try {
        const { data, error } = await supabase
          .from('project_final_files')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading final files:', error);
          setFinalFiles([]);
        } else {
          setFinalFiles(data || []);
        }
      } catch (err) {
        console.error('Error loading final files:', err);
        setFinalFiles([]);
      }
    }

    loadFinalFiles();
  }, [project, isDemoProject]);

  // Load linked products
  useEffect(() => {
    if (!project) return; // Guard against null project
    
    if (isDemoProject) {
      setLinked((demoProjectProducts ?? []).filter((pp) => pp.projectId === project.id));
    } else {
      // For real user projects, fetch from both Supabase AND localStorage
      async function fetchLinked() {
        // First, get from Supabase
        const { data: supabaseData, error } = await supabase
          .from('project_products')
          .select('*, product:products(*)')
          .eq('project_id', project.id);
        
        if (error) {
          console.error('Failed to fetch project_products from Supabase:', error);
        }
        
        // Then, get from localStorage
        const localKey = "dc:projectProducts";
        const localData = JSON.parse(localStorage.getItem(localKey) || "[]");
        const localProjectProducts = localData.filter((pp: any) => pp.projectId === project.id);
        
        // Batch fetch ALL product details in ONE query instead of sequential calls
        let localProductsWithDetails: any[] = [];
        if (localProjectProducts.length > 0) {
          const productIds = localProjectProducts.map((pp: any) => pp.productId);
          const { data: productsData } = await supabase
            .from('products')
            .select('*')
            .in('id', productIds);
          
          // Map products back to project products
          const productsMap = new Map((productsData || []).map(p => [p.id, p]));
          localProductsWithDetails = localProjectProducts.map((pp: any) => ({
            ...pp,
            product: productsMap.get(pp.productId),
          }));
        }
        
        // Combine both sources (Supabase + localStorage)
        const combined = [
          ...(supabaseData || []),
          ...localProductsWithDetails.filter(p => p.product), // Only include if product was found
        ];
        
        setLinked(combined);
      }
      fetchLinked();
    }
  }, [project, productRefreshKey, isDemoProject]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
      }
    };

    if (lightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxOpen, lightboxImages.length]);

  // All useMemo and useCallback hooks must be defined BEFORE early return
  const allRendersForProject = useMemo(() => {
    if (!project) return [];
    return isDemoProject 
      ? (demoRenders ?? []).filter((r) => r.projectId === project.id)
      : renders;
  }, [project, isDemoProject, demoRenders, renders]);

  // Derive areas: use project's areas (user-provided) or empty array for real users
  const areas = useMemo(() => {
    if (!project) return [];
    const derivedFromLinks = Array.from(new Set(linked.map((l) => l.area))).filter(Boolean) as string[];
    const derivedFromRenders = Array.from(new Set(allRendersForProject.map((r) => r.area).filter(Boolean) as string[]));
    const derivedFromScreenshots = Array.from(new Set(screenshots.map((s) => s.area).filter(Boolean) as string[]));
    
    return (project.areas && project.areas.length)
      ? project.areas
      : project.area
        ? [project.area]
        : (isDemoProject ? (derivedFromLinks.length ? derivedFromLinks : (derivedFromRenders.length ? derivedFromRenders : [])) : (derivedFromScreenshots.length ? derivedFromScreenshots : []));
  }, [project, isDemoProject, linked, allRendersForProject, screenshots]);

  // Screenshots from Supabase for real projects, mock for demo
  const screenshotsFor = useCallback((area: string) => {
    if (isDemoProject) {
      return [1, 2].map((n) => ({
        id: `${area}-${n}`,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(area + n)}/1200/800`,
      }));
    }
    const result = screenshots
      .filter((s) => s.area === area)
      .map((s) => {
        const directUrl = getDirectImageUrl(s.image_url) || s.image_url;
        return {
          ...s,
          imageUrl: directUrl,
        };
      });
    return result;
  }, [isDemoProject, screenshots]);

  // Renders for area
  const rendersForArea = useCallback((area: string) => {
    const filtered = allRendersForProject.filter((r) => r.area === area);
    // Map database field to UI field for non-demo projects
    if (!isDemoProject) {
      return filtered.map((r) => {
        const directUrl = getDirectImageUrl(r.render_url) || r.render_url;
        return {
          ...r,
          imageUrl: directUrl,
        };
      });
    }
    return filtered;
  }, [allRendersForProject, isDemoProject]);

  const productsFor = useCallback((area: string) => {
    if (isDemoProject) {
      return linked
        .filter((l) => l.area === area)
        .map((l) => (demoProductsAll ?? []).find((p) => p.id === l.productId))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({
          id: p.id,
          title: p.title,
          imageUrl: p.imageUrl,
          price: p.price,
        }));
    } else {
      return linked
        .filter((l) => l.area === area && l.product)
        .map((l) => ({
          id: l.product.id,
          title: l.product.title || l.product.name || 'Product',
          imageUrl: l.product.image_url || l.product.imageUrl,
          price: l.product.price || l.product.selling_price || 0,
        }));
    }
  }, [isDemoProject, linked, demoProductsAll]);

  // Get unique products with their counts for display
  const getUniqueProductsWithCount = useCallback((area: string) => {
    const products = productsFor(area);
    const productMap = new Map<string, { product: typeof products[0], count: number }>();
    
    products.forEach(p => {
      if (productMap.has(p.id)) {
        productMap.get(p.id)!.count++;
      } else {
        productMap.set(p.id, { product: p, count: 1 });
      }
    });
    
    return Array.from(productMap.values());
  }, [productsFor]);

  // Early return AFTER all hooks to comply with Rules of Hooks
  // Don't show "not found" if we're in the process of deleting (causes hook count mismatch)
  if (!project) {
    if (isDeleting) {
      return <div className="container py-8">Deleting project...</div>;
    }
    return <div className="container py-8">Project not found</div>;
  }

  const projectCode = (project as any).project_code || `#DAC-${project.id.slice(0, 6).toUpperCase()}`;

  // Mock chat messages - only for demo projects
  const mockMessages = isDemoProject ? [
    {
      id: '1',
      projectId: project.id,
      senderId: 'demo-user-1',
      text: 'Hi, I have uploaded the latest renders.',
      timestamp: Date.now() - 3600000
    },
    {
      id: '2',
      projectId: project.id,
      senderId: 'designer',
      text: 'Thank you, I will review them shortly.',
      timestamp: Date.now() - 1800000
    }
  ] : [];

  // Mock files - only for demo projects
  const mockFiles = isDemoProject ? [
    {
      id: 'file1',
      projectId: project.id,
      type: 'pdf',
      url: 'https://example.com/floor-plan.pdf'
    },
    {
      id: 'file2',
      projectId: project.id,
      type: 'dwg',
      url: 'https://example.com/technical-drawing.dwg'
    }
  ] : [];

  async function sendChat(text?: string, attachments?: UploadedFile[], meetingInfo?: StorageChatMessage['meetingInfo'], isSystemMessage?: boolean) {
    const messageText = text || chatText;
    if (!messageText.trim() && !attachments?.length && !meetingInfo) return;
    
    try {
      const msg: StorageChatMessage = {
        id: `m_${Date.now()}`,
        projectId,
        sender: isSystemMessage ? "system" : "client", // System for notifications, client for regular messages
        text: messageText.trim(),
        ts: Date.now(),
        ...(attachments && { attachments }),
        ...(meetingInfo && { meetingInfo }),
      };
      await storage.saveMessage(msg);
      setMessages(prev => [...prev, msg]);
      if (!isSystemMessage) {
        setChatText("");
      }
    } catch (err) {
      setChatError('Failed to send message');
      console.error(err);
    }
  }

  async function handleChatUpload(files: FileList, type: 'image' | 'file') {
    try {
      setIsLoadingChat(true);
      const uploaded = await uploadFiles(
        Array.from(files).map(file => ({
          file,
          type,
          projectId
        }))
      );
      // Send attachments without the "Shared X files/images" text
      await sendChat(
        "",
        uploaded
      );
    } catch (err) {
      if (err instanceof UploadError) {
        setChatError(err.message);
      } else {
        setChatError('Failed to upload files');
      }
      console.error(err);
    } finally {
      setIsLoadingChat(false);
    }
  }

  async function scheduleChatMeeting() {
    if (!meetingDate || !meetingTime) {
      setChatError('Please select both date and time');
      return;
    }

    try {
      setIsLoadingChat(true);

      const meetingInfo = {
        id: `meet_${Date.now()}`,
        projectId: project.id,
        date: meetingDate,
        time: meetingTime,
        duration: 30,
        title: `Design Consultation - ${project.name}`,
        link: '#', // Your team will handle the actual meeting link
        status: 'scheduled' as const
      };

      await sendChat(
        "Meeting scheduled",
        undefined,
        meetingInfo
      );

      // Reset form and close modal
      setMeetingDate("");
      setMeetingTime("");
      setScheduleMeetingOpen(false);
      setChatError(null);
    } catch (err) {
      setChatError('Failed to schedule meeting');
      console.error(err);
    } finally {
      setIsLoadingChat(false);
    }
  }

  const files = projectFiles;
  
  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;

    const currentAreas = project.areas || (project.area ? [project.area] : []);
    const updatedAreas = [...currentAreas, newAreaName.trim()];

    // Update local context first for immediate UI feedback
    updateProject(project.id, {
      areas: updatedAreas
    });

    // Update Supabase projects table with new areas array
    if (!isDemoProject) {
      try {
        const { error: projectError } = await supabase
          .from('projects')
          .update({ areas: updatedAreas })
          .eq('id', project.id);

        if (projectError) {
          console.error('Error updating project areas in Supabase:', projectError);
        }

        // Also insert into project_areas table for detailed tracking
        const areaId = `AREA_${Date.now()}`;
        const now = new Date().toISOString();
        const { error: areaError } = await supabase
          .from('project_areas')
          .insert([
            {
              id: areaId,
              project_id: project.id,
              area_name: newAreaName.trim(),
              area_type: '',
              status: 'created',
              created_at: now,
              updated_at: now,
            },
          ]);

        if (areaError) {
          console.error('Error inserting project area into Supabase:', areaError);
        }
      } catch (error) {
        console.error('Error saving area:', error);
      }
    }

    setNewAreaName("");
    setAddingArea(false);
  };

  const handleMeetingApproval = async (meetingId: string, status: 'approved' | 'changes_needed', feedback?: string) => {
    try {
      // Get meeting details before updating
      const meeting = meetingSummaries.find(m => m.id === meetingId);
      if (!meeting) return;

      const { error } = await supabase
        .from('meeting_summaries')
        .update({ 
          status,
          client_feedback: feedback || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      if (error) throw error;

      // Update local state
      setMeetingSummaries(prev =>
        prev.map(m =>
          m.id === meetingId
            ? { ...m, status, client_feedback: feedback || null }
            : m
        )
      );

      // Send chat notification
      const notificationText = status === 'approved' 
        ? `✅ Meeting Summary Approved: "${meeting.meeting_name}"`
        : `📝 Changes Requested for Meeting Summary: "${meeting.meeting_name}"${feedback ? `\n\nFeedback: ${feedback}` : ''}`;
      
      // Client actions (approve/changes) should show as client messages (right side)
      await sendChat(notificationText, undefined, undefined, false);

      // Close feedback modal if open
      if (feedbackModal?.open) {
        setFeedbackModal({ open: false, meetingId: '' });
        setFeedbackText("");
      }
    } catch (error) {
      console.error('Error updating meeting status:', error);
      alert('Failed to update meeting status. Please try again.');
    }
  };

  const handleDeleteProject = async () => {
    if (!project) {
      alert('Project not found.');
      setShowDeleteConfirm(false);
      return;
    }
    
    setIsDeleting(true);
    
    // Close modal immediately
    setShowDeleteConfirm(false);
    
    try {
      // Delete from Supabase if it's a real project
      if (!isDemoProject) {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', project.id);
        
        if (error) {
          console.error('Error deleting project:', error);
          setIsDeleting(false);
          alert('Failed to delete project. Please try again.');
          return;
        }
      }
      
      // Navigate to dashboard first, then remove from context
      // This prevents the component from re-rendering with null project
      router.push('/');
      
      // Remove from context after navigation starts (async operation)
      setTimeout(() => {
        deleteProjectFromContext(project.id);
      }, 100);
      
    } catch (error) {
      console.error('Error deleting project:', error);
      setIsDeleting(false);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    setUploadingFiles(true);
    setUploadError(null);
    
    try {
      const uploaded = await uploadFiles(
        Array.from(files).map(file => ({
          file,
          type: 'file',
          projectId
        }))
      );
      
      // Save file info to project_user_files table
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const fileRecords = uploaded.map(f => ({
          project_id: projectId,
          user_id: userData.user.id,
          file_url: f.url,
          file_name: f.name,
          file_type: f.name.split('.').pop()?.toLowerCase() || 'file',
          file_size: f.size
        }));
        
        const { error: insertError } = await supabase
          .from('project_user_files')
          .insert(fileRecords);
        
        if (insertError) {
          console.error('Error saving file records:', insertError);
        } else {
          // Reload user files
          const { data: userFilesData } = await supabase
            .from('project_user_files')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });
          
          setUserFiles(userFilesData || []);
        }
      }
      
      alert(`Successfully uploaded ${uploaded.length} file(s)`);
    } catch (err) {
      console.error('Upload error:', err);
      if (err instanceof UploadError) {
        setUploadError(err.message);
      } else if (err instanceof Error) {
        setUploadError(err.message || 'Failed to upload files');
      } else {
        setUploadError('Failed to upload files. Please try again.');
      }
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleApproval = (area: string, type: 'renders' | 'screenshots', index: number, status: 'approved' | 'requested-change') => {
    setApprovalStatus(prev => {
      const areaStatus = prev[area] || { renders: {}, screenshots: {} };
      return {
        ...prev,
        [area]: {
          ...areaStatus,
          [type]: {
            ...areaStatus[type],
            [index]: status
          }
        }
      };
    });
  };

  const getStatus = (area: string, type: 'renders' | 'screenshots', index: number) => {
    return approvalStatus[area]?.[type]?.[index] || null;
  };

  // Open lightbox for renders/screenshots
  const openLightbox = (area: string, type: 'renders' | 'screenshots', index: number) => {
    const images = type === 'renders' ? rendersForArea(area) : screenshotsFor(area);
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxType(type);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextLightboxImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevLightboxImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  // Payment processing functions
  const processPayment = async () => {
    if (!currentEstimate || !paymentType) return;

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const amount = paymentType === 'advance' 
        ? Math.round(Number(currentEstimate.total_amount) * 0.3)
        : Math.round(Number(currentEstimate.total_amount) * 0.7);

      // Create payment order
      const response = await fetch(`/api/projects/${projectId}/create-design-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          estimateId: currentEstimate.id,
          paymentType: paymentType,
          amount: amount,
          currency: 'INR',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment order');
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        
        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      // Initialize Razorpay payment
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_key', // Use your test key
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: 'Design & Cart',
        description: `${paymentType === 'advance' ? 'Advance' : 'Balance'} Payment`,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch(`/api/projects/${projectId}/verify-design-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              setPaymentModalOpen(false);
              setCurrentEstimate(null);
              setPaymentType('advance');
              
              // Reload quotes to reflect payment status
              // Trigger a re-fetch by toggling the modal state
              if (quotesOpen) {
                setQuotesOpen(false);
                setTimeout(() => setQuotesOpen(true), 100);
              }
              
              alert('Payment successful! Invoice will be generated shortly.');
            } else {
              throw new Error(verifyData.error || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            setPaymentError(error.message || 'Payment verification failed');
          }
        },
        prefill: {
          name: 'User Name',
          email: 'user@example.com',
        },
        theme: {
          color: '#d96857',
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Payment processing error:', error);
      setPaymentError(error.message || 'Failed to process payment');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <AuthGuard>
      <div className="py-4 bg-[#f4f3f0] -mx-4 px-4 rounded-2xl">
        {/* Back Button - Top Left */}
        <div className="mb-3">
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="px-3 py-1.5 text-sm text-black/70 hover:bg-gray-100 border-black/20 inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </Button>
        </div>

        <div className="relative bg-white/90 border rounded-2xl p-5 shadow-lg shadow-black/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-semibold leading-tight">
                {project.name}
              </h1>
              <div className="text-sm text-black/60">{projectCode}</div>

              <div className="mt-3">
                <div className="text-sm font-semibold">Address</div>
                <div>{project.address || "—"}</div>
              </div>

              {/* Details = Notes entered at creation */}
              <div className="mt-3">
                <div className="text-sm font-semibold">Details</div>
                {project.notes ? (
                  <div className="text-black/80 whitespace-pre-wrap">
                    {project.notes}
                  </div>
                ) : (
                  <div className="text-black/60">—</div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {project.scope && (
                  <Badge className="text-[13px] px-3 py-1 bg-[#2e2e2e]/5 text-[#2e2e2e]/80 border border-[#2e2e2e]/10">{project.scope}</Badge>
                )}
                {project.status && (
                  <span className={`text-xs rounded-full px-3 py-1.5 font-medium inline-block ${
                    project.status === 'in_progress' ? 'bg-[#d96857]/5 text-[#d96857] border border-[#d96857]/15' :
                    project.status === 'on_hold' ? 'bg-[#2e2e2e]/5 text-[#2e2e2e]/70 border border-[#2e2e2e]/10' :
                    project.status === 'designs_shared' ? 'bg-[#d96857]/8 text-[#c85746] border border-[#d96857]/20' :
                    project.status === 'approved' ? 'bg-[#d96857]/10 text-[#b84535] border border-[#d96857]/25' :
                    project.status === 'ordered' ? 'bg-[#d96857]/12 text-[#a53d2e] border border-[#d96857]/30' :
                    project.status === 'closed' ? 'bg-[#2e2e2e]/8 text-[#2e2e2e] border border-[#2e2e2e]/15' :
                    'bg-[#d96857]/5 text-[#d96857] border border-[#d96857]/15'
                  }`}>
                    {project.status === 'in_progress' ? 'In Progress' :
                     project.status === 'on_hold' ? 'On Hold' :
                     project.status === 'designs_shared' ? 'Designs Shared' :
                     project.status === 'approved' ? 'Approved' :
                     project.status === 'ordered' ? 'Ordered' :
                     project.status === 'closed' ? 'Closed' :
                     project.status}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons - Icon Only */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setChatOpen(true)}
                className="flex items-center justify-center w-14 h-14 p-0 text-[#d96857] hover:bg-[#d96857] hover:text-white border-[#d96857]/30 transition-all"
                title="Chat"
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setMeetOpen(true)}
                className="flex items-center justify-center w-14 h-14 p-0 text-[#d96857] hover:bg-[#d96857] hover:text-white border-[#d96857]/30 transition-all"
                title="Meeting Summary"
              >
                <ClipboardList className="w-6 h-6" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setFilesOpen(true)}
                className="flex items-center justify-center w-14 h-14 p-0 text-[#d96857] hover:bg-[#d96857] hover:text-white border-[#d96857]/30 transition-all"
                title="Project Folder"
              >
                <FolderOpen className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quote by Team Section */}
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {/* Quotes and Bills Box */}
          <button
            onClick={() => setQuotesOpen(true)}
            className="relative bg-gradient-to-br from-[#d96857]/5 to-[#d96857]/10 border-2 border-[#d96857]/20 rounded-2xl p-6 shadow-lg shadow-black/5 hover:shadow-xl transition-all cursor-pointer text-left w-full"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#d96857] flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#2e2e2e] mb-1">Quotes and Bills</h3>
                <p className="text-sm text-[#2e2e2e]/70">View detailed quotations and documents from our team</p>
              </div>
              <svg className="w-6 h-6 text-[#d96857] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Final Files Box */}
          <button
            onClick={() => setFinalFilesOpen(true)}
            className="relative bg-gradient-to-br from-[#d96857]/5 to-[#d96857]/10 border-2 border-[#d96857]/20 rounded-2xl p-6 shadow-lg shadow-black/5 hover:shadow-xl transition-all cursor-pointer text-left w-full"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#d96857] flex items-center justify-center flex-shrink-0">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#2e2e2e] mb-1">
                  Final Files
                </h3>
                <p className="text-sm text-[#2e2e2e]/70">
                  Access all final drawings and specifications
                </p>
              </div>
              <svg className="w-6 h-6 text-[#d96857] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        <div className="h-px bg-black/10 my-6 rounded-full" />

        {/* Areas Section */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#2e2e2e]">Design Areas</h2>
            <p className="text-sm text-[#2e2e2e]/60 mt-1">
              Organize your project by rooms or spaces
            </p>
          </div>
          <Button
            onClick={() => setAddingArea(true)}
            className="bg-[#d96857] text-white hover:bg-[#c85745] px-4 py-2 flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Add Area
          </Button>
        </div>

        {areas.length === 0 ? (
          <div className="bg-white border rounded-2xl p-8 text-center shadow-lg shadow-black/5">
            <div className="text-[#2e2e2e]/40 mb-3">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#2e2e2e] mb-2">No Areas Added Yet</h3>
            <p className="text-sm text-[#2e2e2e]/60 mb-4">
              Click "Add Area" to create your first design area (e.g., Living Room, Kitchen, Bedroom).
            </p>
            <p className="text-xs text-[#2e2e2e]/50">
              Areas help organize your design work by room or space.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {areas.map((area, idx) => {
            const areaRenders = rendersForArea(area);
            const areaScreens = screenshotsFor(area);
            const areaProducts = productsFor(area);
            const uniqueProductsWithCount = getUniqueProductsWithCount(area);

            return (
              <div
                key={area}
                className={`relative rounded-2xl p-3 shadow-lg shadow-black/5 border transition ${
                  idx % 2 ? "bg-[#faf8f6]" : "bg-white"
                } hover:shadow-xl hover:-translate-y-[1px]`}
              >
                <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#d96857] rounded-r-full" />
                <div className="mb-2 pl-2">
                  <div className="text-lg font-semibold">{area}</div>
                </div>

                <div className="pl-2">
                  <div className="mb-3 flex gap-2 bg-[#f7f4f2] p-1 rounded-xl inline-flex">
                    <button 
                      className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${
                        (activeTab[area] || 'renders') === 'renders' 
                          ? 'bg-white text-[#d96857] shadow-sm' 
                          : 'text-gray-600 hover:text-[#2e2e2e]'
                      }`}
                      onClick={() => setActiveTab(prev => ({ ...prev, [area]: 'renders' }))}
                    >
                      Renders
                    </button>
                    <button 
                      className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${
                        (activeTab[area] || 'renders') === 'screenshots' 
                          ? 'bg-white text-[#d96857] shadow-sm' 
                          : 'text-gray-600 hover:text-[#2e2e2e]'
                      }`}
                      onClick={() => setActiveTab(prev => ({ ...prev, [area]: 'screenshots' }))}
                    >
                      Screenshots
                    </button>
                  </div>
                  
                  <div className="relative rounded-2xl overflow-hidden bg-[#f7f4f2] border">
                    {(activeTab[area] || 'renders') === 'renders' ? (
                      // Only show lock if renders exist but are locked
                      (!isDemoProject && !rendersUnlocked && areaRenders.length > 0) ? (
                        <div className="h-[400px] flex flex-col items-center justify-center bg-gray-50 p-8">
                          <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">🔒 Renders Locked</h3>
                          <p className="text-sm text-gray-600 text-center max-w-xs">
                            Renders will be available after final payment
                          </p>
                        </div>
                      ) : areaRenders.length > 0 ? (
                        <div className="relative">
                          <img
                            src={areaRenders[activeSlides[area]?.renders || 0]?.imageUrl}
                            className="w-full h-[400px] object-cover cursor-pointer"
                            alt="render"
                            loading="lazy"
                            onClick={() => openLightbox(area, 'renders', activeSlides[area]?.renders || 0)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.error('❌ Render image failed to load:', target.src);
                              console.error('Image error event:', e);
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzE2MS4zIDEwMCAxMzAgMTMxLjMgMTMwIDE3MFYyMzBDMTMwIDI2OC43IDE2MS4zIDMwMCAyMDAgMzAwQzIzOC43IDMwMCAyNzAgMjY4LjcgMjcwIDIzMFYxNzBDMjcwIDEzMS4zIDIzOC43IDEwMCAyMDAgMTAwWk0yMDAgMjcwQzE3Ny45IDI3MCAyNTAgMjQ3LjEgMTUwIDIzMFYxNzBDMTUwIDE0Mi4zIDE3Mi4zIDEyMCAyMDAgMTIwQzIyNy43IDEyMCAyNTAgMTQyLjMgMjUwIDE3MFYyMzBDMjUwIDI0Ny4xIDIyNy43IDI3MCAyMDAgMjcwWiIgZmlsbD0iIzk5OTk5OSIvPgo8cGF0aCBkPSJNMTcwIDE3MEMxNzAgMTUzLjMgMTgzLjMgMTQwIDIwMCAxNDBDMjE2LjcgMTQwIDIzMCAxNTMuMyAyMzAgMTcwQzIzMCAxODYuNyAyMTYuNyAyMDAgMjAwIDIwMEMxODMuMyAyMDAgMTcwIDE4Ni43IDE3MCAxNzBaIiBmaWxsPSIjOTk5OTk5Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2NjY2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
                            }}
                          />
                          {areaRenders.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSlides(prev => {
                                    const currentArea = prev[area] || { renders: 0, screenshots: 0 };
                                    const currentIndex = currentArea.renders || 0;
                                    return {
                                      ...prev,
                                      [area]: {
                                        ...currentArea,
                                        renders: currentIndex > 0 ? currentIndex - 1 : areaRenders.length - 1
                                      }
                                    };
                                  });
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
                              >
                                <ChevronLeft className="w-6 h-6 text-gray-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSlides(prev => {
                                    const currentArea = prev[area] || { renders: 0, screenshots: 0 };
                                    const currentIndex = currentArea.renders || 0;
                                    return {
                                      ...prev,
                                      [area]: {
                                        ...currentArea,
                                        renders: currentIndex < areaRenders.length - 1 ? currentIndex + 1 : 0
                                      }
                                    };
                                  });
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
                              >
                                <ChevronRight className="w-6 h-6 text-gray-700" />
                              </button>
                            </>
                          )}
                          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
                            {getStatusButtons(area, 'renders', activeSlides[area]?.renders || 0)}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[400px] flex items-center justify-center text-sm text-black/50">
                          No renders yet
                        </div>
                      )
                    ) : (
                      areaScreens.length > 0 ? (
                        <div className="relative">
                          <img
                            src={areaScreens[activeSlides[area]?.screenshots || 0]?.imageUrl}
                            className="w-full h-[400px] object-cover cursor-pointer"
                            alt="screenshot"
                            loading="lazy"
                            onClick={() => openLightbox(area, 'screenshots', activeSlides[area]?.screenshots || 0)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              console.error('❌ Screenshot image failed to load:', target.src);
                              console.error('Image error event:', e);
                              target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzE2MS4zIDEwMCAxMzAgMTMxLjMgMTMwIDE3MFYyMzBDMTMwIDI2OC43IDE2MS4zIDMwMCAyMDAgMzAwQzIzOC43IDMwMCAyNzAgMjY4LjcgMjcwIDIzMFYxNzBDMjcwIDEzMS4zIDIzOC43IDEwMCAyMDAgMTAwWk0yMDAgMjcwQzE3Ny45IDI3MCAyNTAgMjQ3LjEgMTUwIDIzMFYxNzBDMTUwIDE0Mi4zIDE3Mi4zIDEyMCAyMDAgMTIwQzIyNy43IDEyMCAyNTAgMTQyLjMgMjUwIDE3MFYyMzBDMjUwIDI0Ny4xIDIyNy43IDI3MCAyMDAgMjcwWiIgZmlsbD0iIzk5OTk5OSIvPgo8cGF0aCBkPSJNMTcwIDE3MEMxNzAgMTUzLjMgMTgzLjMgMTQwIDIwMCAxNDBDMjE2LjcgMTQwIDIzMCAxNTMuMyAyMzAgMTcwQzIzMCAxODYuNyAyMTYuNyAyMDAgMjAwIDIwMEMxODMuMyAyMDAgMTcwIDE4Ni43IDE3MCAxNzBaIiBmaWxsPSIjOTk5OTk5Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMzMwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2NjY2IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiPkltYWdlIG5vdCBhdmFpbGFibGU8L3RleHQ+Cjwvc3ZnPg==';
                            }}
                          />
                          {areaScreens.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSlides(prev => {
                                    const currentArea = prev[area] || { renders: 0, screenshots: 0 };
                                    const currentIndex = currentArea.screenshots || 0;
                                    return {
                                      ...prev,
                                      [area]: {
                                        ...currentArea,
                                        screenshots: currentIndex > 0 ? currentIndex - 1 : areaScreens.length - 1
                                      }
                                    };
                                  });
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
                              >
                                <ChevronLeft className="w-6 h-6 text-gray-700" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSlides(prev => {
                                    const currentArea = prev[area] || { renders: 0, screenshots: 0 };
                                    const currentIndex = currentArea.screenshots || 0;
                                    return {
                                      ...prev,
                                      [area]: {
                                        ...currentArea,
                                        screenshots: currentIndex < areaScreens.length - 1 ? currentIndex + 1 : 0
                                      }
                                    };
                                  });
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100"
                              >
                              <ChevronRight className="w-6 h-6 text-gray-700" />
                            </button>
                          </>
                          )}
                          <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
                            {getStatusButtons(area, 'screenshots', activeSlides[area]?.screenshots || 0)}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[400px] flex items-center justify-center text-sm text-black/50">
                          No screenshots yet
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="mt-4 pl-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-[#2e2e2e]">Products</div>
                      {uniqueProductsWithCount.length > 0 && (
                        <div className="px-2.5 py-0.5 bg-[#d96857] text-white text-[11px] font-bold rounded-full">
                          {uniqueProductsWithCount.length}
                        </div>
                      )}
                    </div>
                    <button
                      className="text-xs font-medium text-[#d96857] hover:text-[#c85745] transition-colors flex items-center gap-1"
                      onClick={() => router.push(`/projects/${projectId}/area/${encodeURIComponent(area)}`)}
                    >
                      Product details →
                    </button>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1.5">{uniqueProductsWithCount.map(({ product: p, count }) => (
                      <div
                        key={p.id}
                        className="flex-shrink-0 cursor-pointer group relative"
                        onClick={() => router.push(`/projects/${projectId}/area/${encodeURIComponent(area)}`)}
                      >
                        <div className="relative w-[80px] h-[80px] rounded-lg">
                          <img
                             src={p.imageUrl}
                             className="w-full h-full object-cover rounded-lg border border-black/5 group-hover:border-[#d96857]/30 transition-all group-hover:shadow-md"
                             alt={p.title}
                          />
                        </div>
                      </div>
                    ))}
                    {/* Add more products button when products exist */}
                    {uniqueProductsWithCount.length > 0 && (
                      <button
                        onClick={() => router.push('/products')}
                        className="flex-shrink-0 w-[80px] h-[80px] rounded-lg border-2 border-dashed border-[#d96857]/30 hover:border-[#d96857]/60 bg-[#d96857]/5 hover:bg-[#d96857]/10 transition-all flex items-center justify-center group"
                      >
                        <svg className="w-8 h-8 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                    {uniqueProductsWithCount.length === 0 && (
                      <button
                        onClick={() => router.push('/products')}
                        className="text-xs text-[#2e2e2e]/60 py-3 px-4 bg-gradient-to-br from-[#d96857]/5 to-[#d96857]/10 rounded-xl border border-[#d96857]/20 hover:border-[#d96857]/40 hover:from-[#d96857]/10 hover:to-[#d96857]/15 transition-all flex items-center gap-2 group"
                      >
                        <svg className="w-4 h-4 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium">Add Products</span>
                        <span className="text-[#2e2e2e]/40 group-hover:text-[#d96857] transition-colors">→</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Delete Project Section - Bottom of Page */}
      <div className="mt-8 pt-6 border-t border-black/10 flex justify-center">
        <Button
          variant="outline"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-6 py-2.5 text-red-600 border-red-600/30 hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 rounded-full"
        >
          <Trash2 className="w-4 h-4" />
          Delete Project
        </Button>
      </div>

      {/* Chat */}
      <CenterModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title={`Project Chat - ${project.name}`}
        size="large"
      >
        <div className="flex flex-col h-full">
          {chatError && (
            <div className="mx-6 mt-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center justify-between flex-shrink-0">
              <span>{chatError}</span>
              <Button
                className="p-1 hover:bg-red-100 rounded-full"
                onClick={() => setChatError(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#f9f9f8] to-white px-6 pt-6 pb-4">
          {messages.map((m) => {
            const hasAttachments = m.attachments && m.attachments.length > 0;
            const hasMeeting = m.meetingInfo;
            const isClient = m.sender === "client";
            const isSystem = m.sender === "system";
            
            // System messages show on left like designer messages
            const showOnRight = isClient;
            
            // Use neutral colors for messages with attachments/meetings
            const useNeutral = isClient && (hasAttachments || hasMeeting);
            
            return (
              <div
                key={m.id}
                className={`mb-5 flex ${showOnRight ? "justify-end" : "justify-start"}`}
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
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</div>
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
                              <ImageIcon className="w-4 h-4 text-[#d96857]" />
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
                  <div className={`text-[10px] text-zinc-400 ${showOnRight ? 'text-right' : 'text-left'} px-1`}>
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
          {(!messages || messages.length === 0) && !isLoadingChat && (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <div className="w-16 h-16 rounded-full bg-[#d96857]/10 flex items-center justify-center mb-4">
                <MessageCircle className="w-8 h-8 text-[#d96857]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2e2e2e] mb-2">No messages yet</h3>
              <p className="text-sm text-zinc-500">Start the conversation to discuss your project</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            {/* Quick Actions */}
            <div className="flex items-center gap-2 mb-3">
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
                    handleChatUpload(files, 'file');
                  }
                };
                input.click();
              }}
              disabled={isLoadingChat}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Add Files</span>
            </button>
            
            <button
              className="flex items-center gap-1.5 text-xs bg-white hover:bg-[#d96857]/5 text-[#d96857] px-3 py-1.5 rounded-full font-medium transition-all border border-[#d96857] disabled:opacity-50"
              onClick={() => setScheduleMeetingOpen(true)}
              disabled={isLoadingChat}
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
                    handleChatUpload(files, 'image');
                  }
                };
                input.click();
              }}
              disabled={isLoadingChat}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Add Images</span>
            </button>
          </div>

          {/* Message Input */}
          <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Type a message…"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  className="w-full rounded-xl border-zinc-200 bg-[#f9f9f8] focus:bg-white px-4 py-3 text-[#2e2e2e] placeholder:text-[#2e2e2e]/40 resize-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (chatText.trim()) {
                        sendChat();
                      }
                    }
                  }}
                  disabled={isLoadingChat}
                />
              </div>
              <Button
                onClick={() => chatText.trim() && sendChat()}
                disabled={isLoadingChat || !chatText.trim()}
                className="rounded-xl bg-[#d96857] text-white px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#c85746] transition-all shadow-sm hover:shadow-md flex-shrink-0"
              >
                {isLoadingChat ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="font-medium">Send</span>
              </Button>
            </div>
          </div>
        </div>
      </CenterModal>

      {/* Schedule Meeting Modal */}
      <CenterModal
        open={scheduleMeetingOpen}
        onClose={() => {
          setScheduleMeetingOpen(false);
          setMeetingDate("");
          setMeetingTime("");
          setChatError(null);
        }}
        title="Schedule Meeting"
        size="medium"
      >
        <div className="px-6 py-5 flex flex-col justify-center">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[#2e2e2e]">
                Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-[#f9f9f8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 focus:border-[#d96857]/30 text-[#2e2e2e] text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[#2e2e2e]">
                Time
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 bg-[#f9f9f8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 focus:border-[#d96857]/30 text-[#2e2e2e] text-sm transition-all"
              />
            </div>
          </div>

          {chatError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs text-red-600">{chatError}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => {
                setScheduleMeetingOpen(false);
                setMeetingDate("");
                setMeetingTime("");
                setChatError(null);
              }}
              variant="outline"
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border-zinc-300 hover:bg-zinc-50 transition-all"
              disabled={isLoadingChat}
            >
              Cancel
            </Button>
            <Button
              onClick={scheduleChatMeeting}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#d96857] text-white hover:bg-[#c85746] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all shadow-sm"
              disabled={isLoadingChat || !meetingDate || !meetingTime}
            >
              {isLoadingChat ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Scheduling...</span>
                </div>
              ) : (
                'Schedule'
              )}
            </Button>
          </div>
        </div>
      </CenterModal>

      {/* Meeting summary */}
      <CenterModal
        open={meetOpen}
        onClose={() => setMeetOpen(false)}
        title="Meeting Summary"
        size="large"
      >
        <div className="p-6">
          {isLoadingMeetings ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-[#d96857] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm text-zinc-500">Loading meetings...</p>
            </div>
          ) : meetingSummaries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[#2e2e2e]/40 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#2e2e2e] mb-2">No Meeting Summaries Yet</h3>
              <p className="text-sm text-[#2e2e2e]/60 mb-4 max-w-md mx-auto">
                Meeting summaries will be automatically generated after your first meeting with us.
              </p>
              <p className="text-xs text-[#2e2e2e]/50">
                Schedule a meeting from the chat to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetingSummaries.map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-white border border-zinc-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[#2e2e2e] mb-1">
                        {meeting.meeting_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <CalendarDays className="w-4 h-4" />
                        <span>{new Date(meeting.meeting_date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}</span>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div>
                      {meeting.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Approved
                        </span>
                      )}
                      {meeting.status === 'changes_needed' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Changes Needed
                        </span>
                      )}
                      {meeting.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Pending Review
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Meeting Minutes Points */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-[#2e2e2e] mb-3">Meeting Minutes:</h4>
                    {(() => {
                      // Parse mom_points if it's a string, otherwise use as is
                      const data = typeof meeting.mom_points === 'string' 
                        ? JSON.parse(meeting.mom_points) 
                        : (meeting.mom_points || {});
                      
                      return (
                        <div className="space-y-4">
                          {/* Summary */}
                          {data.summary && (
                            <div>
                              <p className="text-sm text-[#2e2e2e]/90 leading-relaxed">{data.summary}</p>
                            </div>
                          )}

                          {/* Key Decisions */}
                          {data.key_decisions && Array.isArray(data.key_decisions) && data.key_decisions.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-[#d96857] uppercase tracking-wide mb-2">Key Decisions</h5>
                              <ul className="space-y-1.5 pl-5">
                                {data.key_decisions.map((item: string, idx: number) => (
                                  <li key={idx} className="text-sm text-[#2e2e2e]/80 list-disc">{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Next Steps */}
                          {data.next_steps && Array.isArray(data.next_steps) && data.next_steps.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-[#d96857] uppercase tracking-wide mb-2">Next Steps</h5>
                              <ul className="space-y-1.5 pl-5">
                                {data.next_steps.map((item: string, idx: number) => (
                                  <li key={idx} className="text-sm text-[#2e2e2e]/80 list-disc">{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Items for Team */}
                          {data.action_items_for_team && Array.isArray(data.action_items_for_team) && data.action_items_for_team.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-[#d96857] uppercase tracking-wide mb-2">Action Items for Team</h5>
                              <ul className="space-y-1.5 pl-5">
                                {data.action_items_for_team.map((item: string, idx: number) => (
                                  <li key={idx} className="text-sm text-[#2e2e2e]/80 list-disc">{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Action Items for Designer */}
                          {data.action_items_for_designer && Array.isArray(data.action_items_for_designer) && data.action_items_for_designer.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-[#d96857] uppercase tracking-wide mb-2">Action Items for Designer</h5>
                              <ul className="space-y-1.5 pl-5">
                                {data.action_items_for_designer.map((item: string, idx: number) => (
                                  <li key={idx} className="text-sm text-[#2e2e2e]/80 list-disc">{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Meeting Notes */}
                          {data.meeting_notes && Array.isArray(data.meeting_notes) && data.meeting_notes.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-[#d96857] uppercase tracking-wide mb-2">Meeting Notes</h5>
                              <ul className="space-y-1.5 pl-5">
                                {data.meeting_notes.map((item: string, idx: number) => (
                                  <li key={idx} className="text-sm text-[#2e2e2e]/80 list-disc">{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Client Feedback */}
                  {meeting.client_feedback && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-xs font-semibold text-orange-800 mb-1">Your Feedback:</p>
                      <p className="text-sm text-orange-700">{meeting.client_feedback}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {meeting.status === 'pending' && (
                    <div className="flex gap-2 pt-3 border-t border-zinc-100">
                      <button
                        onClick={() => handleMeetingApproval(meeting.id, 'approved')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setFeedbackModal({ open: true, meetingId: meeting.id });
                          setFeedbackText(meeting.client_feedback || '');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-orange-500 text-orange-600 hover:bg-orange-50 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Request Changes
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CenterModal>

      {/* Feedback Modal */}
      <CenterModal
        open={feedbackModal?.open || false}
        onClose={() => {
          setFeedbackModal({ open: false, meetingId: '' });
          setFeedbackText("");
        }}
        title="Request Changes"
        size="medium"
      >
        <div className="p-5">
          <p className="text-sm text-zinc-600 mb-4">
            Please describe the changes you'd like to see in this meeting summary:
          </p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Enter your feedback here..."
            rows={5}
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-[#f9f9f8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d96857]/20 focus:border-[#d96857]/30 text-[#2e2e2e] text-sm resize-none"
          />
          <div className="flex gap-2.5 mt-4">
            <button
              onClick={() => {
                setFeedbackModal({ open: false, meetingId: null });
                setFeedbackText("");
              }}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-zinc-300 hover:bg-zinc-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (feedbackModal?.meetingId && feedbackText.trim()) {
                  handleMeetingApproval(feedbackModal.meetingId, 'changes_needed', feedbackText.trim());
                }
              }}
              disabled={!feedbackText.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
            >
              Submit Feedback
            </button>
          </div>
        </div>
      </CenterModal>

      {/* Add Area Modal */}
      <CenterModal
        open={addingArea}
        onClose={() => {
          setAddingArea(false);
          setNewAreaName("");
        }}
        title="Add New Area"
        size="medium"
      >
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2e2e2e] mb-2">
              Area Name
            </label>
            <Input
              placeholder="e.g., Living Room, Master Bedroom, Kitchen"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newAreaName.trim()) {
                  handleAddArea();
                }
              }}
              className="w-full"
              autoFocus
            />
            <p className="text-xs text-[#2e2e2e]/50 mt-2">
              Give this area a descriptive name to help organize your design work.
            </p>
          </div>

          {/* Quick suggestions */}
          <div>
            <div className="text-xs font-medium text-[#2e2e2e]/70 mb-2">Quick suggestions:</div>
            <div className="flex flex-wrap gap-2">
              {['Living Room', 'Master Bedroom', 'Kitchen', 'Bathroom', 'Dining Area', 'Study Room', 'Guest Bedroom', 'Balcony'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setNewAreaName(suggestion)}
                  className="px-3 py-1 text-xs rounded-full bg-[#d96857]/10 text-[#d96857] hover:bg-[#d96857] hover:text-white transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleAddArea}
              disabled={!newAreaName.trim()}
              className="flex-1 bg-[#d96857] text-white hover:bg-[#c85745] disabled:opacity-50"
            >
              Add Area
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAddingArea(false);
                setNewAreaName("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CenterModal>

      {/* Project Folder (User Uploaded Files) */}
      <CenterModal
        open={filesOpen}
        onClose={() => {
          setFilesOpen(false);
          setUploadError(null);
        }}
        title="Project Folder"
        size="large"
      >
        <div className="px-6 pb-6">
        {/* Upload Section */}
        <div className="mb-6 p-4 border-2 border-dashed border-[#d96857]/30 rounded-2xl bg-[#d96857]/5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#2e2e2e] mb-1">Upload Files</h3>
              <p className="text-xs text-[#2e2e2e]/60">Add your documents, images, or Google Drive links</p>
            </div>
            <div className="flex gap-2">
              <input
                type="file"
                id="file-upload-input"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileUpload(e.target.files);
                    e.target.value = ''; // Reset input
                  }
                }}
                className="hidden"
                disabled={uploadingFiles}
              />
              <Button
                onClick={() => document.getElementById('file-upload-input')?.click()}
                disabled={uploadingFiles}
                className="bg-[#d96857] text-white hover:bg-[#c85745] px-4 py-2 flex items-center gap-2 disabled:opacity-50"
              >
                {uploadingFiles ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Choose Files</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Google Drive Link Input */}
          <div className="flex gap-2">
            <input
              type="url"
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="Or paste Google Drive link here..."
              className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d96857] focus:border-transparent"
              disabled={savingDriveLink}
            />
            <Button
              onClick={async () => {
                if (!driveLink.trim()) return;
                setSavingDriveLink(true);
                try {
                  const { data: userData } = await supabase.auth.getUser();
                  if (userData.user) {
                    const { error } = await supabase
                      .from('project_user_files')
                      .insert({
                        project_id: projectId,
                        user_id: userData.user.id,
                        file_url: driveLink.trim(),
                        file_name: 'Google Drive Link',
                        file_type: 'link',
                        file_size: 0
                      });
                    
                    if (error) throw error;
                    
                    // Reload files
                    const { data } = await supabase
                      .from('project_user_files')
                      .select('*')
                      .eq('project_id', projectId)
                      .order('created_at', { ascending: false });
                    
                    if (data) setUserFiles(data);
                    setDriveLink('');
                  }
                } catch (error) {
                  console.error('Error saving Drive link:', error);
                  setUploadError('Failed to save Drive link');
                } finally {
                  setSavingDriveLink(false);
                }
              }}
              disabled={!driveLink.trim() || savingDriveLink}
              className="bg-white text-[#d96857] border-2 border-[#d96857] hover:bg-[#d96857] hover:text-white px-4 py-2 disabled:opacity-50 transition-colors"
            >
              {savingDriveLink ? (
                <div className="w-4 h-4 border-2 border-[#d96857] border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </Button>
          </div>
          {uploadError && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {uploadError}
            </div>
          )}
        </div>

        {/* Files Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {userFiles.map((f) => {
            const fileUrl = f.file_url || f.url;
            const fileName = f.file_name || f.name || fileUrl?.split('/').pop() || 'File';
            const fileType = f.file_type || f.type || fileName.split('.').pop()?.toLowerCase() || 'file';
            const isImage = fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg' || fileType === 'gif' || fileType === 'webp';
            const isDriveLink = fileType === 'link' || fileUrl?.includes('drive.google.com');
            
            return (
            <a
              key={f.id}
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="group relative bg-white border-2 border-zinc-200 rounded-2xl hover:border-[#d96857] hover:shadow-xl hover:shadow-[#d96857]/10 transition-all duration-200 overflow-hidden cursor-pointer"
            >
              {/* Thumbnail/Icon Area */}
              <div className="aspect-square bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center relative overflow-hidden">
                {isDriveLink ? (
                  <div className="flex flex-col items-center justify-center">
                    <svg className="w-16 h-16 text-[#d96857]" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                    </svg>
                    <span className="text-xs font-medium text-[#d96857] mt-2">Google Drive</span>
                  </div>
                ) : isImage ? (
                  <div className="absolute inset-0">
                    <img 
                      src={fileUrl} 
                      alt={fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : fileType === 'pdf' ? (
                  <svg className="w-16 h-16 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-16 h-16 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                
                {/* Type Badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-white/95 backdrop-blur-sm shadow-lg">
                  <span className="text-[10px] font-bold text-[#d96857] uppercase tracking-wide">
                    {isDriveLink ? 'Drive' : fileType}
                  </span>
                </div>

                {/* Hover Action */}
                <div className="absolute inset-0 bg-[#d96857]/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center">
                    <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    <span className="text-xs font-medium">Open</span>
                  </div>
                </div>
              </div>
              
              {/* File Name */}
              <div className="p-3 bg-white">
                <p className="text-xs font-semibold text-[#2e2e2e] truncate group-hover:text-[#d96857] transition-colors" title={fileName}>
                  {fileName}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {isDriveLink ? 'Google Drive Link' :
                   isImage ? 'Image' : 
                   fileType === 'pdf' ? 'PDF' : 
                   fileType === 'doc' || fileType === 'docx' ? 'Word' :
                   fileType === 'xls' || fileType === 'xlsx' ? 'Excel' :
                   fileType === 'dwg' ? 'AutoCAD' :
                   'Document'}
                </p>
              </div>
            </a>
            );
          })}
          
          {userFiles.length === 0 && (
            <div className="col-span-full text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#2e2e2e] mb-2">No files uploaded yet</h3>
              <p className="text-sm text-zinc-500">Click "Choose Files" to upload documents</p>
            </div>
          )}
        </div>
        </div>
      </CenterModal>

      {/* Final Files (Team Uploaded - View Only) */}
      <CenterModal
        open={finalFilesOpen}
        onClose={() => setFinalFilesOpen(false)}
        title="Final Files"
        size="large"
      >
        <div className="px-6 pb-6">
          {/* Files Grid - View Only */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {finalFiles.map((f) => {
              const fileUrl = f.file_url || f.url;
              const fileName = f.file_name || f.name || fileUrl?.split('/').pop() || 'File';
              const fileType = f.file_type || f.type || fileName.split('.').pop()?.toLowerCase() || 'file';
              const isImage = fileType === 'png' || fileType === 'jpg' || fileType === 'jpeg' || fileType === 'gif' || fileType === 'webp';
              const isLocked = !isDemoProject && !finalFilesUnlocked;
              
              return (
              <a
                key={f.id}
                href={isLocked ? undefined : fileUrl}
                target={isLocked ? undefined : "_blank"}
                rel={isLocked ? undefined : "noreferrer"}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                  }
                }}
                className={`group relative bg-white border-2 rounded-2xl transition-all duration-200 overflow-hidden ${
                  isLocked 
                    ? 'border-gray-300 cursor-not-allowed' 
                    : 'border-zinc-200 hover:border-[#d96857] hover:shadow-xl hover:shadow-[#d96857]/10 cursor-pointer'
                }`}
              >
                {/* Thumbnail/Icon Area */}
                <div className="aspect-square bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center relative overflow-hidden">
                  {isImage ? (
                    <div className="absolute inset-0">
                      <img 
                        src={fileUrl} 
                        alt={fileName}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isLocked ? 'blur-sm' : 'group-hover:scale-105'
                        }`}
                      />
                      {!isLocked && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  ) : fileType === 'pdf' ? (
                    <svg className="w-16 h-16 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : fileType === 'xlsx' || fileType === 'xls' ? (
                    <svg className="w-16 h-16 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg className="w-16 h-16 text-[#d96857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  
                  {/* Type Badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-white/95 backdrop-blur-sm shadow-lg">
                    <span className="text-[10px] font-bold text-[#d96857] uppercase tracking-wide">
                      {fileType}
                    </span>
                  </div>

                  {/* Lock Overlay or Hover Action */}
                  {isLocked ? (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="text-white text-center px-2">
                        <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-xs font-medium">Complete payment to unlock</span>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-[#d96857]/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-center">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-xs font-medium">Download</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* File Name & Description */}
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-[#2e2e2e] truncate group-hover:text-[#d96857] transition-colors" title={fileName}>
                    {fileName}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {fileType === 'pdf' ? 'PDF' : 
                     fileType === 'xlsx' || fileType === 'xls' ? 'Excel' :
                     fileType === 'dwg' ? 'AutoCAD' :
                     fileType === 'doc' || fileType === 'docx' ? 'Word' :
                     isImage ? 'Image' :
                     'Document'}
                  </p>
                  {f.description && (
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2" title={f.description}>{f.description}</p>
                  )}
                </div>
              </a>
            );
            })}
            
            {finalFiles.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-[#2e2e2e] mb-2">No final files yet</h3>
                <p className="text-sm text-zinc-500">Final files will appear here once uploaded by our team</p>
              </div>
            )}
          </div>
        </div>
      </CenterModal>

      {/* Fullscreen Lightbox for Renders/Screenshots */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 animate-in fade-in duration-300"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all z-10 border border-white/20"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Image Counter */}
          <div className="absolute top-6 left-6 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-medium border border-white/20">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>

          {/* Main Image */}
          <div 
            className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImages[lightboxIndex]?.imageUrl}
              alt={`${lightboxType} ${lightboxIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />

            {/* Navigation Arrows */}
            {lightboxImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevLightboxImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/90 hover:bg-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
                >
                  <ChevronLeft className="w-7 h-7 text-[#2e2e2e]" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextLightboxImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/90 hover:bg-white shadow-2xl flex items-center justify-center transition-all hover:scale-110"
                >
                  <ChevronRight className="w-7 h-7 text-[#2e2e2e]" />
                </button>
              </>
            )}
          </div>

          {/* Keyboard hint */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/70 text-xs border border-white/20">
            Press ESC to close • Use arrow keys to navigate
          </div>
        </div>
      )}

      {/* Area Products Slide Panel */}
      {openArea && (
        <ProductSlidePanel
          open={!!openArea}
          onClose={() => setOpenArea(null)}
          area={openArea}
          products={productsFor(openArea)}
          projectAddress={project.address || ''}
          projectId={project.id}
          side={openAreaSide}
        />
      )}

      {/* Delete Confirmation Modal */}
      <CenterModal
        open={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        title="Delete Project?"
        size="medium"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4 p-5 bg-red-50 border border-red-100 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 mb-1.5">Warning: This action cannot be undone</h3>
              <p className="text-xs text-red-700 leading-relaxed">
                All project data, files, and chat history will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="p-5 bg-gray-50 rounded-xl">
            <p className="text-sm text-[#2e2e2e] font-semibold mb-3">Project Details:</p>
            <div className="text-sm text-[#2e2e2e]/70 space-y-2">
              <div><span className="font-medium text-[#2e2e2e]">Name:</span> {project.name}</div>
              <div><span className="font-medium text-[#2e2e2e]">Code:</span> {projectCode}</div>
              {project.address && <div><span className="font-medium text-[#2e2e2e]">Address:</span> {project.address}</div>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 py-3"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Yes, Delete Project</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="flex-1 py-3"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CenterModal>

      {/* Quotes & Bills Modal */}
      <CenterModal
        open={quotesOpen}
        onClose={() => setQuotesOpen(false)}
        title="Quotes & Bills"
        size="large"
      >
        <div className="p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#2e2e2e]/10">
            <button
              onClick={() => setQuotesTab('quotes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                quotesTab === 'quotes'
                  ? 'border-[#d96857] text-[#d96857]'
                  : 'border-transparent text-[#2e2e2e]/60 hover:text-[#2e2e2e]'
              }`}
            >
              Quotes
            </button>
            <button
              onClick={() => setQuotesTab('bills')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                quotesTab === 'bills'
                  ? 'border-[#d96857] text-[#d96857]'
                  : 'border-transparent text-[#2e2e2e]/60 hover:text-[#2e2e2e]'
              }`}
            >
              Bills
            </button>
          </div>

          {/* Content */}
          {quotesTab === 'quotes' ? (
            isLoadingQuotesBills ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-[#d96857] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#2e2e2e]/60">Loading quotes...</p>
              </div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-[#d96857]/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-[#d96857]" />
                </div>
                <h3 className="text-lg font-semibold text-[#2e2e2e] mb-2">No Quotes Yet</h3>
                <p className="text-sm text-[#2e2e2e]/60">Our team will prepare detailed quotations for your project</p>
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => {
                  // Calculate payment amounts
                  const totalAmount = Number(quote.total_amount) || 0;
                  const advanceAmount = Math.round(totalAmount * 0.3);
                  const remainingAmount = totalAmount - advanceAmount;
                  
                  return (
                    <div 
                      key={quote.id} 
                      className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#d96857]/30 hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                      onClick={async (e) => {
                        // Don't trigger if clicking on payment buttons
                        if ((e.target as HTMLElement).closest('.payment-actions')) return;
                        
                        console.log('Generating quote for:', { quoteId: quote.id, projectId });
                        try {
                          // Generate detailed quote PDF
                          const response = await fetch('/api/quote/generate', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                              quoteId: quote.id,
                              projectId: projectId
                            }),
                          });

                          const data = await response.json();

                          if (data.success && data.html) {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(data.html);
                              printWindow.document.close();
                              setTimeout(() => {
                                printWindow.print();
                              }, 500);
                            }
                          } else {
                            console.error('Quote generation failed:', data);
                            alert(`Failed to generate quote: ${data.error || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('Quote generation error:', error);
                          alert(`Failed to generate quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }}
                    >
                      {/* Left side: Quote Icon and Quote Details */}
                      <div className="flex items-center gap-4">
                        {/* Quote Icon */}
                        <div className="w-12 h-12 rounded-lg bg-[#d96857]/10 flex items-center justify-center group-hover:bg-[#d96857]/20 transition-colors">
                          <FileText className="w-6 h-6 text-[#d96857]" />
                        </div>
                        
                        {/* Quote Details */}
                        <div>
                          <h3 className="font-medium text-[#2e2e2e] group-hover:text-[#d96857] transition-colors">
                            Design Quote
                          </h3>
                          <p className="text-sm text-[#2e2e2e]/60">
                            {quote.estimate_number}
                          </p>
                          <p className="text-lg font-bold text-[#d96857] mt-1">
                            ₹{totalAmount.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Right side: Payment Actions */}
                      {quote.status === 'active' && (
                        <div className="payment-actions flex items-center gap-3">
                          {quote.estimate_type === 'initial' && (
                            <div className="text-right">
                              <button 
                                className="bg-[#d96857] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#c85745] transition-colors mb-1 block"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentEstimate({
                                    ...quote,
                                    advance_amount: advanceAmount
                                  });
                                  setPaymentType('advance');
                                  setPaymentModalOpen(true);
                                }}
                              >
                                Pay Advance (30%)
                              </button>
                              <p className="text-xs text-[#2e2e2e]/60">
                                ₹{advanceAmount.toLocaleString('en-IN')} to start project
                              </p>
                            </div>
                          )}
                          {quote.estimate_type === 'final' && (
                            <div className="text-right">
                              <button 
                                className="bg-[#d96857] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#c85745] transition-colors mb-1 block"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentEstimate({
                                    ...quote,
                                    remaining_amount: remainingAmount
                                  });
                                  setPaymentType('balance');
                                  setPaymentModalOpen(true);
                                }}
                              >
                                Pay Balance (70%)
                              </button>
                              <p className="text-xs text-[#2e2e2e]/60">
                                ₹{remainingAmount.toLocaleString('en-IN')} to complete project
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            // Bills Tab - Show both product bills and 3D work payment bills
            isLoadingQuotesBills ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-[#d96857] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-600">Loading bills...</p>
              </div>
            ) : bills.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bills Yet</h3>
                <p className="text-sm text-gray-600">Bills will appear here after payments</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {bills.map((bill) => {
                  // Generate bill name based on type
                  const billName = bill.file_name 
                    ? bill.file_name 
                    : `BILL-${bill.id.substring(0, 8).toUpperCase()}.pdf`;
                  
                  return (
                  <div
                    key={bill.id}
                    className="group flex flex-col items-center p-5 rounded-2xl border border-gray-200 hover:border-[#d96857] hover:shadow-lg transition-all cursor-pointer bg-white"
                    onClick={async () => {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        
                        if (!session) {
                          alert('Please log in to download bill');
                          return;
                        }

                        // Check if this is a product bill or 3D work payment
                        if (bill.order_id) {
                          // Product bill - generate from order
                          const response = await fetch('/api/bill/generate', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                              orderId: bill.order_id,
                            }),
                          });

                          const data = await response.json();

                          if (data.success && data.html) {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(data.html);
                              printWindow.document.close();
                              setTimeout(() => {
                                printWindow.print();
                              }, 500);
                            }
                          } else {
                            alert('Failed to generate bill');
                          }
                        } else if (bill.amount) {
                          // 3D work payment - generate payment receipt PDF
                          const response = await fetch('/api/payment/generate-bill', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                              paymentId: bill.id,
                            }),
                          });

                          const data = await response.json();

                          if (data.success && data.html) {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(data.html);
                              printWindow.document.close();
                              setTimeout(() => {
                                printWindow.print();
                              }, 500);
                            }
                          } else {
                            alert('Failed to generate payment receipt');
                          }
                        }
                      } catch (error) {
                        console.error('Bill generation error:', error);
                        alert('Failed to generate bill');
                      }
                    }}
                  >
                    {/* PDF Icon */}
                    <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/>
                        <path d="M14 2v6h6M9.5 13.5c0-.28.22-.5.5-.5h1c.28 0 .5.22.5.5v3c0 .28-.22.5-.5.5h-1a.5.5 0 01-.5-.5v-3zM12 13h1.5c.28 0 .5.22.5.5v.5c0 .28-.22.5-.5.5H12v2h-.5v-3.5zM7 13h1c.28 0 .5.22.5.5v.5c0 .28-.22.5-.5.5H7v1h1.5v.5H6.5V13z" fill="white"/>
                      </svg>
                    </div>
                    
                    {/* Bill Name */}
                    <p className="text-xs text-center text-gray-600 font-medium">
                      {billName}
                    </p>
                  </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </CenterModal>

      {/* Request Change Modal */}
      {requestChangeModal?.open && (
        <CenterModal
          open={requestChangeModal.open}
          onClose={() => {
            setRequestChangeModal(null);
            setChangeNotes("");
          }}
          title="Request Changes"
          size="medium"
        >
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Please describe what changes you'd like to see in this {requestChangeModal.type === 'renders' ? 'render' : 'screenshot'} for {requestChangeModal.area}:
            </p>
            <textarea
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Describe the changes you want..."
              className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d96857]/50 resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setRequestChangeModal(null);
                  setChangeNotes("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitRequestChange}
                disabled={!changeNotes.trim()}
                className="flex-1 px-4 py-2.5 bg-[#d96857] text-white rounded-xl hover:bg-[#c85745] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Request
              </button>
            </div>
          </div>
        </CenterModal>
      )}

      {/* Payment Modal */}
      <CenterModal
        open={paymentModalOpen}
        onClose={() => {
          if (!isProcessingPayment) {
            setPaymentModalOpen(false);
            setPaymentError(null);
          }
        }}
        title={`${paymentType === 'advance' ? 'Advance' : 'Balance'} Payment`}
        size="medium"
      >
        {currentEstimate && (
          <div className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-[#2e2e2e] mb-2">
                {paymentType === 'advance' ? 'Advance Payment (30%)' : 'Balance Payment (70%)'}
              </h3>
              <p className="text-3xl font-bold text-[#d96857]">
                ₹{(paymentType === 'advance' 
                  ? Math.round(Number(currentEstimate.total_amount) * 0.3) 
                  : Math.round(Number(currentEstimate.total_amount) * 0.7)
                ).toLocaleString('en-IN')}
              </p>
              <p className="text-sm text-[#2e2e2e]/60 mt-2">
                Quote: {currentEstimate.estimate_number}
              </p>
            </div>
            
            <div className="bg-[#d96857]/10 border border-[#d96857]/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-[#2e2e2e]">
                {paymentType === 'advance' 
                  ? 'This advance payment will unlock the initial design process and iterations.'
                  : 'This final payment will complete your project and unlock all final deliverables.'
                }
              </p>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-600">{paymentError}</p>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPaymentModalOpen(false)}
                disabled={isProcessingPayment}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#d96857] hover:bg-[#c85745] disabled:opacity-50"
                onClick={processPayment}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </Button>
            </div>
          </div>
        )}
      </CenterModal>
    </AuthGuard>
  );
}
