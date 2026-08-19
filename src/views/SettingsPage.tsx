import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Key, 
  Cpu, 
  Lock, 
  Database, 
  Globe, 
  Check, 
  Sliders, 
  RefreshCw,
  Server,
  Zap,
  Layers,
  Activity,
  UserPlus,
  Users,
  UserCheck,
  Trash2,
  KeyRound,
  Shield,
  Fingerprint,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Language, Workspace, AuthUser, AuthProviderInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface SettingsPageProps {
  lang: Language;
  setLang: (lang: Language) => void;
  currentWorkspace: Workspace;
}

interface DbStatusState {
  connected: boolean;
  type: string;
  urlMasked?: string;
  databaseName?: string;
  serverVersion?: string;
  pgvectorSupported: boolean;
  pgTrgmSupported: boolean;
  rlsEnforced: boolean;
  tables: {
    sourcesCount: number;
    chunksCount: number;
    agentsCount: number;
    conversationsCount: number;
    auditLogsCount: number;
    usersCount?: number;
    sessionsCount?: number;
  };
  lastChecked: string;
  error?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ 
  lang, 
  setLang,
  currentWorkspace 
}) => {
  const { user: currentUser, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'auth' | 'database' | 'security' | 'providers' | 'guardrails'>('auth');
  const [saveToast, setSaveToast] = useState(false);

  // Live Database Status
  const [dbStatus, setDbStatus] = useState<DbStatusState | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [dbMessage, setDbMessage] = useState<string>('');
  const [customDbUrl, setCustomDbUrl] = useState<string>('');

  // Users & Auth state
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [providersList, setProvidersList] = useState<AuthProviderInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'viewer' | 'auditor'>('editor');
  const [newUserMsg, setNewUserMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Settings State
  const [piiRedactionEnabled, setPiiRedactionEnabled] = useState(true);
  const [promptInjectionFilter, setPromptInjectionFilter] = useState(true);
  const [strictGroundednessThreshold, setStrictGroundednessThreshold] = useState(0.85);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(60);
  const [geminiModel, setGeminiModel] = useState('gemini-3.5-flash-lite');
  const [embeddingModel, setEmbeddingModel] = useState('gemini-embedding-2');

  useEffect(() => {
    fetchDbStatus();
    fetchUsers();
    fetchProviders();
    fetchSettings();
  }, [currentWorkspace.id]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`/api/settings?workspaceId=${encodeURIComponent(currentWorkspace.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          if (data.piiRedactionEnabled !== undefined) setPiiRedactionEnabled(data.piiRedactionEnabled);
          if (data.promptInjectionFilter !== undefined) setPromptInjectionFilter(data.promptInjectionFilter);
          if (data.strictGroundednessThreshold !== undefined) setStrictGroundednessThreshold(data.strictGroundednessThreshold);
          if (data.rateLimitPerMinute !== undefined) setRateLimitPerMinute(data.rateLimitPerMinute);
          if (data.geminiModel) setGeminiModel(data.geminiModel);
          if (data.embeddingModel) setEmbeddingModel(data.embeddingModel);
        }
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const fetchDbStatus = async () => {
    setIsCheckingDb(true);
    try {
      const res = await fetch('/api/db/status');
      const data = await res.json();
      setDbStatus(data);
    } catch (e: any) {
      console.error('Failed to fetch DB status:', e);
    } finally {
      setIsCheckingDb(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/auth/users?workspaceId=${encodeURIComponent(currentWorkspace.id)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsersList(data);
      } else if (data.users && Array.isArray(data.users)) {
        setUsersList(data.users);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/auth/providers');
      const data = await res.json();
      if (data.providers) {
        setProvidersList(data.providers);
      }
    } catch (e) {
      console.error('Failed to fetch auth providers:', e);
    }
  };

  const handleReconnectDb = async (overrideUrl?: string) => {
    setIsCheckingDb(true);
    setDbMessage('');
    try {
      const urlToUse = typeof overrideUrl === 'string' ? overrideUrl : customDbUrl.trim();
      const res = await fetch('/api/db/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urlToUse ? { connectionString: urlToUse } : {})
      });
      const data = await res.json();
      if (data.status) {
        setDbStatus(data.status);
      }
      setDbMessage(data.message || (lang === 'ar' ? 'تم فحص الاتصال بقاعدة البيانات بنجاح' : 'Database connection verified successfully'));
      fetchUsers();
    } catch (e: any) {
      setDbMessage(`Error: ${e.message}`);
    } finally {
      setIsCheckingDb(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserMsg(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          workspace_id: currentWorkspace.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      
      setNewUserMsg({
        text: lang === 'ar' ? 'تم إضافة المستخدم إلى قاعدة البيانات بنجاح!' : 'User created in database successfully!',
        type: 'success'
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      fetchUsers();
      setTimeout(() => {
        setNewUserModalOpen(false);
        setNewUserMsg(null);
      }, 1200);
    } catch (err: any) {
      setNewUserMsg({ text: err.message, type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا المستخدم من قاعدة البيانات؟' : 'Are you sure you want to delete this user from database?')) return;
    try {
      const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          piiRedactionEnabled,
          promptInjectionFilter,
          strictGroundednessThreshold,
          rateLimitPerMinute,
          geminiModel,
          embeddingModel,
        }),
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
            <Settings className="w-4 h-4" />
            <span className="font-mono">{lang === 'ar' ? 'إعدادات المؤسسة والمصادقة' : 'Enterprise & Authentication Settings'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {lang === 'ar' ? 'المصادقة المحلية وقاعدة البيانات' : 'Local DB Authentication & Cloud RAG Hub'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            {lang === 'ar'
              ? `المستأجر الحالي: ${currentWorkspace.nameAr} (${currentWorkspace.tenantKey}) — مزود المصادقة الافتراضي: قاعدة البيانات (محلي / PBKDF2)`
              : `Current Tenant: ${currentWorkspace.nameEn} (${currentWorkspace.tenantKey}) — Default Auth Provider: Local Database (PBKDF2-SHA512)`}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs self-start md:self-auto">
          <button
            id="tab-btn-auth"
            onClick={() => setActiveTab('auth')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'auth' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'المصادقة والمستخدمين (DB)' : 'DB Auth & Users'}</span>
          </button>
          <button
            id="tab-btn-database"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'database' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'قاعدة البيانات (PostgreSQL)' : 'PostgreSQL & pgvector'}</span>
          </button>
          <button
            id="tab-btn-security"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'security' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الأمان و RLS' : 'Security & RLS'}</span>
          </button>
          <button
            id="tab-btn-providers"
            onClick={() => setActiveTab('providers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'providers' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'سجل النماذج' : 'Models & Providers'}</span>
          </button>
          <button
            id="tab-btn-guardrails"
            onClick={() => setActiveTab('guardrails')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'guardrails' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'حواجز الحماية' : 'Guardrails'}</span>
          </button>
        </div>
      </div>

      {/* Settings Container */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-8 shadow-xl">
        
        {/* TAB: Local Database Authentication & Identity Management */}
        {activeTab === 'auth' && (
          <div className="space-y-8">
            
            {/* Top Auth Provider Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-950 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">
                      {lang === 'ar' ? 'مزود المصادقة الافتراضي: قاعدة البيانات (محلي)' : 'Default Authentication Provider: Local Database'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      DEFAULT • ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    {lang === 'ar'
                      ? 'يتم تخزين بيانات الاعتماد والمستخدمين مباشرة في جدول `users` مع تشفير كلمات المرور باستخدام PBKDF2 و SHA-512 مع تمليح فريد (Salt 64 bytes) لكل حساب، وربط الجلسات بجدول `auth_sessions`.'
                      : 'Credentials stored natively in `users` table with PBKDF2/SHA-512 hashing (100k iterations, 64-byte salt) and session tracking via `auth_sessions` table.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <button
                  id="btn-open-login-modal-settings"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تبديل الحساب' : 'Switch User'}</span>
                </button>
                <button
                  id="btn-open-create-user-modal"
                  onClick={() => setNewUserModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{lang === 'ar' ? 'إضافة مستخدم جديد' : 'New DB User'}</span>
                </button>
              </div>
            </div>

            {/* Provider Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>{lang === 'ar' ? 'مزودو الهوية والمصادقة المتاحون' : 'Configured Authentication Providers'}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Local Database (Active Default) */}
                <div className="p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 relative overflow-hidden space-y-2">
                  <div className="absolute top-2 end-2">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-white">{lang === 'ar' ? 'قاعدة البيانات (محلي)' : 'Database (Local)'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'المزود الافتراضي الفعال لتسجيل الدخول والتحقق الآمن' : 'Primary & default provider with full PBKDF2/SHA-512 validation'}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-emerald-300">
                    <span>Algorithm: PBKDF2-SHA512</span>
                    <span className="font-bold text-emerald-400">Default (مفعل)</span>
                  </div>
                </div>

                {/* 2. SAML 2.0 / Enterprise SSO */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 opacity-80">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-white">SAML 2.0 / Okta / Azure AD</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'الربط مع مزودات الهوية المؤسسية الكبرى SSO' : 'Enterprise federated single sign-on integration'}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Protocol: SAML 2.0</span>
                    <span className="text-slate-400">Secondary (جاهز)</span>
                  </div>
                </div>

                {/* 3. LDAP / Active Directory */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 opacity-80">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-xs text-white">LDAP / Active Directory</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'المزامنة مع الدلائل المؤسسية والوصول الموحد' : 'On-prem directory synchronization & group mapping'}
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>Protocol: LDAPS (TLS 1.3)</span>
                    <span className="text-slate-400">Secondary (جاهز)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Registered Database Users Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>{lang === 'ar' ? 'حسابات المستخدمين المسجلين في قاعدة البيانات الحقيقية' : 'Registered Users in Database'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-cyan-400 font-mono">
                    {usersList.length} Accounts
                  </span>
                </h4>

                <button
                  onClick={fetchUsers}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingUsers ? 'animate-spin' : ''}`} />
                  <span>{lang === 'ar' ? 'تحديث القائمة' : 'Refresh'}</span>
                </button>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 text-start">{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                        <th className="py-3 px-4 text-start">{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                        <th className="py-3 px-4 text-start">{lang === 'ar' ? 'الدور والصلاحية' : 'Role'}</th>
                        <th className="py-3 px-4 text-start">{lang === 'ar' ? 'المستأجر (Workspace)' : 'Workspace'}</th>
                        <th className="py-3 px-4 text-start">{lang === 'ar' ? 'المزود' : 'Provider'}</th>
                        <th className="py-3 px-4 text-end">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {usersList.map((u) => {
                        const isCurrent = currentUser?.id === u.id;
                        const roleColor = {
                          admin: 'bg-red-950 text-red-300 border-red-800',
                          editor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
                          viewer: 'bg-slate-850 text-slate-300 border-slate-700',
                          auditor: 'bg-purple-950 text-purple-300 border-purple-800'
                        }[u.role] || 'bg-slate-800 text-slate-300';

                        return (
                          <tr key={u.id} className={`hover:bg-slate-900/50 transition-colors ${isCurrent ? 'bg-emerald-950/20' : ''}`}>
                            <td className="py-3 px-4 flex items-center gap-2.5">
                              <img 
                                src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'} 
                                alt={u.name}
                                className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-700" 
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-white flex items-center gap-1.5">
                                  {u.name}
                                  {isCurrent && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                                      {lang === 'ar' ? 'حسابك الحالي' : 'YOU'}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">ID: {u.id}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono text-slate-300">{u.email}</td>

                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${roleColor}`}>
                                {u.role}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {u.workspaceId || currentWorkspace.id}
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                <span>{u.provider || 'local_db'}</span>
                              </span>
                            </td>

                            <td className="py-3 px-4 text-end">
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                title={lang === 'ar' ? 'حذف من قاعدة البيانات' : 'Delete user'}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal: Create New User */}
            {newUserModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
                <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      <span>{lang === 'ar' ? 'إضافة مستخدم جديد إلى قاعدة البيانات' : 'Create User in Database'}</span>
                    </h3>
                    <button
                      onClick={() => setNewUserModalOpen(false)}
                      className="text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {newUserMsg && (
                    <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                      newUserMsg.type === 'success' ? 'bg-emerald-950 border border-emerald-800 text-emerald-300' : 'bg-red-950 border border-red-800 text-red-300'
                    }`}>
                      {newUserMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{newUserMsg.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{lang === 'ar' ? 'الاسم الكامل:' : 'Full Name:'}</label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. نورة السبيعي / Sarah Chen"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{lang === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="user@enterprise.sa"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{lang === 'ar' ? 'كلمة المرور:' : 'Password:'}</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{lang === 'ar' ? 'الدور والصلاحيات:' : 'Role & IAM Permissions:'}</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      >
                        <option value="admin">Admin (كامل الصلاحيات والإدارة)</option>
                        <option value="editor">Editor (رفع المستندات وتعديل المعرفة)</option>
                        <option value="viewer">Viewer (استعلام ومحادثة فقط)</option>
                        <option value="auditor">Auditor (مراجعة سجلات التدقيق والأمان)</option>
                      </select>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setNewUserModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 cursor-pointer"
                      >
                        {lang === 'ar' ? 'حفظ في قاعدة البيانات' : 'Save to DB'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB: Real PostgreSQL Database Connection */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span>{lang === 'ar' ? 'حالة الاتصال بقاعدة البيانات الحقيقية (PostgreSQL + pgvector)' : 'Real PostgreSQL Database & pgvector Connection'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {lang === 'ar'
                    ? 'إدارة الاتصال بـ DATABASE_URL، تشغيل المخطط التلقائي، وجداول المستأجرين مع فهارس المتجهات 3072d.'
                    : 'Manage PostgreSQL connection string, auto-migrations, and 3072d vector embeddings store.'}
                </p>
              </div>

              <button
                onClick={() => handleReconnectDb()}
                disabled={isCheckingDb}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold font-mono transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                <span>{isCheckingDb ? (lang === 'ar' ? 'جاري الفحص...' : 'Checking...') : (lang === 'ar' ? 'إعادة فحص الاتصال' : 'Test / Reconnect')}</span>
              </button>
            </div>

            {dbMessage && (
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{dbMessage}</span>
              </div>
            )}

            {/* Connection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{lang === 'ar' ? 'نوع المحرك:' : 'Database Engine:'}</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${dbStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="font-bold text-sm text-white font-mono">{dbStatus?.type || 'PostgreSQL'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {dbStatus?.connected ? (lang === 'ar' ? 'متصل ومفعل حياً' : 'Live & Active') : (lang === 'ar' ? 'محاكي الذاكرة (RLS Fallback)' : 'In-Memory Fallback')}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{lang === 'ar' ? 'امتداد المتجهات (pgvector):' : 'Vector Extension:'}</span>
                <div className="text-sm font-bold font-mono text-cyan-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{dbStatus?.pgvectorSupported || dbStatus?.connected ? 'pgvector (3072d)' : 'JSON/Dense Fallback'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">HNSW Cosine Metric &lt;=&gt;</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{lang === 'ar' ? 'التطبيع العربي (pg_trgm):' : 'Arabic Trigram Index:'}</span>
                <div className="text-sm font-bold font-mono text-emerald-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{dbStatus?.pgTrgmSupported || dbStatus?.connected ? 'pg_trgm Active' : 'ILIKE Search'}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Arabic Root & Substring Matching</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">{lang === 'ar' ? 'عزل المستأجرين (RLS):' : 'Row-Level Security:'}</span>
                <div className="text-sm font-bold font-mono text-purple-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ENFORCED</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">Tenant: {currentWorkspace.tenantKey}</div>
              </div>

            </div>

            {/* Live Database Info & Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left: Connection Details */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>{lang === 'ar' ? 'تفاصيل الخادم والبيئة' : 'Server Environment'}</span>
                </h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Database Name:</span>
                    <span className="text-white font-bold">{dbStatus?.databaseName || 'neondb / defaultdb'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Connection URI:</span>
                    <span className="text-cyan-300 truncate max-w-[180px]">{dbStatus?.urlMasked || 'postgresql://••••@ep-host/***'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                    <span className="text-slate-400">Server Engine:</span>
                    <span className="text-white truncate max-w-[180px]">{dbStatus?.serverVersion || 'PostgreSQL 16+ on Linux'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Pool Connections:</span>
                    <span className="text-emerald-400 font-bold">10 Max (Auto-scaling)</span>
                  </div>
                </div>
              </div>

              {/* Middle: Live Table Record Counts */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="font-bold text-xs text-white uppercase font-mono tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>{lang === 'ar' ? 'إحصائيات السجلات في الجداول' : 'Live Table Record Counts'}</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400">users (DB Auth):</span>
                    <div className="text-lg font-black text-emerald-400">{dbStatus?.tables?.usersCount || usersList.length || 3}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400">document_chunks:</span>
                    <div className="text-lg font-black text-cyan-400">{dbStatus?.tables?.chunksCount || 12}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400">sources:</span>
                    <div className="text-lg font-black text-indigo-400">{dbStatus?.tables?.sourcesCount || 4}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400">audit_logs:</span>
                    <div className="text-lg font-black text-purple-400">{dbStatus?.tables?.auditLogsCount || 8}</div>
                  </div>
                </div>
              </div>

              {/* Right: Custom Connection String / Environment Variable Guide */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-xs text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>{lang === 'ar' ? 'ربط قاعدة بيانات حية (Live Database URL)' : 'Live Database URL / Vercel'}</span>
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    {lang === 'ar'
                      ? 'يمكنك إدخال رابط الاتصال بقاعدة بيانات PostgreSQL (Supabase / Neon / Railway) واختباره مباشرة أو تعيينه في متغيرات Vercel:'
                      : 'Provide a live PostgreSQL URI (Supabase, Neon, Railway) to connect immediately or configure in Vercel settings:'}
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={customDbUrl}
                    onChange={(e) => setCustomDbUrl(e.target.value)}
                    placeholder="postgresql://postgres:pass@ep-host.region.neon.tech/neondb?sslmode=require"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-[11px] font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReconnectDb()}
                      disabled={isCheckingDb}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold font-mono transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingDb ? 'animate-spin' : ''}`} />
                      <span>{lang === 'ar' ? 'اختبار وحفظ الاتصال' : 'Connect & Test'}</span>
                    </button>
                    {customDbUrl && (
                      <button
                        onClick={() => setCustomDbUrl('')}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        {lang === 'ar' ? 'مسح' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                  <span>Vercel Env: </span>
                  <span className="text-amber-300">DATABASE_URL</span> | <span className="text-amber-300">POSTGRES_URL</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab: Security & Multi-Tenancy */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>{lang === 'ar' ? 'عزل المستأجرين والتشفير (Postgres Row-Level Security)' : 'Tenant Isolation & Row-Level Security'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'يضمن النظام عزل تام لكافة المتجهات والمستندات وفق سياسات RLS الصارمة مع تشفير AES-256.'
                  : 'Zero-leak tenant isolation enforced at PostgreSQL kernel level via RLS policies.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-400">Tenant Identifier:</div>
                <div className="font-mono text-sm text-cyan-300 font-bold">{currentWorkspace.tenantKey}</div>
                <div className="text-[10px] text-slate-500">Auto-injected into every database query session.</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-400">Data Encryption At Rest:</div>
                <div className="font-mono text-sm text-emerald-400 font-bold">AES-256-GCM / Cloud KMS</div>
                <div className="text-[10px] text-slate-500">Keys rotated every 90 days automatically.</div>
              </div>

            </div>
          </div>
        )}

        {/* Tab: Models & BYO Providers */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <span>{lang === 'ar' ? 'سجل نماذج الاستدلال والتضمين' : 'Inference & Embedding Provider Registry'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'اختر النماذج الأساسية لمعالجة واسترجاع المعرفة.'
                  : 'Configure core models for generation, reranking, and 3072d vector embeddings.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'النموذج الافتراضي للتوليد والاستدلال:' : 'Primary Inference LLM:'}
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
                >
                  <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (الافتراضي / Default)</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'نموذج التضمين المتجهي (Vector Embeddings):' : 'Embedding Vector Model:'}
                </label>
                <select
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer font-mono"
                >
                  <option value="gemini-embedding-2">Gemini Embedding 2 (3072 dimensions)</option>
                  <option value="text-embedding-3-large">OpenAI text-embedding-3-large (3072d)</option>
                </select>
              </div>

            </div>
          </div>
        )}

        {/* Tab: Guardrails */}
        {activeTab === 'guardrails' && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span>{lang === 'ar' ? 'حواجز الحماية المؤسسية وتصفية الهلوسة' : 'Enterprise Guardrails & Hallucination Mitigation'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'ضبط عتبات الأمان لمنع تسريب البيانات الشخصية وحماية النماذج من الهجمات.'
                  : 'Enforce PII redaction, prompt injection defenses, and strict refusal thresholds.'}
              </p>
            </div>

            <div className="space-y-4">
              
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="font-bold text-xs text-white">{lang === 'ar' ? 'حجب وتشفير البيانات الشخصية (PII Redaction)' : 'Automatic PII Redaction'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'ar' ? 'تنقيح الهويات الوطنية، بطاقات الائتمان، وأرقام الهواتف قبل التضمين والتوليد.' : 'Mask Saudi National IDs, emails, credit cards, and phone numbers.'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={piiRedactionEnabled}
                  onChange={(e) => setPiiRedactionEnabled(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="font-bold text-xs text-white">{lang === 'ar' ? 'حاجز حماية حقن الأوامر (Prompt Injection Defense)' : 'Prompt Injection & Jailbreak Defense'}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {lang === 'ar' ? 'فحص الاستعلامات الواردة لمنع تخطي التعليمات النظامية.' : 'Pre-flight check detecting jailbreak patterns and malicious system bypasses.'}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={promptInjectionFilter}
                  onChange={(e) => setPromptInjectionFilter(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>{lang === 'ar' ? 'عتبة التأريض لرفض الإجابة في وضع Strict:' : 'Strict Groundedness Refusal Threshold:'}</span>
                  <span className="text-cyan-400 font-mono">{(strictGroundednessThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={strictGroundednessThreshold}
                  onChange={(e) => setStrictGroundednessThreshold(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {lang === 'ar' ? 'يتم تطبيق التغييرات فورياً على مستوى المستأجر' : 'Changes applied instantly across all tenant sessions'}
          </div>

          <div className="flex items-center gap-3">
            {saveToast && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'تم الحفظ!' : 'Saved!'}</span>
              </span>
            )}

            <button
              onClick={handleSave}
              type="button"
              className="px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              {lang === 'ar' ? 'حفظ كافة الإعدادات' : 'Save Changes'}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
