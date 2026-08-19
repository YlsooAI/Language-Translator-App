import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Settings,
  Languages,
  Image as ImageIcon,
  FileText,
  AppWindow,
  ChevronDown,
  ArrowRightLeft,
  Mic,
  Keyboard,
  History,
  Star,
  X,
  Copy,
  Volume2,
  Search,
  Trash2,
} from 'lucide-react';
import { useTranslate, LANGUAGE_NAMES, getLanguageName } from '@/hooks/useTranslate';
import { useClipboard } from '@/hooks/useClipboard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import AuthDialog from '@/components/AuthDialog';
import { cn } from '@/lib/utils';

const MAX_CHARS = 5000;

const ALL_LANGS = Object.entries(LANGUAGE_NAMES).filter(([code]) => code !== 'auto');
const SOURCE_QUICK = ['de', 'en', 'fr'];
const TARGET_QUICK = ['en', 'de', 'es'];

/* Keep the three quick tabs, but always make room for the current selection */
function quickTabs(quick: string[], selected: string): string[] {
  if (selected === 'auto' || quick.includes(selected)) return quick;
  return [...quick.slice(0, 2), selected];
}

/* ----- Google apps grid (3x3 dots) ----- */
function AppsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
      <circle cx="5" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
    </svg>
  );
}

/* ----- Language picker dropdown (opened from the chevron) ----- */
function LanguagePicker({
  value,
  onChange,
  includeDetect = false,
}: {
  value: string;
  onChange: (val: string) => void;
  includeDetect?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_LANGS;
    return ALL_LANGS.filter(([, name]) => name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="p-2 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:bg-[#26282b] transition-colors"
        aria-label="Select language"
        aria-expanded={open}
      >
        <ChevronDown className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[360px] bg-white rounded-2xl p-4 z-50 dark:bg-[#2d2e31] shadow-[0_4px_24px_rgba(60,64,67,0.25)]">
          <div className="flex items-center gap-2 border-b border-[#dadce0] pb-2 mb-3 dark:border-[#3c4043]">
            <Search className="w-4 h-4 text-[#5f6368] shrink-0 dark:text-[#9aa0a6]" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search languages"
              className="flex-1 bg-transparent text-sm text-[#202124] outline-none placeholder:text-[#5f6368] dark:text-[#e8eaed] dark:placeholder:text-[#9aa0a6]"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {includeDetect && !search && (
              <button
                onClick={() => { onChange('auto'); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-1.5 mb-1 rounded-full text-sm transition-colors',
                  value === 'auto'
                    ? 'bg-[#d2e3fc] text-[#0b57d0] font-medium dark:bg-[#004a77] dark:text-[#d3e3fd]'
                    : 'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-[#e8eaed] dark:hover:bg-[#333538]'
                )}
              >
                Detect language
              </button>
            )}
            <div className="grid grid-cols-2 gap-1">
              {filtered.map(([code, name]) => (
                <button
                  key={code}
                  onClick={() => { onChange(code); setOpen(false); setSearch(''); }}
                  className={cn(
                    'text-left px-3 py-1.5 rounded-full text-sm truncate transition-colors',
                    value === code
                      ? 'bg-[#d2e3fc] text-[#0b57d0] font-medium dark:bg-[#004a77] dark:text-[#d3e3fd]'
                      : 'text-[#3c4043] hover:bg-[#f1f3f4] dark:text-[#e8eaed] dark:hover:bg-[#333538]'
                  )}
                >
                  {name}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="col-span-2 px-3 py-4 text-sm text-center text-[#5f6368] dark:text-[#9aa0a6]">
                  No languages found
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----- Main Translator component ----- */
export default function Translator() {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [activePanel, setActivePanel] = useState<'history' | 'saved' | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('translator-theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const { translate, isTranslating, error, history, clearHistory, removeFromHistory, detectedLanguage } = useTranslate();
  const resultClipboard = useClipboard();

  /* Apply + persist theme */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('translator-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  /* Auth */
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSignOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setMenuOpen(false);
  }, []);

  /* Auto-translate with debounce */
  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText('');
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      translate(sourceText, sourceLang, targetLang)
        .then((result) => { if (result) setTranslatedText(result); })
        .catch(() => { /* error handled in hook */ });
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [sourceText, sourceLang, targetLang, translate]);

  const handleSwap = useCallback(() => {
    const effectiveSource = sourceLang === 'auto' ? detectedLanguage : sourceLang;
    if (!effectiveSource) return;
    setSourceLang(targetLang);
    setTargetLang(effectiveSource);
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
  }, [sourceLang, targetLang, detectedLanguage, sourceText, translatedText]);

  const handleClear = useCallback(() => {
    setSourceText('');
    setTranslatedText('');
    textareaRef.current?.focus();
  }, []);

  const handleSpeak = useCallback((text: string, lang: string) => {
    if (!text) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'auto' ? (detectedLanguage ?? 'de') : lang;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }, [detectedLanguage]);

  const handleCopyResult = useCallback(() => {
    resultClipboard.copy(translatedText);
  }, [resultClipboard, translatedText]);

  /* Voice input via Web Speech API when available */
  const handleMic = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = sourceLang === 'auto' ? 'en-US' : sourceLang;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) setSourceText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    setIsListening(true);
    rec.start();
  }, [isListening, sourceLang]);

  const charCount = sourceText.length;
  const sourceQuick = quickTabs(SOURCE_QUICK, sourceLang);
  const targetQuick = quickTabs(TARGET_QUICK, targetLang);

  const iconBtn = 'p-2 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:bg-[#26282b] transition-colors';

  return (
    <div className="min-h-screen bg-white text-[#202124] dark:bg-[#131314] dark:text-[#e8eaed] flex flex-col" style={{ fontFamily: "'Roboto', 'Helvetica Neue', Arial, sans-serif" }}>
      {/* ===== Top bar ===== */}
      <header className="flex items-center justify-between h-12 px-3 sm:px-4">
        <div className="flex items-center">
          <button className="p-2 mr-2 rounded-full text-[#3c4043] hover:bg-[#f1f3f4] dark:text-[#e8eaed] dark:hover:bg-[#26282b] transition-colors" aria-label="Menu">
            <Menu className="w-5 h-5" />
          </button>
          <a href="/" className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
            <img src="./logo.png" alt="Translator" className="h-8 w-8 object-contain dark:invert" />
            <span className="text-[22px] text-[#1f1f1f] font-medium tracking-[-0.2px] hidden sm:inline dark:text-[#e8eaed]">Translator</span>
          </a>
        </div>

        <div className="flex items-center gap-1">
          <button className={iconBtn} onClick={() => setIsDark(!isDark)} aria-label="Toggle theme">{isDark ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}</button>
          <button className={iconBtn} aria-label="Settings"><Settings className="w-5 h-5" /></button>
          <button className={iconBtn} aria-label="Google apps"><AppsIcon /></button>
          {user ? (
            <div className="relative ml-3" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-9 h-9 rounded-full bg-[#0b57d0] text-white text-sm font-medium uppercase flex items-center justify-center hover:opacity-90 transition-opacity dark:bg-[#a8c7fa] dark:text-[#062e6f]"
                aria-label="Account"
              >
                {(user.email ?? '?').charAt(0)}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl p-4 z-50 shadow-[0_4px_24px_rgba(60,64,67,0.25)] dark:bg-[#2d2e31]">
                  <p className="text-sm font-medium text-[#202124] truncate dark:text-[#e8eaed]">{user.email}</p>
                  <p className="text-xs text-[#5f6368] mt-0.5 dark:text-[#9aa0a6]">Signed in</p>
                  <button
                    onClick={handleSignOut}
                    className="mt-3 w-full h-9 rounded-full border border-[#dadce0] text-sm font-medium text-[#0b57d0] hover:bg-[#f6fafe] transition-colors dark:border-[#3c4043] dark:text-[#8ab4f8] dark:hover:bg-[#26282b]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setAuthOpen(true)}
              className="ml-3 h-10 px-6 rounded-full bg-[#0b57d0] hover:bg-[#094fb0] text-white text-sm font-medium transition-colors dark:bg-[#a8c7fa] dark:hover:bg-[#c2d7fc] dark:text-[#062e6f]"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="flex-1 w-[94%] md:w-[62%] md:max-w-[1400px] mx-auto pt-6">
        {/* Mode pills */}
        <div className="flex items-center gap-2.5 mb-5">
          <button className="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium bg-[#d2e3fc] text-[#0b57d0] dark:bg-[#004a77] dark:text-[#d3e3fd]">
            <Languages className="w-[18px] h-[18px]" />
            Text
          </button>
          <button className="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium bg-white border border-[#dadce0] text-[#0b57d0] hover:bg-[#f6fafe] dark:bg-transparent dark:border-[#3c4043] dark:text-[#a8c7fa] dark:hover:bg-[#26282b] transition-colors">
            <ImageIcon className="w-[18px] h-[18px]" />
            Images
          </button>
          <button className="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium bg-white border border-[#dadce0] text-[#0b57d0] hover:bg-[#f6fafe] dark:bg-transparent dark:border-[#3c4043] dark:text-[#a8c7fa] dark:hover:bg-[#26282b] transition-colors">
            <FileText className="w-[18px] h-[18px]" />
            Documents
          </button>
          <button className="flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium bg-white border border-[#dadce0] text-[#0b57d0] hover:bg-[#f6fafe] dark:bg-transparent dark:border-[#3c4043] dark:text-[#a8c7fa] dark:hover:bg-[#26282b] transition-colors">
            <AppWindow className="w-[18px] h-[18px]" />
            Websites
          </button>
        </div>

        {/* Language bars + boxes */}
        <div className="relative">
          {/* Swap */}
          <button
            onClick={handleSwap}
            className="absolute left-1/2 top-3 -translate-x-1/2 z-10 p-1.5 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:bg-[#26282b] transition-colors hidden md:block"
            aria-label="Swap languages"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>

          <div className="grid md:grid-cols-2 gap-[15px]">
            {/* ---- Source column ---- */}
            <div>
              <div className="flex items-center h-12">
                <button
                  onClick={() => setSourceLang('auto')}
                  className={cn(
                    'h-full px-3 text-sm border-b-[3px] transition-colors',
                    sourceLang === 'auto'
                      ? 'text-[#0b57d0] border-[#0b57d0] font-medium dark:text-[#8ab4f8] dark:border-[#8ab4f8]'
                      : 'text-[#3c4043] border-transparent hover:text-[#0b57d0] dark:text-[#e8eaed] dark:hover:text-[#8ab4f8]'
                  )}
                >
                  Detect language
                </button>
                {sourceQuick.map((code) => (
                  <button
                    key={code}
                    onClick={() => setSourceLang(code)}
                    className={cn(
                      'h-full px-3 text-sm border-b-[3px] transition-colors',
                      sourceLang === code
                        ? 'text-[#0b57d0] border-[#0b57d0] font-medium dark:text-[#8ab4f8] dark:border-[#8ab4f8]'
                        : 'text-[#3c4043] border-transparent hover:text-[#0b57d0] dark:text-[#e8eaed] dark:hover:text-[#8ab4f8]'
                    )}
                  >
                    {getLanguageName(code)}
                  </button>
                ))}
                <LanguagePicker value={sourceLang} onChange={setSourceLang} includeDetect />
              </div>

              <div className="bg-white border border-[#dadce0] rounded-xl flex flex-col min-h-[152px] dark:bg-[#131314] dark:border-[#3c4043]">
                <textarea
                  ref={textareaRef}
                  value={sourceText}
                  onChange={(e) => { if (e.target.value.length <= MAX_CHARS) setSourceText(e.target.value); }}
                  maxLength={MAX_CHARS}
                  autoFocus
                  className="flex-1 w-full resize-none bg-transparent border-0 outline-none p-4 pb-1 text-[22px] leading-[1.45] text-[#202124] placeholder:text-[#5f6368] dark:text-[#e8eaed] dark:placeholder:text-[#9aa0a6]"
                  aria-label="Source text"
                />
                <div className="flex items-center justify-between pl-2 pr-2 pb-1">
                  <div className="flex items-center">
                    <button
                      onClick={handleMic}
                      className={cn(iconBtn, isListening && 'text-[#d93025] animate-pulse')}
                      aria-label="Voice input"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    {sourceText && (
                      <>
                        <button onClick={handleClear} className={iconBtn} aria-label="Clear">
                          <X className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleSpeak(sourceText, sourceLang === 'auto' ? (detectedLanguage ?? 'auto') : sourceLang)} className={iconBtn} aria-label="Listen">
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#5f6368] tabular-nums dark:text-[#9aa0a6]">
                      {charCount.toLocaleString('en-US')} / {MAX_CHARS.toLocaleString('en-US')}
                    </span>
                    <button className="p-1 rounded-full text-[#5f6368] hover:bg-[#f1f3f4] dark:text-[#9aa0a6] dark:hover:bg-[#26282b]" aria-label="Character limit">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button className={iconBtn} aria-label="On-screen keyboard">
                      <Keyboard className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Target column ---- */}
            <div className="flex flex-col">
              <div className="flex items-center h-12">
                {targetQuick.map((code) => (
                  <button
                    key={code}
                    onClick={() => setTargetLang(code)}
                    className={cn(
                      'h-full px-3 text-sm border-b-[3px] transition-colors',
                      targetLang === code
                        ? 'text-[#0b57d0] border-[#0b57d0] font-medium dark:text-[#8ab4f8] dark:border-[#8ab4f8]'
                        : 'text-[#3c4043] border-transparent hover:text-[#0b57d0] dark:text-[#e8eaed] dark:hover:text-[#8ab4f8]'
                    )}
                  >
                    {getLanguageName(code)}
                  </button>
                ))}
                <LanguagePicker value={targetLang} onChange={setTargetLang} />
              </div>

              <div className="bg-[#e6eaf1] rounded-xl flex flex-col min-h-[152px] p-4 dark:bg-[#28313c]">
                {error && !translatedText ? (
                  <p className="text-sm text-[#d93025] dark:text-[#f28b82]">{error}</p>
                ) : translatedText ? (
                  <p className={cn('text-[22px] leading-[1.45] text-[#1f1f1f] whitespace-pre-wrap dark:text-[#e8eaed]', isTranslating && 'opacity-60')}>
                    {translatedText}
                  </p>
                ) : (
                  <p className={cn('text-[22px] text-[#5f6368] dark:text-[#9aa0a6]', isTranslating && 'animate-pulse')}>
                    Translation
                  </p>
                )}
                {translatedText && (
                  <div className="flex items-center mt-auto pt-3 -ml-2">
                    <button onClick={() => handleSpeak(translatedText, targetLang)} className={iconBtn} aria-label="Listen">
                      <Volume2 className="w-5 h-5" />
                    </button>
                    <button onClick={handleCopyResult} className={iconBtn} aria-label="Copy">
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="text-right mt-1.5">
                <button className="text-[11px] italic text-[#5f6368] hover:underline dark:text-[#9aa0a6]">Send feedback</button>
              </div>
            </div>
          </div>
        </div>

        {/* ===== History / Saved circles ===== */}
        <div className="mt-16 flex justify-center gap-20">
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
              className={cn(
                'w-[66px] h-[66px] rounded-full border flex items-center justify-center transition-colors',
                activePanel === 'history'
                  ? 'border-[#0b57d0] text-[#0b57d0] bg-[#f6fafe] dark:border-[#8ab4f8] dark:text-[#8ab4f8] dark:bg-[#17253a]'
                  : 'border-[#dadce0] text-[#5f6368] bg-white hover:bg-[#f6fafe] dark:border-[#3c4043] dark:text-[#9aa0a6] dark:bg-transparent dark:hover:bg-[#26282b]'
              )}
              aria-label="History"
            >
              <History className="w-6 h-6" />
            </button>
            <span className="mt-2 text-xs text-[#3c4043] dark:text-[#e8eaed]">History</span>
          </div>
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActivePanel(activePanel === 'saved' ? null : 'saved')}
              className={cn(
                'w-[66px] h-[66px] rounded-full border flex items-center justify-center transition-colors',
                activePanel === 'saved'
                  ? 'border-[#0b57d0] text-[#0b57d0] bg-[#f6fafe] dark:border-[#8ab4f8] dark:text-[#8ab4f8] dark:bg-[#17253a]'
                  : 'border-[#dadce0] text-[#5f6368] bg-white hover:bg-[#f6fafe] dark:border-[#3c4043] dark:text-[#9aa0a6] dark:bg-transparent dark:hover:bg-[#26282b]'
              )}
              aria-label="Saved"
            >
              <Star className="w-6 h-6" />
            </button>
            <span className="mt-2 text-xs text-[#3c4043] dark:text-[#e8eaed]">Saved</span>
          </div>
        </div>

        {/* ===== Panels ===== */}
        {activePanel === 'history' && (
          <div className="mt-8 mx-auto max-w-[720px] bg-white border border-[#dadce0] rounded-2xl overflow-hidden dark:bg-[#1e1f20] dark:border-[#3c4043]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#e8eaed] dark:border-[#333538]">
              <h2 className="text-base font-medium text-[#202124] dark:text-[#e8eaed]">History</h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1.5 text-xs text-[#5f6368] hover:text-[#d93025] dark:text-[#9aa0a6] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear all
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="px-5 py-10 text-sm text-center text-[#5f6368] dark:text-[#9aa0a6]">
                No translations in history
              </p>
            ) : (
              <div className="max-h-[320px] overflow-y-auto divide-y divide-[#f1f3f4] dark:divide-[#2a2c2f]">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="group flex items-start justify-between gap-4 px-5 py-3 hover:bg-[#f8f9fa] cursor-pointer dark:hover:bg-[#26282b]"
                    onClick={() => {
                      setSourceText(entry.sourceText);
                      setTranslatedText(entry.translatedText);
                      setSourceLang(entry.sourceLang);
                      setTargetLang(entry.targetLang);
                      setActivePanel(null);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[#202124] truncate dark:text-[#e8eaed]">{entry.sourceText}</p>
                      <p className="text-sm text-[#5f6368] truncate dark:text-[#9aa0a6]">{entry.translatedText}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <span className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                        {getLanguageName(entry.sourceLang === 'auto' ? 'de' : entry.sourceLang)} → {getLanguageName(entry.targetLang)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.id); }}
                        className="p-1 rounded-full text-[#5f6368] opacity-0 group-hover:opacity-100 hover:bg-[#e8eaed] dark:text-[#9aa0a6] dark:hover:bg-[#333538] transition-all"
                        aria-label="Remove entry"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activePanel === 'saved' && (
          <div className="mt-8 mx-auto max-w-[720px] bg-white border border-[#dadce0] rounded-2xl px-5 py-10 text-center dark:bg-[#1e1f20] dark:border-[#3c4043]">
            <Star className="w-8 h-8 text-[#dadce0] mx-auto mb-3 dark:text-[#3c4043]" />
            <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">No saved translations yet</p>
          </div>
        )}

        <div className="h-16" />
      </main>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
