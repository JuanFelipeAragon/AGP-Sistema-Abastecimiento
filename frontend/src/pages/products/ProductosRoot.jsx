/**
 * Products Module Root — Sub-routing for Productos module.
 * Routes: /base, /variantes, /bodegas, /clasificaciones, /acabados
 * Index route shows "Ver Todos" dashboard.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import ProductosNav from './ProductosNav';

const VerTodosView = lazy(() => import('./VerTodosView'));
const ProductosBaseTab = lazy(() => import('./ProductosBaseTab'));
const VariantesTab = lazy(() => import('./VariantesTab'));
const ProductosBodegasTab = lazy(() => import('./ProductosBodegasTab'));
const ClasificacionesTab = lazy(() => import('./ClasificacionesTab'));
const AcabadosTab = lazy(() => import('./AcabadosTab'));

function Fallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={36} />
    </Box>
  );
}

export default function ProductosRoot() {
  return (
    <Box>
      <PageHeader
        title="Productos"
        subtitle="Gestiona productos, variantes, clasificaciones y datos por bodega"
      />
      <ProductosNav />
      <Box sx={{ mt: 2 }}>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route index element={<VerTodosView />} />
            <Route path="base" element={<ProductosBaseTab />} />
            <Route path="variantes" element={<VariantesTab />} />
            <Route path="bodegas" element={<ProductosBodegasTab />} />
            <Route path="clasificaciones" element={<ClasificacionesTab />} />
            <Route path="acabados" element={<AcabadosTab />} />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
}
