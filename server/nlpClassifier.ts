/**
 * Server-Side Lightweight NLP Document Classifier & Metadata Extractor
 * Automatically categorizes documents upon upload ('policy', 'technical', 'general', 'legal', 'financial')
 * to enhance RAG retrieval precision, context routing, and schema consistency.
 */

export interface ServerNlpClassificationResult {
  category: string;
  categoryLabelAr: string;
  categoryLabelEn: string;
  confidence: number;
  detectedLanguage: 'ar' | 'en' | 'mixed';
  languageLabelAr: string;
  languageLabelEn: string;
  arabicRatio: number;
  keywords: string[];
  summaryTopicAr: string;
  summaryTopicEn: string;
  scores: Record<string, number>;
}

const CATEGORY_LEXICON: Record<string, { ar: string[]; en: string[]; labelAr: string; labelEn: string; topicAr: string; topicEn: string }> = {
  policy: {
    labelAr: 'سياسات وحوكمة (Policy)',
    labelEn: 'Policy & Governance',
    topicAr: 'وثيقة سياسات وإجراءات ومعايير حوكمة وامتثال مؤسسي',
    topicEn: 'Institutional policies, governance standards, and operating compliance procedures',
    ar: [
      'سياسة', 'سياسات', 'لائحة', 'لوائح', 'حوكمة', 'امتثال', 'إجراءات', 'ضوابط', 'معايير',
      'دليل الموظف', 'سرية المعلومات', 'شروط الاستخدام', 'حقوق وواجبات', 'التزامات',
      'نظام العمل', 'إرشادات', 'صلاحيات', 'ميثاق', 'الأخلاقيات', 'الامتثال المؤسسي',
      'إدارة المخاطر', 'الإبلاغ عن المخالفات', 'سياسة الخصوصية', 'إجراء تشغيلي'
    ],
    en: [
      'policy', 'policies', 'governance', 'compliance', 'guideline', 'guidelines',
      'procedure', 'procedures', 'regulation', 'regulations', 'terms of service',
      'code of conduct', 'handbook', 'standard operating procedure', 'sop',
      'whistleblower', 'acceptable use', 'confidentiality', 'internal controls',
      'risk management', 'privacy policy', 'regulatory framework'
    ]
  },
  technical: {
    labelAr: 'تقني وهندسي (Technical)',
    labelEn: 'Technical & Engineering',
    topicAr: 'مواصفات فنية ومعمارية برمجية وبنية تحتية سحابية',
    topicEn: 'Technical architecture specifications, software engineering, and cloud infrastructure',
    ar: [
      'بنية تحتية', 'معمارية', 'برمجة', 'خوارزمية', 'واجهة برمجة', 'قاعدة بيانات', 'نظام',
      'تشفير', 'سحابية', 'خادم', 'توثيق تقني', 'شبكات', 'أمن سيبراني', 'نموذج ذكاء',
      'تطوير برمجيات', 'مكتبة', 'مصفوفة', 'مواصفات فنية', 'بروتوكول', 'استعلام', 'تضمين',
      'مستودع كود', 'نشر تلقائي', 'حاوية', 'سيرفر', 'معالج', 'واجهات مستخدم'
    ],
    en: [
      'technical', 'architecture', 'api', 'apis', 'endpoint', 'database', 'docker',
      'kubernetes', 'server', 'algorithm', 'algorithms', 'framework', 'infrastructure',
      'backend', 'frontend', 'sdk', 'cloud', 'git', 'deployment', 'microservices',
      'pgvector', 'schema', 'rest', 'graphql', 'oauth', 'pipeline', 'embeddings',
      'neural', 'token', 'latency', 'source code', 'devops', 'cicd'
    ]
  },
  legal: {
    labelAr: 'قانوني وعقود (Legal)',
    labelEn: 'Legal & Contracts',
    topicAr: 'وثيقة قانونية وعقود تجارية واتفاقيات ملزمة وبنود تقاضي',
    topicEn: 'Legal contracts, binding agreements, liability clauses, and statutory provisions',
    ar: [
      'عقد', 'عقود', 'اتفاقية', 'مذكرة تفاهم', 'طرف أول', 'طرف ثاني', 'محكمة', 'قضائي',
      'دعوى', 'نزاع', 'تحكيم', 'تعويض', 'مسؤولية قانونية', 'بند جزائي', 'فسخ', 'تشريع',
      'نظام المعاملات', 'الملكية الفكرية', 'إبراء ذمة', 'قوة قاهرة', 'سريان الاتفاقية'
    ],
    en: [
      'legal', 'contract', 'contracts', 'agreement', 'agreements', 'nda', 'party',
      'parties', 'jurisdiction', 'indemnity', 'liability', 'arbitration', 'statute',
      'litigation', 'clause', 'clauses', 'dispute', 'intellectual property', 'warranty',
      'governing law', 'breach', 'settlement', 'force majeure', 'termination clause'
    ]
  },
  financial: {
    labelAr: 'مالي ومحاسبي (Financial)',
    labelEn: 'Financial & Accounting',
    topicAr: 'تقارير مالية وميزانيات وقوائم محاسبية وتدقيق إيرادات',
    topicEn: 'Financial statements, budgets, accounting ledgers, and revenue audit reports',
    ar: [
      'ميزانية', 'موازنة', 'إيرادات', 'مصروفات', 'قوائم مالية', 'تدقيق مالي', 'محاسبة',
      'ضريبة', 'أرباح', 'خسائر', 'تكلفة', 'فاتورة', 'تمويل', 'استثمار', 'عملة',
      'سيولة نقدية', 'قيمة سوقية', 'تحوط', 'أصول متداولة', 'مخصصات', 'ريال'
    ],
    en: [
      'financial', 'budget', 'budgets', 'revenue', 'expense', 'expenses', 'balance sheet',
      'accounting', 'invoice', 'invoices', 'fiscal', 'audit', 'tax', 'vat', 'profit',
      'ebitda', 'cash flow', 'investment', 'valuation', 'ledger', 'quarterly report',
      'hedging', 'assets', 'liabilities', 'roi', 'equity'
    ]
  },
  general: {
    labelAr: 'عام ومعرفي (General)',
    labelEn: 'General Knowledge',
    topicAr: 'مستند تعريفي عام ومقالات ومعلومات معرفية متنوعة',
    topicEn: 'General overview, informational notes, and multi-topic knowledge records',
    ar: [
      'مقدمة', 'نظرة عامة', 'تقرير', 'ملخص', 'دليل', 'ملاحظات', 'معلومات', 'محتوى',
      'استعراض', 'أهداف', 'رؤية', 'نبذة', 'خلفية', 'مقال', 'عناوين'
    ],
    en: [
      'overview', 'general', 'introduction', 'summary', 'guide', 'notes', 'information',
      'background', 'brief', 'article', 'description', 'highlights', 'index'
    ]
  }
};

function normalizeForNlp(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .trim();
}

export function analyzeLanguage(text: string): {
  language: 'ar' | 'en' | 'mixed';
  arabicRatio: number;
  labelAr: string;
  labelEn: string;
} {
  if (!text || text.trim().length === 0) {
    return { language: 'ar', arabicRatio: 1.0, labelAr: 'العربية (AR)', labelEn: 'Arabic (AR)' };
  }

  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalLetters = arabicChars + latinChars;

  if (totalLetters === 0) {
    return { language: 'ar', arabicRatio: 1.0, labelAr: 'العربية (AR)', labelEn: 'Arabic (AR)' };
  }

  const arabicRatio = Number((arabicChars / totalLetters).toFixed(3));

  if (arabicRatio >= 0.7) {
    return { language: 'ar', arabicRatio, labelAr: 'العربية (AR)', labelEn: 'Arabic (AR)' };
  } else if (arabicRatio <= 0.3) {
    return { language: 'en', arabicRatio, labelAr: 'الإنجليزية (EN)', labelEn: 'English (EN)' };
  } else {
    return { language: 'mixed', arabicRatio, labelAr: 'ثنائي اللغة (AR/EN)', labelEn: 'Bilingual (AR/EN)' };
  }
}

export function classifyDocumentNlp(title: string, content: string): ServerNlpClassificationResult {
  const normTitle = normalizeForNlp(title);
  const normContent = normalizeForNlp(content.slice(0, 15000));
  const titleTokens = normTitle.split(/\s+/).filter(w => w.length > 2);

  const langInfo = analyzeLanguage(`${title} ${content.slice(0, 2000)}`);
  
  const scores: Record<string, number> = {
    policy: 0,
    technical: 0,
    legal: 0,
    financial: 0,
    general: 0.1,
  };

  const matchedKeywords: Record<string, Set<string>> = {
    policy: new Set(),
    technical: new Set(),
    legal: new Set(),
    financial: new Set(),
    general: new Set(),
  };

  for (const [catKey, lexicon] of Object.entries(CATEGORY_LEXICON)) {
    let score = 0;
    const combinedLexicon = [...lexicon.ar, ...lexicon.en];

    // Check title matches (Heavily weighted 4.0x)
    for (const word of combinedLexicon) {
      const normWord = normalizeForNlp(word);
      if (normTitle.includes(normWord)) {
        score += 4.0;
        matchedKeywords[catKey].add(word);
      }
      if (titleTokens.includes(normWord)) {
        score += 2.0;
      }
    }

    // Check content matches
    let contentHits = 0;
    for (const word of combinedLexicon) {
      const normWord = normalizeForNlp(word);
      if (normContent.includes(normWord)) {
        contentHits++;
        matchedKeywords[catKey].add(word);
      }
    }

    score += Math.min(10, Math.sqrt(contentHits) * 2.2);
    scores[catKey] = Number(score.toFixed(2));
  }

  let bestCategory = 'general';
  let highestScore = 0;

  for (const [cat, val] of Object.entries(scores)) {
    if (val > highestScore) {
      highestScore = val;
      bestCategory = cat;
    }
  }

  if (highestScore < 1.5) {
    bestCategory = 'general';
    highestScore = Math.max(1.0, highestScore);
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const rawConfidence = highestScore / totalScore;
  const confidence = Number((Math.min(0.98, Math.max(0.78, 0.72 + rawConfidence * 0.26))).toFixed(2));

  const catMeta = CATEGORY_LEXICON[bestCategory] || CATEGORY_LEXICON.general;
  const extractedKeywords = Array.from(matchedKeywords[bestCategory] || []).slice(0, 5);

  if (extractedKeywords.length === 0) {
    extractedKeywords.push(bestCategory === 'policy' ? 'سياسات' : bestCategory === 'technical' ? 'تقني' : 'عام');
  }

  return {
    category: bestCategory,
    categoryLabelAr: catMeta.labelAr,
    categoryLabelEn: catMeta.labelEn,
    confidence,
    detectedLanguage: langInfo.language,
    languageLabelAr: langInfo.labelAr,
    languageLabelEn: langInfo.labelEn,
    arabicRatio: langInfo.arabicRatio,
    keywords: extractedKeywords,
    summaryTopicAr: catMeta.topicAr,
    summaryTopicEn: catMeta.topicEn,
    scores,
  };
}
