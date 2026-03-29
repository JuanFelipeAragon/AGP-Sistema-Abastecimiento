/**
 * Ventas Module Root — Sub-routing for Ventas module.
 * Routes: /facturacion, /clientes, /vendedores, /geografia
 * Index route shows "Ver Todos" dashboard.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import VentasNav from './VentasNav';

const VerTodosView = lazy(() => import('./VerTodosView'));
const FacturacionTab = lazy(() => import('./FacturacionTab'));
const ClientesTab = lazy(() => import('./ClientesTab'));
const VendedoresTab = lazy(() => import('./VendedoresTab'));
const GeografiaTab = lazy(() => import('./GeografiaTab'));

function Fallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress size={36} />
    </Box>
  );
}

export default function VentasRoot() {
  return (
    <Box>
      <PageHeader
        title="Ventas"
        subtitle="Facturación, clientes, vendedores y geografía importados desde Siesa ERP"
      />
      <VentasNav />
      <Box sx={{ mt: 2 }}>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route index element={<VerTodosView />} />
            <Route path="facturacion" element={<FacturacionTab />} />
            <Route path="clientes" element={<ClientesTab />} />
            <Route path="vendedores" element={<VendedoresTab />} />
            <Route path="geografia" element={<GeografiaTab />} />
          </Routes>
        </Suspense>
      </Box>
    </Box>
  );
}
