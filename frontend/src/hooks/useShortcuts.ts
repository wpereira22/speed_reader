import { useEffect } from 'react';

interface ShortcutHandlers {
  onTogglePlay: () => void;
  onIncreaseWPM: () => void;
  onDecreaseWPM: () => void;
  onStartIncreaseWPM?: () => void;
  onStartDecreaseWPM?: () => void;
  onStopAdjustWPM?: () => void;
  onStepBackward: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onToggleFullText?: () => void;
  onToggleMinimal?: () => void;
}

export function useShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return;
      }
      // Prevent shortcuts when typing in input fields
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlers.onTogglePlay();
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (handlers.onStartIncreaseWPM) {
            if (!e.repeat) {
              handlers.onStartIncreaseWPM();
            }
          } else {
            handlers.onIncreaseWPM();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (handlers.onStartDecreaseWPM) {
            if (!e.repeat) {
              handlers.onStartDecreaseWPM();
            }
          } else {
            handlers.onDecreaseWPM();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onStepBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onStepForward();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handlers.onReset();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handlers.onToggleFullText?.();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handlers.onToggleMinimal?.();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.defaultPrevented) {
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowDown':
          handlers.onStopAdjustWPM?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handlers]);
}
