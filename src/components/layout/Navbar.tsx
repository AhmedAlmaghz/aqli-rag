import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Bot, 
  Database, 
  LayoutDashboard, 
  MessageSquare, 
  Store, 
  Network, 
  FileCheck2, 
  Settings, 
  Globe, 
  ShieldCheck, 
  Sparkles,
  Cpu,
  Building2,
  ChevronDown,
  LogOut,
  UserCheck,
  KeyRound,
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { Language, Workspace, RagMode } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  lang: Language;
  setLang: (lang: Language) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  currentWorkspace: Workspace;
  setCurrentWorkspace: (ws: Workspace) => void;
  currentMode: RagMode;
  setCurrentMode: (mode: RagMode) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  lang, 
  setLang,
  theme = 'dark',
  onToggleTheme,
  currentWorkspace,
  setCurrentWorkspace,
  currentMode,
  setCurrentMode,
}) => {
  const location = useLocation();
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [serverStatus, setServerStatus] = useState<'online' | 'checking' | 'offline'>('checking');
  const [dbStatusLabel, setDbStatusLabel] = useState<string>('PostgreSQL');
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([currentWorkspace]);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/workspaces')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setWorkspaces(data);
          }
        })
        .catch(err => console.error('Failed to load workspaces:', err));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') {
          setServerStatus('online');
          if (data.database) setDbStatusLabel(data.database.includes('PostgreSQL') ? 'PostgreSQL' : 'pgvector (RLS)');
        } else {
          setServerStatus('offline');
        }
      })
      .catch(() => setServerStatus('offline'));

    fetch('/api/db/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.connected) {
          setDbStatusLabel('PostgreSQL (Live)');
        }
      })
      .catch(() => {});
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      path: '/',
      labelAr: 'الرئيسية',
      labelEn: 'Overview',
      icon: Sparkles,
    },
    {
      path: '/chat',
      labelAr: 'المحادثة والوكلاء',
      labelEn: 'RAG Chat',
      icon: MessageSquare,
    },
    {
      path: '/knowledge-base',
      labelAr: 'قاعدة المعرفة',
      labelEn: 'Knowledge Base',
      icon: Database,
    },
    {
      path: '/agents',
      labelAr: 'استوديو الوكلاء',
      labelEn: 'Agent Studio',
      icon: Bot,
    },
    {
      path: '/marketplace',
      labelAr: 'السوق والموصلات',
      labelEn: 'Marketplace',
      icon: Store,
    },
    {
      path: '/mcp',
      labelAr: 'بروتوكول MCP',
      labelEn: 'MCP Hub',
      icon: Network,
    },
    {
      path: '/dashboard',
      labelAr: 'التحليلات',
      labelEn: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      path: '/settings',
      labelAr: 'الإعدادات',
      labelEn: 'Settings',
      icon: Settings,
    },
  ];

  const modeBadge = ({
    strict: { labelAr: 'Strict (مقيد بالمصادر)', labelEn: 'Strict (Sources Only)', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    augmented: { labelAr: 'Augmented (هجين)', labelEn: 'Augmented (Hybrid)', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    open: { labelAr: 'Open (وكيل حر)', labelEn: 'Open (Free Agent)', bg: 'bg-violet-500/10 text-violet-400 border-violet-500/30' }
  } as Record<string, { labelAr: string; labelEn: string; bg: string }>)[currentMode || 'strict'] || {
    labelAr: 'Strict (مقيد بالمصادر)',
    labelEn: 'Strict (Sources Only)',
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/90 border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500 font-bold text-lg shadow-sm group-hover:border-slate-700 transition-all">
                ع
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-slate-100 tracking-tight">
                    Aqli RAG
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  {lang === 'ar' ? 'نظام استرجاع وتوليد هجين ثنائي اللغة' : 'Enterprise Bilingual Hybrid RAG'}
                </span>
              </div>
            </Link>

            {/* Workspace Selector Dropdown */}
            <div className="relative hidden md:block">
              <button
                id="btn-workspace-dropdown"
                onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-300 transition-all cursor-pointer"
                title="تبديل مساحة العمل / Switch Workspace"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="max-w-[140px] truncate font-medium">
                  {lang === 'ar' ? currentWorkspace.nameAr : currentWorkspace.nameEn}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {workspaceMenuOpen && (
                <div className="absolute top-full mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800">
                    {lang === 'ar' ? 'مساحات العمل المعزولة (Postgres RLS)' : 'Isolated Workspaces (Postgres RLS)'}
                  </div>
                  <div className="space-y-1 mt-1">
                    {workspaces.map((ws) => (
                      <button
                        key={ws.id}
                        onClick={() => {
                          setCurrentWorkspace(ws);
                          setCurrentMode(ws.defaultMode || 'strict');
                          setWorkspaceMenuOpen(false);
                        }}
                        className={`w-full text-start px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                          currentWorkspace.id === ws.id
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold'
                            : 'text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="truncate">
                          <div>{lang === 'ar' ? ws.nameAr : ws.nameEn}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{ws.tenantKey}</div>
                        </div>
                        {currentWorkspace.id === ws.id && (
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-850/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <div key={item.path} className="relative group">
                  <Link
                    to={item.path}
                    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.12)] font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 border border-transparent hover:border-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110" />
                  </Link>
                  
                  {/* Premium Hover Tooltip with Smooth Animation */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-[11px] font-semibold whitespace-nowrap shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-50 flex flex-col items-center">
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 border-l border-t border-slate-800"></div>
                    {lang === 'ar' ? item.labelAr : item.labelEn}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Right Controls: Mode Indicator, Server Health, User Auth, Language Toggle */}
          <div className="flex items-center gap-2">
            
            {/* Quick Mode Toggle Icon */}
            <div className="hidden sm:block relative group/mode">
              <button
                id="btn-quick-mode-toggle"
                onClick={() => {
                  const nextMode: RagMode = currentMode === 'strict' ? 'augmented' : currentMode === 'augmented' ? 'open' : 'strict';
                  setCurrentMode(nextMode);
                }}
                className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer relative ${
                  currentMode === 'strict' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.08)]' 
                    : currentMode === 'augmented'
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.08)]'
                    : 'bg-violet-500/10 text-violet-400 border-violet-500/30 hover:border-violet-500/50 shadow-[0_0_10px_rgba(139,92,246,0.08)]'
                }`}
              >
                <Cpu className="w-4.5 h-4.5 animate-pulse" />
                <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  currentMode === 'strict' ? 'bg-emerald-400' : currentMode === 'augmented' ? 'bg-cyan-400' : 'bg-violet-400'
                }`}></span>
              </button>
              
              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-[11px] font-semibold whitespace-nowrap shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/mode:opacity-100 group-hover/mode:scale-100 transition-all duration-200 z-50 flex flex-col items-center">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 border-l border-t border-slate-800"></div>
                <span className="text-slate-400 text-[10px] block mb-0.5">
                  {lang === 'ar' ? 'وضع الاسترجاع الحالي' : 'Retrieval Mode'}
                </span>
                {lang === 'ar' ? modeBadge.labelAr : modeBadge.labelEn}
              </div>
            </div>

            {/* Database & Vector Store Status Icon */}
            <div className="hidden lg:block relative group/db">
              <Link
                id="link-db-status"
                to="/settings"
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer relative"
              >
                <Database className="w-4.5 h-4.5" />
                <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-ping"></span>
                <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              </Link>

              {/* Tooltip */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-[11px] font-semibold whitespace-nowrap shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/db:opacity-100 group-hover/db:scale-100 transition-all duration-200 z-50 flex flex-col items-center">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 border-l border-t border-slate-800"></div>
                <span className="text-slate-400 text-[10px] block mb-0.5">
                  {lang === 'ar' ? 'حالة قاعدة البيانات والمتجهات' : 'Vector Database Status'}
                </span>
                {dbStatusLabel}
              </div>
            </div>

            {/* User Profile / Auth Control Dropdown */}
            <div className="relative" ref={userMenuRef}>
              {isAuthenticated && user ? (
                <div className="relative group/user">
                  <button
                    id="btn-user-profile-menu"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700/80 transition-all cursor-pointer group"
                  >
                    <img 
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'} 
                      alt={user.name} 
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500/50 group-hover:scale-105 transition-transform"
                    />
                  </button>

                  {/* Tooltip */}
                  <div className="absolute top-full end-0 mt-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-[11px] font-semibold whitespace-nowrap shadow-2xl opacity-0 scale-95 pointer-events-none group-hover/user:opacity-100 group-hover/user:scale-100 transition-all duration-200 z-50 flex flex-col items-end">
                    <div className="absolute bottom-full end-4 w-2 h-2 rotate-45 bg-slate-900 border-l border-t border-slate-800"></div>
                    <span className="text-white text-[11px] font-bold">{user.name}</span>
                    <span className="text-[9px] text-emerald-400">{user.role} • {lang === 'ar' ? 'عرض الملف' : 'View Profile'}</span>
                  </div>
                </div>
              ) : (
                <button
                  id="btn-open-auth-modal"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950 transition-all cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'دخول / DB' : 'Sign In'}</span>
                </button>
              )}

              {/* User Dropdown Menu */}
              {userMenuOpen && user && (
                <div 
                  id="user-profile-dropdown"
                  className="absolute top-full end-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  {/* User Profile Card */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 mb-2">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {user.role.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            مزود: قاعدة البيانات (محلي)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-1">
                    <button
                      id="btn-switch-account-modal"
                      onClick={() => {
                        setUserMenuOpen(false);
                        openAuthModal('login');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors text-start cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4 text-cyan-400" />
                      <span>{lang === 'ar' ? 'تبديل الحساب (مستخدمي DB)' : 'Switch DB Account'}</span>
                    </button>

                    <Link
                      id="link-user-settings"
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors text-start"
                    >
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>{lang === 'ar' ? 'إدارة الهوية والصلاحيات IAM' : 'IAM & Security Policies'}</span>
                    </Link>

                    <div className="border-t border-slate-800 my-1"></div>

                    <button
                      id="btn-logout"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition-colors text-start cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <button
              id="btn-toggle-lang"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              title="تغيير اللغة / Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{lang === 'ar' ? 'EN' : 'العربية'}</span>
            </button>

          </div>

        </div>
      </div>

      {/* Mobile / Medium Subnav Row */}
      <div className="xl:hidden border-t border-slate-800/70 bg-slate-950/95 px-2 py-1.5 overflow-x-auto flex items-center gap-1 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1 whitespace-nowrap px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 border border-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? item.labelAr : item.labelEn}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
};
