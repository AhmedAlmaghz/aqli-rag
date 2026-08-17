import policyIconUrl from './images/category_policy_icon_1786820283516.jpg';
import techIconUrl from './images/category_tech_icon_1786820296777.jpg';
import generalIconUrl from './images/category_general_icon_1786820306827.jpg';

export interface CategoryIconMeta {
  id: 'policy' | 'technical' | 'general' | 'legal' | 'financial';
  labelAr: string;
  labelEn: string;
  shortAr: string;
  shortEn: string;
  imageUrl: string;
  accentColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  descriptionAr: string;
  descriptionEn: string;
}

export const CATEGORY_ICON_MAP: Record<string, CategoryIconMeta> = {
  policy: {
    id: 'policy',
    labelAr: 'سياسات وحوكمة (Policy & Governance)',
    labelEn: 'Policy & Governance',
    shortAr: 'سياسات وحوكمة',
    shortEn: 'Policy',
    imageUrl: policyIconUrl,
    accentColor: '#a855f7',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-950/40',
    textColor: 'text-purple-400',
    descriptionAr: 'وثائق اللوائح التنظيمية، الامتثال السيبراني، والحوكمة المؤسسية',
    descriptionEn: 'Regulatory frameworks, cybersecurity compliance & institutional governance'
  },
  regulatory: {
    id: 'policy',
    labelAr: 'سياسات ولوائح تنظيمية (Regulatory)',
    labelEn: 'Regulations & Compliance',
    shortAr: 'لوائح وأنظمة',
    shortEn: 'Regulatory',
    imageUrl: policyIconUrl,
    accentColor: '#a855f7',
    borderColor: 'border-purple-500/40',
    bgColor: 'bg-purple-950/40',
    textColor: 'text-purple-400',
    descriptionAr: 'معايير الهيئة الوطنية للأمن السيبراني وضوابط ECC/CSCC',
    descriptionEn: 'National Cybersecurity Authority standards & ECC/CSCC controls'
  },
  technical: {
    id: 'technical',
    labelAr: 'تقني وهندسي (Technical & Engineering)',
    labelEn: 'Technical & Engineering',
    shortAr: 'تقني وهندسي',
    shortEn: 'Technical',
    imageUrl: techIconUrl,
    accentColor: '#06b6d4',
    borderColor: 'border-cyan-500/40',
    bgColor: 'bg-cyan-950/40',
    textColor: 'text-cyan-400',
    descriptionAr: 'معماريات السحاب، أدلة المطورين، الشيفرات وقواعد البيانات',
    descriptionEn: 'Cloud architectures, developer manuals, APIs, code & schemas'
  },
  legal: {
    id: 'legal',
    labelAr: 'قانوني وعقود (Legal & Contracts)',
    labelEn: 'Legal & Contracts',
    shortAr: 'قانوني وعقود',
    shortEn: 'Legal',
    imageUrl: policyIconUrl,
    accentColor: '#f59e0b',
    borderColor: 'border-amber-500/40',
    bgColor: 'bg-amber-950/40',
    textColor: 'text-amber-400',
    descriptionAr: 'العقود الاستشارية، اتفاقيات مستوى الخدمة SLA وشروط الخصوصية',
    descriptionEn: 'SLA contracts, non-disclosure agreements & terms of service'
  },
  financial: {
    id: 'financial',
    labelAr: 'مالي ومحاسبي (Financial & Auditing)',
    labelEn: 'Financial & Accounting',
    shortAr: 'مالي ومحاسبي',
    shortEn: 'Financial',
    imageUrl: generalIconUrl,
    accentColor: '#10b981',
    borderColor: 'border-emerald-500/40',
    bgColor: 'bg-emerald-950/40',
    textColor: 'text-emerald-400',
    descriptionAr: 'القوائم المالية، الموازنات التقديرية وسجلات التحوط الاستثماري',
    descriptionEn: 'Financial statements, capital budgets & hedging ledgers'
  },
  general: {
    id: 'general',
    labelAr: 'عام ومعرفي (General Knowledge Base)',
    labelEn: 'General Knowledge',
    shortAr: 'عام وشامل',
    shortEn: 'General',
    imageUrl: generalIconUrl,
    accentColor: '#64748b',
    borderColor: 'border-slate-500/40',
    bgColor: 'bg-slate-900/60',
    textColor: 'text-slate-300',
    descriptionAr: 'المعارف والوثائق الإدارية والتقارير العامة للشركة',
    descriptionEn: 'Enterprise administrative knowledge & multi-domain repositories'
  }
};

export function getCategoryIconMeta(categoryKey?: string): CategoryIconMeta {
  const normalizedKey = (categoryKey || 'general').toLowerCase();
  return CATEGORY_ICON_MAP[normalizedKey] || CATEGORY_ICON_MAP['general'];
}
