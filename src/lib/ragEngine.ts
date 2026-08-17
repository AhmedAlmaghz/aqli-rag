/**
 * Aqli RAG Engine Utilities
 * Implements Arabic Text Normalization, Reciprocal Rank Fusion (RRF),
 * and Hybrid Search scoring adhering to enterprise SDLC specifications.
 */

// Arabic Normalization: Removes Tashkeel, normalizes Alef/Hamza, Taa Marbuta, and Yaa
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Remove Arabic diacritics (Tashkeel / Harakat)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove Tatweel (Kashida)
    .replace(/\u0640/g, '')
    // Normalize Alef forms (أ، إ، آ -> ا)
    .replace(/[إأآٱ]/g, 'ا')
    // Normalize Taa Marbuta (ة -> ه)
    .replace(/ة/g, 'ه')
    // Normalize Yaa forms (ى -> ي)
    .replace(/ى/g, 'ي')
    // Normalize Persian/Urdu variants (ك -> ك, ؤ -> و, ئ -> ي)
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Trim and normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectLanguage(text: string): 'ar' | 'en' | 'mixed' {
  if (!text) return 'en';
  const arabicCharCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishCharCount = (text.match(/[a-zA-Z]/g) || []).length;
  
  if (arabicCharCount > 0 && englishCharCount > 0) {
    if (arabicCharCount > englishCharCount * 2) return 'ar';
    if (englishCharCount > arabicCharCount * 2) return 'en';
    return 'mixed';
  }
  return arabicCharCount > 0 ? 'ar' : 'en';
}

/**
 * Calculates Trigram similarity between two normalized strings (emulating pg_trgm)
 */
export function calculateTrigramSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeArabicText((str1 || '').toLowerCase());
  const norm2 = normalizeArabicText((str2 || '').toLowerCase());

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  const getTrigrams = (s: string) => {
    const padded = `  ${s} `;
    const trigrams = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  };

  const trigrams1 = getTrigrams(norm1);
  const trigrams2 = getTrigrams(norm2);

  let intersectionCount = 0;
  trigrams1.forEach((t) => {
    if (trigrams2.has(t)) intersectionCount++;
  });

  const unionSize = trigrams1.size + trigrams2.size - intersectionCount;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

/**
 * Calculates pseudo-BM25 score based on term frequency and token matching
 */
export function calculateBM25Score(query: string, document: string): number {
  const normQuery = normalizeArabicText((query || '').toLowerCase());
  const normDoc = normalizeArabicText((document || '').toLowerCase());

  const queryTerms = normQuery.split(/\s+/).filter(Boolean);
  const docTerms = normDoc.split(/\s+/).filter(Boolean);

  if (queryTerms.length === 0 || docTerms.length === 0) return 0;

  let matchScore = 0;
  queryTerms.forEach((term) => {
    const termCount = docTerms.filter((dt) => dt.includes(term) || term.includes(dt)).length;
    if (termCount > 0) {
      // TF with saturation
      const tf = (termCount * 2.2) / (termCount + 1.2 * (0.25 + 0.75 * (docTerms.length / 50)));
      matchScore += tf;
    }
  });

  return Math.min(1.0, matchScore / queryTerms.length);
}

/**
 * Reciprocal Rank Fusion (RRF)
 * Combines dense vector rank and sparse keyword rank
 * Formula: RRF Score = SUM(1 / (k + rank_i))
 */
export function calculateRRFScore(denseRank: number, sparseRank: number, k: number = 60): number {
  const denseComponent = 1 / (k + denseRank);
  const sparseComponent = 1 / (k + sparseRank);
  return Number(((denseComponent + sparseComponent) * 30).toFixed(4));
}

/**
 * Evaluates Groundedness of a response against retrieved context chunks
 */
export function evaluateGroundedness(
  response: string,
  contextChunks: { content: string }[]
): { score: number; isSufficient: boolean; unsupportedClaims: string[] } {
  if (!response || contextChunks.length === 0) {
    return { score: 0, isSufficient: false, unsupportedClaims: ['لا يوجد سياق مسترجع للإجابة'] };
  }

  const normResponse = normalizeArabicText((response || '').toLowerCase());
  const combinedContext = normalizeArabicText(
    (contextChunks || []).map((c) => c?.content || '').join(' ').toLowerCase()
  );

  const sentences = (response || '')
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  if (sentences.length === 0) {
    return { score: 95, isSufficient: true, unsupportedClaims: [] };
  }

  const unsupportedClaims: string[] = [];
  let supportedCount = 0;

  sentences.forEach((sentence) => {
    const normSentence = normalizeArabicText((sentence || '').toLowerCase());
    const words = normSentence.split(/\s+/).filter((w) => w.length > 3);
    
    if (words.length === 0) {
      supportedCount++;
      return;
    }

    const matchedWords = words.filter((w) => combinedContext.includes(w)).length;
    const ratio = matchedWords / words.length;

    if (ratio >= 0.35) {
      supportedCount++;
    } else {
      unsupportedClaims.push(sentence);
    }
  });

  const groundednessScore = Math.round((supportedCount / sentences.length) * 100);

  return {
    score: groundednessScore,
    isSufficient: groundednessScore >= 75,
    unsupportedClaims,
  };
}
