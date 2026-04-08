import { useEffect, useRef, useState, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function useAutoSave(
  saveFn: () => Promise<void>,
  data: string,
  intervalMs: number = 30000,
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const lastSavedRef = useRef(data);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveFnRef = useRef(saveFn);

  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const save = useCallback(async () => {
    if (data === lastSavedRef.current) return;
    try {
      setStatus('saving');
      await saveFnRef.current();
      lastSavedRef.current = data;
      setLastSavedAt(new Date());
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [data]);

  const markSaved = useCallback(() => {
    lastSavedRef.current = data;
    setLastSavedAt(new Date());
    setStatus('saved');
  }, [data]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (data !== lastSavedRef.current) {
        save();
      }
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [data, intervalMs, save]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (data !== lastSavedRef.current) {
        save();
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data, save]);

  const lastSavedAtFormatted = lastSavedAt ? formatTime(lastSavedAt) : null;

  return { status, save, lastSavedAt, lastSavedAtFormatted, markSaved };
}
