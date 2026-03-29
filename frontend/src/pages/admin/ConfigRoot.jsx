/**
 * Configuration Module Root — Sub-routing for admin configuration pages.
 */
import { Routes, Route } from 'react-router-dom';
import BodegasView from './BodegasView';
import PaisesView from './PaisesView';
import ArchivosView from './ArchivosView';

export default function ConfigRoot() {
  return (
    <Routes>
      <Route index element={<BodegasView />} />
      <Route path="bodegas" element={<BodegasView />} />
      <Route path="paises" element={<PaisesView />} />
      <Route path="archivos" element={<ArchivosView />} />
    </Routes>
  );
}
