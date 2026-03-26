/**
 * App.jsx — Root component
 * Sets up global error boundary, MUI ThemeProvider, Notifications, and Router.
 */
import { useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from './theme/theme';
import useUIStore from './store/useUIStore';
import NotificationProvider from './components/feedback/NotificationProvider';
import AppErrorBoundary from './components/errors/AppErrorBoundary';
import AppRouter from './routes/AppRouter';

export default function App() {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  return (
    <AppErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <NotificationProvider>
          <AppRouter />
        </NotificationProvider>
      </ThemeProvider>
    </AppErrorBoundary>
  );
}
