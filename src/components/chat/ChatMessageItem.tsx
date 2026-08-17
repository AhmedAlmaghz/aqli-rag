import React, { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { preprocessContentMath, typesetArabicMathInElement } from '../../utils/mathPreprocessor';
import { 
  Bot, 
  User, 
  CheckCircle2, 
  FileText, 
  Play, 
  Globe2, 
  ChevronDown, 
  Check, 
  Copy,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Cpu,
  Code2
} from 'lucide-react';
import { ChatMessage, Citation, Language } from '../../types';
import { CitationTooltip } from './CitationTooltip';

interface ChatMessageItemProps {
  msg: ChatMessage;
  lang: Language;
  useArabicMath: boolean;
  copiedMessageId: string | null;
  searchQuery?: string;
  isLastAssistant?: boolean;
  onCopyMessage: (id: string, content: string) => void;
  onSelectCitation: (cit: Citation) => void;
  onFeedback?: (msgId: string, type: 'like' | 'dislike') => void;
  onRegenerate?: () => void;
}

// Dedicated Code Block with Header and One-Click Copy
const CodeBlock: React.FC<{ language: string; value: string; lang: Language }> = ({ language, value, lang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/90 shadow-lg" dir="ltr">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] font-semibold">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language || 'text'}</span>
        </div>
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[11px] font-medium cursor-pointer"
          title={lang === 'ar' ? 'نسخ الشفرة' : 'Copy code'}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">{lang === 'ar' ? 'تم النسخ' : 'Copied'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-slate-400" />
              <span>{lang === 'ar' ? 'نسخ' : 'Copy'}</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '0.85rem',
          fontSize: '0.8rem',
          backgroundColor: 'transparent',
          lineHeight: 1.55,
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};

export const ChatMessageItem = memo(({
  msg,
  lang,
  useArabicMath,
  copiedMessageId,
  searchQuery,
  isLastAssistant,
  onCopyMessage,
  onSelectCitation,
  onFeedback,
  onRegenerate,
}: ChatMessageItemProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState<'like' | 'dislike' | null>(msg.feedback || null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isUser = msg.sender === 'user';
  const isSystem = msg.sender === 'system';

  // Math typesetting effect for Arabic math when active
  useEffect(() => {
    if (useArabicMath && contentRef.current) {
      typesetArabicMathInElement(contentRef.current);
    }
  }, [useArabicMath, msg.content]);

  // Text-To-Speech Playback
  const handleToggleSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for cleaner speech
    const cleanText = msg.content
      .replace(/\[\^?\d+\]/g, '')
      .replace(/[`*#_\[\]()]/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  }, [msg.content, lang, isPlayingAudio]);

  const handleFeedbackClick = (type: 'like' | 'dislike') => {
    const next = activeFeedback === type ? null : type;
    setActiveFeedback(next);
    if (onFeedback && next) {
      onFeedback(msg.id, next);
    }
  };

  if (isSystem) {
    return (
      <div 
        id={`message-${msg.id}`}
        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono space-y-1 chat-message-bubble"
      >
        <div className="whitespace-pre-wrap">{msg.content}</div>
        <div className="text-[10px] text-slate-500 text-end">{msg.timestamp}</div>
      </div>
    );
  }

  // Pre-process content for citations and automatically format Arabic math equations & raw LaTeX formulas
  const processedContent = useMemo(() => {
    return preprocessContentMath(msg.content, useArabicMath);
  }, [msg.content, useArabicMath]);

  // Highlight matches if search active
  const isHighlighted = searchQuery && searchQuery.trim().length > 1 && (msg?.content || '').toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div 
      id={`message-${msg.id}`}
      className={`flex gap-3 sm:gap-3.5 ${isUser ? 'justify-end' : 'justify-start'} ${
        isHighlighted ? 'ring-2 ring-cyan-500/40 rounded-3xl p-1 bg-cyan-950/20' : ''
      } transition-all duration-300`}
    >
      {!isUser && (
        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md mt-1 ring-1 ring-white/10">
          <Bot className="w-4 h-4" />
        </div>
      )}

      <div className={`w-full max-w-3xl rounded-3xl p-4 sm:p-4.5 space-y-3 transition-all chat-message-bubble ${
        isUser
          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/10'
          : msg.isRefusal
          ? 'bg-slate-950/95 border border-amber-500/40 text-slate-200 shadow-xl'
          : 'bg-slate-950/95 border border-slate-800/90 text-slate-200 shadow-xl backdrop-blur-xs'
      }`}>
        
        {/* Assistant Header Info */}
        {!isUser && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 text-[11px]">
            <div className="flex items-center gap-2 font-bold text-slate-300">
              <span className="text-white">{msg.agentName || 'Aqli Assistant'}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold tracking-wider ${
                msg.ragMode === 'strict' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                msg.ragMode === 'augmented' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              }`}>
                {msg.ragMode}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {msg.groundednessScore && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[10px]">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{msg.groundednessScore}% {lang === 'ar' ? 'مؤرّض' : 'Grounded'}</span>
                </div>
              )}
              {msg.tokenUsage && (
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span>{msg.tokenUsage.totalTokens || msg.tokenUsage.completionTokens} tkn</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Content with 100% hydration-safe block elements */}
        <div ref={contentRef} className={`markdown-body text-sm leading-relaxed text-slate-100 ${useArabicMath ? 'arabic-math-active' : ''}`}>
          <Markdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
            components={{
              h1: ({ node, ...props }) => <h1 className={`text-lg font-bold mt-3 mb-2 ${isUser ? 'text-white' : 'text-slate-100'}`} {...props} />,
              h2: ({ node, ...props }) => <h2 className={`text-base font-bold mt-2.5 mb-1.5 ${isUser ? 'text-white' : 'text-slate-100'}`} {...props} />,
              h3: ({ node, ...props }) => <h3 className={`text-sm font-bold mt-2 mb-1 ${isUser ? 'text-white' : 'text-slate-100'}`} {...props} />,
              p: ({ node, children }) => <div className="mb-2 last:mb-0 leading-relaxed text-slate-200">{children}</div>,
              ul: ({ node, ...props }) => <ul className="list-disc px-4 mb-2.5 space-y-0.5" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal px-4 mb-2.5 space-y-0.5" {...props} />,
              li: ({ node, ...props }) => <li className="text-slate-200" {...props} />,
              strong: ({ node, ...props }) => <strong className={`font-extrabold ${isUser ? 'text-white' : 'text-cyan-400'}`} {...props} />,
              blockquote: ({ node, ...props }) => <blockquote className="border-l-3 border-indigo-500 pl-3 py-1 italic text-slate-400 bg-slate-900/50 rounded-r-lg my-2" {...props} />,
              pre: ({ node, children }) => <div className="my-2 not-prose">{children}</div>,
              a: ({ node, href, children, ...props }) => {
                if (href?.startsWith('#citation-')) {
                  const citIdx = parseInt(href.replace('#citation-', ''), 10) - 1;
                  const cit = msg.citations && msg.citations[citIdx];
                  if (cit) {
                    return (
                      <CitationTooltip
                        citation={cit}
                        index={citIdx}
                        lang={lang}
                        onSelectCitation={onSelectCitation}
                      >
                        <span className="inline-flex items-center justify-center px-1.5 py-0.2 mx-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 font-bold text-xs cursor-pointer border border-indigo-500/30 transition-colors align-baseline shadow-xs">
                          {children}
                        </span>
                      </CitationTooltip>
                    );
                  }
                  return (
                    <button
                      onClick={() => cit && onSelectCitation(cit)}
                      className="inline-flex items-center justify-center px-1.5 py-0.2 mx-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 font-bold text-xs cursor-pointer border border-indigo-500/30 transition-colors align-baseline shadow-xs"
                      title={cit?.sourceTitle || 'مصدر'}
                    >
                      {children}
                    </button>
                  );
                }
                return <a href={href} className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
              },
              code: ({ node, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const langName = match ? match[1] : '';
                const codeString = String(children).replace(/\n$/, '');

                // Math handling
                if (langName === 'math' || className?.includes('math')) {
                  return (
                    <span className="font-mono text-cyan-300 bg-slate-900/80 px-1 py-0.5 rounded" {...props}>
                      {children}
                    </span>
                  );
                }

                // If it is a multi-line or explicit language code block
                if (match || codeString.includes('\n')) {
                  return (
                    <CodeBlock
                      language={langName || 'text'}
                      value={codeString}
                      lang={lang}
                    />
                  );
                }

                // Inline standard code
                return (
                  <code className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-mono text-xs" {...props}>
                    {children}
                  </code>
                );
              },
              table: ({ node, ...props }) => (
                <div className="overflow-x-auto my-3 rounded-2xl border border-slate-800 shadow-md">
                  <table className="min-w-full divide-y divide-slate-800 text-xs text-slate-200" {...props} />
                </div>
              ),
              thead: ({ node, ...props }) => <thead className="bg-slate-900/80" {...props} />,
              tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-850" {...props} />,
              tr: ({ node, ...props }) => <tr className="hover:bg-slate-900/30 transition-colors" {...props} />,
              th: ({ node, ...props }) => <th className="px-3 py-2 text-start font-semibold text-slate-300" {...props} />,
              td: ({ node, ...props }) => <td className="px-3 py-2 text-slate-300 whitespace-normal break-words" {...props} />,
            }}
          >
            {processedContent}
          </Markdown>
        </div>

        {/* Citations Badges Bar */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'الاستشهادات والمصادر المؤرِّضة:' : 'Verified Grounding Citations:'}</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Display first 2 citations */}
              {(msg.citations || []).slice(0, 2).map((cit, idx) => (
                <CitationTooltip
                  key={cit.id}
                  citation={cit}
                  index={idx}
                  lang={lang}
                  onSelectCitation={onSelectCitation}
                >
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-[11px] text-cyan-300 transition-colors cursor-pointer group shadow-xs hover:border-cyan-500/40">
                    <span className="font-bold text-indigo-400">[{idx + 1}]</span>
                    <span className="max-w-[150px] truncate">{cit.sourceTitle}</span>
                    {cit.youtubeTimestamp ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold font-mono">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        {cit.youtubeTimestamp}
                      </span>
                    ) : cit.isWebSource ? (
                      <Globe2 className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(cit.similarityScore * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </CitationTooltip>
              ))}

              {/* Dropdown for remaining citations */}
              {msg.citations.length > 2 && (
                <div className="relative inline-block text-left">
                  <button
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-850 border border-indigo-500/50 text-[11px] text-indigo-300 transition-all cursor-pointer font-semibold shadow-xs hover:shadow-indigo-500/10"
                  >
                    <span>+{msg.citations.length - 2} {lang === 'ar' ? 'المزيد' : 'more'}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 mt-1.5 z-50 min-w-[240px] rounded-2xl bg-slate-950 border border-slate-800 p-2 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="text-[10px] text-slate-400 px-2.5 py-1 font-semibold border-b border-slate-800 mb-1">
                          {lang === 'ar' ? 'مصادر إضافية مسترجعة:' : 'Additional Retrieved Sources:'}
                        </div>
                        <div className="space-y-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                          {msg.citations.slice(2).map((cit, hIdx) => {
                            const overallIdx = 2 + hIdx;
                            return (
                              <CitationTooltip
                                key={cit.id}
                                citation={cit}
                                index={overallIdx}
                                lang={lang}
                                onSelectCitation={(c) => {
                                  onSelectCitation(c);
                                  setIsDropdownOpen(false);
                                }}
                              >
                                <div className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-900 text-right text-[11px] text-cyan-300 transition-colors cursor-pointer group">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-indigo-400">[{overallIdx + 1}]</span>
                                    <span className="truncate max-w-[140px]">{cit.sourceTitle}</span>
                                  </div>
                                  {cit.youtubeTimestamp ? (
                                    <span className="flex items-center gap-1 px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold font-mono">
                                      <Play className="w-2 h-2 fill-current" />
                                      {cit.youtubeTimestamp}
                                    </span>
                                  ) : cit.isWebSource ? (
                                    <Globe2 className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                                  ) : (
                                    <span className="text-[9px] text-slate-500 font-mono shrink-0">
                                      {(cit.similarityScore * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                              </CitationTooltip>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Meta & Rich Action Controls */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-850">
          <span className="font-mono text-[10px]">{msg.timestamp}</span>

          <div className="flex items-center gap-1.5">
            {!isUser && (
              <>
                {/* Speech Playback Button */}
                <button
                  onClick={handleToggleSpeech}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                    isPlayingAudio 
                      ? 'bg-cyan-500/20 text-cyan-300 animate-pulse' 
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={isPlayingAudio ? (lang === 'ar' ? 'إيقاف القراءة الصوتية' : 'Stop voice') : (lang === 'ar' ? 'استماع للإجابة صوتياً' : 'Listen to response')}
                >
                  {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5 text-cyan-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline text-[10px]">{isPlayingAudio ? (lang === 'ar' ? 'إيقاف' : 'Stop') : (lang === 'ar' ? 'استماع' : 'Listen')}</span>
                </button>

                {/* Feedback Buttons */}
                <div className="flex items-center gap-0.5 border-x border-slate-800 px-1">
                  <button
                    onClick={() => handleFeedbackClick('like')}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      activeFeedback === 'like' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'hover:bg-slate-800 text-slate-400 hover:text-emerald-400'
                    }`}
                    title={lang === 'ar' ? 'إجابة مفيدة ودقيقة' : 'Helpful response'}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleFeedbackClick('dislike')}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      activeFeedback === 'dislike' 
                        ? 'bg-rose-500/20 text-rose-400' 
                        : 'hover:bg-slate-800 text-slate-400 hover:text-rose-400'
                    }`}
                    title={lang === 'ar' ? 'إجابة غير دقيقة' : 'Unhelpful response'}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Regenerate Button on Latest Message */}
                {isLastAssistant && onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1"
                    title={lang === 'ar' ? 'إعادة التوليد' : 'Regenerate response'}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[10px]">{lang === 'ar' ? 'إعادة' : 'Retry'}</span>
                  </button>
                )}
              </>
            )}

            {/* Copy Button */}
            <button
              onClick={() => onCopyMessage(msg.id, msg.content)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              title={lang === 'ar' ? 'نسخ النص بالكامل' : 'Copy message text'}
            >
              {copiedMessageId === msg.id ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="text-[10px]">{copiedMessageId === msg.id ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>
        </div>

      </div>

      {isUser && (
        <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md mt-1 ring-1 ring-white/10">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';
