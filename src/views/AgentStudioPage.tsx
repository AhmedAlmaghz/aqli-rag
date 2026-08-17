import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Plus, 
  Sparkles, 
  Cpu, 
  Sliders, 
  Check, 
  Layers, 
  Lock, 
  Search, 
  Copy, 
  CheckCircle2, 
  Trash2,
  Settings,
  Scale,
  Languages,
  FileText,
  Database,
  Youtube,
  Globe,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Language, AgentConfig, RagMode, DocumentSource } from '../types';

const FALLBACK_DEFAULT_AGENT: AgentConfig = {
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

interface AgentStudioPageProps {
  lang: Language;
}

export const AgentStudioPage: React.FC<AgentStudioPageProps> = ({ lang }) => {
  const [agents, setAgents] = useState<AgentConfig[]>([FALLBACK_DEFAULT_AGENT]);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig>(FALLBACK_DEFAULT_AGENT);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Live Knowledge Base Document Sources
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);

  // Fetch Live Document Sources from Database/API
  const fetchSources = async () => {
    setIsLoadingSources(true);
    try {
      const res = await fetch('/api/sources');
      if (res.ok) {
        const dbSources = await res.json();
        if (Array.isArray(dbSources)) {
          const mapped: DocumentSource[] = dbSources.filter(Boolean).map((s: any) => ({
            id: s.id,
            workspaceId: s.workspaceId || 'ws-enterprise-legal',
            titleAr: s.titleAr || s.title || 'مستند مضاف',
            titleEn: s.titleEn || s.title || 'Added Document',
            type: (s?.sourceType as any) || (s?.type as any) || 'local_file',
            category: s?.metadata?.category || 'regulatory',
            sizeBytes: s.sizeBytes || 1024,
            chunksCount: s.chunksCount || s.chunkCount || 1,
            status: s.status || 'indexed',
            language: s.language || 'ar',
            lastSyncedAt: s.updatedAt || new Date().toISOString(),
            descriptionAr: s?.metadata?.descriptionAr || '',
            descriptionEn: s?.metadata?.descriptionEn || '',
          }));
          setDocuments(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to load sources for Agent Studio:', err);
    } finally {
      setIsLoadingSources(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  // Sync agents with PostgreSQL database
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: AgentConfig[] = data.map((d: any) => ({
              id: d.id,
              nameAr: d.nameAr,
              nameEn: d.nameEn,
              roleAr: d.roleAr,
              roleEn: d.roleEn,
              descriptionAr: d.config?.descriptionAr || d.roleAr,
              descriptionEn: d.config?.descriptionEn || d.roleEn,
              systemPromptAr: d.systemInstructions || '',
              systemPromptEn: d.systemInstructions || '',
              model: d.model || 'gemini-3.5-flash-lite',
              temperature: d.config?.temperature ?? 0.2,
              defaultMode: d.config?.defaultMode || 'strict',
              scopedSourceIds: d.config?.scopedSourceIds || [],
              attachedToolIds: d.config?.attachedToolIds || ['tool-citation-extractor'],
              attachedMcpServerIds: d.config?.attachedMcpServerIds || ['postgres-internal'],
              icon: 'Bot',
              isPreset: d.isPreset || false,
              avatarBg: 'from-cyan-600 to-indigo-600',
            }));
            setAgents(mapped);
            if (mapped.length > 0) {
              setSelectedAgent(mapped[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load agents from database:', err);
      }
    };
    fetchAgents();
  }, []);

  // Form State
  const [formNameAr, setFormNameAr] = useState(selectedAgent.nameAr);
  const [formNameEn, setFormNameEn] = useState(selectedAgent.nameEn);
  const [formRoleAr, setFormRoleAr] = useState(selectedAgent.roleAr);
  const [formRoleEn, setFormRoleEn] = useState(selectedAgent.roleEn);
  const [formPromptAr, setFormPromptAr] = useState(selectedAgent.systemPromptAr);
  const [formPromptEn, setFormPromptEn] = useState(selectedAgent.systemPromptEn);
  const [formModel, setFormModel] = useState(selectedAgent.model);
  const [formTemp, setFormTemp] = useState(selectedAgent.temperature);
  const [formMode, setFormMode] = useState<RagMode>(selectedAgent.defaultMode);
  const [formScopedDocs, setFormScopedDocs] = useState<string[]>(selectedAgent.scopedSourceIds);

  const handleSelectAgent = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    setFormNameAr(agent.nameAr);
    setFormNameEn(agent.nameEn);
    setFormRoleAr(agent.roleAr);
    setFormRoleEn(agent.roleEn);
    setFormPromptAr(agent.systemPromptAr);
    setFormPromptEn(agent.systemPromptEn);
    setFormModel(agent.model);
    setFormTemp(agent.temperature);
    setFormMode(agent.defaultMode);
    setFormScopedDocs(agent.scopedSourceIds);
    setIsEditing(false);
  };

  const handleCreateNewAgent = () => {
    const newAgent: AgentConfig = {
      id: `agent-custom-${Date.now()}`,
      nameAr: 'وكيل RAG مخصص جديد',
      nameEn: 'New Custom RAG Agent',
      roleAr: 'مستشار بيانات متخصص',
      roleEn: 'Domain Specialist Assistant',
      descriptionAr: 'وكيل مخصص تم إنشاؤه في مساحة العمل وفق تعليمات مخصصة.',
      descriptionEn: 'Custom scoped agent created with dedicated instructions.',
      systemPromptAr: 'أنت وكيل ذكي مساعد متخصص. أجب بدقة متناهية بناءً على المصادر المحددة لنطاقك.',
      systemPromptEn: 'You are a dedicated AI assistant. Answer accurately based on your scoped knowledge sources.',
      model: 'gemini-3.5-flash-lite',
      temperature: 0.2,
      defaultMode: 'strict',
      scopedSourceIds: [],
      attachedToolIds: ['tool-citation-extractor'],
      attachedMcpServerIds: ['postgres-internal'],
      icon: 'Bot',
      isPreset: false,
      avatarBg: 'from-purple-600 to-indigo-600',
    };

    setAgents((prev) => [newAgent, ...prev]);
    handleSelectAgent(newAgent);
    setIsEditing(true);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMessage(null);
    setSaveErrorMessage(null);

    const updatedAgent: AgentConfig = {
      ...selectedAgent,
      nameAr: formNameAr,
      nameEn: formNameEn,
      roleAr: formRoleAr,
      roleEn: formRoleEn,
      systemPromptAr: formPromptAr,
      systemPromptEn: formPromptEn,
      model: formModel,
      temperature: formTemp,
      defaultMode: formMode,
      scopedSourceIds: formScopedDocs,
    };

    const updated = agents.map((a) => (a.id === selectedAgent.id ? updatedAgent : a));
    setAgents(updated);
    setSelectedAgent(updatedAgent);

    // Save to real database
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAgent.id,
          nameAr: formNameAr,
          nameEn: formNameEn,
          roleAr: formRoleAr,
          roleEn: formRoleEn,
          model: formModel,
          systemInstructions: formPromptAr,
          config: {
            temperature: formTemp,
            defaultMode: formMode,
            scopedSourceIds: formScopedDocs,
            descriptionAr: updatedAgent.descriptionAr,
            descriptionEn: updatedAgent.descriptionEn,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      setSaveSuccessMessage(
        lang === 'ar'
          ? `تم حفظ وتحديث إعدادات الوكيل "${formNameAr}" بنجاح في قاعدة البيانات!`
          : `Agent "${formNameEn}" configuration successfully saved and persisted!`
      );
      setTimeout(() => setSaveSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to persist agent to PostgreSQL:', err);
      setSaveErrorMessage(
        lang === 'ar'
          ? 'تعذر الحفظ في قاعدة البيانات الحية. تم حفظ التغييرات مؤقتاً في الواجهة.'
          : 'Failed to persist to database. Changes saved in UI state only.'
      );
      setTimeout(() => setSaveErrorMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الوكيل؟' : 'Are you sure you want to delete this agent?')) {
      return;
    }
    try {
      await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      const filtered = agents.filter((a) => a.id !== agentId);
      setAgents(filtered);
      if (filtered.length > 0) {
        handleSelectAgent(filtered[0]);
      }
      setSaveSuccessMessage(
        lang === 'ar' ? 'تم حذف الوكيل المخصص بنجاح.' : 'Agent deleted successfully.'
      );
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to delete agent:', err);
      setSaveErrorMessage(
        lang === 'ar' ? 'تعذر حذف الوكيل من القاعدة.' : 'Failed to delete agent.'
      );
      setTimeout(() => setSaveErrorMessage(null), 4000);
    }
  };

  const toggleScopedDoc = (docId: string) => {
    if (formScopedDocs.includes(docId)) {
      setFormScopedDocs(formScopedDocs.filter((id) => id !== docId));
    } else {
      setFormScopedDocs([...formScopedDocs, docId]);
    }
  };

  const handleSelectAllDocs = () => {
    setFormScopedDocs(documents.map((d) => d.id));
  };

  const handleClearDocs = () => {
    setFormScopedDocs([]);
  };

  return (
    <div className="space-y-8">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Bot className="w-4 h-4" />
            <span>{lang === 'ar' ? 'استوديو وبناء الوكلاء المتخصصين' : 'Agent Studio & Scoped Orchestration'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'ar' ? 'منشئ الوكلاء وقوالب المهام المتقدمة' : 'Agent Builder & Multi-Agent Templates'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'تخصيص شخصية الوكيل، التعليمات النظامية، نطاق المصادر المسموح بالبحث فيها، وأدوات MCP'
              : 'Configure agent personas, system prompts, scoped retrieval boundaries, and MCP tool attachments'}
          </p>
        </div>

        <button
          onClick={handleCreateNewAgent}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إنشاء وكيل مخصص جديد' : 'Create Custom Agent'}</span>
        </button>
      </div>

      {/* Studio Grid: Agent Catalog (4 cols) & Agent Configuration Editor (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Agents List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-white">
              {lang === 'ar' ? 'الوكلاء المتاحون' : 'Active Agents'} ({agents.length})
            </h2>
            <span className="text-xs text-cyan-400 font-semibold font-mono">
              AI SDK 7 Ready
            </span>
          </div>

          <div className="space-y-3">
            {agents.map((agent) => {
              const isSelected = selectedAgent.id === agent.id;
              return (
                <div
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/30'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${agent.avatarBg} flex items-center justify-center text-white font-bold shadow-sm`}>
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">
                          {lang === 'ar' ? agent.nameAr : agent.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lang === 'ar' ? agent.roleAr : agent.roleEn}
                        </div>
                      </div>
                    </div>

                    {agent.isPreset && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-mono">
                        Preset
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 font-mono">
                    <span>{agent.model}</span>
                    <span className="text-cyan-400 uppercase font-semibold">Mode: {agent.defaultMode}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Agent Config Form */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSaveAgent} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${selectedAgent.avatarBg} flex items-center justify-center text-white font-bold`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {lang === 'ar' ? selectedAgent.nameAr : selectedAgent.nameEn}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedAgent.id}</p>
                </div>
              </div>

              {!selectedAgent.isPreset && (
                <button
                  type="button"
                  onClick={() => handleDeleteAgent(selectedAgent.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'حذف الوكيل' : 'Delete Agent'}</span>
                </button>
              )}
            </div>

            {/* Notification Banners */}
            {saveSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-between gap-3 text-emerald-300 text-xs shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span className="font-bold">{saveSuccessMessage}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-900/40 px-2 py-0.5 rounded border border-emerald-500/30">
                  PostgreSQL Sync OK
                </span>
              </div>
            )}

            {saveErrorMessage && (
              <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 flex items-center justify-between gap-3 text-rose-300 text-xs shadow-lg animate-fadeIn">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <span className="font-bold">{saveErrorMessage}</span>
                </div>
                <span className="text-[10px] font-mono text-rose-400/80 bg-rose-900/40 px-2 py-0.5 rounded border border-rose-500/30">
                  DB Error
                </span>
              </div>
            )}

            {/* Names & Roles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'اسم الوكيل (عربي):' : 'Agent Name (Arabic):'}
                </label>
                <input
                  type="text"
                  value={formNameAr}
                  onChange={(e) => setFormNameAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'اسم الوكيل (إنجليزي):' : 'Agent Name (English):'}
                </label>
                <input
                  type="text"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Model & Mode Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'نموذج الاستدلال الأساسي:' : 'Inference Model:'}
                </label>
                <select
                  value={formModel}
                  onChange={(e: any) => setFormModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
                >
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (الافتراضي / Default)</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Primary Reasoning)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Fast Rerank)</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (BYO Provider)</option>
                  <option value="gpt-4o">GPT-4o (BYO Provider)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'وضع العمل الافتراضي:' : 'Default RAG Mode:'}
                </label>
                <select
                  value={formMode}
                  onChange={(e: any) => setFormMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-mono uppercase"
                >
                  <option value="strict">Strict (Sources Only)</option>
                  <option value="augmented">Augmented (Hybrid + Web)</option>
                  <option value="open">Open (Free Agent)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>{lang === 'ar' ? 'درجة الحرارة (Temperature):' : 'Temperature:'}</span>
                  <span className="text-cyan-400 font-mono">{formTemp}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={formTemp}
                  onChange={(e) => setFormTemp(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* System Instructions / Prompts */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'التعليمات والشخصية النظامية (System Prompt - بالعربية):' : 'System Prompt (Arabic):'}
                </label>
                <textarea
                  rows={4}
                  value={formPromptAr}
                  onChange={(e) => setFormPromptAr(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {lang === 'ar' ? 'التعليمات النظامية (System Prompt - بالإنجليزية):' : 'System Prompt (English):'}
                </label>
                <textarea
                  rows={3}
                  value={formPromptEn}
                  onChange={(e) => setFormPromptEn(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>

            {/* Scoped Retrieval Sources - Live Database Documents */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300">
                <div className="flex items-center gap-2">
                  <span>{lang === 'ar' ? 'نطاق مصادر قاعدة المعرفة المسموح بها (Live Scoped Sources):' : 'Scoped Retrieval Sources (Live DB):'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-400 font-mono text-[10px]">
                    {documents.length} {lang === 'ar' ? 'مصدر متاح' : 'sources available'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllDocs}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    {lang === 'ar' ? 'تحديد الكل' : 'Select All'}
                  </button>
                  <span className="text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleClearDocs}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء التحديد' : 'Clear All'}
                  </button>
                  <button
                    type="button"
                    onClick={fetchSources}
                    title={lang === 'ar' ? 'تحديث المصادر من القاعدة' : 'Refresh live sources from DB'}
                    className="p-1 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSources ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                {lang === 'ar'
                  ? 'اختر الوثائق والمصادر المحددة التي يمكن لهذا الوكيل الاستدلال منها عند تفعيل وضع Strict/Augmented.'
                  : 'Select specific knowledge base documents scoped for this agent when operating in Strict or Augmented modes.'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 custom-scrollbar">
                {documents.map((doc) => {
                  const isChecked = formScopedDocs.includes(doc.id);
                  const renderIcon = () => {
                    switch (doc.type) {
                      case 'database':
                        return <Database className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />;
                      case 'youtube':
                        return <Youtube className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />;
                      case 'web':
                      case 'sitemap':
                        return <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />;
                      default:
                        return <FileText className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />;
                    }
                  };

                  return (
                    <div
                      key={doc.id}
                      onClick={() => toggleScopedDoc(doc.id)}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-indigo-950/50 border-indigo-500/80 text-indigo-100 font-semibold shadow-sm'
                          : 'bg-slate-950/80 border-slate-800/90 text-slate-400 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden pr-2">
                        {renderIcon()}
                        <div className="truncate">
                          <div className="truncate text-slate-200" title={lang === 'ar' ? doc.titleAr : doc.titleEn}>
                            {lang === 'ar' ? doc.titleAr : doc.titleEn}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {doc.chunksCount || 1} {lang === 'ar' ? 'أجزاء/Chunks' : 'chunks'}
                          </div>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 bg-slate-900'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-500 font-mono">
                {formScopedDocs.length === 0
                  ? (lang === 'ar' ? 'النطاق: جميع مصادر قاعدة المعرفة' : 'Scope: All KB Sources')
                  : `${formScopedDocs.length} ${lang === 'ar' ? 'مصادر محددة' : 'sources scoped'}`}
              </span>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري الحفظ والربط...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'حفظ إعدادات الوكيل' : 'Save Agent Configuration'}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
};
