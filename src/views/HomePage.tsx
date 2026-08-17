import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Database, 
  MessageSquare, 
  Bot, 
  ShieldCheck, 
  Cpu, 
  ArrowRight, 
  Lock, 
  Layers, 
  Search, 
  Globe2, 
  Store, 
  CheckCircle2, 
  Terminal, 
  SlidersHorizontal,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Language, Workspace, RagMode } from '../types';

interface HomePageProps {
  lang: Language;
  currentWorkspace: Workspace;
  currentMode: RagMode;
  setCurrentMode: (mode: RagMode) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ 
  lang, 
  currentWorkspace,
  currentMode,
  setCurrentMode,
}) => {
  const [selectedDemoMode, setSelectedDemoMode] = useState<RagMode>('strict');

  const modesInfo = {
    strict: {
      titleAr: 'الوضع المقيد (Strict Mode)',
      titleEn: 'Strict Mode (Source-Bound)',
      descAr: 'الإجابة تُبنى حصرًا على المصادر الموثوقة المرفوعة في قاعدة معرفتك. إذا لم يتوفر سياق كافٍ، يرفض الوكيل الإجابة بأمان لمنع أي هلوسة (Hallucination).',
      descEn: 'Answers are constructed exclusively from verified sources in your workspace. Guaranteed refusal if evidence is insufficient, eliminating hallucinations.',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      groundedness: '100% Guaranteed',
      icon: Lock,
    },
    augmented: {
      titleAr: 'الوضع الهجين (Augmented Mode)',
      titleEn: 'Augmented Mode (Hybrid Grounding)',
      descAr: 'تُستخدم بياناتك كسياق تأريض أساسي، ويُسمح للوكيل بالبحث في الويب المباشر لسد الفجوات مع تمييز بصري شفاف بين "من مصادرك" و"من الويب".',
      descEn: 'Your documents provide primary grounding, supplemented with live Google Search grounding to fill gaps with clear provenance indicators.',
      badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      groundedness: '92% Hybrid Fusion',
      icon: Search,
    },
    open: {
      titleAr: 'الوضع الحر (Open Agent Mode)',
      titleEn: 'Open Agent Mode (Unconstrained)',
      descAr: 'الوكيل حر تمامًا في الاستدلال واستدعاء أدوات MCP الخارجية ونماذج التفكير المنطقي دون التقيد بملفات قاعدة المعرفة.',
      descEn: 'Agent is unconstrained to perform complex multi-step reasoning, external MCP tool calling, and general domain tasks.',
      badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
      groundedness: 'Free Reasoning',
      icon: Bot,
    }
  };

  return (
    <div className="space-y-12">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#09090b] via-[#101015] to-[#050508] border border-[#1f2029] p-8 sm:p-12 shadow-2xl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ar' ? 'منظومة RAG الهجينة ثنائية اللغة للمؤسسات' : 'Next-Gen Enterprise Bilingual Hybrid RAG'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            {lang === 'ar' ? (
              <>
                منصة <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">Aqli RAG</span> لاسترجاع وتوليد المعرفة بدقة وحوكمة فائقة
              </>
            ) : (
              <>
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">Aqli RAG</span> Enterprise Hybrid Retrieval & Agentic Platform
              </>
            )}
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-3xl">
            {lang === 'ar'
              ? 'نظام استرجاع وتوليد هجين ثنائي اللغة يجمع بين البحث المتجهي الكثيف (pgvector 3072d) والبحث اللفظي الضبابي للغة العربية (pg_trgm)، مع عزل تام للمستأجرين عبر Postgres RLS وبروتوكول MCP ثنائي الاتجاه.'
              : 'Enterprise-grade bilingual RAG combining dense vector search (pgvector 3072d) with Arabic lexical fuzzy search (pg_trgm), strict Row-Level Security isolation, and bi-directional Model Context Protocol (MCP).'}
          </p>

          {/* Call-to-action buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/chat"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{lang === 'ar' ? 'بدء محادثة RAG الذكية' : 'Launch Interactive RAG Chat'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </Link>

            <Link
              to="/knowledge-base"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#14141f] hover:bg-[#1c1c2b] border border-[#2e2e3b] text-slate-200 text-sm font-semibold transition-all"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'إدارة قاعدة المعرفة والمصادر' : 'Manage Knowledge Sources'}</span>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-[#1f2029]">
            <div className="p-3.5 rounded-2xl bg-[#030305]/80 border border-[#1f2029]">
              <div className="text-xs text-slate-400 mb-1">{lang === 'ar' ? 'فضاء التضمين' : 'Embedding Vector'}</div>
              <div className="text-lg font-bold text-cyan-400">Gemini 3072-dim</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#030305]/80 border border-[#1f2029]">
              <div className="text-xs text-slate-400 mb-1">{lang === 'ar' ? 'دقة الاسترجاع الهجين' : 'Hybrid Recall@5'}</div>
              <div className="text-lg font-bold text-emerald-400">92.4% (RRF)</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#030305]/80 border border-[#1f2029]">
              <div className="text-xs text-slate-400 mb-1">{lang === 'ar' ? 'عزل المستأجرين' : 'Tenant Security'}</div>
              <div className="text-lg font-bold text-indigo-400">100% RLS Isol.</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#030305]/80 border border-[#1f2029]">
              <div className="text-xs text-slate-400 mb-1">{lang === 'ar' ? 'بروتوكول MCP' : 'MCP Support'}</div>
              <div className="text-lg font-bold text-violet-400">v1.2 Bi-directional</div>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive 3-Mode Architecture Selector */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
              <SlidersHorizontal className="w-4 h-4" />
              <span>{lang === 'ar' ? 'المرونة المعمارية الثلاثية' : 'Tri-Mode Architecture'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {lang === 'ar' ? 'ثلاثة أوضاع استرجاع قابلة للتبديل لحظياً' : 'Three Granular Modes for Every Workload'}
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            {lang === 'ar'
              ? 'التحكم بدقة على مستوى التطبيق، قاعدة المعرفة، المحادثة، أو الوكيل الفردي.'
              : 'Switch dynamically per workspace, collection, conversation, or individual agent.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['strict', 'augmented', 'open'] as RagMode[]).map((modeKey) => {
            const item = modesInfo[modeKey];
            const Icon = item.icon;
            const isCurrent = currentMode === modeKey;
            return (
              <div
                key={modeKey}
                onClick={() => setCurrentMode(modeKey)}
                className={`relative rounded-2xl p-6 border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                  isCurrent
                    ? 'bg-slate-900 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-bold">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${item.badgeBg}`}>
                      {item.groundedness}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {lang === 'ar' ? item.titleAr : item.titleEn}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'ar' ? item.descAr : item.descEn}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">
                    {isCurrent ? (lang === 'ar' ? 'الوضع النشط حالياً' : 'Active Mode') : (lang === 'ar' ? 'انقر للتفعيل' : 'Click to activate')}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Architectural Blueprint & Key Pillars */}
      <section className="rounded-3xl bg-slate-900/70 border border-slate-800 p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-indigo-400" />
              <span>{lang === 'ar' ? 'معمارية خط أنابيب المعالجة والاسترجاع الهجين' : 'Hybrid Ingestion & Retrieval Pipeline'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'ar'
                ? 'رحلة البيانات من المصادر الأولية حتى الاستشهاد الدقيق في إجابات الوكلاء'
                : 'End-to-end data lifecycle from ingestion to precise citation provenance'}
            </p>
          </div>
        </div>

        {/* 5-Step Pipeline Visualizer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-[10px] font-bold text-indigo-400 uppercase font-mono">01. Ingestion</div>
            <div className="font-bold text-sm text-slate-200">{lang === 'ar' ? 'جلب واستخراج' : 'Extraction'}</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              {lang === 'ar' ? 'استخراج ذكي لملفات PDF والجداول وGoogle Drive وNotion.' : 'Table-aware OCR & document parsing via Mistral / Unstructured.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-[10px] font-bold text-cyan-400 uppercase font-mono">02. NLP Normalization</div>
            <div className="font-bold text-sm text-slate-200">{lang === 'ar' ? 'التطبيع العربي' : 'Normalization'}</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              {lang === 'ar' ? 'إزالة التشكيل، توحيد الهمزات، والتقسيم الدلالي Semantic Chunking.' : 'Tashkeel stripping, Hamza unification & semantic boundary chunking.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-[10px] font-bold text-violet-400 uppercase font-mono">03. Dual Indexing</div>
            <div className="font-bold text-sm text-slate-200">{lang === 'ar' ? 'الفهرسة المزدوجة' : 'Dual Indexing'}</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              {lang === 'ar' ? 'تخزين المتجهات في pgvector (3072d) + فهارس pg_trgm النصية.' : 'HNSW dense vectors + sparse pg_trgm trigrams in PostgreSQL.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-[10px] font-bold text-emerald-400 uppercase font-mono">04. Hybrid Fusion</div>
            <div className="font-bold text-sm text-slate-200">{lang === 'ar' ? 'الدمج وإعادة الترتيب' : 'RRF Fusion'}</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              {lang === 'ar' ? 'دمج النتائج عبر خوارزمية Reciprocal Rank Fusion واستبعاد التكرار.' : 'Reciprocal Rank Fusion (RRF) scoring with cross-tenant RLS checks.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <div className="text-[10px] font-bold text-amber-400 uppercase font-mono">05. Grounded Agent</div>
            <div className="font-bold text-sm text-slate-200">{lang === 'ar' ? 'الاستدلال والاستشهاد' : 'Inference & Citations'}</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              {lang === 'ar' ? 'توليد الإجابة عبر Gemini مع استشهادات تفاعلية برقم الصفحة.' : 'Gemini 3.5/3.6 Flash generation with verified citation popovers.'}
            </p>
          </div>

        </div>
      </section>

      {/* Feature Modules Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Link
          to="/chat"
          className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">{lang === 'ar' ? 'المحادثة والوكلاء RAG' : 'Interactive RAG Chat'}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'محادثة ذكية تدعم الأوضاع الثلاثة، بث الاستجابات، الاستشهادات التفاعلية، وموافقات الأدوات.'
              : 'Multi-agent chat with streaming, interactive citations, and human-in-the-loop approvals.'}
          </p>
          <div className="flex items-center gap-1 text-xs text-cyan-400 font-semibold pt-1">
            <span>{lang === 'ar' ? 'فتح المحادثة' : 'Open Chat'}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </div>
        </Link>

        <Link
          to="/knowledge-base"
          className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-850 transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">{lang === 'ar' ? 'قاعدة المعرفة والمقاطع' : 'Knowledge & Chunks'}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'رفع المستندات، فحص المقاطع وأبعاد المتجهات، واختبار محرك البحث الهجين الحي.'
              : 'Upload documents, inspect chunk vectors, and test hybrid search ranking scores.'}
          </p>
          <div className="flex items-center gap-1 text-xs text-indigo-400 font-semibold pt-1">
            <span>{lang === 'ar' ? 'استكشاف المصادر' : 'Explore Sources'}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </div>
        </Link>

        <Link
          to="/agents"
          className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-850 transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bot className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">{lang === 'ar' ? 'استوديو الوكلاء المخصصين' : 'Agent Studio Builder'}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'تصميم وكلاء متخصصين (قانوني، سحابي، مالي)، تحديد التعليمات، ونطاقات الاسترجاع.'
              : 'Create scoped agents with custom instructions, tool attachments, and preset templates.'}
          </p>
          <div className="flex items-center gap-1 text-xs text-violet-400 font-semibold pt-1">
            <span>{lang === 'ar' ? 'بناء وكيل' : 'Build Agent'}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </div>
        </Link>

        <Link
          to="/mcp"
          className="group p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition-all space-y-3"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">{lang === 'ar' ? 'بروتوكول MCP والموافقات' : 'MCP Hub & Approvals'}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'خادم MCP داخلي لـ Claude Desktop، موصلات MCP الخارجية، وطابور الموافقات الأمنية.'
              : 'Built-in MCP server, external MCP connections, and human-in-the-loop approvals.'}
          </p>
          <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold pt-1">
            <span>{lang === 'ar' ? 'إدارة MCP' : 'Manage MCP'}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </div>
        </Link>

      </section>

    </div>
  );
};
