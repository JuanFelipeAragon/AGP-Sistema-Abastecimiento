import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import HomepageRoutes from './HomepageRoutes';

const PlatformRoutes = React.lazy(() => import('./PlatformRoutes'));

function LoadingScreen() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress size={48} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Cargando plataforma...
      </Typography>
    </Box>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Homepage — zero platform dependencies */}
        <Route path="/*" element={<HomepageRoutes />} />

        {/* Platform — lazy loaded, completely isolated */}
        <Route path="/platform/*" element={
          <Suspense fallback={<LoadingScreen />}>
            <PlatformRoutes />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
}
