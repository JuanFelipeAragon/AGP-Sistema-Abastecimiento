/**
 * Ventas Sub-Navigation — Horizontal chip bar for submodule navigation.
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Chip, useTheme, useMediaQuery } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PeopleIcon from '@mui/icons-material/People';
import BadgeIcon from '@mui/icons-material/Badge';
import PublicIcon from '@mui/icons-material/Public';

const NAV_ITEMS = [
  { label: 'Ver Todos', path: '', Icon: DashboardIcon },
  { label: 'Facturación', path: 'facturacion', Icon: ReceiptLongIcon },
  { label: 'Clientes', path: 'clientes', Icon: PeopleIcon },
  { label: 'Vendedores', path: 'vendedores', Icon: BadgeIcon },
  { label: 'Geografía', path: 'geografia', Icon: PublicIcon },
];

const BASE = '/platform/ventas';

export default function VentasNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

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
