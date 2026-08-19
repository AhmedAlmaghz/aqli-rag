import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Language, UserRole } from '../../types';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User, 
  Database, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  KeyRound,
  Building2,
  Users
} from 'lucide-react';

interface AuthModalProps {
  language: Language;
}

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

export const AuthModal: React.FC<AuthModalProps> = ({ language }) => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    setAuthModalMode, 
    login, 
    register, 
    switchUser,
    activeProvider
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('editor');
  const [workspaceId, setWorkspaceId] = useState('ws-enterprise-legal');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const isAr = language === 'ar';
  const Arrow = isAr ? ArrowLeft : ArrowRight;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    if (authModalMode === 'login') {
      const res = await login(email, password, workspaceId);
      if (!res.success) {
        setError(res.error || (isAr ? 'فشل تسجيل الدخول' : 'Login failed'));
      } else {
        setSuccessMsg(isAr ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!');
      }
    } else {
      if (!name) {
        setError(isAr ? 'يرجى إدخال الاسم بالكامل' : 'Please enter your full name');
        setIsSubmitting(false);
        return;
      }
      const res = await register(name, email, password, role, workspaceId);
      if (!res.success) {
        setError(res.error || (isAr ? 'فشل إنشاء الحساب' : 'Registration failed'));
      } else {
        setSuccessMsg(isAr ? 'تم إنشاء الحساب وحفظه في قاعدة البيانات!' : 'Account registered and saved in database!');
      }
    }
    setIsSubmitting(false);
  };

  const handleQuickSelect = async (presetEmail: string) => {
    setError(null);
    setIsSubmitting(true);
    const res = await login(presetEmail, 'password123');
    if (res.success) {
      closeAuthModal();
    } else {
      setError(res.error || (isAr ? 'فشل التبديل للحساب المختار' : 'Failed to switch user'));
    }
    setIsSubmitting(false);
  };

  return (
    <div 
      id="auth-modal-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onClick={closeAuthModal}
    >
      <div 
        id="auth-modal-container"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-600/20 via-indigo-600/20 to-blue-600/20 px-6 py-4 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'نظام المصادقة وإدارة الهوية' : 'Identity & Access Management'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  {isAr ? 'المزود الافتراضي: قاعدة البيانات (محلي)' : 'Default: Local Database'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr 
                  ? 'مصادقة مشفرة عبر خوارزمية PBKDF2/SHA-512 مع عزل المستأجرين RLS'
                  : 'Encrypted via PBKDF2/SHA-512 with Row-Level Security (RLS)'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-auth-modal"
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Quick Demo Switcher Section */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                {isAr ? 'حسابات قيادية مسجلة مسبقاً في قاعدة البيانات:' : 'Pre-seeded Enterprise DB Accounts:'}
              </span>
              <span className="text-[11px] text-slate-500">
                {isAr ? 'كلمة المرور الافتراضية: password123' : 'Default password: password123'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_USERS.map((pu) => (
                <button
                  key={pu.email}
                  type="button"
                  id={`btn-select-user-${pu.email.split('@')[0]}`}
                  onClick={() => handleQuickSelect(pu.email)}
                  disabled={isSubmitting}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-start transition-all group"
                >
                  <img 
                    src={pu.avatar} 
                    alt={pu.nameEn} 
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700 group-hover:ring-emerald-500/50" 
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                        {isAr ? pu.nameAr : pu.nameEn}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border ${pu.badgeColor}`}>
                        {pu.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {pu.email}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              id="tab-auth-login"
              type="button"
              onClick={() => { setAuthModalMode('login'); setError(null); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                authModalMode === 'login'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              {isAr ? 'تسجيل الدخول (قاعدة البيانات)' : 'Sign In (Database Auth)'}
            </button>
            <button
              id="tab-auth-register"
              type="button"
              onClick={() => { setAuthModalMode('register'); setError(null); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                authModalMode === 'register'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              {isAr ? 'إنشاء حساب جديد في DB' : 'Create Database Account'}
            </button>
          </div>

          {/* Messages */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authModalMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {isAr ? 'الاسم بالكامل' : 'Full Name'}
                </label>
                <div className="relative">
                  <User className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                  <input
                    id="input-auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isAr ? 'مثال: م. فهد الشمري' : 'e.g. Fahad Al-Shammari'}
                    className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isAr ? 'البريد الإلكتروني المؤسسي' : 'Enterprise Email'}
              </label>
              <div className="relative">
                <Mail className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                <input
                  id="input-auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@aqli.sa"
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                {authModalMode === 'login' && (
                  <span className="text-[11px] text-slate-500">
                    {isAr ? 'مشفرة في DB' : 'Encrypted in DB'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute top-3 left-3 rtl:left-auto rtl:right-3 w-4 h-4 text-slate-500" />
                <input
                  id="input-auth-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {authModalMode === 'register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isAr ? 'الدور الوظيفي والصلاحية' : 'Role & IAM Policy'}
                  </label>
                  <select
                    id="select-auth-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="editor">{isAr ? 'محرر ومحلل (Editor)' : 'Editor & Analyst'}</option>
                    <option value="admin">{isAr ? 'مسؤول مساحة عمل (Admin)' : 'Workspace Admin'}</option>
                    <option value="auditor">{isAr ? 'مدقق امتثال أمني (Auditor)' : 'Security Auditor'}</option>
                    <option value="viewer">{isAr ? 'مشاهد فقط (Viewer)' : 'Viewer (Read-Only)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    {isAr ? 'مساحة العمل المعزولة' : 'Target Workspace (RLS)'}
                  </label>
                  <select
                    id="select-auth-workspace"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    className="w-full py-2 px-3 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ws-enterprise-legal">{isAr ? 'الشؤون القانونية والامتثال' : 'Legal & Compliance'}</option>
                    <option value="ws-finance-fintech">{isAr ? 'التقنية المالية والمخاطر' : 'FinTech & Risk Models'}</option>
                    <option value="ws-ai-architecture">{isAr ? 'هندسة الذكاء ومعايير SDLC' : 'AI Architecture'}</option>
                  </select>
                </div>
              </div>
            )}

            <button
              id="btn-submit-auth"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {authModalMode === 'login'
                      ? (isAr ? 'تسجيل الدخول ومصادقة الجلسة' : 'Authenticate & Sign In')
                      : (isAr ? 'تأكيد التسجيل في قاعدة البيانات' : 'Register Database Account')}
                  </span>
                  <Arrow className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Guarantee Notice */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {isAr ? 'متوافق مع ضوابط الأمن السيبراني NCA ECC-1' : 'NCA ECC-1 Cybersecurity Compliant'}
            </span>
            <span>
              {isAr ? 'تشفير PBKDF2 / SHA-512' : 'PBKDF2 / SHA-512 Vault'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
