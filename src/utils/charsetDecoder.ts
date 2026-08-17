import chardet from 'chardet';
import textEncoding from 'text-encoding';

const TextDecoderClass = typeof globalThis.TextDecoder !== 'undefined' 
  ? globalThis.TextDecoder 
  : textEncoding.TextDecoder;

export interface DecodedResult {
  text: string;
  encoding: string;
  confidence?: number;
  hasArabic: boolean;
}

/**
 * Normalizes encoding name strings returned by chardet to standard WHATWG TextDecoder labels.
 */
export function normalizeEncodingLabel(encoding: string | null | undefined): string {
  if (!encoding) return 'utf-8';
  const clean = encoding.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  if (clean.includes('utf-8') || clean === 'utf8') return 'utf-8';
  if (clean.includes('utf-16le') || clean === 'utf16le') return 'utf-16le';
  if (clean.includes('utf-16be') || clean === 'utf16be') return 'utf-16be';
  if (clean.includes('utf-16') || clean === 'utf16') return 'utf-16le';
  if (clean.includes('1256') || clean.includes('windows1256') || clean.includes('cp1256')) return 'windows-1256';
  if (clean.includes('8859-6') || clean.includes('iso88596')) return 'iso-8859-6';
  if (clean.includes('1252') || clean.includes('windows1252')) return 'windows-1252';
  if (clean.includes('ascii')) return 'utf-8';

  return encoding;
}

/**
 * Detects if a Uint8Array starts with a standard Byte Order Mark (BOM).
 */
export function detectBOM(bytes: Uint8Array): { encoding: string; offset: number } | null {
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { encoding: 'utf-8', offset: 3 };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { encoding: 'utf-16le', offset: 2 };
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { encoding: 'utf-16be', offset: 2 };
  }
  return null;
}

/**
 * Checks whether the text contains valid Arabic characters.
 * Arabic unicode blocks: \u0600-\u06FF, \u0750-\u077F, \u08A0-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFE
 */
export function hasArabicCharacters(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFE]/.test(text);
}

/**
 * Universal Charset Detection and Decoding Utility
 * Uses 'chardet' to accurately identify character encodings (UTF-8, UTF-16LE, UTF-16BE, Windows-1256, ISO-8859-6, etc.)
 * and 'text-encoding' / native TextDecoder to decode multi-byte Arabic and international text without corruption.
 */
export function detectAndDecodeBuffer(
  input: Uint8Array | ArrayBuffer | Buffer,
  preferredFallback: string = 'utf-8'
): DecodedResult {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  if (bytes.length === 0) {
    return { text: '', encoding: 'utf-8', hasArabic: false };
  }

  // 1. Check for standard BOM signatures first
  const bom = detectBOM(bytes);
  if (bom) {
    try {
      const decoder = new TextDecoderClass(bom.encoding, { fatal: false });
      const sliced = bytes.subarray(bom.offset);
      const text = decoder.decode(sliced);
      return {
        text,
        encoding: bom.encoding,
        confidence: 100,
        hasArabic: hasArabicCharacters(text),
      };
    } catch {
      // fallback if custom decoder fails
    }
  }

  // 2. Run chardet analysis
  let detectedEncoding: string | null = null;
  let confidence: number | undefined = undefined;

  try {
    const analysis = chardet.analyse(bytes);
    if (analysis && analysis.length > 0) {
      const topMatch = analysis[0];
      detectedEncoding = topMatch.name;
      confidence = topMatch.confidence;
    } else {
      detectedEncoding = chardet.detect(bytes);
    }
  } catch (err) {
    console.warn('chardet analysis error, using fallback:', err);
  }

  const targetEncoding = normalizeEncodingLabel(detectedEncoding || preferredFallback);

  // 3. Attempt decoding with detected encoding
  let decodedText = '';
  try {
    const decoder = new TextDecoderClass(targetEncoding, { fatal: false });
    decodedText = decoder.decode(bytes);
  } catch {
    try {
      const utf8Decoder = new TextDecoderClass('utf-8', { fatal: false });
      decodedText = utf8Decoder.decode(bytes);
    } catch {
      const fallbackDecoder = new textEncoding.TextDecoder('utf-8');
      decodedText = fallbackDecoder.decode(bytes);
    }
  }

  // 4. Special verification for Arabic text integrity:
  // If the detected charset was not UTF-8 or Windows-1256, but UTF-8 yields valid Arabic, prefer UTF-8
  if (!hasArabicCharacters(decodedText) && targetEncoding !== 'utf-8') {
    try {
      const utf8Decoder = new TextDecoderClass('utf-8', { fatal: false });
      const altText = utf8Decoder.decode(bytes);
      if (hasArabicCharacters(altText)) {
        decodedText = altText;
      }
    } catch {
      // keep original decoded
    }
  }

  // If still no Arabic detected and the file might be Windows-1256 (Arabic legacy)
  if (!hasArabicCharacters(decodedText) && targetEncoding !== 'windows-1256') {
    try {
      const win1256Decoder = new textEncoding.TextDecoder('windows-1256');
      const winText = win1256Decoder.decode(bytes);
      if (hasArabicCharacters(winText)) {
        decodedText = winText;
      }
    } catch {
      // keep original decoded
    }
  }

  return {
    text: decodedText,
    encoding: targetEncoding,
    confidence,
    hasArabic: hasArabicCharacters(decodedText),
  };
}

/**
 * Universal safe string cleaner and normalizer for Arabic & English document text.
 * Strips unprintable control characters, null bytes, and fixes spacing while preserving line breaks.
 */
export function sanitizeDocumentText(text: string): string {
  if (!text) return '';
  return text
    // Remove null bytes and unprintable control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFFFD]/g, ' ')
    // Normalize consecutive spaces and tabs
    .replace(/[ \t]+/g, ' ')
    // Normalize excessive newlines
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}
