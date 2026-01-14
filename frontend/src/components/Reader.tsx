import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DocumentMeta, WordData } from '../types';
import { useShortcuts } from '../hooks/useShortcuts';
import FullTextView from './FullTextView';

const WPM_MIN = 100;
const WPM_MAX = 2000;
const WPM_STEP = 10;
const WPM_HOLD_STEP = 5;
const WPM_HOLD_INTERVAL = 120;
const WORDS_PER_PAGE = 300;

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function shadeHex(hex: string, percent: number) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;
  const num = Number.parseInt(normalized, 16);
  if (Number.isNaN(num)) return hex;

  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);

  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  const nr = Math.round((t - r) * p) + r;
  const ng = Math.round((t - g) * p) + g;
  const nb = Math.round((t - b) * p) + b;

  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

interface ReaderProps {
  words: WordData[];
  fullText?: string;
  meta?: DocumentMeta;
  fileName?: string;
  onBack: () => void;
}

export default function Reader({ words, fullText, meta, fileName, onBack }: ReaderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(300);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMinimal, setIsMinimal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWpmToast, setShowWpmToast] = useState(false);
  const [fontFamily, setFontFamily] = useState('Georgia, "Times New Roman", Times, serif');
  const [fontSize, setFontSize] = useState(128);
  const [centerNudge, setCenterNudge] = useState(-6);
  const [orpColor, setOrpColor] = useState('#ef4444');
  const [orpEffect, setOrpEffect] = useState<'solid' | 'breathe' | 'gradient'>('solid');
  const [orpBreatheSpeed, setOrpBreatheSpeed] = useState(10);
  const [orpGradientPreset, setOrpGradientPreset] = useState('sunset');
  const [orpGradientSpeed, setOrpGradientSpeed] = useState(14);
  const wpmHoldRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wpmToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef(0);
  const accRef = useRef(0);
  const prevWpmRef = useRef(wpm);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // RSVP Engine
  useEffect(() => {
    if (!isPlaying || words.length === 0) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const interval = 60000 / wpm;
    tickRef.current = performance.now();
    accRef.current = interval;

    const step = (now: number) => {
      const delta = now - tickRef.current;
      tickRef.current = now;
      accRef.current += delta;

      if (accRef.current >= interval) {
        const steps = Math.floor(accRef.current / interval);
        accRef.current -= steps * interval;
        setCurrentIndex((prev) => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = Math.min(prev + steps, words.length - 1);
          if (next >= words.length - 1) {
            setIsPlaying(false);
          }
          return next;
        });
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, wpm, words.length]);

  const togglePlay = useCallback(() => {
    setHasStarted(true);
    setIsPlaying((prev) => !prev);
    setShowSettings(false);
  }, []);

  const openContextPanel = useCallback(() => {
    setHasStarted(true);
    setIsMinimal(false);
    setIsPlaying(false);
    setShowSettings(false);
  }, []);

  const refocusFromContext = useCallback(() => {
    setHasStarted(true);
    setIsPlaying(true);
  }, []);

  const jumpToIndex = useCallback((index: number) => {
    setHasStarted(true);
    setIsPlaying(false);
    setCurrentIndex(index);
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  const adjustWpm = useCallback((delta: number) => {
    setWpm((prev) => clampValue(prev + delta, WPM_MIN, WPM_MAX));
  }, []);

  const increaseWPM = useCallback(() => {
    adjustWpm(WPM_STEP);
  }, [adjustWpm]);

  const decreaseWPM = useCallback(() => {
    adjustWpm(-WPM_STEP);
  }, [adjustWpm]);

  const startWpmAdjust = useCallback(
    (delta: number) => {
      if (wpmHoldRef.current) return;
      adjustWpm(delta);
      wpmHoldRef.current = setInterval(() => adjustWpm(delta), WPM_HOLD_INTERVAL);
    },
    [adjustWpm]
  );

  const stopWpmAdjust = useCallback(() => {
    if (!wpmHoldRef.current) return;
    clearInterval(wpmHoldRef.current);
    wpmHoldRef.current = null;
  }, []);

  useEffect(() => {
    return () => stopWpmAdjust();
  }, [stopWpmAdjust]);

  useEffect(() => {
    if (!isMinimal) {
      setShowWpmToast(false);
      if (wpmToastRef.current) {
        clearTimeout(wpmToastRef.current);
        wpmToastRef.current = null;
      }
      prevWpmRef.current = wpm;
      return;
    }

    if (prevWpmRef.current === wpm) return;
    prevWpmRef.current = wpm;
    setShowWpmToast(true);
    if (wpmToastRef.current) {
      clearTimeout(wpmToastRef.current);
    }
    wpmToastRef.current = setTimeout(() => setShowWpmToast(false), 900);
  }, [isMinimal, wpm]);

  useEffect(() => {
    return () => {
      if (wpmToastRef.current) {
        clearTimeout(wpmToastRef.current);
      }
    };
  }, []);

  const stepBackward = useCallback(() => {
    setHasStarted(true);
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const stepForward = useCallback(() => {
    setHasStarted(true);
    setIsPlaying(false);
    setCurrentIndex((prev) => Math.min(words.length - 1, prev + 1));
  }, [words.length]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(0);
  }, []);

  const shortcutHandlers = useMemo(
    () => ({
      onTogglePlay: togglePlay,
      onIncreaseWPM: increaseWPM,
      onDecreaseWPM: decreaseWPM,
      onStartIncreaseWPM: () => startWpmAdjust(WPM_HOLD_STEP),
      onStartDecreaseWPM: () => startWpmAdjust(-WPM_HOLD_STEP),
      onStopAdjustWPM: stopWpmAdjust,
      onStepBackward: stepBackward,
      onStepForward: stepForward,
      onReset: reset,
      onToggleFullText: openContextPanel,
      onToggleMinimal: () => setIsMinimal((prev) => !prev),
    }),
    [
      decreaseWPM,
      increaseWPM,
      openContextPanel,
      reset,
      startWpmAdjust,
      stepBackward,
      stepForward,
      stopWpmAdjust,
      togglePlay,
    ]
  );

  // Keyboard shortcuts
  useShortcuts(shortcutHandlers);

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-xs uppercase tracking-[0.35em] text-gray-500">
          Preparing text…
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const safeWord = currentWord?.word ?? '';
  const safeOrpIndex =
    safeWord.length > 0
      ? Math.min(Math.max(currentWord?.orpIndex ?? 0, 0), safeWord.length - 1)
      : 0;
  const orpOffset = useMemo(() => {
    if (!safeWord) return centerNudge;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return centerNudge;
    ctx.font = `${fontSize}px ${fontFamily}`;
    const wordWidth = ctx.measureText(safeWord).width;
    const leadingWidth = ctx.measureText(safeWord.slice(0, safeOrpIndex)).width;
    const orpChar = safeWord.charAt(safeOrpIndex);
    const orpWidth = orpChar ? ctx.measureText(orpChar).width : 0;
    const orpCenter = leadingWidth + orpWidth / 2;
    return Math.round(wordWidth / 2 - orpCenter + centerNudge);
  }, [centerNudge, fontFamily, fontSize, safeOrpIndex, safeWord]);
  const progress = ((currentIndex + 1) / words.length) * 100;
  const page = Math.floor(currentIndex / WORDS_PER_PAGE) + 1;
  const totalPages = Math.max(1, Math.ceil(words.length / WORDS_PER_PAGE));
  const showContextPanel = !isPlaying && hasStarted;
  const focusStatusVisible = showWpmToast || !isPlaying;
  const rootStyle = {
    backgroundColor: '#000000',
    '--panel-width': 'min(44rem, 45vw)',
  } as CSSProperties;
  const centerShiftStyle = showContextPanel
    ? { transform: 'translateX(calc(var(--panel-width) / -2))' }
    : { transform: 'translateX(0px)' };
  const fontOptions = useMemo(
    () => [
      { label: 'Classic Serif', value: 'Georgia, "Times New Roman", Times, serif' },
      { label: 'Palatino', value: '"Palatino Linotype", Palatino, "Book Antiqua", serif' },
      { label: 'Garamond', value: '"Garamond", "Adobe Garamond Pro", serif' },
      { label: 'Didot', value: '"Didot", "Bodoni 72", serif' },
      { label: 'Baskerville', value: '"Baskerville", "Baskerville Old Face", serif' },
      { label: 'Charter', value: '"Charter", "Bitstream Charter", serif' },
      { label: 'Goudy', value: '"Goudy Old Style", "Goudy", serif' },
      { label: 'Rockwell', value: '"Rockwell", "Rockwell Nova", serif' },
      { label: 'Helvetica', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
      { label: 'Gill Sans', value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
      { label: 'Optima', value: '"Optima", "Candara", sans-serif' },
      { label: 'Mono', value: '"Courier New", Courier, monospace' },
    ],
    []
  );
  const gradientPresets = useMemo(
    () => ({
      sunset: 'linear-gradient(90deg, #ff7a18, #af002d 50%, #319197)',
      aurora: 'linear-gradient(90deg, #00c6ff, #0072ff 45%, #7b2ff7)',
      ember: 'linear-gradient(90deg, #ff512f, #f09819 50%, #ff6a88)',
      rainforest: 'linear-gradient(90deg, #00b09b, #96c93d 50%, #5ed497)',
    }),
    []
  );
  const orpDarkColor = useMemo(() => shadeHex(orpColor, -0.35), [orpColor]);
  const orpStyle =
    orpEffect === 'gradient'
      ? ({
          backgroundImage: gradientPresets[orpGradientPreset],
          '--orp-gradient-speed': `${orpGradientSpeed}s`,
        } as CSSProperties)
      : orpEffect === 'breathe'
      ? ({
          color: orpColor,
          '--orp-color': orpColor,
          '--orp-color-dark': orpDarkColor,
          '--orp-breathe-speed': `${orpBreatheSpeed}s`,
        } as CSSProperties)
      : { color: orpColor };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white relative" style={rootStyle}>
      {/* WPM Indicator */}
      {!isMinimal && (
        <div className="absolute top-4 right-4 text-gray-300 text-sm">
          <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
            {isPlaying ? 'Playing' : 'Paused'}
          </div>
          <div className="text-lg text-white font-semibold">{wpm} wpm</div>
          {!isPlaying && (
            <div className="text-xs text-gray-400">
              Page {page} / {totalPages}
            </div>
          )}
        </div>
      )}

      {/* Focus Mode Page */}
      {isMinimal && (
        <div className="absolute top-4 left-4 text-xs uppercase tracking-[0.35em] text-gray-500">
          Page {page} / {totalPages}
        </div>
      )}

      {/* Focus Mode WPM Toast */}
      {isMinimal && (
        <div
          className={`absolute top-4 right-4 text-right transition-opacity duration-200 ${
            focusStatusVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="text-xs uppercase tracking-[0.35em] text-gray-500">
            {isPlaying ? 'WPM' : 'Paused'}
          </div>
          <div className="text-2xl text-white font-semibold">{isPlaying ? wpm : '—'}</div>
        </div>
      )}

      {/* Focus Mode Full Text Button */}
      {isMinimal && (
        <button
          onClick={openContextPanel}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.35em] text-gray-500/80 hover:text-gray-300 transition-colors"
        >
          Full Text
        </button>
      )}

      {/* Top Controls */}
      {!isMinimal && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-xs uppercase tracking-widest text-gray-200"
          >
            Back
          </button>
          <button
            onClick={openContextPanel}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-xs uppercase tracking-widest text-gray-200"
          >
            Full Text
          </button>
          <button
            onClick={() => setIsMinimal((prev) => !prev)}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-xs uppercase tracking-widest text-gray-200"
          >
            Focus
          </button>
        </div>
      )}

      {/* Word Display */}
      <div className="flex flex-col items-center justify-center flex-1 w-full px-8">
        {/* Vertical guide lines */}
        <div
          className={`relative w-full ${isMinimal ? '' : 'max-w-4xl'} mx-auto transition-transform duration-200 ease-out`}
          style={!isMinimal ? centerShiftStyle : undefined}
        >
          {!isMinimal && (
            <>
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-800 transform -translate-x-1/2 z-10 guide-line guide-line-vertical"></div>

              {/* Horizontal guide lines */}
              <div className="absolute left-0 right-0 top-1/3 h-px bg-gray-800 transform -translate-y-1/2 guide-line guide-line-horizontal"></div>
              <div className="absolute left-0 right-0 bottom-1/3 h-px bg-gray-800 transform translate-y-1/2 guide-line guide-line-horizontal"></div>
            </>
          )}

          {/* Word */}
          <div className="flex items-center justify-center min-h-[400px] relative">
            <div 
              className="leading-none inline-flex items-center"
              style={{ 
                transform: `translateX(${orpOffset}px)`,
                transition: 'none', // No transition - instant positioning
                fontFamily,
                fontSize: `${fontSize}px`,
              }}
            >
              {safeWord.split('').map((char, idx) => (
                <span
                  key={idx}
                  className={
                    idx === safeOrpIndex
                      ? orpEffect === 'gradient'
                        ? 'orp-gradient'
                        : orpEffect === 'breathe'
                        ? 'orp-breathe'
                        : ''
                      : 'text-white'
                  }
                  style={idx === safeOrpIndex ? orpStyle : undefined}
                >
                  {char}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Progress Bar */}
      {!isMinimal && (
        <div
          className="w-full max-w-4xl px-8 mb-8 transition-transform duration-200 ease-out"
          style={centerShiftStyle}
        >
          <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-center text-gray-400 text-sm mt-2">
            {currentIndex + 1} / {words.length}
          </div>
        </div>
      )}

      {/* Controls */}
      {!isMinimal && (
        <div className="flex items-center gap-4 mb-8 transition-transform duration-200 ease-out" style={centerShiftStyle}>
          <button
            onClick={stepBackward}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-sm"
          >
            ←
          </button>
          <button
            onClick={togglePlay}
            className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded font-medium"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={stepForward}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-sm"
          >
            →
          </button>
          <button
            onClick={decreaseWPM}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-sm"
          >
            ↓
          </button>
          <button
            onClick={increaseWPM}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-sm"
          >
            ↑
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-sm"
          >
            Reset
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      {!isMinimal && (
        <div className="absolute bottom-4 left-4 text-gray-500 text-[10px] leading-relaxed max-w-[16rem]">
          <div>Space: Play/Pause | ↑↓: WPM (hold to adjust) | ←→: Navigate | R: Reset | F: Full Text | M: Focus</div>
        </div>
      )}


      {/* Context Panel */}
      <FullTextView
        isOpen={showContextPanel}
        currentIndex={currentIndex}
        totalWords={words.length}
        isPlaying={isPlaying}
        onPlay={refocusFromContext}
        onJumpToIndex={jumpToIndex}
        onOpenSettings={toggleSettings}
        fullText={fullText}
        meta={meta}
        fileName={fileName}
      />

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed top-20 right-6 z-50 w-[22rem] bg-black/95 border border-gray-800 rounded-xl shadow-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-3">
            Settings
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
              Font
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs"
              >
                {fontOptions.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
              Size
              <input
                type="range"
                min={64}
                max={200}
                step={2}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
              Center nudge
              <input
                type="range"
                min={-20}
                max={20}
                step={1}
                value={centerNudge}
                onChange={(e) => setCenterNudge(Number(e.target.value))}
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
              Effect
              <select
                value={orpEffect}
                onChange={(e) => setOrpEffect(e.target.value as 'solid' | 'breathe' | 'gradient')}
                className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs"
              >
                <option value="solid">Solid</option>
                <option value="breathe">Breathe</option>
                <option value="gradient">Gradient</option>
              </select>
            </label>

            <label className={`flex items-center justify-between gap-3 text-xs ${orpEffect === 'gradient' ? 'text-gray-600' : 'text-gray-400'}`}>
              Center color
              <input
                type="color"
                value={orpColor}
                onChange={(e) => setOrpColor(e.target.value)}
                disabled={orpEffect === 'gradient'}
                className="h-6 w-10 bg-transparent border border-gray-700 rounded"
              />
            </label>

            {orpEffect === 'breathe' && (
              <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
                Breathe speed
                <input
                  type="range"
                  min={6}
                  max={20}
                  step={1}
                  value={orpBreatheSpeed}
                  onChange={(e) => setOrpBreatheSpeed(Number(e.target.value))}
                />
              </label>
            )}

            {orpEffect === 'gradient' && (
              <>
                <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
                  Preset
                  <select
                    value={orpGradientPreset}
                    onChange={(e) => setOrpGradientPreset(e.target.value)}
                    className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs"
                  >
                    <option value="sunset">Sunset</option>
                    <option value="aurora">Aurora</option>
                    <option value="ember">Ember</option>
                    <option value="rainforest">Rainforest</option>
                  </select>
                </label>

                <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
                  Gradient speed
                  <input
                    type="range"
                    min={8}
                    max={30}
                    step={1}
                    value={orpGradientSpeed}
                    onChange={(e) => setOrpGradientSpeed(Number(e.target.value))}
                  />
                </label>
              </>
            )}

            <label className="flex items-center justify-between gap-3 text-xs text-gray-400">
              Focus mode
              <input
                type="checkbox"
                checked={isMinimal}
                onChange={(e) => setIsMinimal(e.target.checked)}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
