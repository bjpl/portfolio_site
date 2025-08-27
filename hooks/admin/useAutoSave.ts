import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface UseAutoSaveOptions {
  enabled?: boolean;
  interval?: number; // milliseconds
  onSave: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const useAutoSave = <T>(
  data: T,
  options: UseAutoSaveOptions
) => {
  const {
    enabled = true,
    interval = 30000, // 30 seconds default
    onSave,
    onError
  } = options;

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSavedString, setLastSavedString] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);
  const isSavingRef = useRef(false);

  // Update last saved string periodically
  useEffect(() => {
    if (lastSaved) {
      const updateString = () => {
        setLastSavedString(formatDistanceToNow(lastSaved, { addSuffix: true }));
      };

      updateString();
      const interval = setInterval(updateString, 10000); // Update every 10 seconds

      return () => clearInterval(interval);
    }
  }, [lastSaved]);

  // Detect changes in data
  useEffect(() => {
    const hasChanged = JSON.stringify(previousDataRef.current) !== JSON.stringify(data);
    if (hasChanged) {
      setIsDirty(true);
      previousDataRef.current = data;
    }
  }, [data]);

  // Auto-save logic
  useEffect(() => {
    if (!enabled || !isDirty || isSavingRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      if (!isDirty || isSavingRef.current) return;

      try {
        isSavingRef.current = true;
        setSaveStatus('saving');
        
        await onSave(data);
        
        setSaveStatus('saved');
        setLastSaved(new Date());
        setIsDirty(false);
        
      } catch (error) {
        setSaveStatus('error');
        if (onError) {
          onError(error as Error);
        }
        console.error('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, isDirty, interval, onSave, onError]);

  // Manual save function
  const manualSave = async () => {
    if (isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      setSaveStatus('saving');
      
      // Clear auto-save timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      await onSave(data);
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      setIsDirty(false);
      
      return true;
    } catch (error) {
      setSaveStatus('error');
      if (onError) {
        onError(error as Error);
      }
      console.error('Manual save failed:', error);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  };

  // Force save (bypass dirty check)
  const forceSave = async () => {
    if (isSavingRef.current) return;

    try {
      isSavingRef.current = true;
      setSaveStatus('saving');
      
      await onSave(data);
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      setIsDirty(false);
      
      return true;
    } catch (error) {
      setSaveStatus('error');
      if (onError) {
        onError(error as Error);
      }
      console.error('Force save failed:', error);
      return false;
    } finally {
      isSavingRef.current = false;
    }
  };

  // Cancel auto-save
  const cancelAutoSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setSaveStatus('idle');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSaved,
    lastSaved: lastSavedString,
    isDirty,
    isSaving: saveStatus === 'saving',
    manualSave,
    forceSave,
    cancelAutoSave,
  };
};

export default useAutoSave;