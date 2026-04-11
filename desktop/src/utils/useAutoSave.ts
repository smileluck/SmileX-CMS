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
  const lastSavedDataRef = useRef(data);
  const currentDataRef = useRef(data);
  const isDirtyRef = useRef(false);
  const savingRef = useRef(false);

  const saveFnRef = useRef(saveFn);
  useEffect(() => { saveFnRef.current = saveFn; }, [saveFn]);

  useEffect(() => {
    currentDataRef.current = data;
    if (data !== lastSavedDataRef.current) {
      isDirtyRef.current = true;
    }
  }, [data]);

  const markSaved = useCallback(() => {
    lastSavedDataRef.current = currentDataRef.current;
    isDirtyRef.current = false;
    setLastSavedAt(new Date());
    setStatus('saved');
  }, []);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (!isDirtyRef.current || savingRef.current) return;
      savingRef.current = true;
      isDirtyRef.current = false;
      try {
        setStatus('saving');
        await saveFnRef.current();
        lastSavedDataRef.current = currentDataRef.current;
        setLastSavedAt(new Date());
        setStatus('saved');
      } catch {
        setStatus('error');
      } finally {
        savingRef.current = false;
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const lastSavedAtFormatted = lastSavedAt ? formatTime(lastSavedAt) : null;

  return { status, lastSavedAt, lastSavedAtFormatted, markSaved };
}
