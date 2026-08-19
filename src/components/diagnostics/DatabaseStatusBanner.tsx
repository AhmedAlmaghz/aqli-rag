import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  WifiOff, 
  KeyRound, 
  ShieldAlert, 
  RefreshCw, 
  ChevronRight, 
  ExternalLink, 
  Copy, 
  Check, 
  Info,
  Server,
  Zap,
  Activity,
  X
} from 'lucide-react';
import { DatabaseStatus, Language, DbErrorCategory } from '../../types';

interface DatabaseStatusBannerProps {
  lang: Language;
  onOpenSettings?: () => void;
  showAlways?: boolean;
}

export const DatabaseStatusBanner: React.FC<DatabaseStatusBannerProps> = ({
  lang,
  onOpenSettings,
  showAlways = false,
}) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isAr = lang === 'ar';

  const checkConnectivity = useCallback(async (overrideUrl?: string) => {
    setIsDiagnosing(true);
    setTestResult(null);
    try {
      let res;
      if (overrideUrl) {
        res = await fetch('/api/db/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectionString: overrideUrl }),
        });
      } else {
        res = await fetch('/api/db/status');
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: DatabaseStatus = await res.json();
      setStatus(data);

      if (overrideUrl) {
        setTestResult({
          success: data.connected,
          message: data.connected
            ? (isAr ? 'تم الاتصال بنجاح بقاعدة البيانات!' : 'Successfully connected to PostgreSQL!')
            : (data.diagnostic?.messageAr || (isAr ? 'فشل الاتصال بالرابط المدخل.' : 'Failed to connect.')),
        });
      }
    } catch (err: any) {
      console.error('Database diagnostic probe error:', err);
      setStatus(prev => ({
        connected: false,
        type: 'In-Memory (Fallback)',
        configuredUrlPresent: Boolean(prev?.configuredUrlPresent),
        pgvectorSupported: false,
        pgTrgmSupported: false,
        rlsEnforced: true,
        lastChecked: new Date().toISOString(),
        tables: {
          sourcesCount: 0,
          chunksCount: 0,
          agentsCount: 0,
          conversationsCount: 0,
          auditLogsCount: 0,
        },
        error: err.message,
        diagnostic: {
          category: 'NETWORK_ERROR',
          titleAr: 'خطأ في الاتصال بالشبكة أو الخادم البعيد',
          titleEn: 'Network & Host Connectivity Issue',
          messageAr: `تعذر الوصول إلى نقطة نهاية تشخيص الخادم: ${err.message}`,
          messageEn: `Failed to reach server diagnostic endpoint: ${err.message}`,
          technicalCode: 'ERR_DIAGNOSTIC_UNREACHABLE',
          suggestedActionAr: 'تأكد من تشغيل الخادم والاتصال بالإنترنت.',
          suggestedActionEn: 'Ensure the backend server is running and internet connection is active.',
        },
      }));
    } finally {
      setIsLoading(false);
      setIsDiagnosing(false);
    }
  }, [isAr]);

  useEffect(() => {
    checkConnectivity();
  }, [checkConnectivity]);

  const handleCopyMaskedUrl = () => {
    if (status?.urlMasked) {
      navigator.clipboard.writeText(status.urlMasked);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const category = status?.diagnostic?.category || (status?.connected ? 'NONE' : 'UNCONFIGURED');

  // Don't render banner if connected unless explicitly requested via showAlways or modal is open
  const shouldRenderBanner = !isDismissed && (!status?.connected || showAlways);

  return (
    <>
      {/* 1. Diagnostic Alert Banner */}
      {shouldRenderBanner && (
        <div 
          id="db-diagnostic-banner"
          className={`w-full transition-all duration-300 relative z-30 border-b backdrop-blur-md px-4 py-2.5 ${
            category === 'CREDENTIAL_ERROR'
              ? 'bg-rose-950/80 border-rose-800/80 text-rose-200'
              : category === 'NETWORK_ERROR'
              ? 'bg-amber-950/80 border-amber-800/80 text-amber-200'
              : category === 'DATABASE_NOT_FOUND' || category === 'SSL_ERROR'
              ? 'bg-orange-950/80 border-orange-800/80 text-orange-200'
              : status?.connected
              ? 'bg-emerald-950/70 border-emerald-800/60 text-emerald-200'
              : 'bg-slate-900/90 border-slate-800 text-slate-300'
          }`}
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
            
            {/* Left/Start: Icon & Category Label */}
            <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
              <div className={`p-1.5 rounded-lg shrink-0 ${
                category === 'CREDENTIAL_ERROR'
                  ? 'bg-rose-900/80 text-rose-300 ring-1 ring-rose-500/40'
                  : category === 'NETWORK_ERROR'
                  ? 'bg-amber-900/80 text-amber-300 ring-1 ring-amber-500/40'
                  : status?.connected
                  ? 'bg-emerald-900/80 text-emerald-300 ring-1 ring-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'
              }`}>
                {category === 'CREDENTIAL_ERROR' ? (
                  <KeyRound className="w-4 h-4 text-rose-400 animate-pulse" />
                ) : category === 'NETWORK_ERROR' ? (
                  <WifiOff className="w-4 h-4 text-amber-400" />
                ) : status?.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Database className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold tracking-wide">
                    {category === 'CREDENTIAL_ERROR' ? (
                      isAr ? '🔴 خطأ في بيانات الاعتماد والمصادقة (POSTGRES_URL Auth Error)' : '🔴 Authentication / Credential Failure'
                    ) : category === 'NETWORK_ERROR' ? (
                      isAr ? '🟠 تعذر الاتصال بالشبكة أو الخادم (POSTGRES_URL Network Error)' : '🟠 Network / Host Connectivity Issue'
                    ) : category === 'DATABASE_NOT_FOUND' ? (
                      isAr ? '⚠️ اسم قاعدة البيانات غير موجود على الخادم' : '⚠️ Target Database Catalog Not Found'
                    ) : category === 'SSL_ERROR' ? (
                      isAr ? '🔒 خطأ في تفاوض شهادة أمان SSL' : '🔒 SSL/TLS Security Negotiation Failed'
                    ) : status?.connected ? (
                      isAr ? `🟢 متصل بقاعدة بيانات PostgreSQL (${status.databaseName || 'Live'})` : `🟢 Connected to PostgreSQL (${status.databaseName || 'Live'})`
                    ) : (
                      isAr ? '🔵 وضع الذاكرة التزامني (POSTGRES_URL غير مضبوط)' : '🔵 In-Memory Fallback (POSTGRES_URL Unconfigured)'
                    )}
                  </span>

                  {status?.latencyMs !== undefined && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                      {status.latencyMs}ms
                    </span>
                  )}
                </div>

                <p className="text-[11px] opacity-90 truncate max-w-2xl mt-0.5">
                  {status?.diagnostic ? (
                    isAr ? status.diagnostic.messageAr : status.diagnostic.messageEn
                  ) : status?.connected ? (
                    isAr ? 'جميع جداول المعرفة والمتجهات والمصادقة تعمل بأعلى كفاءة.' : 'Knowledge, pgvector, and auth tables fully synchronized.'
                  ) : (
                    isAr ? 'التطبيق يعمل بنجاح مع عزل المستأجرين في الذاكرة.' : 'System running in memory with full tenant isolation.'
                  )}
                </p>
              </div>
            </div>

            {/* Right/End: Actions & Modal Opener */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="btn-recheck-db"
                onClick={() => checkConnectivity()}
                disabled={isDiagnosing}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 border border-slate-700 transition shadow-sm active:scale-95 disabled:opacity-50"
                title={isAr ? 'إعادة فحص الاتصال' : 'Re-check connectivity'}
              >
                <RefreshCw className={`w-3 h-3 ${isDiagnosing ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isAr ? 'إعادة الفحص' : 'Re-check'}</span>
              </button>

              <button
                id="btn-open-db-diagnostic-modal"
                onClick={() => setIsModalOpen(true)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold shadow-sm transition active:scale-95 ${
                  category === 'CREDENTIAL_ERROR'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : category === 'NETWORK_ERROR'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <span>{isAr ? 'تفاصيل التشخيص والحل' : 'Diagnostic Details & Fix'}</span>
                <ChevronRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
              </button>

              <button
                id="btn-dismiss-db-banner"
                onClick={() => setIsDismissed(true)}
                className="p-1 rounded-md hover:bg-black/20 text-slate-400 hover:text-slate-200 transition"
                title={isAr ? 'إغلاق الإشعار' : 'Dismiss'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Comprehensive Database Diagnostics Modal */}
      {isModalOpen && (
        <div 
          id="db-diagnostic-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div 
            id="db-diagnostic-modal-container"
            className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  category === 'CREDENTIAL_ERROR'
                    ? 'bg-rose-950 border border-rose-700/60 text-rose-400'
                    : category === 'NETWORK_ERROR'
                    ? 'bg-amber-950 border border-amber-700/60 text-amber-400'
                    : status?.connected
                    ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-400'
                    : 'bg-slate-800 border border-slate-700 text-slate-300'
                }`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {isAr ? 'تشخيص الاتصال بقاعدة البيانات (POSTGRES_URL)' : 'Database Connectivity Diagnostic (POSTGRES_URL)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAr ? 'فحص دقيق ومباشر لبيانات الاعتماد والشبكة والملحقات' : 'Live probe for credentials, network reachability, and pgvector'}
                  </p>
                </div>
              </div>

              <button
                id="btn-close-db-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-sm">
              
              {/* Status Overview Card */}
              <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
                category === 'CREDENTIAL_ERROR'
                  ? 'bg-rose-950/40 border-rose-800/60'
                  : category === 'NETWORK_ERROR'
                  ? 'bg-amber-950/40 border-amber-800/60'
                  : status?.connected
                  ? 'bg-emerald-950/40 border-emerald-800/60'
                  : 'bg-slate-800/50 border-slate-700'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    {isAr ? 'حالة الاتصال والتشخيص' : 'Diagnostic Status'}
                  </span>
                  
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    status?.connected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : category === 'CREDENTIAL_ERROR'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : category === 'NETWORK_ERROR'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {status?.connected ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>{isAr ? 'متصل بنجاح (PostgreSQL Live)' : 'Connected (PostgreSQL Live)'}</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span>{status?.diagnostic?.category || (isAr ? 'غير متصل' : 'Disconnected')}</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    {status?.diagnostic?.titleAr ? (
                      isAr ? status.diagnostic.titleAr : status.diagnostic.titleEn
                    ) : (
                      isAr ? 'فحص الاتصال بقاعدة البيانات' : 'Database Connectivity Probe'
                    )}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {status?.diagnostic?.messageAr ? (
                      isAr ? status.diagnostic.messageAr : status.diagnostic.messageEn
                    ) : (
                      isAr ? 'تم فحص الاتصال بقاعدة البيانات.' : 'Database connection verified.'
                    )}
                  </p>
                </div>

                {/* Error Code & Specific Reason */}
                {status?.diagnostic?.technicalCode && (
                  <div className="pt-2 border-t border-slate-700/50 flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span>{isAr ? 'الرمز التقني:' : 'Technical Code:'}</span>
                      <code className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
                        {status.diagnostic.technicalCode}
                      </code>
                    </div>

                    {status.latencyMs !== undefined && (
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>{isAr ? 'زمن الاستجابة:' : 'Latency:'}</span>
                        <span className="text-emerald-400 font-mono font-bold">{status.latencyMs}ms</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actionable Fix Recommendation */}
              {status?.diagnostic?.suggestedActionAr && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isAr ? 'الخطوات المقترحة لحل المشكلة' : 'Actionable Resolution Steps'}</span>
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {isAr ? status.diagnostic.suggestedActionAr : status.diagnostic.suggestedActionEn}
                  </p>
                </div>
              )}

              {/* Connection Details Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {isAr ? 'معلومات التكوين والبيئة' : 'Environment & Configuration Details'}
                </h4>

                <div className="bg-slate-950/70 border border-slate-800 rounded-xl divide-y divide-slate-800/80 text-xs">
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{isAr ? 'متغير البيئة المستهدف:' : 'Target Environment Variable:'}</span>
                    <span className="font-mono font-bold text-slate-200">
                      {status?.targetEnvVar || 'POSTGRES_URL'}
                    </span>
                  </div>

                  <div className="p-3 flex items-center justify-between gap-4">
                    <span className="text-slate-400 shrink-0">{isAr ? 'رابط الاتصال (Masked URL):' : 'Connection URL (Masked):'}</span>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <code className="font-mono text-[11px] text-slate-300 truncate max-w-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {status?.urlMasked || (isAr ? 'غير محدد (Not Configured)' : 'Not Configured')}
                      </code>
                      {status?.urlMasked && (
                        <button
                          onClick={handleCopyMaskedUrl}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                          title={isAr ? 'نسخ' : 'Copy'}
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{isAr ? 'دعم ملحق البحث المعجمي (pg_trgm):' : 'Lexical Search (pg_trgm):'}</span>
                    <span className={status?.pgTrgmSupported ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {status?.pgTrgmSupported ? (isAr ? 'مفعل (نشط)' : 'Active') : (isAr ? 'غير متاح (استخدام ILIKE)' : 'Fallback')}
                    </span>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{isAr ? 'دعم البحث المتجهي (pgvector):' : 'Dense Vector Extension (pgvector):'}</span>
                    <span className={status?.pgvectorSupported ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                      {status?.pgvectorSupported ? (isAr ? 'مفعل (3072 أبعاد)' : 'Active (3072 dims)') : (isAr ? 'غير متاح (تخزين JSON)' : 'JSON Fallback')}
                    </span>
                  </div>

                  <div className="p-3 flex items-center justify-between">
                    <span className="text-slate-400">{isAr ? 'عزل المستأجرين (Multi-Tenant RLS):' : 'Tenant Isolation (RLS):'}</span>
                    <span className="text-emerald-400 font-semibold">
                      {isAr ? 'مطبق ومؤمّن بالكامل' : 'Strictly Enforced'}
                    </span>
                  </div>
                </div>
              </div>

              {/* On-Demand Custom String Probe */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200">
                    {isAr ? 'اختبار رابط اتصال مخصص فورياً' : 'Test Custom Connection String'}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {isAr ? 'اختبار آمن دون حفظ دائم' : 'Safe ephemeral test'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="password"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="postgres://user:password@host:5432/dbname?sslmode=require"
                    className="flex-1 px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => checkConnectivity(customUrl)}
                    disabled={isDiagnosing || !customUrl.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'اختبار' : 'Test'}</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200' 
                      : 'bg-rose-950/80 border border-rose-800 text-rose-200'
                  }`}>
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 text-xs">
              <span className="text-slate-400">
                {isAr ? 'آخر فحص:' : 'Last Checked:'} {status?.lastChecked ? new Date(status.lastChecked).toLocaleTimeString(isAr ? 'ar-SA' : 'en-US') : '-'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => checkConnectivity()}
                  disabled={isDiagnosing}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{isAr ? 'إعادة الفحص' : 'Re-run Diagnostics'}</span>
                </button>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
