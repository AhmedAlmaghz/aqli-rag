import React, { useState, useMemo } from 'react';
import { 
  ListFilter, 
  MessageSquare, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  ArrowUpRight,
  Hash,
  X,
  Compass
} from 'lucide-react';
import { ChatMessage, Language } from '../../types';

interface ChatQuestionsNavigatorProps {
  messages: ChatMessage[];
  lang: Language;
  onJumpToMessage: (messageId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ChatQuestionsNavigator: React.FC<ChatQuestionsNavigatorProps> = ({
  messages,
  lang,
  onJumpToMessage,
  isOpen,
  onToggleOpen,
}) => {
  const [filterText, setFilterText] = useState('');

  // Extract all user questions
  const userQuestions = useMemo(() => {
    return messages
      .filter((m) => m.sender === 'user')
      .map((m, index) => ({
        index: index + 1,
        id: m.id,
        content: m.content,
        timestamp: m.timestamp,
        ragMode: m.ragMode,
      }));
  }, [messages]);

  // Filtered list
  const filteredQuestions = useMemo(() => {
    if (!filterText || !filterText.trim()) return userQuestions;
    const term = filterText.toLowerCase();
    return userQuestions.filter((q) =>
      (q?.content || '').toLowerCase().includes(term)
    );
  }, [userQuestions, filterText]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggleOpen}
        className="hidden lg:flex flex-col items-center justify-center w-10 py-4 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-2xl text-slate-400 hover:text-cyan-400 transition-all cursor-pointer shadow-lg group shrink-0 self-start mt-2"
        title={lang === 'ar' ? 'فتح فهرس أسئلة المحادثة' : 'Open Questions Outline'}
      >
        <Compass className="w-4 h-4 mb-2 text-cyan-400 group-hover:rotate-45 transition-transform" />
        <span className="text-[10px] font-bold font-mono [writing-mode:vertical-rl] tracking-wider text-slate-300">
          {lang === 'ar' ? 'فهرس الأسئلة' : 'OUTLINE'}
        </span>
        {userQuestions.length > 0 && (
          <span className="mt-2 px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[9px] font-bold font-mono">
            {userQuestions.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="hidden lg:flex flex-col w-72 max-w-xs rounded-3xl bg-slate-950/95 border border-slate-800/90 shadow-2xl overflow-hidden shrink-0 transition-all duration-200 animate-in fade-in slide-in-from-left-2">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{lang === 'ar' ? 'فهرس الأسئلة' : 'Questions Outline'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-cyan-400 text-[10px] font-mono">
                {userQuestions.length}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {lang === 'ar' ? 'انقر للانتقال السريع للرسالة' : 'Click to jump to question'}
            </p>
          </div>
        </div>
        <button
          onClick={onToggleOpen}
          className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={lang === 'ar' ? 'إغلاق الفهرس' : 'Close Outline'}
        >
          {lang === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Search */}
      {userQuestions.length > 3 && (
        <div className="p-2 border-b border-slate-800/60 bg-slate-950/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={lang === 'ar' ? 'تصفية الأسئلة...' : 'Filter questions...'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 rtl:pl-2 rtl:pr-8 pr-7 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
        {userQuestions.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500 text-xs">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
            <p>{lang === 'ar' ? 'لم يتم طرح أي أسئلة بعد في هذه الجلسة.' : 'No questions asked yet in this session.'}</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-6 px-4 text-slate-500 text-xs">
            <p>{lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك.' : 'No matching questions found.'}</p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => onJumpToMessage(q.id)}
              className="w-full text-start p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 hover:border-cyan-500/40 border border-slate-800/80 transition-all cursor-pointer group text-xs text-slate-300 hover:text-white relative shadow-sm"
            >
              <div className="flex items-center justify-between gap-1 mb-1 text-[10px] text-slate-400">
                <span className="font-mono font-bold text-cyan-400 flex items-center gap-0.5">
                  <Hash className="w-3 h-3" />
                  {q.index}
                </span>
                <span className="flex items-center gap-1 font-mono text-[9px]">
                  <Clock className="w-2.5 h-2.5 text-slate-500" />
                  {q.timestamp}
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-200 group-hover:text-cyan-200">
                {q.content.replace(/\[.*?\]/g, '').trim()}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[9px]">
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                  {q.ragMode}
                </span>
                <span className="text-cyan-400/0 group-hover:text-cyan-400 transition-colors flex items-center gap-0.5 font-semibold">
                  <span>{lang === 'ar' ? 'انتقال' : 'Jump'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
        <span>{lang === 'ar' ? 'إجمالي المدخلات:' : 'Total Inputs:'}</span>
        <span className="text-cyan-400 font-bold">{userQuestions.length}</span>
      </div>
    </div>
  );
};
