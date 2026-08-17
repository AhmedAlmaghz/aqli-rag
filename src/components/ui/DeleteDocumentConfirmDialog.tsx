import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Layers, 
  Database, 
  FileText, 
  HardDrive, 
  Calendar, 
  Globe, 
  ShieldAlert, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Language, DocumentSource } from '../../types';
import { getCategoryIconMeta } from '../../assets/categoryIcons';

interface DeleteDocumentConfirmDialogProps {
  isOpen: boolean;
  document: DocumentSource | null;
  lang: Language;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteDocumentConfirmDialog: React.FC<DeleteDocumentConfirmDialogProps> = ({
  isOpen,
  document,
  lang,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  // Listen for ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !document) return null;

  const categoryMeta = getCategoryIconMeta(document.nlpMetadata?.category || document.category);
  const displayTitle = lang === 'ar' ? (document.titleAr || document.titleEn) : (document.titleEn || document.titleAr);
  const secondaryTitle = lang === 'ar' ? document.titleEn : document.titleAr;
  const displayDate = document.uploadDate || (document.uploadedAt ? document.uploadedAt.split('T')[0] : document.lastSyncedAt || '2026-08-15');
  const chunksCount = document.chunksCount || 1;
  const isAr = lang === 'ar';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div 
        className="relative w-full max-w-xl bg-slate-950 border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden text-slate-100 animate-scaleUp ring-1 ring-rose-500/20"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Top Warning Accent Header */}
        <div className="bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-slate-950 p-5 border-b border-rose-500/20 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 id="delete-dialog-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'تأكيد حذف المستند المعرفي' : 'Confirm Document Deletion'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {isAr ? 'إجراء غير قابل للتراجع' : 'Irreversible'}
                </span>
              </h2>
              <p className="text-xs text-rose-300/80 mt-0.5">
                {isAr 
                  ? 'يرجى مراجعة تفاصيل المستند قبل إزالته من محرك المعرفة المتجهي.' 
                  : 'Please review document metadata before purging from the vector engine.'}
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          
          {/* Target Document Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-inner">
            
            {/* Header: Category Icon Thumbnail & Title */}
            <div className="flex items-start gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-700/80 shrink-0 shadow-md bg-slate-950">
                <img 
                  src={categoryMeta.imageUrl} 
                  alt={categoryMeta.labelEn}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${categoryMeta.borderColor} ${categoryMeta.bgColor} ${categoryMeta.textColor}`}>
                    <span>{isAr ? categoryMeta.shortAr : categoryMeta.shortEn}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                    {document.type}
                  </span>
                  {document.classificationLevel && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{document.classificationLevel}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-100 truncate" title={displayTitle}>
                  {displayTitle}
                </h3>
                {secondaryTitle && secondaryTitle !== displayTitle && (
                  <p className="text-xs text-slate-400 truncate font-mono mt-0.5">
                    {secondaryTitle}
                  </p>
                )}
              </div>
            </div>

            {/* Document Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60">
                <span className="text-[10px] text-slate-500 block mb-0.5">
                  {isAr ? 'المقاطع المتجهية (3072d):' : 'Vector Chunks (3072d):'}
                </span>
                <span className="font-mono font-bold text-cyan-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>{chunksCount} {isAr ? 'مقطع' : 'chunks'}</span>
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60">
                <span className="text-[10px] text-slate-500 block mb-0.5">
                  {isAr ? 'تاريخ الإدخال والرفع:' : 'Ingested Date:'}
                </span>
                <span className="font-mono text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{displayDate}</span>
                </span>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/60 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 block mb-0.5">
                  {isAr ? 'المصدر والأصل:' : 'Source Origin:'}
                </span>
                <span className="text-slate-300 flex items-center gap-1 truncate text-[11px]" title={document.source || document.fileName || document.type}>
                  <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{document.fileName || document.source || document.type}</span>
                </span>
              </div>
            </div>

          </div>

          {/* Deletion Impact Warning Box */}
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-xs space-y-2">
            <h4 className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>{isAr ? 'ماذا سيحدث عند إتمام عملية الحذف؟' : 'Impact of this deletion action:'}</span>
            </h4>
            <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed ps-1">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>
                  {isAr 
                    ? `سيتم مسح جميع المتجهات الـ (${chunksCount}) ذات الأبعاد 3072 نهائياً من قاعدة بيانات pgvector.`
                    : `All ${chunksCount} 3072-dimensional embeddings will be permanently purged from the vector index.`}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>
                  {isAr 
                    ? 'لن يتمكن محرك البحث الهجين (BM25 + Dense Cosine) أو الوكلاء الأذكياء من استرجاع نصوص هذا المستند.'
                    : 'Hybrid search (BM25 + Dense) and autonomous agents will no longer retrieve or cite this document.'}
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                <span>
                  {isAr 
                    ? 'سيتم تحديث مقاييس مساحة العمل وسجل التدقيق فوراً.'
                    : 'Workspace metrics and compliance audit logs will be updated immediately.'}
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            {isAr ? 'إلغاء الأمر' : 'Cancel'}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-lg shadow-rose-900/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{isAr ? 'جارٍ الحذف والتطهير...' : 'Purging vector index...'}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{isAr ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
