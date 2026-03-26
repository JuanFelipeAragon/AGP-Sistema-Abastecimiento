import { Suspense } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import ModuleErrorBoundary from './ModuleErrorBoundary';

function ModuleLoader() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        Cargando módulo...
      </Typography>
    </Box>
  );
}

export default function IsolatedModule({ name, children }) {
  return (
    <ModuleErrorBoundary moduleName={name}>
      <Suspense fallback={<ModuleLoader />}>
        {children}
      </Suspense>
    </ModuleErrorBoundary>
  );
}
