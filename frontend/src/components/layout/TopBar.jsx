/**
 * TopBar — Content-area header with breadcrumbs + actions.
 * Sits inside the main content area, NOT over the sidebar.
 */
import {
  Box, IconButton, Tooltip, Badge, Typography, Breadcrumbs,
  Link, useTheme, useMediaQuery, alpha,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useLocation, useNavigate } from 'react-router-dom';
import useUIStore from '../../store/useUIStore';

// Route → readable label map
const ROUTE_LABELS = {
  platform: null, // skip
  dashboard: 'Dashboard',
  productos: 'Productos',
  inventario: 'Inventario',
  ventas: 'Ventas',
  compras: 'Compras',
  logistica: 'Logística',
  abastecimiento: 'Abastecimiento',
  usuarios: 'Usuarios',
  configuracion: 'Configuración',
  supply: 'Abastecimiento',
  // Sub-routes
  decisiones: 'Decisiones de Compra',
  importar: 'Importar Datos',
  parametros: 'Parámetros',
  transito: 'Tránsito',
  catalogo: 'Catálogo',
  clasificaciones: 'Clasificaciones',
  acabados: 'Acabados',
};

function useBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const crumbs = [];
  let path = '';

  for (const seg of segments) {
    path += `/${seg}`;
    const label = ROUTE_LABELS[seg];
    if (label) {
      crumbs.push({ label, path });
    }
  }

  return crumbs;
}

export default function TopBar() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode, toggleSidebar } = useUIStore();

  const crumbs = useBreadcrumbs();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, md: 0 },
        py: 1.5,
        minHeight: 52,
        gap: 2,
      }}
    >
      {/* Left: Mobile menu + Breadcrumbs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
        {isMobile && (
          <IconButton onClick={toggleSidebar} size="small" sx={{ mr: 0.5 }}>
            <MenuIcon />
          </IconButton>
        )}

        <Breadcrumbs
          separator={<NavigateNextIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
          sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
        >
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return isLast ? (
              <Typography
                key={crumb.path}
                variant="body2"
                sx={{ fontWeight: 600, color: 'text.primary', whiteSpace: 'nowrap' }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                component="button"
                variant="body2"
                underline="hover"
                onClick={() => navigate(crumb.path)}
                sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <Tooltip title={darkMode ? 'Modo claro' : 'Modo oscuro'}>
          <IconButton onClick={toggleDarkMode} size="small">
            {darkMode
              ? <LightModeOutlinedIcon fontSize="small" />
              : <DarkModeOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Notificaciones">
          <IconButton size="small">
            <Badge badgeContent={3} color="error" variant="dot">
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
