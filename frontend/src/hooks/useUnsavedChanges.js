import { useEffect } from 'react';

export function useUnsavedChanges(isDirty, message = 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?') {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, message]);
}
