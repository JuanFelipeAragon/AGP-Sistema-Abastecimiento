import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts(shortcuts) {
  const handler = useCallback(
    (e) => {
      const tag = e.target.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        if (e.key === shortcut.key && ctrlMatch) {
          if (isEditable && !shortcut.ctrl && shortcut.key !== 'Escape') continue;
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}
