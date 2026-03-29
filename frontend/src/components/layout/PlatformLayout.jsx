/**
 * PlatformLayout — Main app shell.
 * Sidebar (full height) + Content area with TopBar.
 * Includes scroll-to-top on route change and page fade-in transitions.
 */
import { useEffect, useRef } from 'react';
import { Box, Fade, useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

function ScrollToTop() {
  const { pathname } = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
}

export default function PlatformLayout({ children }) {
  const theme = useTheme();
  const { pathname } = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <ScrollToTop />

      {/* Sidebar — full viewport height, independent */}
      <Sidebar />

      {/* Content area — fills remaining space next to the permanent Drawer */}
      <Box
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          minHeight: '100vh',
          transition: theme.transitions.create(['margin', 'width'], {
            duration: 250,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }),
        }}
      >
        {/* TopBar — breadcrumbs + actions */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar - 1,
            bgcolor: 'background.default',
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 0, md: 3, lg: 4 },
          }}
        >
          <TopBar />
        </Box>

        {/* Page content — fluid width, fade-in on route change */}
        <Fade in key={pathname} timeout={250}>
          <Box
            sx={{
              flex: 1,
              px: { xs: 2, sm: 3, md: 3, lg: 4, xl: 5 },
              py: 3,
              width: '100%',
            }}
          >
            {children}
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
