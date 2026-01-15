import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { DocumentMeta } from '../types';

interface FullTextViewProps {
  isOpen: boolean;
  currentIndex: number;
  totalWords: number;
  isPlaying: boolean;
  onPlay: () => void;
  onJumpToIndex: (index: number) => void;
  onOpenSettings: () => void;
  fullText?: string;
  meta?: DocumentMeta;
  fileName?: string;
}

const WORDS_PER_PAGE = 300;

function isWordToken(token: string) {
  return /[A-Za-z0-9]/.test(token);
}

function countWords(text: string) {
  const tokens = text.match(/\S+/g) ?? [];
  let count = 0;
  tokens.forEach((token) => {
    if (isWordToken(token)) {
      count += 1;
    }
  });
  return count;
}

function isSentenceEnd(token: string) {
  return /[.!?]["')\]]*$/.test(token);
}

function FullTextView({
  isOpen,
  currentIndex,
  totalWords,
  isPlaying,
  onPlay,
  onJumpToIndex,
  onOpenSettings,
  fullText,
  meta,
  fileName,
}: FullTextViewProps) {
  const [isReady, setIsReady] = useState(false);
  const fallbackTitle = fileName
    ? fileName.split('/').pop()?.replace(/\.[^/.]+$/, '') ?? fileName
    : 'Untitled';
  const title = meta?.title ? meta.title : fallbackTitle;
  const author = meta?.creator ? `• ${meta.creator}` : '';
  const formattedText = useMemo(
    () => (isOpen && isReady ? fullText?.trim() ?? '' : ''),
    [fullText, isOpen, isReady]
  );
  const textTabIndex = isOpen && isReady ? 0 : -1;
  const scrollRef = useRef<HTMLDivElement>(null);
  const handlePlay = () => {
    setIsReady(false);
    onPlay();
  };

  const paragraphs = useMemo(() => {
    if (!formattedText) return [];
    return formattedText.split(/\n\s*\n/);
  }, [formattedText]);

  const paragraphMeta = useMemo(() => {
    const starts: number[] = [];
    const counts: number[] = [];
    let total = 0;
    paragraphs.forEach((paragraph) => {
      starts.push(total);
      const count = countWords(paragraph);
      counts.push(count);
      total += count;
    });
    return { starts, counts, total };
  }, [paragraphs]);

  const activeParagraphIndex = useMemo(() => {
    if (!isOpen || !isReady || !paragraphs.length) return 0;
    const { starts } = paragraphMeta;
    let low = 0;
    let high = starts.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const start = starts[mid];
      const next = mid + 1 < starts.length ? starts[mid + 1] : Number.MAX_SAFE_INTEGER;
      if (currentIndex >= start && currentIndex < next) {
        return mid;
      }
      if (currentIndex < start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return 0;
  }, [currentIndex, isOpen, isReady, paragraphMeta, paragraphs.length]);

  const currentPage = useMemo(() => Math.floor(currentIndex / WORDS_PER_PAGE) + 1, [currentIndex]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalWords / WORDS_PER_PAGE)), [totalWords]);

  const goToPage = (page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    const targetIndex = (targetPage - 1) * WORDS_PER_PAGE;
    onJumpToIndex(targetIndex);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Calculate which paragraphs belong to the current page
  const visibleParagraphs = useMemo(() => {
    if (!isOpen || !isReady || paragraphs.length === 0) return [];
    
    const pageStartWord = (currentPage - 1) * WORDS_PER_PAGE;
    const pageEndWord = Math.min(currentPage * WORDS_PER_PAGE, totalWords);
    
    const visible: number[] = [];
    const { starts, counts } = paragraphMeta;
    
    // Find paragraphs that overlap with the current page
    for (let i = 0; i < paragraphs.length; i++) {
      const paraStart = starts[i];
      const paraEnd = paraStart + counts[i];
      
      // Include paragraph if it overlaps with the page range
      if (paraStart < pageEndWord && paraEnd > pageStartWord) {
        visible.push(i);
      }
    }
    
    return visible;
  }, [currentPage, paragraphs.length, paragraphMeta, isOpen, isReady, totalWords]);

  useEffect(() => {
    if (!isOpen) {
      setIsReady(false);
      return;
    }
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isReady || !scrollRef.current) return;
    // Small delay to ensure DOM is updated with new paragraphs
    const timeout = setTimeout(() => {
      const target = scrollRef.current?.querySelector(
        `[data-word-index="${currentIndex}"]`
      ) as HTMLElement | null;
      if (target) {
        requestAnimationFrame(() => {
          target.scrollIntoView({ block: 'center', behavior: 'auto' });
        });
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [currentIndex, isOpen, visibleParagraphs.length]);

  const renderParagraph = (paragraph: string, paragraphStart: number, isActive: boolean) => {
    const tokens = paragraph.match(/\s+|[^\s]+/g) ?? [];
    const targetWordIndex = currentIndex - paragraphStart;
    let sentenceId = 0;
    let wordIndex = 0;
    let activeSentenceId = 0;

    if (isActive) {
      tokens.forEach((token) => {
        if (/^\s+$/.test(token)) {
          return;
        }
        const isWord = isWordToken(token);
        if (isWord && wordIndex === targetWordIndex) {
          activeSentenceId = sentenceId;
        }
        if (isSentenceEnd(token)) {
          sentenceId += 1;
        }
        if (isWord) {
          wordIndex += 1;
        }
      });
    }

    sentenceId = 0;
    wordIndex = 0;
    return tokens.map((token, tokenIndex) => {
      if (/^\s+$/.test(token)) {
        return token;
      }

      const isWord = isWordToken(token);
      const isActiveWord = isActive && isWord && wordIndex === targetWordIndex;
      const isActiveSentence = isActive && sentenceId === activeSentenceId;
      const wordIndexInDocument = paragraphStart + wordIndex;
      const classes = [
        isActive && isActiveSentence ? 'book-sentence' : 'book-dim',
        isActiveWord ? 'book-word' : '',
      ]
        .filter(Boolean)
        .join(' ');

      if (isSentenceEnd(token)) {
        sentenceId += 1;
      }
      if (isWord) {
        wordIndex += 1;
      }

      return (
        <span
          key={tokenIndex}
          data-word-index={isWord ? wordIndexInDocument : undefined}
          className={classes || undefined}
        >
          {token}
        </span>
      );
    });
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-[min(44rem,45vw)] max-w-full bg-black/95 border-l border-gray-800 shadow-2xl transition-transform duration-200 ease-out transform-gpu ${
        isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <div className="flex flex-col h-full">
        <div className="px-6 pt-6 pb-4 border-b border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Context</div>
              <h2
                className="text-sm text-white font-semibold mt-2 truncate max-w-[28rem]"
                title={title}
              >
                {title}
              </h2>
              {author ? <div className="text-xs text-gray-500 mt-1">{author}</div> : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlay}
                className="px-3 py-2 bg-white text-black hover:bg-gray-200 rounded text-xs uppercase tracking-widest"
              >
                {isPlaying ? 'Playing' : 'Play'}
              </button>
              <button
                onClick={onOpenSettings}
                className="px-3 py-2 bg-gray-900/80 border border-gray-800 hover:bg-gray-800 rounded text-xs uppercase tracking-widest text-gray-200"
                aria-label="Open settings"
              >
                Config
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="text-xs text-gray-500">
              Word {currentIndex + 1} / {totalWords}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPreviousPage();
                }}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
              >
                ←
              </button>
              <span className="text-xs text-gray-500 min-w-[4rem] text-center">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextPage();
                }}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-6 cursor-pointer"
          onClick={(e) => {
            // Find the clicked word element
            const target = e.target as HTMLElement;
            const wordSpan = target.closest('[data-word-index]') as HTMLElement | null;
            if (wordSpan) {
              const wordIndex = wordSpan.getAttribute('data-word-index');
              if (wordIndex !== null) {
                const index = parseInt(wordIndex, 10);
                if (!isNaN(index) && index >= 0 && index < totalWords) {
                  e.preventDefault();
                  e.stopPropagation();
                  onJumpToIndex(index);
                }
              }
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              handlePlay();
            }
          }}
          role="button"
          tabIndex={textTabIndex}
        >
          {!isReady ? (
            <div className="text-gray-500 text-sm">Loading context…</div>
          ) : formattedText.length > 0 ? (
            <div ref={scrollRef} className="book-body">
              {visibleParagraphs.map((paragraphIndex) => {
                const paragraph = paragraphs[paragraphIndex];
                const paragraphStart = paragraphMeta.starts[paragraphIndex] ?? 0;
                const isActive = paragraphIndex === activeParagraphIndex;
                return (
                  <p
                    key={paragraphIndex}
                    className={`book-paragraph ${isActive ? '' : 'book-dim'}`}
                  >
                    {renderParagraph(paragraph, paragraphStart, isActive)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              Formatted text is not available for this file.
            </div>
          )}
        </div>

        <div className="px-6 pb-4 text-[10px] uppercase tracking-[0.3em] text-gray-600">
          Click text to jump • Space/Enter to play
        </div>
      </div>
    </div>
  );
}

export default memo(FullTextView, (prev, next) => {
  if (!prev.isOpen && !next.isOpen) {
    return true;
  }
  return false;
});
