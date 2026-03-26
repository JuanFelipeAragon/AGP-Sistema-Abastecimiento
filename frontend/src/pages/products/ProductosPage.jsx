/**
 * Productos Page — Main page with tabs: Catálogo SKUs, Clasificaciones, Acabados
 * Reads ?tab= from URL so the sidebar can link directly to sub-tabs.
 */
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CategoryIcon from '@mui/icons-material/Category';
import PaletteIcon from '@mui/icons-material/Palette';

import PageHeader from '../../components/common/PageHeader';
import SKUCatalogTab from './SKUCatalogTab';
import ClasificacionesTab from './ClasificacionesTab';
import AcabadosTab from './AcabadosTab';

function TabPanel({ children, value, index }) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 2 }}>
      {value === index && children}
    </Box>
  );
}

export default function ProductosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = Number(searchParams.get('tab') || 0);

  const handleTabChange = (_, v) => {
    setSearchParams({ tab: v }, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title="Productos"
        subtitle="Gestiona el catálogo de SKUs, clasificaciones y acabados"
      />

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              px: 2,
              '& .MuiTab-root': {
                minHeight: 56,
                gap: 1,
              },
            }}
          >
            <Tab icon={<Inventory2Icon />} iconPosition="start" label="Catálogo SKUs" />
            <Tab icon={<CategoryIcon />} iconPosition="start" label="Clasificaciones" />
            <Tab icon={<PaletteIcon />} iconPosition="start" label="Acabados" />
          </Tabs>
        </Box>

        <Box sx={{ p: 2 }}>
          <TabPanel value={activeTab} index={0}>
            <SKUCatalogTab />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            <ClasificacionesTab />
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            <AcabadosTab />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
