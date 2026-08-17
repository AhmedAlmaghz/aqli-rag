import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  X, 
  Check, 
  Globe, 
  Zap, 
  Lock, 
  Search, 
  Trash2, 
  Send,
  AlertCircle
} from 'lucide-react';
import { Language, RagMode } from '../../types';

interface VoiceDictationBarProps {
  lang: Language;
  currentMode: RagMode;
  onTranscriptReceived: (text: string, isFinal: boolean) => void;
  onExecuteCommand: (command: 'send' | 'clear' | 'strict' | 'augmented' | 'open' | 'new_chat' | 'stop') => void;
  isGenerating: boolean;
}

export const VoiceDictationBar: React.FC<VoiceDictationBarProps> = ({
  lang,
  currentMode,
  onTranscriptReceived,
  onExecuteCommand,
  isGenerating,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ar-SA' | 'en-US'>(lang === 'ar' ? 'ar-SA' : 'en-US');
  const [interimText, setInterimText] = useState('');
  const [lastDetectedCommand, setLastDetectedCommand] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [audioLevels, setAudioLevels] = useState<number[]>([4, 8, 14, 20, 12, 6, 16, 8]);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sync default speech language if parent language changes while not recording
  useEffect(() => {
    if (!isListening) {
      setSpeechLang(lang === 'ar' ? 'ar-SA' : 'en-US');
    }
  }, [lang, isListening]);

  // Audio chime feedback using Web Audio API
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
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'stop') {
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'command') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch (e) {
      // Audio chime is non-blocking
    }
  }, []);

  // Voice Command Matcher
  const checkVoiceCommands = useCallback((transcript: string): boolean => {
    const clean = transcript.trim().toLowerCase();

    // 1. Send command
    if (
      clean === 'ارسل' ||
      clean === 'إرسال' ||
      clean === 'ابحث' ||
      clean === 'ارسل السؤال' ||
      clean === 'send' ||
      clean === 'submit' ||
      clean === 'send question' ||
      clean === 'search now'
    ) {
      setLastDetectedCommand(lang === 'ar' ? '⚡ تم تنفيذ الأمر: إرسال الرسالة' : '⚡ Executing: Send message');
      playChime('command');
      onExecuteCommand('send');
      return true;
    }

    // 2. Clear command
    if (
      clean === 'امسح' ||
      clean === 'تفريغ' ||
      clean === 'مسح النص' ||
      clean === 'clear' ||
      clean === 'clear text' ||
      clean === 'delete'
    ) {
      setLastDetectedCommand(lang === 'ar' ? '⚡ تم تنفيذ الأمر: مسح النص' : '⚡ Executing: Clear input');
      playChime('command');
      onExecuteCommand('clear');
      return true;
    }

    // 3. Strict mode
    if (
      clean.includes('وضع مقيد') ||
      clean.includes('الوضع المقيد') ||
      clean === 'تفعيل المقيد' ||
      clean === 'strict mode' ||
      clean === 'strict'
    ) {
      setLastDetectedCommand(lang === 'ar' ? '🔒 تفعيل الوضع المقيد بالمصادر' : '🔒 Switched to Strict Mode');
      playChime('command');
      onExecuteCommand('strict');
      return true;
    }

    // 4. Augmented mode
    if (
      clean.includes('وضع هجين') ||
      clean.includes('الوضع الهجين') ||
      clean === 'تفعيل الهجين' ||
      clean === 'augmented mode' ||
      clean === 'hybrid mode' ||
      clean === 'augmented'
    ) {
      setLastDetectedCommand(lang === 'ar' ? '🌐 تفعيل الوضع الهجين' : '🌐 Switched to Augmented Mode');
      playChime('command');
      onExecuteCommand('augmented');
      return true;
    }

    // 5. Open mode
    if (
      clean.includes('وضع حر') ||
      clean.includes('الوضع الحر') ||
      clean === 'تفعيل الحر' ||
      clean === 'open mode' ||
      clean === 'open'
    ) {
      setLastDetectedCommand(lang === 'ar' ? '✨ تفعيل الوضع الحر' : '✨ Switched to Open Mode');
      playChime('command');
      onExecuteCommand('open');
      return true;
    }

    // 6. New chat
    if (
      clean === 'محادثة جديدة' ||
      clean === 'جلسة جديدة' ||
      clean === 'بدء محادثة' ||
      clean === 'new chat' ||
      clean === 'new session'
    ) {
      setLastDetectedCommand(lang === 'ar' ? '➕ بدء محادثة جديدة' : '➕ Starting New Chat');
      playChime('command');
      onExecuteCommand('new_chat');
      return true;
    }

    // 7. Stop
    if (
      clean === 'وقف' ||
      clean === 'توقف' ||
      clean === 'إيقاف' ||
      clean === 'stop' ||
      clean === 'halt' ||
      clean === 'cancel'
    ) {
      setLastDetectedCommand(lang === 'ar' ? '⏹️ إيقاف التوليد' : '⏹️ Stopped generation');
      playChime('command');
      onExecuteCommand('stop');
      return true;
    }

    return false;
  }, [lang, onExecuteCommand, playChime]);

  // Speech Recognition Initialization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
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
        const text = item[0].transcript;
        if (item.isFinal) {
          finalTranscript += text;
        } else {
          currentInterim += text;
        }
      }

      const textToCheck = finalTranscript || currentInterim;
      const isCmd = checkVoiceCommands(textToCheck);

      if (!isCmd) {
        if (finalTranscript) {
          onTranscriptReceived(finalTranscript, true);
          setInterimText('');
        } else if (currentInterim) {
          setInterimText(currentInterim);
          onTranscriptReceived(currentInterim, false);
        }
      } else {
        setInterimText('');
      }
    };

    recognition.onerror = (err: any) => {
      console.warn('Web Speech API status:', err?.error);
      if (err?.error !== 'no-speech') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [speechLang, checkVoiceCommands, onTranscriptReceived]);

  // Simulated live audio wave levels
  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(() => {
      setAudioLevels([
        Math.floor(Math.random() * 18) + 4,
        Math.floor(Math.random() * 26) + 6,
        Math.floor(Math.random() * 32) + 8,
        Math.floor(Math.random() * 28) + 6,
        Math.floor(Math.random() * 34) + 10,
        Math.floor(Math.random() * 22) + 6,
        Math.floor(Math.random() * 16) + 4,
        Math.floor(Math.random() * 28) + 8,
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
    } else {
      try {
        recognitionRef.current.lang = speechLang;
        recognitionRef.current.start();
        setIsListening(true);
        playChime('start');
        setLastDetectedCommand(null);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const switchLanguage = (newLang: 'ar-SA' | 'en-US') => {
    setSpeechLang(newLang);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setTimeout(() => {
        try {
          recognitionRef.current.lang = newLang;
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error(e);
        }
      }, 150);
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/40 border border-amber-500/20 text-amber-300 text-[11px]">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{lang === 'ar' ? 'المتصفح لا يدعم Web Speech API' : 'Web Speech API not supported in this browser'}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Active Voice Listening Pill */}
      {isListening && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-rose-500/50 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          
          <div className="flex items-center gap-3">
            {/* Pulsating Microphone Badge */}
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <div className="relative w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-md">
                <Mic className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Audio Waveform Bars */}
            <div className="flex items-center gap-1 h-6 px-1">
              {audioLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-gradient-to-t from-rose-500 to-amber-400 rounded-full transition-all duration-100 ease-out"
                  style={{ height: `${lvl}px` }}
                />
              ))}
            </div>

            {/* Interim Status / Text */}
            <div className="text-xs">
              <div className="font-bold text-rose-300 flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'جاري الاستماع...' : 'Listening...'}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-500/30 font-mono">
                  {speechLang === 'ar-SA' ? 'العربية' : 'English'}
                </span>
              </div>
              {interimText && (
                <p className="text-slate-300 text-[11px] italic truncate max-w-[240px] sm:max-w-md">
                  "{interimText}"
                </p>
              )}
            </div>
          </div>

          {/* Controls: Language Selector & Stop */}
          <div className="flex items-center gap-2">
            {/* Language Switch Pills */}
            <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800 text-[10px] font-bold font-mono">
              <button
                type="button"
                onClick={() => switchLanguage('ar-SA')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  speechLang === 'ar-SA' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                عربي
              </button>
              <button
                type="button"
                onClick={() => switchLanguage('en-US')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  speechLang === 'en-US' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>

            {/* Stop Listening Button */}
            <button
              type="button"
              onClick={toggleListening}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-rose-900/30"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إنهاء' : 'Stop'}</span>
            </button>
          </div>

        </div>
      )}

      {/* Voice Command Execution Feedback Toast */}
      {lastDetectedCommand && (
        <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-semibold animate-in fade-in slide-in-from-top-1 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>{lastDetectedCommand}</span>
          </div>
          <button
            type="button"
            onClick={() => setLastDetectedCommand(null)}
            className="p-1 hover:bg-cyan-900/50 rounded-lg text-cyan-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Persistent Voice Trigger Button Component (When not active) */}
      {!isListening && (
        <div className="hidden sm:flex items-center justify-between px-2 text-[10px] text-slate-500">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleListening}
              className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors cursor-pointer"
              title={lang === 'ar' ? 'بدء الإملاء الصوتي أو الأوامر الصوتية' : 'Start voice dictation or voice commands'}
            >
              <Mic className="w-3 h-3 text-cyan-400" />
              <span>
                {lang === 'ar' 
                  ? 'أوامر صوتية: "ارسل"، "امسح"، "الوضع المقيد"، "محادثة جديدة"' 
                  : 'Voice commands: "send", "clear", "strict mode", "new chat"'}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-mono">Web Speech API</span>
          </div>
        </div>
      )}
    </div>
  );
};
