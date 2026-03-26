import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import PlatformLayout from '../components/layout/PlatformLayout';
import IsolatedModule from '../components/errors/IsolatedModule';
import DashboardPage from '../pages/dashboard/DashboardPage';
import SupplyModule from '../pages/supply/SupplyRoot';
import PlaceholderModule from '../pages/PlaceholderModule';
import NotFoundPage from '../pages/NotFoundPage';

// Lazy-loaded pages
const ProductosRoot = React.lazy(() => import('../pages/products/ProductosRoot'));
const TransitoPage = React.lazy(() => import('../pages/transit/TransitoPage'));

function PageFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <CircularProgress size={36} />
    </Box>
  );
}

export default function PlatformRoutes() {
  return (
    <PlatformLayout>
      <Routes>
        {/* Default redirect */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Dashboard */}
        <Route path="dashboard" element={
          <IsolatedModule name="Dashboard"><DashboardPage /></IsolatedModule>
        } />

        {/* Productos */}
        <Route path="productos/*" element={
          <IsolatedModule name="Productos">
            <Suspense fallback={<PageFallback />}>
              <ProductosRoot />
            </Suspense>
          </IsolatedModule>
        } />

        {/* Tránsito */}
        <Route path="transito/*" element={
          <IsolatedModule name="Tránsito">
            <Suspense fallback={<PageFallback />}>
              <TransitoPage />
            </Suspense>
          </IsolatedModule>
        } />

        {/* Supply / Abastecimiento — sub-routes for import and parameters */}
        <Route path="supply/*" element={
          <IsolatedModule name="Abastecimiento"><SupplyModule /></IsolatedModule>
        } />

        {/* Legacy abastecimiento route */}
        <Route path="abastecimiento/*" element={
          <IsolatedModule name="Abastecimiento"><SupplyModule /></IsolatedModule>
        } />

        {/* Placeholder modules — to be built */}
        <Route path="inventario/*" element={
          <IsolatedModule name="Inventario"><PlaceholderModule title="Inventario" subtitle="Control de stock y movimientos de bodega" /></IsolatedModule>
        } />
        <Route path="ventas/*" element={
          <IsolatedModule name="Ventas"><PlaceholderModule title="Ventas" subtitle="Registro y análisis de ventas" /></IsolatedModule>
        } />
        <Route path="compras/*" element={
          <IsolatedModule name="Compras"><PlaceholderModule title="Compras" subtitle="Gestión de órdenes de compra e importaciones" /></IsolatedModule>
        } />
        <Route path="logistica/*" element={
          <IsolatedModule name="Logística"><PlaceholderModule title="Logística" subtitle="Seguimiento de envíos y distribución" /></IsolatedModule>
        } />
        <Route path="usuarios/*" element={
          <IsolatedModule name="Usuarios"><PlaceholderModule title="Usuarios" subtitle="Gestión de usuarios y permisos" /></IsolatedModule>
        } />
        <Route path="configuracion/*" element={
          <IsolatedModule name="Configuración"><PlaceholderModule title="Configuración" subtitle="Ajustes generales del sistema" /></IsolatedModule>
        } />

        {/* 404 catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PlatformLayout>
  );
}
