/**
 * Products Sub-Navigation — Horizontal chip bar for submodule navigation.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Chip, useTheme, useMediaQuery } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import CategoryIcon from '@mui/icons-material/Category';
import PaletteIcon from '@mui/icons-material/Palette';

const NAV_ITEMS = [
  { label: 'Ver Todos', path: '', Icon: DashboardIcon },
  { label: 'Productos Base', path: 'base', Icon: Inventory2Icon },
  { label: 'Variantes', path: 'variantes', Icon: AccountTreeIcon },
  { label: 'Productos-Bodegas', path: 'bodegas', Icon: WarehouseIcon },
  { label: 'Clasificaciones', path: 'clasificaciones', Icon: CategoryIcon },
  { label: 'Acabados', path: 'acabados', Icon: PaletteIcon },
];

const BASE = '/platform/productos';

export default function ProductosNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  // Determine active item from pathname
  const currentPath = location.pathname.replace(BASE, '').replace(/^\//, '');

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        pb: 1,
        borderBottom: 1,
        borderColor: 'divider',
        overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = currentPath === item.path;
        const { Icon } = item;
        return (
          <Chip
            key={item.path}
            icon={!isSmall ? <Icon sx={{ fontSize: 18 }} /> : undefined}
            label={item.label}
            onClick={() => navigate(item.path ? `${BASE}/${item.path}` : BASE)}
            variant={isActive ? 'filled' : 'outlined'}
            color={isActive ? 'primary' : 'default'}
            sx={{
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: isActive ? undefined : 'action.hover',
              },
            }}
          />
        );
      })}
    </Box>
  );
}
