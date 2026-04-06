import { useEffect, useRef, useState, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(
  saveFn: () => Promise<void>,
  data: string,
  intervalMs: number = 30000,
) {
  const [status, setStatus] = useState<SaveStatus>('idle');
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
      setStatus('saved');
    } catch {
      setStatus('error');
    }
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

  return { status, save };
}
