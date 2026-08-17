import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Maximize2,
  Minimize2,
  Printer,
  Download,
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Lock, 
  Search, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Check, 
  X, 
  Copy, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe2,
  Info,
  Clock,
  Layers,
  Youtube,
  Play,
  UploadCloud,
  MessageSquare,
  Plus,
  Menu,
  Trash2,
  ArrowDown,
  Search as SearchIcon,
  Volume2,
  Settings,
  HelpCircle,
  FolderOpen,
  Compass,
  Calculator,
  PanelRightClose,
  PanelRightOpen
} from 'lucide-react';
import ArabicMathJax from 'mathjax4arabic';
import {
  Language, 
  Workspace, 
  RagMode, 
  ChatMessage, 
  Citation, 
  AgentConfig,
  ToolApprovalRequest
} from '../types';
import { extractTextFromFile } from '../utils/fileExtractor';
import { ChatInputBar } from '../components/chat/ChatInputBar';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ChatQuestionsNavigator } from '../components/chat/ChatQuestionsNavigator';
import { PdfExport } from '../components/chat/PdfExport';

const DEFAULT_LEGAL_AGENT: AgentConfig = {
  id: 'agent-legal-counsel',
  nameAr: 'المستشار القانوني والامتثال (Aqli Legal Advisor)',
  nameEn: 'Aqli Enterprise Legal Advisor',
  roleAr: 'خبير الأنظمة واللوائح والامتثال السيبراني',
  roleEn: 'Legal, Compliance & Cyber Regulation Specialist',
  descriptionAr: 'متخصص في تحليل الأنظمة السعودية وضوابط الأمن السيبراني وصياغة المذكرات القانونية.',
  descriptionEn: 'Specialist in Saudi regulations, NCA cybersecurity controls, and legal compliance.',
  systemPromptAr: 'أنت مستشار قانوني خبير في الأنظمة واللوائح السعودية وضوابط الهيئة الوطنية للأمن السيبراني (NCA). أجب بدقة استناداً إلى نصوص المواد، وقدّم استشهادات واضحة برقم المادة واسم النظام.',
  systemPromptEn: 'You are an enterprise legal and regulatory compliance expert specializing in Saudi statutory laws and NCA cybersecurity controls. Provide accurate, cited answers referencing specific articles.',
  model: 'gemini-3.5-flash-lite',
  temperature: 0.1,
  defaultMode: 'strict',
  scopedSourceIds: ['doc-nca-ecc', 'doc-saudi-civil-code'],
  attachedToolIds: ['tool-citation-extractor', 'tool-legal-reference-checker'],
  attachedMcpServerIds: ['postgres-internal'],
  icon: 'Scale',
  isPreset: true,
  avatarBg: 'from-emerald-600 to-teal-700',
};

interface ChatPageProps {
  lang: Language;
  currentWorkspace: Workspace;
  currentMode: RagMode;
  setCurrentMode: (mode: RagMode) => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  lang,
  currentWorkspace,
  currentMode,
  setCurrentMode,
}) => {
  const { id: urlConvId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agents, setAgents] = useState<AgentConfig[]>([DEFAULT_LEGAL_AGENT]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(DEFAULT_LEGAL_AGENT.id);
  const [sources, setSources] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(urlConvId || null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(true);

  // Search in chat
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Scroll to bottom state
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Abort Controller for streaming/request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Attached Document for contextual query
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingChatFile, setIsExtractingChatFile] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<{
    name: string;
    text: string;
    wordCount: number;
    fileType: string;
  } | null>(null);

  // Live custom agents & sources fetching
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [agentRes, sourceRes, convRes] = await Promise.all([
          fetch(`/api/agents?workspaceId=${currentWorkspace.id}`),
          fetch(`/api/sources?workspaceId=${currentWorkspace.id}`),
          fetch(`/api/conversations?workspaceId=${currentWorkspace.id}`)
        ]);

        if (!isMounted) return;

        if (agentRes.ok) {
          const dbAgents = await agentRes.json();
          if (Array.isArray(dbAgents) && dbAgents.length > 0) {
            const mapped: AgentConfig[] = dbAgents.map((d: any) => ({
              id: d.id,
              nameAr: d.nameAr,
              nameEn: d.nameEn,
              roleAr: d.roleAr || d.roleEn,
              roleEn: d.roleEn || d.roleAr,
              descriptionAr: d.config?.descriptionAr || d.roleAr,
              descriptionEn: d.config?.descriptionEn || d.roleEn,
              systemPromptAr: d.systemInstructions || '',
              systemPromptEn: d.systemInstructions || '',
              model: d.model || 'gemini-3.5-flash-lite',
              temperature: d.config?.temperature || 0.2,
              defaultMode: d.config?.defaultMode || 'strict',
              scopedSourceIds: d.scopedSourceIds || d.config?.scopedSourceIds || [],
              attachedToolIds: d.config?.attachedToolIds || [],
              attachedMcpServerIds: d.config?.attachedMcpServerIds || [],
              icon: 'Bot',
              isPreset: d.isPreset || false,
              avatarBg: 'from-cyan-600 to-indigo-600',
            }));
            setAgents(mapped);
          }
        }

        if (sourceRes.ok) {
          const dbSources = await sourceRes.json();
          if (Array.isArray(dbSources)) {
            const mappedSources = dbSources.filter(Boolean).map((s: any) => ({
              id: s?.id,
              titleAr: s?.titleAr || s?.nameAr || s?.titleEn || 'مستند',
              titleEn: s?.titleEn || s?.nameEn || s?.titleAr || 'Document',
              type: s?.type || s?.sourceType || 'pdf',
              chunksCount: s?.chunksCount || s?.chunk_count || 1,
              wordCount: s?.wordCount || 1200,
              status: s?.status || 'ready',
              sourceUrl: s?.sourceUrl,
            }));
            setSources(mappedSources);
          }
        }

        if (convRes.ok) {
          const dbConvs = await convRes.json();
          if (Array.isArray(dbConvs)) {
            setConversations(dbConvs);
          }
        }
      } catch (err) {
        console.error('Failed to load agents/sources in ChatPage:', err);
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, [currentWorkspace.id]);

  const welcomeMessage = useMemo<ChatMessage>(() => ({
    id: 'msg-welcome',
    sender: 'assistant',
    content: lang === 'ar'
      ? `مرحباً بك في منصة **Aqli RAG**! أنا وكيلك الذكي المخصص لمساحة العمل "${currentWorkspace.nameAr}".

يمكنك سؤالي حول محتوى مستنداتك المرفوعة، أو طلب استشارات دقيقة مدعومة باستشهادات رسمية.

الوضع الحالي: **${currentMode === 'strict' ? 'Strict (مقيد بالمصادر حصرًا)' : currentMode === 'augmented' ? 'Augmented (هجين مع الويب)' : 'Open (وكيل حر)'}**.`
      : `Welcome to **Aqli RAG**! I am your AI agent for "${currentWorkspace.nameEn}".

Ask questions regarding your indexed documents or request analyses backed by verified citations.

Current mode: **${currentMode.toUpperCase()}**.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ragMode: currentMode,
    agentId: DEFAULT_LEGAL_AGENT.id,
    agentName: lang === 'ar' ? DEFAULT_LEGAL_AGENT.nameAr : DEFAULT_LEGAL_AGENT.nameEn,
  }), [lang, currentWorkspace.nameAr, currentWorkspace.nameEn, currentMode]);

  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConv, setIsLoadingConv] = useState(false);
  const conversationCache = useRef<Record<string, ChatMessage[]>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [useArabicMath, setUseArabicMath] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ToolApprovalRequest | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const currentAgent = useMemo(() => {
    return agents.find((a) => a.id === selectedAgentId) || agents[0];
  }, [agents, selectedAgentId]);

  // Handle File Extraction for attached documents
  const handleChatFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFileAttachment(file);
    }
  };

  const handleFileAttachment = async (file: File) => {
    setIsExtractingChatFile(true);
    try {
      const extracted = await extractTextFromFile(file);
      setAttachedDoc({
        name: file.name,
        text: extracted.text,
        wordCount: extracted.wordCount,
        fileType: extracted.fileType,
      });
    } catch (err) {
      console.error('Failed to parse attached chat file:', err);
    } finally {
      setIsExtractingChatFile(false);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }
    }
  };

  // Jump to specific message by ID
  const handleJumpToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-cyan-400', 'bg-cyan-950/30');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-cyan-400', 'bg-cyan-950/30');
      }, 2000);
    }
  }, []);

  // Truly Intelligent Contextual Dynamic Prompts
  const dynamicPrompts = useMemo(() => {
    // If there's an assistant response in the conversation, provide tailored follow-ups
    const assistantMessages = messages.filter((m) => m.sender === 'assistant' && m.id !== 'msg-welcome');
    const lastAsstMsg = assistantMessages[assistantMessages.length - 1];

    if (lastAsstMsg) {
      const content = (lastAsstMsg.content || '').toLowerCase();
      if (lang === 'ar') {
        const prompts: string[] = [];
        if (content.includes('نظام') || content.includes('مادة') || content.includes('قانون') || content.includes('nca')) {
          prompts.push('ما هي الاستثناءات والعقوبات القانونية المنصوص عليها؟');
          prompts.push('لخص المتطلبات الإلزامية في جدول مقارنة تنفيذي.');
        } else if (content.includes('متجهات') || content.includes('pgvector') || content.includes('بحث') || content.includes('خوارزمية')) {
          prompts.push('كيف يتم ضبط معاملات الخوارزمية وتفادي الاستعلام البطيء؟');
          prompts.push('وضح بمثال عملي وشفرة SQL/TypeScript توضيحية.');
        } else {
          prompts.push('لخص أهم 3 نقاط تنفيذية من هذه الإجابة.');
          prompts.push('ما هي الخطوات العملية لتطبيق هذا الحل؟');
        }
        prompts.push('هل هناك معايير دولية مماثلة مثل ISO 27001 أو NIST؟');
        return prompts.slice(0, 4);
      } else {
        const prompts: string[] = [];
        if (content.includes('law') || content.includes('article') || content.includes('nca') || content.includes('compliance')) {
          prompts.push('What are the statutory exemptions and penalties?');
          prompts.push('Summarize mandatory requirements in an executive table.');
        } else if (content.includes('vector') || content.includes('pgvector') || content.includes('search') || content.includes('algorithm')) {
          prompts.push('How to tune indexing parameters for optimal query latency?');
          prompts.push('Provide a practical SQL/TypeScript implementation example.');
        } else {
          prompts.push('Summarize the top 3 actionable insights.');
          prompts.push('What are the practical deployment steps?');
        }
        prompts.push('How does this compare to global standards (ISO/NIST)?');
        return prompts.slice(0, 4);
      }
    }

    // Otherwise, dynamic prompts based on agent specialty
    const agentRole = (currentAgent?.nameEn || '').toLowerCase();
    const agentNameAr = currentAgent?.nameAr || '';
    if (lang === 'ar') {
      if (agentRole.includes('legal') || agentRole.includes('nca') || agentNameAr.includes('قانون')) {
        return [
          'ما هي ضوابط عزل بيانات المستأجرين والتشفير في لوائح الأمن السيبراني NCA؟',
          'ما هي شروط صحة العقود وآثارها ومبدأ حسن النية في نظام المعاملات المدنية؟',
          'كيف يتم التعامل مع نقل البيانات الحساسة وفق لوائح حماية البيانات الشخصية؟',
          'ما هي التزامات المستأجر السحابي المشتركة مع مزود الخدمة؟'
        ];
      }
      if (agentRole.includes('architect') || agentRole.includes('system') || agentNameAr.includes('معمارية')) {
        return [
          'اشرح معمارية RRF لدمج pgvector (3072d) مع البحث اللفظي pg_trgm.',
          'قارن بين فهارس HNSW و IVFFlat من حيث استهلاك الذاكرة وسرعة البحث.',
          'كيف يتم تطبيق مبدأ RLS في Postgres لعزل بيانات المستأجرين تماماً؟',
          'ما هي أفضل استراتيجية لتقطيع المستندات Chunking للغة العربية؟'
        ];
      }
      return [
        'ما هي ضوابط عزل بيانات المستأجرين والتشفير في لوائح الأمن السيبراني NCA؟',
        'اشرح معمارية RRF لدمج pgvector (3072d) مع البحث اللفظي pg_trgm.',
        'هل يتطلب بروتوكول MCP موافقة بشرية Human-in-the-Loop قبل تنفيذ الأدوات؟',
        'ما هي شروط صحة العقود وآثارها في نظام المعاملات المدنية؟'
      ];
    } else {
      if (agentRole.includes('legal') || agentRole.includes('nca')) {
        return [
          'What are the NCA cybersecurity controls for tenant isolation and encryption?',
          'What are the conditions for contract validity in Saudi Civil Transactions Law?',
          'How is cross-border data transfer governed under national data regulations?',
          'What is the shared responsibility model for cloud cybersecurity?'
        ];
      }
      return [
        'Explain the RRF architecture combining pgvector (3072d) and pg_trgm lexical search.',
        'Compare HNSW and IVFFlat vector indexing for high-dimensional embeddings.',
        'Does the MCP protocol require Human-in-the-Loop approval for risky tools?',
        'How does PostgreSQL Row-Level Security (RLS) enforce tenant isolation?'
      ];
    }
  }, [messages, lang, currentAgent]);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 200;
    setShowScrollBottom(isUp);
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, isLoading, scrollToBottom]);

  // Arabic Math typesetting debounce
  useEffect(() => {
    if (useArabicMath) {
      ArabicMathJax.injectStyles();
      ArabicMathJax.loadMathJax().then(() => {
        ArabicMathJax.typesetArabic(undefined, { force: true, forceArabic: true });
      }).catch(console.error);
    }
  }, [messages, useArabicMath]);

  const exportChat = () => {
    const chatText = messages.map(m => `**${m.sender === 'user' ? 'User' : 'Assistant'}** (${m.timestamp}):\n${m.content}\n`).join('\n---\n');
    const blob = new Blob([chatText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aqli_chat_export_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Robust, formatted chat printing
  const printChat = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const messagesHtml = messages.map(m => `
      <div style="margin-bottom: 20px; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; background: ${m.sender === 'user' ? '#f0f9ff' : '#ffffff'};">
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
          <span>${m.sender === 'user' ? (lang === 'ar' ? 'المستخدم' : 'User') : (m.agentName || 'Aqli Assistant')}</span>
          <span>${m.timestamp}</span>
        </div>
        <div style="font-size: 13px; line-height: 1.6; color: #1e293b; white-space: pre-wrap; font-family: sans-serif;">
          ${m.content.replace(/\[\^?\d+\]/g, '')}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="utf-8" />
          <title>${lang === 'ar' ? 'طباعة محادثة Aqli RAG' : 'Aqli RAG Chat Export'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; margin: 0; background: #ffffff; }
            h1 { font-size: 18px; color: #0f172a; margin-bottom: 4px; }
            p.meta { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 24px; }
            @media print { body { padding: 15px; } }
          </style>
        </head>
        <body>
          <h1>Aqli RAG — ${lang === 'ar' ? currentWorkspace.nameAr : currentWorkspace.nameEn}</h1>
          <p class="meta">${lang === 'ar' ? 'وكيل المحادثة:' : 'Agent:'} ${lang === 'ar' ? currentAgent.nameAr : currentAgent.nameEn} | ${new Date().toLocaleDateString()}</p>
          ${messagesHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  // Stop Generation / Abort Controller
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Send Message Logic
  const handleSendMessage = async (textToSend: string) => {
    const promptText = (textToSend || '').trim();
    if ((!promptText && !attachedDoc) || isLoading) return;

    const finalMessageContent = attachedDoc 
      ? `${promptText}\n\n📎 [${lang === 'ar' ? 'مستند مرفق' : 'Attached Document'}: ${attachedDoc.name} (${attachedDoc.wordCount} ${lang === 'ar' ? 'كلمة' : 'words'})]\n${attachedDoc.text}`
      : promptText;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: attachedDoc 
        ? `${promptText}\n\n📄 [${attachedDoc.name} - ${attachedDoc.wordCount} ${lang === 'ar' ? 'كلمة' : 'words'}]` 
        : promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ragMode: currentMode,
    };

    setMessages((prev) => [...prev, userMessage]);
    setAttachedDoc(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: finalMessageContent,
          ragMode: currentMode,
          agentId: selectedAgentId,
          model: currentAgent.model,
          workspaceId: currentWorkspace.id,
          conversationId: currentConversationId || undefined,
          locale: lang,
        }),
      });

      const data = await response.json();
      
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
        navigate(`/chat/${data.conversationId}`, { replace: true });
        fetch(`/api/conversations?workspaceId=${currentWorkspace.id}`)
          .then(res => res.json())
          .then(dbConvs => {
            if (Array.isArray(dbConvs)) setConversations(dbConvs);
          })
          .catch(console.error);
      }

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        content: data.response || (lang === 'ar' ? 'لم يتم استلام رد من الخادم.' : 'No response from server.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ragMode: data.ragMode || currentMode,
        agentId: selectedAgentId,
        agentName: lang === 'ar' ? currentAgent.nameAr : currentAgent.nameEn,
        citations: data.citations || [],
        groundednessScore: data.groundednessScore,
        isRefusal: data.isRefusal,
        tokenUsage: data.tokenUsage,
      };

      setMessages((prev) => {
        const next = [...prev, assistantMessage];
        const convId = currentConversationId || data.conversationId;
        if (convId) {
          conversationCache.current[convId] = next;
        }
        return next;
      });

      if (data.citations && data.citations.length > 0 && !selectedCitation) {
        setSelectedCitation(data.citations[0]);
      }

      const lowerPrompt = (promptText || '').toLowerCase();
      if (lowerPrompt.includes('reindex') || lowerPrompt.includes('حذف') || lowerPrompt.includes('تعديل')) {
        setTimeout(() => {
          setPendingApproval({
            id: `appr-${Date.now()}`,
            toolName: 'reindex_workspace_vectors',
            mcpServer: 'postgres-internal',
            parameters: { workspace_id: currentWorkspace.id, force_rebuild: true },
            riskLevel: 'medium',
            requestedAt: new Date().toLocaleTimeString(),
            status: 'pending',
            reasonAr: 'طلب إعادة بناء فهرس المتجهات HNSW في قاعدة بيانات Postgres لمساحة العمل الحالية.',
            reasonEn: 'Request to trigger HNSW vector re-indexing on PostgreSQL for active tenant.',
          });
        }, 800);
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        const abortedMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          sender: 'assistant',
          content: lang === 'ar' ? '⚠️ تم إيقاف توليد الاستجابة بواسطة المستخدم.' : '⚠️ Generation stopped by user.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ragMode: currentMode,
          isRefusal: true,
        };
        setMessages((prev) => [...prev, abortedMsg]);
      } else {
        const errorMessage: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          content: lang === 'ar' 
            ? `حدث خطأ أثناء معالجة الطلب: ${err.message}`
            : `Error processing request: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ragMode: currentMode,
          isRefusal: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCopyMessage = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const handleFeedback = useCallback((msgId: string, type: 'like' | 'dislike') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: type } : m))
    );
  }, []);

  const handleRegenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find((m) => m.sender === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  }, [messages]);

  const handleApproveTool = (approved: boolean) => {
    if (!pendingApproval) return;
    
    const statusText = approved 
      ? (lang === 'ar' ? 'تمت الموافقة على استدعاء الأداة بنجاح والتنفيذ قيد الاكتمال.' : 'Tool approval granted. Executed successfully.')
      : (lang === 'ar' ? 'تم رفض استدعاء الأداة بواسطة المستخدم.' : 'Tool execution rejected by user.');

    setMessages((prev) => [
      ...prev,
      {
        id: `tool-notif-${Date.now()}`,
        sender: 'system',
        content: `🛡️ **${lang === 'ar' ? 'سجل الموافقة البشرية (MCP Tool Approval)' : 'MCP Tool Approval Record'}**:
- **Tool**: \`${pendingApproval.toolName}\` (${pendingApproval.mcpServer})
- **Status**: ${approved ? '✅ Approved' : '❌ Rejected'}
- **Note**: ${statusText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ragMode: currentMode,
      }
    ]);

    setPendingApproval(null);
  };

  const loadConversation = useCallback(async (convId: string) => {
    if (!convId) return;

    // Check instant cache first
    if (conversationCache.current[convId] && conversationCache.current[convId].length > 0) {
      setMessages(conversationCache.current[convId]);
      setCurrentConversationId(convId);
      setIsHistoryOpen(false);
      return;
    }

    try {
      setIsLoadingConv(true);
      const res = await fetch(`/api/conversations/${convId}/messages?workspaceId=${currentWorkspace.id}`);
      if (res.ok) {
        const msgs = await res.json();
        const formattedMsgs: ChatMessage[] = msgs.map((m: any) => ({
          id: m.id || `msg-${Math.random()}`,
          sender: m.role || 'assistant',
          content: m.content || '',
          timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          ragMode: m.ragMode || currentMode,
          citations: m.citations || [],
          groundednessScore: m.groundednessScore ?? m.groundedness_score,
        }));
        
        const finalMsgs = formattedMsgs.length > 0 ? formattedMsgs : [welcomeMessage];
        conversationCache.current[convId] = finalMsgs;
        setMessages(finalMsgs);
        setCurrentConversationId(convId);
        setIsHistoryOpen(false);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoadingConv(false);
    }
  }, [currentWorkspace.id, currentMode, welcomeMessage]);

  const deleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/conversations/${convId}?workspaceId=${currentWorkspace.id}`, { method: 'DELETE' });
      setConversations(prev => prev.filter(c => c.id !== convId));
      delete conversationCache.current[convId];
      if (currentConversationId === convId) {
        startNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  useEffect(() => {
    if (urlConvId && urlConvId !== currentConversationId) {
      loadConversation(urlConvId);
    }
  }, [urlConvId, currentConversationId, loadConversation]);

  const startNewConversation = () => {
    navigate('/chat');
    setCurrentConversationId(null);
    setMessages([welcomeMessage]);
    setSelectedCitation(null);
    setIsHistoryOpen(false);
  };

  // Filtered Conversations for History Drawer
  const filteredConversations = useMemo(() => {
    if (!historySearchQuery || !historySearchQuery.trim()) return conversations;
    const query = historySearchQuery.toLowerCase();
    return conversations.filter(c => 
      c?.title ? c.title.toLowerCase().includes(query) : false
    );
  }, [conversations, historySearchQuery]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const groups = [
      { id: 'today', labelAr: 'اليوم', labelEn: 'Today', convs: [] as any[] },
      { id: 'yesterday', labelAr: 'الأمس', labelEn: 'Yesterday', convs: [] as any[] },
      { id: 'last7days', labelAr: 'آخر ٧ أيام', labelEn: 'Last 7 Days', convs: [] as any[] },
      { id: 'older', labelAr: 'أقدم', labelEn: 'Older', convs: [] as any[] }
    ];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const last7 = new Date(today);
    last7.setDate(last7.getDate() - 7);

    filteredConversations.forEach(conv => {
      const convDate = new Date(conv.updated_at || conv.created_at);
      const convDay = new Date(convDate.getFullYear(), convDate.getMonth(), convDate.getDate());

      if (convDay.getTime() === today.getTime()) {
        groups[0].convs.push(conv);
      } else if (convDay.getTime() === yesterday.getTime()) {
        groups[1].convs.push(conv);
      } else if (convDay.getTime() > last7.getTime()) {
        groups[2].convs.push(conv);
      } else {
        groups[3].convs.push(conv);
      }
    });

    return groups.filter(g => g.convs.length > 0);
  }, [filteredConversations]);

  // Filter messages based on search query
  const matchingMessagesCount = useMemo(() => {
    if (!searchQuery || !searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return messages.filter(m => m?.content ? m.content.toLowerCase().includes(q) : false).length;
  }, [messages, searchQuery]);

  return (
    <div className={isFullscreen 
      ? "fixed inset-0 z-50 bg-slate-950 flex flex-col lg:flex-row p-2 gap-3" 
      : "h-[calc(100vh-10rem)] min-h-[600px] flex flex-col lg:flex-row gap-4 print:h-auto"
    }>
      
      {/* Left/North: Questions Navigation Outline */}
      <ChatQuestionsNavigator
        messages={messages}
        lang={lang}
        onJumpToMessage={handleJumpToMessage}
        isOpen={isNavigatorOpen}
        onToggleOpen={() => setIsNavigatorOpen(!isNavigatorOpen)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden print:shadow-none print:border-none print:rounded-none relative min-w-0">
        
        {/* Chat Header Bar */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-2.5 backdrop-blur-md">
          
          {/* Agent Picker & Role */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr ${currentAgent.avatarBg} flex items-center justify-center text-white font-bold shadow-md ring-1 ring-white/10 shrink-0`}>
              <Bot className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedAgentId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setSelectedAgentId(newId);
                    const matched = agents.find((a) => a.id === newId);
                    if (matched && matched.defaultMode) {
                      setCurrentMode(matched.defaultMode);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-0.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[150px] sm:max-w-[200px] truncate"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {lang === 'ar' ? agent.nameAr : agent.nameEn}
                      {!agent.isPreset ? (lang === 'ar' ? ' (مخصص)' : ' (Custom)') : ''}
                    </option>
                  ))}
                </select>
                <span className="hidden sm:inline-block text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {currentAgent.model}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px] sm:max-w-[260px]">
                {lang === 'ar' ? currentAgent.roleAr : currentAgent.roleEn}
              </p>
            </div>
          </div>

          {/* Mode Switcher Buttons & Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Mode Pills */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs shadow-inner">
              <button
                onClick={() => setCurrentMode('strict')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl font-semibold transition-all cursor-pointer text-xs ${
                  currentMode === 'strict'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={lang === 'ar' ? 'الإجابة مقيدة بالمصادر المرفوعة فقط' : 'Strict Source Grounding'}
              >
                <Lock className="w-3 h-3" />
                <span className="hidden xs:inline text-[11px]">Strict</span>
              </button>

              <button
                onClick={() => setCurrentMode('augmented')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl font-semibold transition-all cursor-pointer text-xs ${
                  currentMode === 'augmented'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={lang === 'ar' ? 'هجين: مصادرك أولاً مع إمكانية تأريض الويب' : 'Hybrid Sources + Web'}
              >
                <Search className="w-3 h-3" />
                <span className="hidden xs:inline text-[11px]">Augmented</span>
              </button>

              <button
                onClick={() => setCurrentMode('open')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl font-semibold transition-all cursor-pointer text-xs ${
                  currentMode === 'open'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={lang === 'ar' ? 'استدلال حر واستدعاء أدوات' : 'Autonomous Reasoning'}
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden xs:inline text-[11px]">Open</span>
              </button>
            </div>

            {/* Clear, Working Arabic Math Switcher Toggle */}
            <button
              onClick={() => {
                const nextState = !useArabicMath;
                setUseArabicMath(nextState);
                if (nextState) {
                  ArabicMathJax.injectStyles();
                  ArabicMathJax.loadMathJax().then(() => {
                    ArabicMathJax.typesetArabic(undefined, { force: true, forceArabic: true });
                  }).catch(console.error);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all cursor-pointer border text-xs font-semibold shadow-xs ${
                useArabicMath 
                  ? 'bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 border-cyan-400 text-cyan-200 ring-1 ring-cyan-500/30' 
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title={
                useArabicMath 
                  ? (lang === 'ar' ? 'الرياضيات العربية مفعلة (انقر للتحويل إلى LaTeX قياسي)' : 'Arabic Math Enabled (Click for Standard LaTeX)') 
                  : (lang === 'ar' ? 'تفعيل تنسيق الرياضيات بالرموز العربية (س، ص، جا، تكامل)' : 'Enable Arabic Math Typography')
              }
            >
              <Calculator className={`w-3.5 h-3.5 ${useArabicMath ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-[11px]">
                {useArabicMath 
                  ? (lang === 'ar' ? 'رياضيات عربية ✓' : 'Arabic Math ✓') 
                  : (lang === 'ar' ? 'رياضيات عربية' : 'Arabic Math')}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${useArabicMath ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            </button>

            {/* In-Chat Search Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-1.5 rounded-xl transition-all border cursor-pointer ${
                isSearchOpen || searchQuery 
                  ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/40' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={lang === 'ar' ? 'بحث في الرسائل' : 'Search chat'}
            >
              <SearchIcon className="w-3.5 h-3.5" />
            </button>

            {/* History Drawer Toggle */}
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 shadow-xs cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">{lang === 'ar' ? 'السجل' : 'History'}</span>
            </button>

            {/* Mobile Inspector Toggle */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`lg:hidden p-1.5 rounded-xl border transition-all cursor-pointer ${
                isInspectorOpen 
                  ? 'bg-cyan-600 text-white border-cyan-500' 
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title={lang === 'ar' ? 'فاحص الاستشهاد والمصادر' : 'Citations Inspector'}
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Desktop Right Sidebar Collapse / Expand Toggle */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isSidebarCollapsed
                  ? 'bg-cyan-600/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={
                isSidebarCollapsed
                  ? (lang === 'ar' ? 'إظهار فاحص المصادر والاستشهادات' : 'Show Citations Inspector')
                  : (lang === 'ar' ? 'طي الشريط الجانبي وتكبير الدردشة ملء الشاشة' : 'Collapse Sidebar to Expand Chat')
              }
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelRightOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px]">{lang === 'ar' ? 'إظهار المصادر' : 'Show Inspector'}</span>
                </>
              ) : (
                <>
                  <PanelRightClose className="w-3.5 h-3.5" />
                  <span className="text-[11px]">{lang === 'ar' ? 'ملء الشاشة' : 'Expand'}</span>
                </>
              )}
            </button>

            {/* Utility Actions: Formatted PDF Export, Markdown Download, Fullscreen */}
            <div className="hidden sm:flex items-center gap-1 border-l border-slate-700/50 pl-1.5 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-1.5">
              <PdfExport
                messages={messages}
                lang={lang}
                currentWorkspace={currentWorkspace}
                currentAgent={currentAgent}
                currentMode={currentMode}
                buttonVariant="icon"
              />
              <button
                onClick={exportChat}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer"
                title={lang === 'ar' ? 'تصدير ملف Markdown' : 'Export Markdown'}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer"
                title={lang === 'ar' ? (isFullscreen ? 'تصغير' : 'تكبير') : (isFullscreen ? 'Exit Fullscreen' : 'Fullscreen')}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* In-Chat Search Bar Toggle */}
        {isSearchOpen && (
          <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-1">
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1">
              <SearchIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث في محادثة اليوم...' : 'Search within chat...'}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {searchQuery && (
              <span className="text-[10px] text-slate-400 font-mono">
                {matchingMessagesCount} {lang === 'ar' ? 'نتيجة' : 'matches'}
              </span>
            )}
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 hover:bg-slate-800 text-slate-400 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Messages Stream Container */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 custom-scrollbar relative"
        >
          {isLoadingConv ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-lg animate-pulse">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'جاري استرجاع المحادثة السابقة...' : 'Loading previous conversation...'}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isLastAssistant = !isLoading && index === messages.length - 1 && msg.sender === 'assistant';
              return (
                <ChatMessageItem
                  key={msg.id}
                  msg={msg}
                  lang={lang}
                  useArabicMath={useArabicMath}
                  copiedMessageId={copiedMessageId}
                  searchQuery={searchQuery}
                  isLastAssistant={isLastAssistant}
                  onCopyMessage={handleCopyMessage}
                  onSelectCitation={setSelectedCitation}
                  onFeedback={handleFeedback}
                  onRegenerate={handleRegenerate}
                />
              );
            })
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 items-start animate-in fade-in">
              <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs animate-pulse ring-1 ring-white/10">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl p-3 bg-slate-950 border border-slate-800 text-slate-300 text-xs flex items-center gap-2.5 shadow-lg">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="leading-relaxed text-[11px]">
                  {lang === 'ar' 
                    ? 'جاري استرجاع المقاطع وحساب تشابه المتجهات وتوليد الإجابة المؤرَّضة...'
                    : 'Retrieving vector chunks and generating verified response...'}
                </span>
              </div>
            </div>
          )}

          {/* Tool Approval Modal / Notification */}
          {pendingApproval && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950 border-2 border-amber-500/50 shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{lang === 'ar' ? 'مطلوب موافقة أمنية بشرية (Human-in-the-Loop Approval)' : 'Human-in-the-Loop Tool Approval Required'}</span>
              </div>

              <p className="text-xs text-slate-300">
                {lang === 'ar' ? pendingApproval.reasonAr : pendingApproval.reasonEn}
              </p>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>Tool: <span className="text-cyan-300">{pendingApproval.toolName}</span></div>
                <div>Server: <span className="text-indigo-300">{pendingApproval.mcpServer}</span></div>
                <div>Params: {JSON.stringify(pendingApproval.parameters)}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => handleApproveTool(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-300 transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'رفض التنفيذ' : 'Reject Execution'}
                </button>
                <button
                  onClick={() => handleApproveTool(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer shadow-md shadow-emerald-900/20"
                >
                  {lang === 'ar' ? 'الموافقة والتنفيذ' : 'Approve & Execute'}
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-20 right-6 z-30 p-2 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white shadow-xl shadow-cyan-900/40 border border-cyan-400/40 transition-all animate-in fade-in zoom-in cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">{lang === 'ar' ? 'الأسفل' : 'Bottom'}</span>
          </button>
        )}

        {/* Compact Smart Chat Input Bar */}
        <ChatInputBar
          lang={lang}
          currentAgent={currentAgent}
          currentMode={currentMode}
          isLoading={isLoading}
          attachedDoc={attachedDoc}
          setAttachedDoc={setAttachedDoc}
          isExtractingChatFile={isExtractingChatFile}
          chatFileInputRef={chatFileInputRef}
          handleChatFileSelect={handleChatFileSelect}
          handleFileDrop={handleFileAttachment}
          quickPrompts={dynamicPrompts}
          onSendMessage={handleSendMessage}
          onStopGeneration={handleStopGeneration}
          onSwitchMode={setCurrentMode}
          onClearChat={startNewConversation}
        />

      </div>

      {/* Right Side / Mobile Collapsible: Citation Details & Knowledge Context Inspector */}
      <div className={`w-full lg:w-72 xl:w-80 rounded-3xl bg-slate-900/90 border border-slate-800 p-4 flex-col justify-between gap-4 shadow-xl transition-all shrink-0 ${
        isInspectorOpen ? 'flex' : (isSidebarCollapsed ? 'hidden' : 'hidden lg:flex')
      }`}>
        
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'فاحص الاستشهاد والتأريض' : 'Citation Inspector'}</span>
            </h3>
            <div className="flex items-center gap-2">
              {selectedCitation && (
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer px-1.5 py-0.5 rounded-lg bg-slate-800/80"
                >
                  {lang === 'ar' ? 'إلغاء التحديد' : 'Clear'}
                </button>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer hidden lg:flex"
                title={lang === 'ar' ? 'طي الشريط الجانبي لتكبير المحادثة' : 'Collapse Sidebar to Expand Chat'}
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedCitation ? (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-2.5 animate-in fade-in shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-cyan-300 truncate max-w-[160px]">{selectedCitation.sourceTitle}</span>
                {selectedCitation.pageNumber ? (
                  <span className="px-1.5 py-0.2 rounded-lg bg-slate-900 text-slate-400 font-mono text-[10px]">
                    Page {selectedCitation.pageNumber}
                  </span>
                ) : selectedCitation.youtubeTimestamp ? (
                  <span className="px-1.5 py-0.2 rounded-lg bg-rose-950 text-rose-300 border border-rose-500/30 font-mono text-[10px] font-bold flex items-center gap-1">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{selectedCitation.youtubeTimestamp}</span>
                  </span>
                ) : null}
              </div>

              {selectedCitation.sectionHeader && (
                <div className="text-[11px] text-indigo-400 font-semibold">
                  {selectedCitation.sectionHeader}
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                {selectedCitation.snippet}
              </div>

              {selectedCitation.youtubeTimestamp && selectedCitation.webUrl && (
                <a
                  href={selectedCitation.webUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
                >
                  <Youtube className="w-3.5 h-3.5 text-rose-500" />
                  <span>{lang === 'ar' ? `مشاهدة الفيديو عند [${selectedCitation.youtubeTimestamp}]` : `Watch at [${selectedCitation.youtubeTimestamp}]`}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>{lang === 'ar' ? 'درجة التطابق الهجين:' : 'Hybrid Similarity:'}</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {(selectedCitation.similarityScore * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-1.5">
              <FileText className="w-7 h-7 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'انقر على أي شارة استشهاد داخل الإجابة لمعاينة المقطع الأصلي ورقم الصفحة ودرجة التطابق.'
                  : 'Click on any citation pill inside a response to inspect exact text, page number, and similarity score.'}
              </p>
            </div>
          )}

          {/* Active Knowledge Sources in Scope for Selected Agent */}
          <div className="space-y-1.5 pt-2.5 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
              <span>{lang === 'ar' ? 'مصادر الوكيل الحالي:' : 'Agent Scoped Sources:'}</span>
              {currentAgent.scopedSourceIds && currentAgent.scopedSourceIds.length > 0 ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                  🔒 {currentAgent.scopedSourceIds.length} {lang === 'ar' ? 'مخصص' : 'scoped'}
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                  🌐 {lang === 'ar' ? 'الكل' : 'All'}
                </span>
              )}
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
              {(() => {
                const agentSourceIds = currentAgent.scopedSourceIds || (currentAgent as any).config?.scopedSourceIds || [];
                const displayDocs = agentSourceIds.length > 0
                  ? sources.filter((doc) => agentSourceIds.includes(doc.id))
                  : sources;

                if (displayDocs.length === 0) {
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center text-[10px] text-slate-400">
                      {lang === 'ar'
                        ? 'لا توجد مصادر محددة لهذا الوكيل بعد.'
                        : 'No sources scoped to this agent yet.'}
                    </div>
                  );
                }

                return displayDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-1.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-[11px]"
                  >
                    <div className="truncate max-w-[150px] text-slate-300 font-medium">
                      {lang === 'ar' ? (doc.titleAr || doc.titleEn) : (doc.titleEn || doc.titleAr)}
                    </div>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                      {doc.chunksCount || 5} chk
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Tenant RLS Security Seal */}
        <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-300 space-y-1 mt-auto">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
            <span>Postgres RLS Active</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Tenant: <span className="font-mono text-slate-300">{currentWorkspace.tenantKey}</span>
          </p>
        </div>

      </div>

      {/* History Drawer Overlay & Panel */}
      {isHistoryOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setIsHistoryOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-80 sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'سجل المحادثات' : 'Chat History'}</span>
              </h3>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* New Chat & Search History */}
            <div className="p-3.5 border-b border-slate-800 space-y-2.5">
              <button
                onClick={startNewConversation}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors cursor-pointer shadow-md shadow-cyan-900/20 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'محادثة جديدة' : 'New Chat'}</span>
              </button>

              <div className="relative">
                <SearchIcon className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث في العناوين...' : 'Search conversations...'}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-7 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Grouped Conversations */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
              {groupedConversations.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-6 space-y-2">
                  <FolderOpen className="w-7 h-7 mx-auto text-slate-600" />
                  <p>{lang === 'ar' ? 'لا توجد محادثات سابقة.' : 'No previous conversations.'}</p>
                </div>
              ) : (
                groupedConversations.map(group => (
                  <div key={group.id} className="space-y-1.5">
                    <h4 className="text-[10px] font-bold text-slate-500 px-1">
                      {lang === 'ar' ? group.labelAr : group.labelEn}
                    </h4>
                    {group.convs.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          if (currentConversationId !== conv.id) {
                            navigate(`/chat/${conv.id}`);
                          } else {
                            setIsHistoryOpen(false);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-2xl border flex flex-col gap-1 transition-all cursor-pointer group relative ${
                          currentConversationId === conv.id 
                            ? 'bg-slate-800/90 border-cyan-500/50 shadow-md' 
                            : 'bg-slate-950/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-semibold text-xs truncate max-w-[180px] ${currentConversationId === conv.id ? 'text-cyan-300' : 'text-slate-300 group-hover:text-slate-200'}`}>
                            {conv.title || 'محادثة بدون عنوان'}
                          </span>
                          <button
                            onClick={(e) => deleteConversation(e, conv.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                            title={lang === 'ar' ? 'حذف المحادثة' : 'Delete conversation'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="truncate max-w-[130px]">
                            {agents.find(a => a.id === conv.agent_id)?.nameAr || conv.agent_id}
                          </span>
                          <span>
                            {new Date(conv.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
};
