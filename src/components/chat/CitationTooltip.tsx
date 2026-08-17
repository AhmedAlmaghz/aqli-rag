import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Globe2, 
  Play, 
  ExternalLink, 
  Check, 
  Copy, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  CornerDownRight 
} from 'lucide-react';
import { Citation, Language } from '../../types';

interface CitationTooltipProps {
  citation: Citation;
  index?: number;
  lang: Language;
  onSelectCitation?: (citation: Citation) => void;
  children?: React.ReactNode;
  className?: string;
}

export const CitationTooltip: React.FC<CitationTooltipProps> = ({
  citation,
  index,
  lang,
  onSelectCitation,
  children,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isAr = lang === 'ar';

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // Calculate viewport space to position top or bottom
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        if (rect.top < 220) {
          setTooltipPosition('bottom');
        } else {
          setTooltipPosition('top');
        }
      }
      setIsVisible(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopySnippet = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (citation.snippet) {
      navigator.clipboard.writeText(citation.snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const matchPercent = Math.round((citation.similarityScore || 0.92) * 100);
  const matchColorClass = 
    matchPercent >= 90 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
    matchPercent >= 80 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
    'bg-amber-500/20 text-amber-300 border-amber-500/30';

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger element (default or custom children) */}
      {children ? (
        <div 
          onClick={() => onSelectCitation && onSelectCitation(citation)}
          className="cursor-pointer inline-block"
        >
          {children}
        </div>
      ) : (
        <button
          onClick={() => onSelectCitation && onSelectCitation(citation)}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-500/30 text-indigo-300 font-bold text-xs transition-all cursor-pointer shadow-xs hover:border-cyan-400/50"
        >
          <span>[{typeof index === 'number' ? index + 1 : '1'}]</span>
          <span className="max-w-[120px] truncate hidden sm:inline text-[11px] font-normal opacity-90">
            {citation.sourceTitle}
          </span>
        </button>
      )}

      {/* Floating Hover Card Popover */}
      {isVisible && (
        <div
          ref={tooltipRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute z-50 w-80 sm:w-96 p-3.5 rounded-2xl bg-slate-950/95 border border-slate-700/90 shadow-2xl backdrop-blur-md text-slate-200 transition-all duration-200 animate-in fade-in zoom-in-95 ${
            tooltipPosition === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2'
              : 'top-full mt-2 left-1/2 -translate-x-1/2'
          }`}
          style={{
            maxWidth: 'calc(100vw - 32px)',
          }}
        >
          {/* Arrow Indicator */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-r border-b border-slate-700/90 rotate-45 ${
              tooltipPosition === 'top' ? 'top-full -mt-1.5' : 'bottom-full -mb-1.5 rotate-225'
            }`} 
          />

          {/* Header Info */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 mb-2.5">
            <div className="flex items-start gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 shrink-0 mt-0.5">
                {citation.youtubeTimestamp ? (
                  <Play className="w-3.5 h-3.5 text-rose-400 fill-current" />
                ) : citation.isWebSource ? (
                  <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </div>
              <div className="min-w-0">
                <h5 className="font-bold text-xs text-white truncate leading-snug">
                  {citation.sourceTitle}
                </h5>
                {citation.sectionHeader && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate mt-0.5">
                    <CornerDownRight className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                    <span className="truncate">{citation.sectionHeader}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Similarity Score Badge */}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${matchColorClass}`}>
              {matchPercent}% {isAr ? 'تطابق' : 'Match'}
            </span>
          </div>

          {/* Source Snippet Box */}
          <div className="relative group/snippet bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80 mb-2.5 max-h-36 overflow-y-auto custom-scrollbar">
            <p className="text-[11px] leading-relaxed text-slate-300 italic font-sans whitespace-pre-wrap">
              "{citation.snippet || (isAr ? 'لا يوجد مقتطع نصي معروض لهذا المصدر.' : 'No preview snippet available for this citation.')}"
            </p>
          </div>

          {/* Footer Metadata & Actions */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
            <div className="flex items-center gap-2 font-mono">
              {citation.pageNumber && (
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-medium">
                  {isAr ? `صفحة ${citation.pageNumber}` : `Page ${citation.pageNumber}`}
                </span>
              )}
              {citation.youtubeTimestamp && (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {citation.youtubeTimestamp}
                </span>
              )}
              {citation.isWebSource && (
                <span className="text-cyan-400 font-sans">{isAr ? 'مصدر ويب' : 'Web Source'}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Copy Snippet Button */}
              <button
                onClick={handleCopySnippet}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                title={isAr ? 'نسخ المقتطع' : 'Copy snippet'}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className="text-[10px]">{copied ? (isAr ? 'تم' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
              </button>

              {/* External Web Link or Full Source View */}
              {citation.webUrl ? (
                <a
                  href={citation.webUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-semibold transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>{isAr ? 'فتح الرابط' : 'Open Link'}</span>
                </a>
              ) : onSelectCitation ? (
                <button
                  onClick={() => {
                    setIsVisible(false);
                    onSelectCitation(citation);
                  }}
                  className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>{isAr ? 'عرض في المعرفة' : 'View in KB'}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
