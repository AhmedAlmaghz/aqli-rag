import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  RefreshCw, 
  Paperclip, 
  Send, 
  X, 
  FileText, 
  Mic, 
  MicOff, 
  Square, 
  Command,
  Sparkles,
  Lock,
  Search,
  Zap,
  Trash2,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { Language, AgentConfig, RagMode } from '../../types';

interface ChatInputBarProps {
  lang: Language;
  currentAgent: AgentConfig;
  currentMode: RagMode;
  isLoading: boolean;
  attachedDoc: { name: string; wordCount: number; fileType: string } | null;
  setAttachedDoc: (doc: any | null) => void;
  isExtractingChatFile: boolean;
  chatFileInputRef: React.RefObject<HTMLInputElement>;
  handleChatFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileDrop?: (file: File) => void;
  quickPrompts: string[];
  onSendMessage: (text: string) => void;
  onStopGeneration?: () => void;
  onSwitchMode?: (mode: RagMode) => void;
  onClearChat?: () => void;
}

interface SlashCommand {
  id: string;
  name: string;
  descAr: string;
  descEn: string;
  icon: any;
  action: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  lang,
  currentAgent,
  currentMode,
  isLoading,
  attachedDoc,
  setAttachedDoc,
  isExtractingChatFile,
  chatFileInputRef,
  handleChatFileSelect,
  handleFileDrop,
  quickPrompts,
  onSendMessage,
  onStopGeneration,
  onSwitchMode,
  onClearChat,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  // Web Speech API state
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ar-SA' | 'en-US'>(lang === 'ar' ? 'ar-SA' : 'en-US');
  const [voiceInterim, setVoiceInterim] = useState('');
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [audioLevels, setAudioLevels] = useState<number[]>([3, 7, 12, 16, 10, 6, 14, 8]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sync speech language when app language changes
  useEffect(() => {
    if (!isListening) {
      setSpeechLang(lang === 'ar' ? 'ar-SA' : 'en-US');
    }
  }, [lang, isListening]);

  // Audio chimes
  const playChime = useCallback((type: 'start' | 'stop' | 'command') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'command') {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.06);
        osc.frequency.setValueAtTime(783.99, now + 0.12);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch {
      // Audio is non-blocking
    }
  }, []);

  // Slash commands
  const slashCommands: SlashCommand[] = [
    {
      id: 'strict',
      name: '/strict',
      descAr: 'الوضع المقيد بالمصادر حصرًا',
      descEn: 'Strict Mode (Sources Only)',
      icon: Lock,
      action: () => {
        onSwitchMode?.('strict');
        setInputPrompt('');
      }
    },
    {
      id: 'augmented',
      name: '/augmented',
      descAr: 'الوضع الهجين (مصادر + ويب)',
      descEn: 'Augmented Mode (Sources + Web)',
      icon: Search,
      action: () => {
        onSwitchMode?.('augmented');
        setInputPrompt('');
      }
    },
    {
      id: 'open',
      name: '/open',
      descAr: 'الوضع الحر والوكلاء',
      descEn: 'Open Mode (Autonomous Reasoning)',
      icon: Sparkles,
      action: () => {
        onSwitchMode?.('open');
        setInputPrompt('');
      }
    },
    {
      id: 'summarize',
      name: '/summarize',
      descAr: 'تلخيص الوثائق المرفوعة في نقاط رئيسية',
      descEn: 'Summarize indexed documents into executive key points',
      icon: Zap,
      action: () => {
        setInputPrompt(lang === 'ar' ? 'قم بتلخيص شامل لأهم بنود المستندات المرفوعة في نقاط موجزة ودقيقة.' : 'Provide a comprehensive executive summary of key points across indexed documents.');
      }
    },
    {
      id: 'clear',
      name: '/clear',
      descAr: 'بدء محادثة جديدة وتفريغ الجلسة',
      descEn: 'Start a new clean chat session',
      icon: Trash2,
      action: () => {
        onClearChat?.();
        setInputPrompt('');
      }
    }
  ];

  // Auto-grow textarea handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputPrompt(val);

    e.target.style.height = 'inherit';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSelectedSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || (!inputPrompt.trim() && !attachedDoc)) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    onSendMessage(inputPrompt);
    setInputPrompt('');
    setShowSlashMenu(false);
    setVoiceInterim('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % slashCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + slashCommands.length) % slashCommands.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const cmd = slashCommands[selectedSlashIndex];
        if (cmd) {
          cmd.action();
          setShowSlashMenu(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice Command matcher
  const handleVoiceCommand = useCallback((text: string): boolean => {
    const clean = text.trim().toLowerCase();

    if (clean === 'ارسل' || clean === 'إرسال' || clean === 'send' || clean === 'submit') {
      setVoiceToast(lang === 'ar' ? '⚡ تم تنفيذ الأمر: إرسال الرسالة' : '⚡ Voice Command: Sent');
      playChime('command');
      setTimeout(() => {
        handleSubmit();
      }, 200);
      return true;
    }

    if (clean === 'امسح' || clean === 'مسح' || clean === 'تفريغ' || clean === 'clear') {
      setVoiceToast(lang === 'ar' ? '⚡ تم تفريغ النص' : '⚡ Voice Command: Cleared');
      playChime('command');
      setInputPrompt('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return true;
    }

    if (clean.includes('وضع مقيد') || clean.includes('الوضع المقيد') || clean === 'strict mode' || clean === 'strict') {
      setVoiceToast(lang === 'ar' ? '🔒 الوضع المقيد' : '🔒 Switched to Strict');
      playChime('command');
      onSwitchMode?.('strict');
      return true;
    }

    if (clean.includes('وضع هجين') || clean.includes('الوضع الهجين') || clean === 'augmented mode' || clean === 'hybrid') {
      setVoiceToast(lang === 'ar' ? '🌐 الوضع الهجين' : '🌐 Switched to Augmented');
      playChime('command');
      onSwitchMode?.('augmented');
      return true;
    }

    if (clean.includes('وضع حر') || clean.includes('الوضع الحر') || clean === 'open mode' || clean === 'open') {
      setVoiceToast(lang === 'ar' ? '✨ الوضع الحر' : '✨ Switched to Open');
      playChime('command');
      onSwitchMode?.('open');
      return true;
    }

    if (clean === 'محادثة جديدة' || clean === 'جلسة جديدة' || clean === 'new chat') {
      setVoiceToast(lang === 'ar' ? '➕ محادثة جديدة' : '➕ Starting New Chat');
      playChime('command');
      onClearChat?.();
      setInputPrompt('');
      return true;
    }

    if (clean === 'وقف' || clean === 'توقف' || clean === 'stop' || clean === 'cancel') {
      setVoiceToast(lang === 'ar' ? '⏹️ إيقاف التوليد' : '⏹️ Stopped generation');
      playChime('command');
      onStopGeneration?.();
      return true;
    }

    return false;
  }, [lang, playChime, onSwitchMode, onClearChat, onStopGeneration]);

  // Speech Recognition Init
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          currentInterim += item[0].transcript;
        }
      }

      const textToCheck = (finalTranscript || currentInterim).trim();
      const isCmd = handleVoiceCommand(textToCheck);

      if (!isCmd) {
        if (finalTranscript) {
          setInputPrompt((prev) => {
            const p = prev.trim();
            return p ? `${p} ${finalTranscript.trim()}` : finalTranscript.trim();
          });
          setVoiceInterim('');
          if (textareaRef.current) {
            textareaRef.current.style.height = 'inherit';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
          }
        } else if (currentInterim) {
          setVoiceInterim(currentInterim);
        }
      } else {
        setVoiceInterim('');
      }
    };

    recognition.onerror = (err: any) => {
      if (err?.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setVoiceInterim('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [speechLang, handleVoiceCommand]);

  // Audio wave animation
  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => {
      setAudioLevels([
        Math.floor(Math.random() * 10) + 3,
        Math.floor(Math.random() * 16) + 4,
        Math.floor(Math.random() * 20) + 6,
        Math.floor(Math.random() * 14) + 4,
        Math.floor(Math.random() * 18) + 6,
        Math.floor(Math.random() * 12) + 4,
        Math.floor(Math.random() * 8) + 3,
        Math.floor(Math.random() * 16) + 4,
      ]);
    }, 120);
    return () => clearInterval(interval);
  }, [isListening]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      playChime('stop');
      setVoiceInterim('');
    } else {
      try {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
        setIsListening(true);
        playChime('start');
        setVoiceToast(null);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const toggleSpeechLang = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLang = speechLang === 'ar-SA' ? 'en-US' : 'ar-SA';
    setSpeechLang(nextLang);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setTimeout(() => {
        try {
          recognitionRef.current.lang = nextLang;
          recognitionRef.current.start();
          setIsListening(true);
        } catch {}
      }, 150);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && handleFileDrop) {
      handleFileDrop(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-950/85 border-t border-slate-800/70 relative">
      {/* Smart Contextual Prompt Suggestions (Compact & Horizontal) */}
      {quickPrompts.length > 0 && (
        <div className="mb-1.5 overflow-x-auto flex items-center gap-1.5 custom-scrollbar pb-0.5">
          <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold whitespace-nowrap pl-1 rtl:pl-0 rtl:pr-1 shrink-0">
            <Lightbulb className="w-3 h-3 text-amber-400 shrink-0" />
            <span>{lang === 'ar' ? 'اقتراحات ذكية:' : 'Smart Prompts:'}</span>
          </div>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(qp)}
              className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 whitespace-nowrap transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1"
            >
              <span>{qp}</span>
            </button>
          ))}
        </div>
      )}

      {/* Voice Toast notification */}
      {voiceToast && (
        <div className="mb-1.5 flex items-center justify-between px-2.5 py-1 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs font-semibold animate-in fade-in slide-in-from-bottom-1 shadow-lg">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{voiceToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setVoiceToast(null)} 
            className="p-0.5 hover:bg-cyan-900/60 rounded text-cyan-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Compact Input Box Card */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-2xl bg-slate-900/90 border transition-all duration-150 shadow-lg flex flex-col ${
          isDragOver 
            ? 'border-cyan-400 ring-1 ring-cyan-500/20 bg-cyan-950/20' 
            : isListening 
            ? 'border-rose-500/70 ring-1 ring-rose-500/20' 
            : 'border-slate-700/80 focus-within:border-cyan-500/80 focus-within:ring-1 focus-within:ring-cyan-500/20'
        }`}
      >
        {/* Slash Commands Dropdown Menu */}
        {showSlashMenu && (
          <div className="absolute bottom-full left-0 right-0 mb-1.5 z-50 max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
            <div className="text-[10px] font-bold text-slate-400 px-2.5 py-1 border-b border-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3 text-cyan-400" />
                {lang === 'ar' ? 'أوامر سريعة' : 'Slash Commands'}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">Tab/Enter to select</span>
            </div>
            <div className="space-y-0.5 mt-1">
              {slashCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === selectedSlashIndex;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => {
                      cmd.action();
                      setShowSlashMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer text-left rtl:text-right ${
                      isSelected ? 'bg-cyan-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-cyan-400'}`} />
                      <span className="font-mono text-xs">{cmd.name}</span>
                    </div>
                    <span className={`text-[10px] truncate max-w-[180px] ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
                      {lang === 'ar' ? cmd.descAr : cmd.descEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Attached Document Pill */}
        {attachedDoc && (
          <div className="px-2.5 pt-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-[11px] text-emerald-300 animate-in fade-in">
              <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="font-semibold truncate max-w-[180px]">{attachedDoc.name}</span>
              <span className="text-[9px] text-emerald-400/80 font-mono">
                ({attachedDoc.wordCount} {lang === 'ar' ? 'كلمة' : 'words'})
              </span>
              <button
                type="button"
                onClick={() => setAttachedDoc(null)}
                className="p-0.5 hover:bg-emerald-900/60 rounded text-emerald-400 hover:text-white transition-colors cursor-pointer"
                title={lang === 'ar' ? 'إزالة الملف المرفق' : 'Remove attached file'}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Live Voice Dictation Wave */}
        {isListening && (
          <div className="px-2.5 pt-2">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <div className="flex items-center gap-0.5 h-3">
                  {audioLevels.map((lvl, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-rose-400 rounded-full transition-all duration-100 ease-out"
                      style={{ height: `${Math.min(lvl, 12)}px` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-rose-300 shrink-0">
                  {lang === 'ar' ? 'جاري الاستماع...' : 'Listening...'}
                </span>
                {voiceInterim && (
                  <span className="text-[10px] text-slate-300 italic truncate max-w-[180px] sm:max-w-sm">
                    "{voiceInterim}"
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={toggleSpeechLang}
                className="px-1.5 py-0.2 rounded bg-rose-900/60 hover:bg-rose-800 border border-rose-500/30 text-[9px] font-mono text-rose-200 shrink-0 cursor-pointer"
              >
                {speechLang === 'ar-SA' ? 'عربي' : 'EN'}
              </button>
            </div>
          </div>
        )}

        {/* Compact Textarea */}
        <div className="p-2 sm:p-2.5 pb-0">
          <textarea
            ref={textareaRef}
            value={inputPrompt}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              lang === 'ar'
                ? `اسأل ${currentAgent.nameAr}... (اكتب / للأوامر أو انقر الميكروفون)`
                : `Ask ${currentAgent.nameEn}... (type / or use voice)`
            }
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none overflow-y-auto min-h-[36px] max-h-[110px] custom-scrollbar leading-relaxed"
            rows={1}
          />
        </div>

        {/* Compact Bottom Toolbar */}
        <div className="px-2 pb-1.5 pt-0.5 flex items-center justify-between border-t border-slate-800/40">
          
          {/* Left Actions: Attach, Mic, Slash hint */}
          <div className="flex items-center gap-1">
            <input
              ref={chatFileInputRef}
              type="file"
              onChange={handleChatFileSelect}
              accept=".docx,.doc,.pdf,.txt,.csv,.json,.md"
              className="hidden"
            />

            {/* Attach File Button */}
            <button
              type="button"
              disabled={isExtractingChatFile || isLoading}
              onClick={() => chatFileInputRef.current?.click()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors disabled:opacity-50 cursor-pointer"
              title={lang === 'ar' ? 'إرفاق مستند (Word/PDF/Text)' : 'Attach document'}
            >
              {isExtractingChatFile ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Paperclip className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Web Speech Voice Dictation Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isListening 
                    ? 'bg-rose-600 text-white shadow-xs animate-pulse' 
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80'
                }`}
                title={lang === 'ar' ? 'الإملاء والأوامر الصوتية' : 'Voice dictation'}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Slash Command trigger */}
            <button
              type="button"
              onClick={() => {
                setShowSlashMenu(!showSlashMenu);
                if (!inputPrompt.startsWith('/')) {
                  setInputPrompt('/');
                  if (textareaRef.current) textareaRef.current.focus();
                }
              }}
              className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 text-[10px] font-mono transition-colors cursor-pointer border border-slate-700/40"
              title={lang === 'ar' ? 'قائمة الأوامر السريعة' : 'Slash commands'}
            >
              /cmd
            </button>
          </div>

          {/* Right Actions: Character count & Send / Stop Button */}
          <div className="flex items-center gap-1.5">
            {inputPrompt.length > 0 && (
              <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">
                {inputPrompt.length}
              </span>
            )}

            {isLoading ? (
              <button
                type="button"
                onClick={onStopGeneration}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow-md shadow-rose-900/30"
                title={lang === 'ar' ? 'إيقاف التوليد' : 'Stop generation'}
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="hidden xs:inline">{lang === 'ar' ? 'إيقاف' : 'Stop'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isLoading || (!inputPrompt.trim() && !attachedDoc)}
                className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-cyan-500/20"
                title={lang === 'ar' ? 'إرسال الرسالة (Enter)' : 'Send message (Enter)'}
              >
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Drag & Drop Overlay Indicator */}
      {isDragOver && (
        <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-xs rounded-2xl border-2 border-dashed border-cyan-400 flex items-center justify-center text-cyan-300 font-bold text-xs pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 animate-bounce" />
            <span>{lang === 'ar' ? 'أفلت الملف هنا للإرفاق الفوري' : 'Drop file here to attach'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
