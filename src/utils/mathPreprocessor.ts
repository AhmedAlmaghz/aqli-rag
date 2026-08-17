import ArabicMathJax from 'mathjax4arabic';

// Arabic math symbols mapping
export const ARABIC_DIGITS: Record<string, string> = {
  '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
  '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
};

export const LATIN_TO_ARABIC_VARS: Record<string, string> = {
  'x': 'س', 'y': 'ص', 'z': 'ع', 'i': 'ت', 'n': 'ن',
  'm': 'م', 'r': 'نق', 'A': 'م', 'C': 'ش', 't': 'ت',
  'k': 'ك', 'a': 'أ', 'b': 'ب', 'c': 'ج', 'd': 'د'
};

export const ARABIC_FUNCTIONS: Record<string, string> = {
  'sin': 'جا', 'cos': 'جتا', 'tan': 'ظا', 'cot': 'ظتا',
  'sec': 'قا', 'csc': 'قتا', 'log': 'لو', 'ln': 'لو_هـ',
  'lim': 'نهـ', 'sum': 'مجـ', 'int': 'تكامل'
};

/**
 * Sanitizes and wraps raw LaTeX math formulas found in text that lack $...$ delimiters.
 * Ensures equations like:
 *   \frac{2 + ت}{1 - ت}
 *   ع^{-1} = \frac{1}{3 + 4ت}
 *   3^2 + 4^2 = 25
 *   \sqrt{2}
 * are wrapped in $...$ and Arabic letters inside math mode are wrapped in \text{...} for KaTeX/MathJax.
 */
export function preprocessContentMath(content: string, useArabicMath = false): string {
  if (!content) return '';

  let text = content;

  // Step 1: Fix citations temporarily so they don't get mixed with math brackets
  const citationPlaceholders: string[] = [];
  text = text.replace(/\[(?:المصدر\s*)?(\d+)\]/g, (_match, num) => {
    const placeholder = `__AQ_CIT_${citationPlaceholders.length}__`;
    citationPlaceholders.push(` [[${num}]](#citation-${num}) `);
    return placeholder;
  });

  // Step 2: Auto-detect and wrap un-delimited LaTeX commands and equations
  text = autoWrapRawMath(text);

  // Step 3: Process math blocks ($$...$$ and $...$) to ensure Arabic characters inside math are valid for LaTeX
  text = text.replace(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g, (mathMatch) => {
    const isBlock = mathMatch.startsWith('$$');
    const mathInner = isBlock ? mathMatch.slice(2, -2) : mathMatch.slice(1, -1);

    const sanitized = sanitizeMathInner(mathInner, useArabicMath);

    return isBlock ? `$$${sanitized}$$` : `$${sanitized}$`;
  });

  // Step 4: Restore citations
  citationPlaceholders.forEach((cit, idx) => {
    text = text.replace(`__AQ_CIT_${idx}__`, cit);
  });

  return text;
}

/**
 * Automatically wraps un-delimited LaTeX patterns and mathematical statements in $ ... $
 */
function autoWrapRawMath(text: string): string {
  // Protect existing delimited math ($...$ and $$...$$ and `...`)
  const mathVault: string[] = [];
  const vaultToken = (i: number) => `__AQ_VAULT_${i}__`;

  let protectedText = text.replace(/(`[^`]+`|\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g, (match) => {
    const idx = mathVault.length;
    mathVault.push(match);
    return vaultToken(idx);
  });

  // 1. Detect expressions containing LaTeX commands:
  // e.g., \frac{...}{...}, \sqrt{...}, \mathbf{...}, \sum, \int, \times, \div, \pm, etc.
  const latexCommandRegex = /((?:[\u0600-\u06FF\w\d+\-*\/=^_{}()[\],.\s\\-]*?\\(?:frac|sqrt|mathbf|mathbfit|text|times|div|pm|ne|le|ge|approx|cdot|left|right|sum|int|lim|alpha|beta|theta|pi|partial|infty|nabla|circ|perp|angle|degree)[\u0600-\u06FF\w\d+\-*\/=^_{}()[\],.\s\\-]*)+)/g;

  protectedText = protectedText.replace(latexCommandRegex, (match) => {
    const trimmed = match.trim();
    if (!trimmed || trimmed.length < 2) return match;
    if (trimmed.startsWith('__AQ_VAULT_')) return match;

    // Separate leading/trailing Arabic words if any
    const splitMatch = splitLeadingTrailingText(trimmed);
    return `${splitMatch.leading}$${splitMatch.math}$${splitMatch.trailing}`;
  });

  // 2. Detect standalone Arabic/algebraic equations like:
  // ع = 3 + 4ت, ع^{-1} = 5, ت^2 = -1, (1 + ت)^2 = 2ت
  const arabicEquationRegex = /(^|[\s(،؛:])([عستصxyzabcnm]\^?\{?-?\d*\}?\s*=\s*[\u0600-\u06FF\w\d+\-*\/^_{}()\s]+)(?=[\s).،؛:]|$)/gm;
  protectedText = protectedText.replace(arabicEquationRegex, (match, prefix, equation) => {
    const eqTrim = equation.trim();
    if (eqTrim.includes('__AQ_VAULT_') || eqTrim.includes('$') || eqTrim.length < 3) {
      return match;
    }
    // Only wrap if it looks like actual math with operators +, -, =, ^, *, /
    if (/[+\-*\/=^]/.test(eqTrim)) {
      return `${prefix}$${eqTrim}$`;
    }
    return match;
  });

  // 3. Detect standalone power expressions like ت^2, 3^2, 4^2, س^3
  const powerExprRegex = /(^|[\s(،؛:])([\u0600-\u06FF\w]\^\d+)(?=[\s).،؛:]|$)/gm;
  protectedText = protectedText.replace(powerExprRegex, (match, prefix, pow) => {
    if (pow.includes('__AQ_VAULT_') || pow.includes('$')) return match;
    return `${prefix}$${pow}$`;
  });

  // Restore protected tokens
  mathVault.forEach((original, idx) => {
    protectedText = protectedText.replace(vaultToken(idx), original);
  });

  return protectedText;
}

/**
 * Splits any leading or trailing normal Arabic words from a math equation snippet
 */
function splitLeadingTrailingText(raw: string): { leading: string; math: string; trailing: string } {
  let leading = '';
  let trailing = '';
  let math = raw;

  // If starts with Arabic words like "الحل: " or "مثال (1): "
  const leadingWordMatch = /^([\u0600-\u06FF\s]+[:：])\s*/.exec(math);
  if (leadingWordMatch) {
    leading = leadingWordMatch[0];
    math = math.slice(leading.length);
  }

  // If ends with Arabic words like " وهو المطلوب" or " (أو ...)"
  const trailingWordMatch = /\s+([\u0600-\u06FF\s]+[.،!؟]?)$/.exec(math);
  if (trailingWordMatch && !trailingWordMatch[1].includes('\\') && trailingWordMatch[1].length > 2) {
    trailing = ' ' + trailingWordMatch[1];
    math = math.slice(0, math.length - trailing.length);
  }

  return { leading, math: math.trim(), trailing };
}

/**
 * Sanitizes math inside $...$ so that Arabic characters and symbols are parsed cleanly
 * by KaTeX and MathJax. Uses safe in-memory array substitution to prevent any URI errors.
 */
function sanitizeMathInner(math: string, useArabicMath: boolean): string {
  let result = math;
  const textBlocks: string[] = [];
  const cmdBlocks: string[] = [];

  // 1. Protect existing \text{...} blocks safely in an array
  result = result.replace(/\\text\{([^}]+)\}/g, (_m, txt) => {
    const idx = textBlocks.length;
    textBlocks.push(txt);
    return `__AQ_SAVED_TEXT_${idx}__`;
  });

  // 2. Protect LaTeX command names in an array
  result = result.replace(/\\([a-zA-Z]+)/g, (_m, cmd) => {
    const idx = cmdBlocks.length;
    cmdBlocks.push(cmd);
    return `__AQ_SAVED_CMD_${idx}__`;
  });

  if (useArabicMath) {
    // If Arabic math is active, convert digits to Arabic-Indic digits if not already converted
    result = result.replace(/\d/g, (d) => ARABIC_DIGITS[d] || d);
    // Convert common variables: x -> س, y -> ص, z -> ع, i -> ت
    result = result.replace(/\b([xyztr])\b/g, (_m, v) => LATIN_TO_ARABIC_VARS[v] || v);
  }

  // 3. Wrap naked Arabic words / characters in \text{...}
  result = result.replace(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g, (match) => {
    return `\\text{${match}}`;
  });

  // 4. Restore LaTeX commands
  cmdBlocks.forEach((cmd, idx) => {
    result = result.replace(`__AQ_SAVED_CMD_${idx}__`, `\\${cmd}`);
  });

  // 5. Restore original \text{...} blocks
  textBlocks.forEach((txt, idx) => {
    result = result.replace(`__AQ_SAVED_TEXT_${idx}__`, `\\text{${txt}}`);
  });

  return result;
}

/**
 * Initializes and triggers Arabic Math typesetting using MathJax4Arabic
 */
export async function typesetArabicMathInElement(container: HTMLElement | null): Promise<void> {
  if (!container || typeof window === 'undefined') return;

  try {
    ArabicMathJax.injectStyles();
    await ArabicMathJax.loadMathJax();
    if ((window as any).MathJax) {
      ArabicMathJax.configureMathJax({
        tex: {
          inlineMath: [['$', '$'], ['\\(', '\\)']],
          displayMath: [['$$', '$$'], ['\\[', '\\]']],
        }
      });
    }
    await ArabicMathJax.typesetArabic(container, { force: true, forceArabic: true });
  } catch (err) {
    console.warn('[MathJax4Arabic] typeset error:', err);
  }
}
