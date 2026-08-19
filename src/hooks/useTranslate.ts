import { useState, useCallback, useRef, useEffect } from 'react';

export interface TranslationEntry {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

const LANGUAGE_NAMES: Record<string, string> = {
  auto: 'Detect Language',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  nl: 'Dutch',
  sv: 'Swedish',
  da: 'Danish',
  fi: 'Finnish',
  no: 'Norwegian',
  cs: 'Czech',
  el: 'Greek',
  he: 'Hebrew',
  ro: 'Romanian',
  hu: 'Hungarian',
  uk: 'Ukrainian',
  bg: 'Bulgarian',
  hr: 'Croatian',
  sr: 'Serbian',
  sk: 'Slovak',
  sl: 'Slovenian',
  lt: 'Lithuanian',
  lv: 'Latvian',
  et: 'Estonian',
  ms: 'Malay',
  tl: 'Filipino',
  sw: 'Swahili',
  af: 'Afrikaans',
  sq: 'Albanian',
  am: 'Amharic',
  az: 'Azerbaijani',
  bn: 'Bengali',
  eu: 'Basque',
  be: 'Belarusian',
  ca: 'Catalan',
  co: 'Corsican',
  cy: 'Welsh',
  eo: 'Esperanto',
  fa: 'Persian',
  ga: 'Irish',
  gd: 'Scottish Gaelic',
  gl: 'Galician',
  gu: 'Gujarati',
  ha: 'Hausa',
  haw: 'Hawaiian',
  hmn: 'Hmong',
  is: 'Icelandic',
  ig: 'Igbo',
  jw: 'Javanese',
  ka: 'Georgian',
  kk: 'Kazakh',
  km: 'Khmer',
  kn: 'Kannada',
  ku: 'Kurdish',
  ky: 'Kyrgyz',
  la: 'Latin',
  lb: 'Luxembourgish',
  lo: 'Lao',
  mg: 'Malagasy',
  mi: 'Maori',
  mk: 'Macedonian',
  ml: 'Malayalam',
  mn: 'Mongolian',
  mr: 'Marathi',
  mt: 'Maltese',
  my: 'Myanmar',
  ne: 'Nepali',
  ny: 'Nyanja',
  or: 'Odia',
  pa: 'Punjabi',
  ps: 'Pashto',
  si: 'Sinhala',
  so: 'Somali',
  su: 'Sundanese',
  ta: 'Tamil',
  te: 'Telugu',
  tg: 'Tajik',
  ur: 'Urdu',
  uz: 'Uzbek',
  xh: 'Xhosa',
  yi: 'Yiddish',
  yo: 'Yoruba',
  zu: 'Zulu',
};

// Persistence helpers
const HISTORY_STORAGE_KEY = 'yavqo-translate-history';

function loadHistory(): TranslationEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: TranslationEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage full or unavailable
  }
}

// Export helpers
function formatDateForFile(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  // Wrap in quotes and escape inner quotes
  return `"${value.replace(/"/g, '""')}"`;
}

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

export function useTranslate() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationEntry[]>(loadHistory);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Persist history to localStorage whenever it changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const translate = useCallback(
    async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
      if (!text.trim()) return '';

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsTranslating(true);
      setError(null);

      try {
        const sl = sourceLang === 'auto' ? 'auto' : sourceLang;
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Translation service error: ${response.status}`);
        }

        const data = await response.json();

        if (!data || !Array.isArray(data[0])) {
          throw new Error('Invalid response from translation service');
        }

        const translatedText = data[0].map((item: any[]) => item[0]).filter(Boolean).join('');
        const detected = data[2] || sourceLang;
        setDetectedLanguage(typeof detected === 'string' ? detected : null);

        const entry: TranslationEntry = {
          id: Date.now().toString(),
          sourceText: text,
          translatedText,
          sourceLang: typeof detected === 'string' ? detected : sourceLang,
          targetLang,
          timestamp: Date.now(),
        };

        setHistory((prev) => {
          // Deduplicate — don't add if the same source text + target lang exists at top
          const isDuplicate = prev.length > 0
            && prev[0].sourceText === text
            && prev[0].targetLang === targetLang;
          if (isDuplicate) {
            const updated = [...prev];
            updated[0] = entry;
            return updated;
          }
          return [entry, ...prev].slice(0, 100);
        });

        return translatedText;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return ''; // Silently handle aborted requests
        }
        const message = err instanceof Error ? err.message : 'Translation failed. Please try again.';
        setError(message);
        throw err;
      } finally {
        setIsTranslating(false);
      }
    },
    []
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const exportAsJSON = useCallback(() => {
    if (history.length === 0) return;
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    triggerDownload(blob, `yavqo-translations-${formatDateForFile()}.json`);
  }, [history]);

  const exportAsCSV = useCallback(() => {
    if (history.length === 0) return;
    const headers = ['Source Language', 'Target Language', 'Source Text', 'Translated Text', 'Timestamp'];
    const rows = history.map((entry) => [
      getLanguageName(entry.sourceLang),
      getLanguageName(entry.targetLang),
      escapeCSV(entry.sourceText),
      escapeCSV(entry.translatedText),
      new Date(entry.timestamp).toISOString(),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `yavqo-translations-${formatDateForFile()}.csv`);
  }, [history]);

  return {
    translate,
    isTranslating,
    error,
    history,
    clearHistory,
    removeFromHistory,
    detectedLanguage,
    exportAsJSON,
    exportAsCSV,
  };
}

export { LANGUAGE_NAMES };
