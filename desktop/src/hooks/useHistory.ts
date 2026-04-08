import { useRef, useCallback, useState } from 'react';

export interface HistoryEntry {
  content: string;
  description: string;
  timestamp: number;
}

const MAX_HISTORY = 100;

export function useHistory(initialContent: string = '') {
  const historyRef = useRef<HistoryEntry[]>([
    { content: initialContent, description: '初始状态', timestamp: Date.now() },
  ]);
  const indexRef = useRef(0);
  const [, forceUpdate] = useState(0);

  const triggerUpdate = useCallback(() => {
    forceUpdate(n => n + 1);
  }, []);

  const currentIndex = indexRef.current;
  const history = historyRef.current;
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((content: string, description: string) => {
    const idx = indexRef.current;
    const entries = historyRef.current;
    const truncated = entries.slice(0, idx + 1);
    truncated.push({ content, description, timestamp: Date.now() });
    if (truncated.length > MAX_HISTORY) {
      truncated.splice(0, truncated.length - MAX_HISTORY);
    }
    historyRef.current = truncated;
    indexRef.current = truncated.length - 1;
    triggerUpdate();
  }, [triggerUpdate]);

  const undo = useCallback((): string | null => {
    const idx = indexRef.current;
    if (idx <= 0) return null;
    indexRef.current = idx - 1;
    triggerUpdate();
    return historyRef.current[idx - 1].content;
  }, [triggerUpdate]);

  const redo = useCallback((): string | null => {
    const idx = indexRef.current;
    const entries = historyRef.current;
    if (idx >= entries.length - 1) return null;
    indexRef.current = idx + 1;
    triggerUpdate();
    return historyRef.current[idx + 1].content;
  }, [triggerUpdate]);

  const jumpTo = useCallback((targetIndex: number): string | null => {
    const entries = historyRef.current;
    if (targetIndex < 0 || targetIndex >= entries.length) return null;
    indexRef.current = targetIndex;
    triggerUpdate();
    return entries[targetIndex].content;
  }, [triggerUpdate]);

  const clearHistory = useCallback(() => {
    historyRef.current = [
      { content: historyRef.current[indexRef.current]?.content ?? '', description: '保存后清空', timestamp: Date.now() },
    ];
    indexRef.current = 0;
    triggerUpdate();
  }, [triggerUpdate]);

  return {
    pushState,
    undo,
    redo,
    jumpTo,
    clearHistory,
    canUndo,
    canRedo,
    history: historyRef.current,
    currentIndex: indexRef.current,
  };
}
