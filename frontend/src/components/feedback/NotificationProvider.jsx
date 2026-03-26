import { createContext, useState, useCallback, useMemo } from 'react';
import { Snackbar, Alert, Slide, Button } from '@mui/material';

export const NotificationContext = createContext(null);

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

export default function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success',
    action: null,
  });

  const notify = useMemo(() => ({
    success: (message, action) => setNotification({ open: true, message, severity: 'success', action }),
    error: (message, action) => setNotification({ open: true, message, severity: 'error', action }),
    warning: (message, action) => setNotification({ open: true, message, severity: 'warning', action }),
    info: (message, action) => setNotification({ open: true, message, severity: 'info', action }),
  }), []);

  const handleClose = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    setNotification((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.severity === 'error' ? 6000 : 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        TransitionComponent={SlideTransition}
      >
        <Alert
          onClose={handleClose}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
          action={notification.action && (
            <Button color="inherit" size="small" onClick={notification.action.onClick}>
              {notification.action.label}
            </Button>
          )}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}
