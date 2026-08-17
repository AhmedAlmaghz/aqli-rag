import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './views/HomePage';
import { ChatPage } from './views/ChatPage';
import { KnowledgeBasePage } from './views/KnowledgeBasePage';
import { AgentStudioPage } from './views/AgentStudioPage';
import { MarketplacePage } from './views/MarketplacePage';
import { McpHubPage } from './views/McpHubPage';
import { SdlcPage } from './views/SdlcPage';
import { DashboardPage } from './views/DashboardPage';
import { SettingsPage } from './views/SettingsPage';
import { Language, Workspace, RagMode, UserRole } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Database, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  KeyRound,
  Building2,
  Users,
  Globe,
  Activity
} from 'lucide-react';

const DEFAULT_WORKSPACE: Workspace = {
  id: 'ws-enterprise-legal',
  nameAr: 'مساحة العمل المؤسسية (Aqli Legal & Compliance)',
  nameEn: 'Aqli Enterprise Legal & Cyber Compliance',
  tenantKey: 'saudi-legal-corp',
  encryptionKeyId: 'kms-key-ecc-saudi-01',
  storageQuotaMb: 10240,
  usedStorageMb: 124,
  storageUsedMb: 124,
  documentsCount: 4,
  vectorsCount: 5,
  defaultMode: 'strict',
  createdAt: new Date().toISOString(),
};

const PRESET_USERS = [
  {
    email: 'admin@aqli.sa',
    nameAr: 'د. طارق السبيعي',
    nameEn: 'Dr. Tariq Al-Subaie',
    roleAr: 'مالك النظام ومسؤول الأمان (Owner)',
    roleEn: 'System Owner & CISO',
    role: 'owner' as UserRole,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    badgeColor: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/60',
  },
  {
    email: 'counsel@aqli.sa',
    nameAr: 'أ. ريم المنصور',
    nameEn: 'Reem Al-Mansoor',
    roleAr: 'مستشار قانوني أول ومدير (Admin)',
    roleEn: 'Senior Legal Counsel (Admin)',
    role: 'admin' as UserRole,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    badgeColor: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/60',
  },
  {
    email: 'analyst@aqli.sa',
    nameAr: 'م. فيصل الغامدي',
    nameEn: 'Faisal Al-Ghamdi',
    roleAr: 'محلل مخاطر ونماذج (Editor)',
    roleEn: 'Financial Risk Analyst (Editor)',
    role: 'editor' as UserRole,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    badgeColor: 'bg-blue-900/60 text-blue-300 border-blue-700/60',
  },
  {
    email: 'auditor@aqli.sa',
    nameAr: 'سارة العتيبي',
    nameEn: 'Sarah Al-Otaibi',
    roleAr: 'مدقق امتثال أمني وسيبراني (Auditor)',
    roleEn: 'Security & NCA Auditor',
    role: 'auditor' as UserRole,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700/60',
  },
];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const [lang, setLang] = useState<Language>('ar');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [currentMode, setCurrentMode] = useState<RagMode>('strict');

  const { user, isAuthenticated, isLoading, login, register, switchUser } = useAuth();

  // Secure Gate UI state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [workspaceId, setWorkspaceId] = useState('ws-enterprise-legal');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    localStorage.setItem('aqli_theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  const toggleTheme = () => {};

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/workspaces')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const ws = {
              ...DEFAULT_WORKSPACE,
              ...data[0],
              defaultMode: data[0].defaultMode || 'strict',
            };
            setCurrentWorkspace(ws);
            setCurrentMode(ws.defaultMode);
          }
        })
        .catch(err => console.error('Failed to load initial workspace:', err));
    }
  }, [isAuthenticated]);

  const handleGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const isAr = lang === 'ar';

    if (authMode === 'login') {
      const res = await login(email, password, workspaceId);
      if (!res.success) {
        setError(res.error || (isAr ? 'فشل تسجيل الدخول، يرجى التحقق من المدخلات.' : 'Login failed, please check your credentials.'));
      } else {
        setSuccessMsg(isAr ? 'تم التحقق من الهوية ومصادقة الجلسة بنجاح!' : 'Identity verified and session authenticated successfully!');
      }
    } else {
      if (!name) {
        setError(isAr ? 'يرجى إدخال الاسم بالكامل.' : 'Please enter your full name.');
        setIsSubmitting(false);
        return;
      }
      const res = await register(name, email, password, role, workspaceId);
      if (!res.success) {
        setError(res.error || (isAr ? 'فشل إنشاء الحساب الجديد.' : 'Registration failed.'));
      } else {
        setSuccessMsg(isAr ? 'تم تسجيل الحساب بنجاح وتوليد مفتاح المشتقات المتجهية!' : 'Account registered successfully with derived vector credentials!');
      }
    }
    setIsSubmitting(false);
  };

  const handlePresetSelect = async (presetEmail: string) => {
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    const success = await switchUser(presetEmail, 'password123');
    if (!success) {
      setError(lang === 'ar' ? 'فشل التبديل للحساب المختار' : 'Failed to switch user');
    }
    setIsSubmitting(false);
  };

  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  // 1. Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin"></div>
          <Activity className="absolute w-6 h-6 text-emerald-400 animate-pulse" />
        </div>
        <p className="mt-6 text-sm font-semibold tracking-wide text-slate-400">
          {isAr ? 'تحميل نظام الهوية وإدارة الوصول...' : 'Loading Identity & Access Manager...'}
        </p>
      </div>
    );
  }

  // 2. Unauthenticated Secure Login Gate
  if (!isAuthenticated) {
    return (
      <div 
        dir={isAr ? 'rtl' : 'ltr'} 
        className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans transition-colors duration-200 ${
          isAr ? 'font-arabic' : ''
        }`}
      >
        {/* Top bar on Login Gate */}
        <header className="px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              ع
            </div>
            <span className="font-bold text-sm tracking-tight">Aqli RAG Enterprise</span>
          </div>

          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>
        </header>

        {/* Central Gate Form Card */}
        <main className="flex-1 flex items-center justify-center px-4 py-12 max-w-lg w-full mx-auto">
          <div className="w-full space-y-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            
            {/* Top decorative lock glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            {/* Lock Header */}
            <div className="text-center space-y-2 relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
                <Lock className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isAr ? 'بوابة التحقق الآمن والمصادقة' : 'Secure Enterprise Auth Gate'}
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {isAr 
                  ? 'يجب تسجيل الدخول لمصادقة جلسة العمل وتفعيل حماية المستأجرين RLS وحظر غير المصرح لهم.'
                  : 'Access restricted. Please authenticate to verify tenant identity & activate row-level shielding.'}
              </p>
            </div>

            {/* Quick Demo Accounts Selection */}
            <div className="bg-slate-950/70 border border-slate-850 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {isAr ? 'حسابات تجريبية مؤسسية جاهزة للاستخدام:' : 'Pre-seeded Enterprise Roles (Demo):'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">pass: password123</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_USERS.map((pu) => (
                  <button
                    key={pu.email}
                    onClick={() => handlePresetSelect(pu.email)}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-emerald-500/30 text-start transition-all cursor-pointer group"
                  >
                    <img src={pu.avatar} alt="" className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-800" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-200 block truncate group-hover:text-white">
                        {isAr ? pu.nameAr.split(' ')[1] || pu.nameAr : pu.nameEn.split(' ')[1] || pu.nameEn}
                      </span>
                      <span className="text-[8px] text-slate-400 block truncate">{pu.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Auth Mode Switch Tabs */}
            <div className="flex border-b border-slate-800">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(null); }}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'login'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setError(null); }}
                className={`flex-1 pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'register'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                {isAr ? 'إنشاء حساب جديد' : 'Register Account'}
              </button>
            </div>

            {/* Notification Messages */}
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleGateSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    {isAr ? 'الاسم بالكامل' : 'Full Name'}
                  </label>
                  <div className="relative">
                    <User className="absolute top-2.5 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isAr ? 'مثال: د. عبدالرحمن المطيري' : 'e.g. Dr. Abdulrahman'}
                      className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isAr ? 'البريد الإلكتروني' : 'Enterprise Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute top-2.5 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@aqli.sa"
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute top-2.5 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {isAr ? 'الصلاحيات' : 'Role'}
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white focus:outline-none"
                    >
                      <option value="editor">{isAr ? 'محلل (Editor)' : 'Analyst (Editor)'}</option>
                      <option value="admin">{isAr ? 'مدير (Admin)' : 'Admin'}</option>
                      <option value="auditor">{isAr ? 'مدقق (Auditor)' : 'Auditor'}</option>
                      <option value="viewer">{isAr ? 'مشاهد (Viewer)' : 'Viewer'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {isAr ? 'مساحة العمل' : 'Workspace'}
                    </label>
                    <select
                      value={workspaceId}
                      onChange={(e) => setWorkspaceId(e.target.value)}
                      className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white focus:outline-none"
                    >
                      <option value="ws-enterprise-legal">{isAr ? 'الشؤون القانونية' : 'Legal & Compliance'}</option>
                      <option value="ws-finance-fintech">{isAr ? 'التقنية المالية' : 'FinTech & Risks'}</option>
                      <option value="ws-ai-architecture">{isAr ? 'هندسة الذكاء' : 'AI & SDLC Code'}</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {authMode === 'login'
                        ? (isAr ? 'تسجيل الدخول الآمن ومصادقة الجلسة' : 'Secure Sign In & Validate Session')
                        : (isAr ? 'تأكيد التسجيل في النظام المشفر' : 'Confirm Registration')}
                    </span>
                    <ArrowIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Certifications and Compliance standards */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                NCA ECC-1 Active Shield
              </span>
              <span className="flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-cyan-500" />
                PostgreSQL (RLS)
              </span>
            </div>
          </div>
        </main>

        <footer className="px-6 py-4 text-center text-slate-500 text-[10px] border-t border-slate-900">
          {isAr 
            ? 'منصة عقل RAG للمؤسسات الكبرى © ٢٠٢٦ - محمية بالكامل بموجب معايير الهيئة الوطنية للأمن السيبراني ومستويات العزل للمستأجرين.'
            : 'Aqli RAG Enterprise © 2026 - Fully compliant with NCA security frameworks and tenant-isolation policies.'}
        </footer>
      </div>
    );
  }

  // 3. Authenticated Full Platform Interface
  return (
    <div 
      dir={lang === 'ar' ? 'rtl' : 'ltr'} 
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 transition-colors duration-200 ${
        lang === 'ar' ? 'font-arabic' : ''
      } ${theme}`}
    >
      
      {/* Top Navbar */}
      <Navbar 
        lang={lang} 
        setLang={setLang}
        theme={theme}
        onToggleTheme={toggleTheme}
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={setCurrentWorkspace}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
      />

      {/* Authentication Modal (For quick role switches inside the app) */}
      <AuthModal language={lang} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                lang={lang} 
                currentWorkspace={currentWorkspace} 
                currentMode={currentMode} 
                setCurrentMode={setCurrentMode} 
              />
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ChatPage 
                lang={lang} 
                currentWorkspace={currentWorkspace} 
                currentMode={currentMode} 
                setCurrentMode={setCurrentMode} 
              />
            } 
          />
          <Route 
            path="/chat/:id" 
            element={
              <ChatPage 
                lang={lang} 
                currentWorkspace={currentWorkspace} 
                currentMode={currentMode} 
                setCurrentMode={setCurrentMode} 
              />
            } 
          />
          <Route 
            path="/knowledge-base" 
            element={
              <KnowledgeBasePage 
                lang={lang} 
                currentWorkspace={currentWorkspace} 
              />
            } 
          />
          <Route 
            path="/agents" 
            element={
              <AgentStudioPage 
                lang={lang} 
              />
            } 
          />
          <Route 
            path="/marketplace" 
            element={
              <MarketplacePage 
                lang={lang} 
              />
            } 
          />
          <Route 
            path="/mcp" 
            element={
              <McpHubPage 
                lang={lang} 
              />
            } 
          />
          <Route 
            path="/sdlc" 
            element={
              <SdlcPage 
                lang={lang} 
              />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <DashboardPage 
                lang={lang} 
                currentWorkspace={currentWorkspace} 
              />
            } 
          />
          <Route 
            path="/settings" 
            element={
              <SettingsPage 
                lang={lang} 
                setLang={setLang} 
                currentWorkspace={currentWorkspace} 
              />
            } 
          />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer lang={lang} />

    </div>
  );
}
