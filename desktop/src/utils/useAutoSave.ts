import { useEffect, useRef, useState, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveOptions {
  debounceMs?: number;
  maxIntervalMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function useAutoSave(
  saveFn: () => Promise<void>,
  options?: UseAutoSaveOptions,
) {
  const {
    debounceMs = 5000,
    maxIntervalMs = 30000,
    maxRetries = 2,
    retryBackoffMs = 2000,
  } = options || {};

  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDirtyRef = useRef(false);
  const savingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxIntervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);

  useEffect(() => { saveFnRef.current = saveFn; }, [saveFn]);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const performSaveRef = useRef<() => Promise<void>>(null as any);

  const scheduleMaxInterval = useCallback(() => {
    if (maxIntervalTimerRef.current !== null) {
      clearInterval(maxIntervalTimerRef.current);
    }
    maxIntervalTimerRef.current = setInterval(() => {
      if (isDirtyRef.current && !savingRef.current) {
        clearDebounce();
        performSaveRef.current?.();
      }
    }, maxIntervalMs);
  }, [maxIntervalMs, clearDebounce]);

  const performSave = useCallback(async () => {
    if (savingRef.current) return;
    if (!isDirtyRef.current) return;
    savingRef.current = true;
    setStatus('saving');
    try {
      await saveFnRef.current();
      isDirtyRef.current = false;
      retryCountRef.current = 0;
      setLastSavedAt(new Date());
      setErrorMessage(null);
      setStatus('saved');
      scheduleMaxInterval();
    } catch (err: any) {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const delay = retryBackoffMs * Math.pow(2, retryCountRef.current - 1);
        setStatus('error');
        setErrorMessage(`保存失败，正在重试 (${retryCountRef.current}/${maxRetries})...`);
        retryTimerRef.current = setTimeout(() => performSave(), delay);
      } else {
        setStatus('error');
        setErrorMessage(err?.message || '自动保存失败');
      }
    } finally {
      savingRef.current = false;
    }
  }, [maxRetries, retryBackoffMs, scheduleMaxInterval]);

  performSaveRef.current = performSave;

  const notifyChange = useCallback(() => {
    isDirtyRef.current = true;
    clearRetry();
    retryCountRef.current = 0;
    clearDebounce();
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      performSave();
    }, debounceMs);
  }, [debounceMs, clearDebounce, clearRetry, performSave]);

  const flush = useCallback(async () => {
    clearDebounce();
    clearRetry();
    retryCountRef.current = 0;
    if (!isDirtyRef.current) return;
    await performSave();
  }, [clearDebounce, clearRetry, performSave]);

  const markSaved = useCallback(() => {
    isDirtyRef.current = false;
    clearDebounce();
    clearRetry();
    retryCountRef.current = 0;
    setLastSavedAt(new Date());
    setErrorMessage(null);
    setStatus('saved');
    scheduleMaxInterval();
  }, [clearDebounce, clearRetry, scheduleMaxInterval]);

  useEffect(() => {
    scheduleMaxInterval();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (maxIntervalTimerRef.current) clearInterval(maxIntervalTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [scheduleMaxInterval]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || savingRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const lastSavedAtFormatted = lastSavedAt ? formatTime(lastSavedAt) : null;

  return { status, lastSavedAt, lastSavedAtFormatted, errorMessage, markSaved, notifyChange, flush };
}
