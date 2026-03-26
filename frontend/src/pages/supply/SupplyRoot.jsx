/**
 * Supply Module Root — Sub-routing for the Abastecimiento module.
 * Each sub-page is lazy-loaded and wrapped in its own error boundary,
 * so a crash in SupplyImport doesn't take down SupplyDashboard.
 */
import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import IsolatedModule from '../../components/errors/IsolatedModule';

const SupplyDashboard = lazy(() => import('./SupplyDashboard'));
const SupplyDecisions = lazy(() => import('./SupplyDecisions'));
const SupplyParameters = lazy(() => import('./SupplyParameters'));
const SupplyImport = lazy(() => import('./SupplyImport'));

export default function SupplyRoot() {
  return (
    <Routes>
      <Route index element={
        <IsolatedModule name="Supply Dashboard">
          <SupplyDashboard />
        </IsolatedModule>
      } />
      <Route path="decisiones" element={
        <IsolatedModule name="Decisiones de Compra">
          <SupplyDecisions />
        </IsolatedModule>
      } />
      <Route path="parametros" element={
        <IsolatedModule name="Parámetros">
          <SupplyParameters />
        </IsolatedModule>
      } />
      <Route path="importar" element={
        <IsolatedModule name="Importar Datos">
          <SupplyImport />
        </IsolatedModule>
      } />
    </Routes>
  );
}
