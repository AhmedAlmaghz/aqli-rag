import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { detectAndDecodeBuffer, sanitizeDocumentText } from './charsetDecoder';
import { ChunkingStrategy } from '../types';
import { classifyDocumentNlp, NlpClassificationResult } from './nlpClassifier';

// Set up pdf.js worker for browser fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('PDF.js worker initialization notice:', e);
}

export interface ExtractedFileResult {
  text: string;
  wordCount: number;
  charCount: number;
  fileType: string;
  isExtracted: boolean;
  engine?: string;
  encoding?: string;
  hasArabic?: boolean;
  warnings?: string[];
  autoIndexed?: boolean;
  document?: any;
  chunks?: any[];
  totalChunksCreated?: number;
  indexingLatencyMs?: number;
  nlpClassification?: NlpClassificationResult;
}

export interface ExtractionOptions {
  autoIndex?: boolean;
  workspaceId?: string;
  title?: string;
  category?: string;
  chunkingStrategy?: ChunkingStrategy;
}

/**
 * Convert File to Base64 String safely
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // remove data:application/pdf;base64, prefix
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Clean & normalize extracted Arabic/English text:
 * - Remove non-printable control characters, null bytes, and unicode replacement glyphs
 * - Preserve legitimate Arabic, English, numerals, punctuation, and newlines
 */
export function cleanExtractedText(text: string): string {
  return sanitizeDocumentText(text);
}

/**
 * Robust Client-Side PDF Parser using Mozilla PDF.js with charset-aware decoding
 */
async function parsePdfClientSide(file: File): Promise<{ text: string; encoding: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const textPieces: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => item.str || '')
      .join(' ');

    if (pageText.trim()) {
      textPieces.push(`--- صفحة ${pageNum} / Page ${pageNum} ---\n${pageText}`);
    }
  }

  const combined = textPieces.join('\n\n');
  const cleaned = sanitizeDocumentText(combined);
  return { text: cleaned, encoding: 'UTF-8' };
}

/**
 * Robust Multi-layer Extractor for Arabic & English documents:
 * Layer 1: High-Precision Server Engine (/api/extract-file with Gemini AI OCR + chardet + text-encoding + pdf-parse/mammoth)
 * Layer 2: Client-side Browser Fallback (PDF.js + Mammoth + chardet/text-encoding universal charset decoder)
 */
export async function extractTextFromFile(
  file: File,
  options?: ExtractionOptions
): Promise<ExtractedFileResult> {
  const fileName = file.name.toLowerCase();
  const fileType = file.type || '';
  const isPdf = fileName.endsWith('.pdf') || fileType === 'application/pdf';
  const isDocx = fileName.endsWith('.docx') || fileType.includes('wordprocessingml');
  const isDoc = fileName.endsWith('.doc') || fileType === 'application/msword';

  // --------------------------------------------------------------------------
  // 1. Try High-Precision Server Extraction via /api/extract-file
  // --------------------------------------------------------------------------
  try {
    const base64 = await fileToBase64(file);
    const response = await fetch('/api/extract-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64,
        fileName: file.name,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'application/octet-stream'),
        autoIndex: options?.autoIndex,
        workspaceId: options?.workspaceId,
        title: options?.title || file.name.replace(/\.[^/.]+$/, ''),
        category: options?.category,
        chunkingStrategy: options?.chunkingStrategy,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.text && data.text.length > 5) {
        const cleaned = sanitizeDocumentText(data.text);
        const words = cleaned.split(/\s+/).filter(Boolean).length;
        return {
          text: cleaned,
          wordCount: words,
          charCount: cleaned.length,
          fileType: data.fileType || (isPdf ? 'PDF Document' : 'Document'),
          isExtracted: true,
          engine: data.engine || 'server-extractor',
          encoding: data.encoding || 'UTF-8',
          hasArabic: data.hasArabic ?? /[\u0600-\u06FF]/.test(cleaned),
          autoIndexed: data.autoIndexed,
          document: data.document,
          chunks: data.chunks,
          totalChunksCreated: data.totalChunksCreated,
          indexingLatencyMs: data.indexingLatencyMs,
        };
      }
    }
  } catch (apiErr) {
    console.warn('Server document extraction endpoint unreachable, switching to browser-side extractor:', apiErr);
  }

  // --------------------------------------------------------------------------
  // 2. Client-Side Fallback: PDF Documents (.pdf)
  // --------------------------------------------------------------------------
  if (isPdf) {
    try {
      const { text: pdfText, encoding } = await parsePdfClientSide(file);
      if (pdfText && pdfText.length > 20) {
        const words = pdfText.split(/\s+/).filter(Boolean).length;
        return {
          text: pdfText,
          wordCount: words,
          charCount: pdfText.length,
          fileType: 'PDF Document (PDF.js Engine)',
          isExtracted: true,
          engine: 'client-pdfjs',
          encoding,
          hasArabic: /[\u0600-\u06FF]/.test(pdfText),
        };
      }
    } catch (pdfErr) {
      console.warn('Client PDF.js parser notice:', pdfErr);
    }
  }

  // --------------------------------------------------------------------------
  // 3. Client-Side Fallback: Word Documents (.docx)
  // --------------------------------------------------------------------------
  if (isDocx) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      let extracted = sanitizeDocumentText(result.value || '');

      if (!extracted) {
        const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
        if (htmlResult.value) {
          extracted = sanitizeDocumentText(htmlResult.value.replace(/<[^>]+>/g, '\n'));
        }
      }

      if (extracted) {
        const words = extracted.split(/\s+/).filter(Boolean).length;
        return {
          text: extracted,
          wordCount: words,
          charCount: extracted.length,
          fileType: 'Word Document (.docx)',
          isExtracted: true,
          engine: 'client-mammoth',
          encoding: 'UTF-8',
          hasArabic: /[\u0600-\u06FF]/.test(extracted),
        };
      }
    } catch (docxErr) {
      console.warn('Client DOCX extractor notice:', docxErr);
    }
  }

  // --------------------------------------------------------------------------
  // 4. Legacy Word Documents (.doc) with Universal Charset Detection
  // --------------------------------------------------------------------------
  if (isDoc) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = detectAndDecodeBuffer(arrayBuffer, 'windows-1256');
      const cleanMatches = decoded.text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-zA-Z0-9\s.,!?:;\-–—/()""'']{3,}/g);
      
      if (cleanMatches && cleanMatches.length > 0) {
        const text = sanitizeDocumentText(cleanMatches.join(' '));
        return {
          text: `[مستند Word قديم (.doc) - ترميز: ${decoded.encoding}]:\n\n${text}`,
          wordCount: text.split(/\s+/).filter(Boolean).length,
          charCount: text.length,
          fileType: `Word 97-2003 Document (.doc / ${decoded.encoding})`,
          isExtracted: true,
          engine: 'client-chardet-doc',
          encoding: decoded.encoding,
          hasArabic: decoded.hasArabic,
        };
      }
    } catch (docErr) {
      console.warn('Client DOC notice:', docErr);
    }
  }

  // --------------------------------------------------------------------------
  // 5. Universal Charset Detection for Plain Text, Markdown, CSV, JSON, UTF-8/UTF-16
  // --------------------------------------------------------------------------
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = detectAndDecodeBuffer(arrayBuffer, 'utf-8');
    const text = sanitizeDocumentText(decoded.text);
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
      fileType: `${fileType || 'Text Document'} (${decoded.encoding})`,
      isExtracted: true,
      engine: 'client-universal-chardet',
      encoding: decoded.encoding,
      hasArabic: decoded.hasArabic,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      text: `[خطأ في معالجة المستند: ${msg}]`,
      wordCount: 0,
      charCount: 0,
      fileType: 'Unknown',
      isExtracted: false,
    };
  }
}
