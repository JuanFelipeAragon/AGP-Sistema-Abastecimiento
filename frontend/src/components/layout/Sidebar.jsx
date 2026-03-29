import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Tooltip, Typography, Box, useMediaQuery, useTheme,
  Collapse, IconButton, alpha, Avatar, Dialog, InputBase,
} from '@mui/material';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import useUIStore from '../../store/useUIStore';
import { PALETTE } from '../../theme/theme';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import CategoryIcon from '@mui/icons-material/Category';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PaletteIcon from '@mui/icons-material/Palette';
import TuneIcon from '@mui/icons-material/Tune';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PublicIcon from '@mui/icons-material/Public';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export const SIDEBAR_WIDTH_EXPANDED = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

const SIDEBAR_BG = PALETTE.slate[900];
const ACCENT = PALETTE.red.main; // #EF4444

// ── Sidebar Panel Toggle Icon ──
function PanelToggleIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block' }}
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

// ── Navigation structure ──
const MODULE_GROUPS = [
  {
    id: 'general',
    label: 'General',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon fontSize="small" />, path: '/platform/dashboard' },
    ],
  },
  {
    id: 'operations',
    label: 'Operaciones',
    items: [
      {
        key: 'products',
        label: 'Productos',
        icon: <CategoryIcon fontSize="small" />,
        path: '/platform/productos',
        children: [
          { key: 'products-all', label: 'Ver Todos', icon: <ViewListIcon fontSize="small" />, path: '/platform/productos' },
          { key: 'products-base', label: 'Productos Base', icon: <Inventory2OutlinedIcon fontSize="small" />, path: '/platform/productos/base' },
          { key: 'products-variants', label: 'Variantes', icon: <AccountTreeIcon fontSize="small" />, path: '/platform/productos/variantes' },
          { key: 'products-warehouses', label: 'Productos-Bodegas', icon: <WarehouseIcon fontSize="small" />, path: '/platform/productos/bodegas' },
          { key: 'products-classifications', label: 'Clasificaciones', icon: <CategoryIcon fontSize="small" />, path: '/platform/productos/clasificaciones' },
          { key: 'products-finishes', label: 'Acabados', icon: <PaletteIcon fontSize="small" />, path: '/platform/productos/acabados' },
          { key: 'products-attributes', label: 'Atributos', icon: <TuneIcon fontSize="small" />, path: '/platform/productos/atributos' },
        ],
      },
      { key: 'inventory', label: 'Inventario', icon: <Inventory2Icon fontSize="small" />, path: '/platform/inventario' },
      { key: 'sales', label: 'Ventas', icon: <ShoppingCartIcon fontSize="small" />, path: '/platform/ventas' },
      { key: 'purchases', label: 'Compras', icon: <ReceiptIcon fontSize="small" />, path: '/platform/compras' },
    ],
  },
  {
    id: 'logistics',
    label: 'Logística',
    items: [
      { key: 'logistics', label: 'Logística', icon: <LocalShippingIcon fontSize="small" />, path: '/platform/logistica' },
      { key: 'supply', label: 'Abastecimiento', icon: <WarehouseIcon fontSize="small" />, path: '/platform/abastecimiento' },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    items: [
      { key: 'users', label: 'Usuarios', icon: <PeopleIcon fontSize="small" />, path: '/platform/usuarios' },
      {
        key: 'settings',
        label: 'Configuración',
        icon: <SettingsIcon fontSize="small" />,
        path: '/platform/configuracion',
        children: [
          { key: 'settings-warehouses', label: 'Bodegas', icon: <WarehouseIcon fontSize="small" />, path: '/platform/configuracion/bodegas' },
          { key: 'settings-countries', label: 'Paises', icon: <PublicIcon fontSize="small" />, path: '/platform/configuracion/paises' },
          { key: 'settings-files', label: 'Archivos', icon: <UploadFileIcon fontSize="small" />, path: '/platform/configuracion/archivos' },
        ],
      },
    ],
  },
];

// Build a flat list of all navigable items for the command palette
function buildSearchIndex() {
  const items = [];
  for (const group of MODULE_GROUPS) {
    for (const item of group.items) {
      items.push({ label: item.label, path: item.path, icon: item.icon, group: group.label });
      if (item.children) {
        for (const child of item.children) {
          items.push({ label: child.label, path: child.path, icon: child.icon, group: `${group.label} › ${item.label}` });
        }
      }
    }
  }
  return items;
}

const SEARCH_INDEX = buildSearchIndex();

// ── Command Palette ──
function CommandPalette({ open, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const theme = useTheme();

  const filtered = query.trim()
    ? SEARCH_INDEX.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.group.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_INDEX;

  // Reset selection when results change
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Reset on open/close
  useEffect(() => {
    if (!open) { setQuery(''); setSelectedIdx(0); }
  }, [open]);

  const handleSelect = (path) => {
    onNavigate(path);
    setQuery('');
    setSelectedIdx(0);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { setQuery(''); onClose(); return; }
    if (e.key === 'Enter' && filtered.length > 0) {
      handleSelect(filtered[selectedIdx]?.path || filtered[0].path);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev + 1) % filtered.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => (prev - 1 + filtered.length) % filtered.length);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => { setQuery(''); onClose(); }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: theme.palette.mode === 'dark' ? PALETTE.slate[800] : '#fff',
          backgroundImage: 'none',
          overflow: 'hidden',
          mt: -10,
        },
      }}
    >
      {/* Search input */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          py: 1.5,
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <SearchIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
        <InputBase
          autoFocus
          fullWidth
          placeholder="Buscar módulos, páginas..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ fontSize: '0.9375rem' }}
        />
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: 'text.disabled',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '4px',
            px: 0.75,
            py: 0.2,
            fontWeight: 600,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          ESC
        </Typography>
      </Box>

      {/* Results */}
      <Box sx={{ maxHeight: 360, overflowY: 'auto', py: 1 }}>
        {filtered.length === 0 ? (
          <Typography sx={{ px: 2.5, py: 3, color: 'text.disabled', textAlign: 'center', fontSize: '0.85rem' }}>
            No se encontraron resultados
          </Typography>
        ) : (
          filtered.map((item, idx) => (
            <Box
              key={item.path + item.label}
              onClick={() => handleSelect(item.path)}
              onMouseEnter={() => setSelectedIdx(idx)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2.5,
                py: 1,
                cursor: 'pointer',
                transition: 'background 100ms ease',
                bgcolor: idx === selectedIdx ? 'action.hover' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box sx={{ color: idx === selectedIdx ? 'text.primary' : 'text.secondary', display: 'flex', '& .MuiSvgIcon-root': { fontSize: '1.1rem' } }}>
                {item.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: idx === selectedIdx ? 600 : 500, color: 'text.primary' }}>
                  {item.label}
                </Typography>
                <Typography sx={{ fontSize: '0.675rem', color: 'text.disabled' }}>
                  {item.group}
                </Typography>
              </Box>
              {idx === selectedIdx && (
                <Typography sx={{ fontSize: '0.6rem', color: 'text.disabled', fontFamily: 'monospace', opacity: 0.6 }}>
                  ↵
                </Typography>
              )}
            </Box>
          ))
        )}
      </Box>
    </Dialog>
  );
}

// ── Section Header ──
function SectionHeader({ label, open, onToggle, collapsed }) {
  if (collapsed) return null;

  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2.5,
        pt: 1.5,
        pb: 0.5,
        cursor: 'pointer',
        userSelect: 'none',
        '&:hover .section-arrow': { color: alpha('#fff', 0.6) },
      }}
    >
      <Typography
        variant="overline"
        sx={{
          fontSize: '0.625rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: alpha('#fff', 0.4),
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      <ExpandMoreIcon
        className="section-arrow"
        sx={{
          fontSize: 16,
          color: alpha('#fff', 0.45),
          transition: 'transform 200ms ease, color 200ms ease',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        }}
      />
    </Box>
  );
}

// ── Nav Item (leaf — no children) ──
function NavItem({ item, active, collapsed, onClick, isChild }) {
  return (
    <Tooltip title={collapsed ? item.label : ''} placement="right" arrow enterDelay={200}>
      <ListItemButton
        selected={active}
        onClick={onClick}
        sx={{
          minHeight: isChild ? 34 : 38,
          px: collapsed ? 0 : 1.5,
          py: isChild ? 0.25 : 0.5,
          mx: 1,
          ml: isChild && !collapsed ? 2.5 : 1,
          mb: '2px',
          borderRadius: '8px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          position: 'relative',
          overflow: 'hidden',
          color: active ? '#fff' : alpha('#fff', 0.65),
          transition: 'all 150ms ease',

          // Red accent bar on left
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '18%',
            bottom: '18%',
            width: 3,
            borderRadius: '0 3px 3px 0',
            bgcolor: ACCENT,
            opacity: active ? 1 : 0,
            transition: 'opacity 200ms ease',
          },

          '&.Mui-selected': {
            bgcolor: alpha(ACCENT, 0.15),
            color: '#fff',
            '& .MuiListItemIcon-root': { color: '#fff' },
            '&:hover': { bgcolor: alpha(ACCENT, 0.2) },
          },

          '&:not(.Mui-selected):hover': {
            bgcolor: alpha('#fff', 0.05),
            color: alpha('#fff', 0.9),
            '& .MuiListItemIcon-root': { color: alpha('#fff', 0.8) },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: collapsed ? 0 : 28,
            justifyContent: 'center',
            color: active ? '#fff' : alpha('#fff', 0.5),
            transition: 'color 150ms ease',
            '& .MuiSvgIcon-root': { fontSize: isChild ? '1rem' : '1.2rem' },
          }}
        >
          {item.icon}
        </ListItemIcon>
        {!collapsed && (
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontSize: isChild ? '0.75rem' : '0.8125rem',
              fontWeight: active ? 600 : 400,
              noWrap: true,
            }}
          />
        )}
      </ListItemButton>
    </Tooltip>
  );
}

// ── Expandable Nav Item (parent with children) ──
function ExpandableNavItem({ item, collapsed, onNavigate, expandedItems, toggleExpand, isChildActive }) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems[item.key];
  // Parent is "contains active" — brighter text but NO red bg
  const containsActive = hasChildren && item.children.some((c) => isChildActive(c));

  const handleClick = () => {
    if (collapsed) {
      onNavigate(item.children[0].path);
      return;
    }
    toggleExpand(item.key);
  };

  return (
    <>
      <Tooltip title={collapsed ? item.label : ''} placement="right" arrow enterDelay={200}>
        <ListItemButton
          onClick={handleClick}
          sx={{
            minHeight: 38,
            px: collapsed ? 0 : 1.5,
            py: 0.5,
            mx: 1,
            mb: '2px',
            borderRadius: '8px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            position: 'relative',
            overflow: 'hidden',
            color: containsActive ? '#fff' : alpha('#fff', 0.65),
            transition: 'all 150ms ease',

            // Subtle red bottom border when parent contains active child
            '&::after': containsActive && !collapsed ? {
              content: '""',
              position: 'absolute',
              bottom: 2,
              left: '12%',
              right: '12%',
              height: 2,
              borderRadius: 1,
              bgcolor: alpha(ACCENT, 0.5),
            } : {},

            '&:hover': {
              bgcolor: alpha('#fff', 0.05),
              color: alpha('#fff', 0.9),
              '& .MuiListItemIcon-root': { color: alpha('#fff', 0.8) },
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: collapsed ? 0 : 28,
              justifyContent: 'center',
              color: containsActive ? '#fff' : alpha('#fff', 0.5),
              transition: 'color 150ms ease',
              '& .MuiSvgIcon-root': { fontSize: '1.2rem' },
            }}
          >
            {item.icon}
          </ListItemIcon>
          {!collapsed && (
            <>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.8125rem',
                  fontWeight: containsActive ? 600 : 400,
                  noWrap: true,
                }}
              />
              {hasChildren && (
                <ExpandMoreIcon
                  sx={{
                    fontSize: 16,
                    color: alpha('#fff', 0.5),
                    transition: 'transform 200ms ease, color 200ms ease',
                    transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    '&:hover': { color: alpha('#fff', 0.8) },
                  }}
                />
              )}
            </>
          )}
        </ListItemButton>
      </Tooltip>

      {/* Children sub-items */}
      {hasChildren && !collapsed && (
        <Collapse in={isExpanded} timeout={200}>
          <List disablePadding>
            {item.children.map((child) => (
              <NavItem
                key={child.key}
                item={child}
                active={isChildActive(child)}
                collapsed={false}
                isChild
                onClick={() => onNavigate(child.path)}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { permissions, role } = useAuthStore();
  const { sidebarOpen, closeSidebar, toggleSidebar } = useUIStore();

  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(MODULE_GROUPS.map((g) => [g.id, true]))
  );
  const [expandedItems, setExpandedItems] = useState({ products: true, settings: true });
  const [paletteOpen, setPaletteOpen] = useState(false);

  const collapsed = !sidebarOpen && !isMobile;
  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasAccess = useCallback((moduleKey) => {
    if (moduleKey === 'dashboard') return true;
    if (role === 'admin') return true;
    return permissions?.includes(moduleKey);
  }, [permissions, role]);

  // Check if a simple nav item (no query params) is active
  const isActive = useCallback(
    (path) => {
      // For items without query params, just check pathname
      if (!path.includes('?')) {
        return location.pathname.startsWith(path);
      }
      // For items with query params (sub-tabs), exact match
      const [basePath, qs] = path.split('?');
      if (!location.pathname.startsWith(basePath)) return false;
      const params = new URLSearchParams(qs);
      for (const [key, val] of params) {
        if (searchParams.get(key) !== val) return false;
      }
      return true;
    },
    [location.pathname, searchParams]
  );

  // Collect parent base paths so index children don't false-positive on prefix match
  const parentBasePaths = useMemo(() => {
    const paths = new Set();
    for (const group of MODULE_GROUPS) {
      for (const item of group.items) {
        if (item.children) paths.add(item.path);
      }
    }
    return paths;
  }, []);

  // Check if a child sub-item is active (exact pathname match)
  const isChildActive = useCallback(
    (child) => {
      if (location.pathname === child.path) return true;
      // For sub-routes, prefix match — but skip parent base paths (index routes)
      if (!parentBasePaths.has(child.path) && location.pathname.startsWith(child.path)) return true;
      return false;
    },
    [location.pathname, parentBasePaths]
  );

  const toggleSection = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpand = (key) => {
    setExpandedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNavigate = (path) => {
    // path may contain query params like "/platform/productos?tab=1"
    const [basePath, qs] = path.split('?');
    if (qs) {
      navigate(`${basePath}?${qs}`);
    } else {
      navigate(basePath);
    }
    if (isMobile) closeSidebar();
  };

  // Check if a simple (non-expandable) item is active — exclude parent paths that have children
  const isSimpleActive = useCallback(
    (item) => {
      // If this item's path is a parent path of items with children, don't mark as active
      // when we're on a child sub-tab
      return location.pathname.startsWith(item.path) && !item.children;
    },
    [location.pathname]
  );

  // ── Drawer Content ──
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: SIDEBAR_BG }}>

      {/* ── Brand Header ── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 2,
          pb: 1.5,
          px: 1,
        }}
      >
        <Box
          component="img"
          src="/logo-agp.png"
          alt="AGP — Aluminum Glass & Products"
          sx={{
            width: collapsed ? 38 : 50,
            height: collapsed ? 38 : 50,
            objectFit: 'contain',
            transition: 'all 200ms ease',
          }}
        />
        <Typography
          sx={{
            color: '#fff',
            fontWeight: 800,
            fontSize: collapsed ? '0.625rem' : '0.8rem',
            letterSpacing: '0.12em',
            lineHeight: 1,
            mt: 0.75,
            transition: 'font-size 200ms ease',
          }}
        >
          AGP
        </Typography>
        {!collapsed && (
          <Typography
            sx={{
              color: alpha('#fff', 0.4),
              fontSize: '0.6rem',
              fontWeight: 500,
              letterSpacing: '0.06em',
              lineHeight: 1.3,
              mt: 0.25,
              textAlign: 'center',
            }}
          >
            Aluminum Glass &amp; Products
          </Typography>
        )}

        {/* Panel toggle */}
        {!isMobile && (
          <Tooltip title={collapsed ? 'Expandir menú' : 'Colapsar menú'} placement="right" arrow>
            <IconButton
              onClick={toggleSidebar}
              size="small"
              sx={{
                mt: 1,
                width: 30,
                height: 30,
                borderRadius: '8px',
                color: alpha('#fff', 0.35),
                transition: 'all 150ms ease',
                '&:hover': {
                  bgcolor: alpha('#fff', 0.08),
                  color: alpha('#fff', 0.8),
                },
              }}
            >
              <PanelToggleIcon size={16} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* ═══ Divider ═══ */}
      <Box sx={{ mx: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }} />

      {/* ── Search Bar ── */}
      <Box sx={{ px: collapsed ? 1 : 1.5, py: 1 }}>
        {collapsed ? (
          <Tooltip title="Buscar (⌘K)" placement="right" arrow>
            <IconButton
              size="small"
              onClick={() => setPaletteOpen(true)}
              sx={{
                width: '100%',
                height: 34,
                borderRadius: '8px',
                color: alpha('#fff', 0.4),
                bgcolor: alpha('#fff', 0.04),
                border: `1px solid ${alpha('#fff', 0.06)}`,
                transition: 'all 150ms ease',
                '&:hover': {
                  bgcolor: alpha('#fff', 0.08),
                  color: alpha('#fff', 0.7),
                  borderColor: alpha('#fff', 0.12),
                },
              }}
            >
              <SearchIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        ) : (
          <Box
            onClick={() => setPaletteOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: alpha('#fff', 0.04),
              borderRadius: '8px',
              border: `1px solid ${alpha('#fff', 0.06)}`,
              px: 1.25,
              py: 0.6,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              '&:hover': {
                bgcolor: alpha('#fff', 0.07),
                borderColor: alpha('#fff', 0.12),
              },
            }}
          >
            <SearchIcon sx={{ fontSize: 16, color: alpha('#fff', 0.35), mr: 1 }} />
            <Typography
              sx={{
                flex: 1,
                fontSize: '0.75rem',
                color: alpha('#fff', 0.35),
                userSelect: 'none',
              }}
            >
              Buscar...
            </Typography>
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: alpha('#fff', 0.25),
                border: `1px solid ${alpha('#fff', 0.1)}`,
                borderRadius: '4px',
                px: 0.6,
                py: 0.15,
                fontWeight: 600,
                fontFamily: 'monospace',
                lineHeight: 1.4,
              }}
            >
              ⌘K
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Scrollable Navigation ── */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          py: 0.5,
          // Sleek thin scrollbar
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha('#fff', 0.1),
            borderRadius: 4,
            '&:hover': { bgcolor: alpha('#fff', 0.22) },
          },
          // Fade masks at top and bottom edges when scrolling
          maskImage: 'linear-gradient(to bottom, transparent 0px, black 8px, black calc(100% - 8px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0px, black 8px, black calc(100% - 8px), transparent 100%)',
          // Firefox scrollbar
          scrollbarWidth: 'thin',
          scrollbarColor: `${alpha('#fff', 0.1)} transparent`,
        }}
      >
        {MODULE_GROUPS.map((group, groupIndex) => {
          const visibleItems = group.items.filter((item) => hasAccess(item.key));
          if (visibleItems.length === 0) return null;

          return (
            <Box key={group.id}>
              <SectionHeader
                label={group.label}
                open={openSections[group.id]}
                onToggle={() => toggleSection(group.id)}
                collapsed={collapsed}
              />
              {collapsed ? (
                <List disablePadding>
                  {visibleItems.map((item) =>
                    item.children ? (
                      <ExpandableNavItem
                        key={item.key}
                        item={item}
                        collapsed
                        onNavigate={handleNavigate}
                        expandedItems={expandedItems}
                        toggleExpand={toggleExpand}
                        isChildActive={isChildActive}
                      />
                    ) : (
                      <NavItem
                        key={item.key}
                        item={item}
                        active={isSimpleActive(item)}
                        collapsed
                        onClick={() => handleNavigate(item.path)}
                      />
                    )
                  )}
                </List>
              ) : (
                <Collapse in={openSections[group.id]} timeout={200}>
                  <List disablePadding>
                    {visibleItems.map((item) =>
                      item.children ? (
                        <ExpandableNavItem
                          key={item.key}
                          item={item}
                          collapsed={false}
                          onNavigate={handleNavigate}
                          expandedItems={expandedItems}
                          toggleExpand={toggleExpand}
                          isChildActive={isChildActive}
                        />
                      ) : (
                        <NavItem
                          key={item.key}
                          item={item}
                          active={isSimpleActive(item)}
                          collapsed={false}
                          onClick={() => handleNavigate(item.path)}
                        />
                      )
                    )}
                  </List>
                </Collapse>
              )}

              {/* Divider between nav groups */}
              {groupIndex < MODULE_GROUPS.length - 1 && (
                <Box sx={{ mx: collapsed ? 1.5 : 2.5, my: collapsed ? 0.75 : 0.25, borderBottom: `1px solid ${alpha('#fff', 0.07)}` }} />
              )}
            </Box>
          );
        })}
      </Box>

      {/* ═══ Divider ═══ */}
      <Box sx={{ mx: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }} />

      {/* ── Footer: User ── */}
      <Box sx={{ px: collapsed ? 1 : 1.5, py: 1.25 }}>
        <Tooltip title={collapsed ? 'Juan Felipe Aragon' : ''} placement="right" arrow>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: collapsed ? 0 : 0.5,
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: PALETTE.blue[600],
                fontSize: '0.7rem',
                fontWeight: 700,
              }}
            >
              JF
            </Avatar>
            {!collapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Juan Felipe Aragon
                </Typography>
                <Typography
                  sx={{
                    color: alpha('#fff', 0.4),
                    fontSize: '0.675rem',
                    lineHeight: 1.3,
                  }}
                >
                  Jefe Abastecimiento
                </Typography>
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* ── Command Palette ── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </Box>
  );

  // ── Mobile: Temporary Drawer ──
  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={sidebarOpen}
        onClose={closeSidebar}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH_EXPANDED,
            bgcolor: SIDEBAR_BG,
            backgroundImage: 'none',
            border: 'none',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  // ── Desktop: Permanent Drawer ──
  return (
    <Drawer
      variant="permanent"
      PaperProps={{
        sx: {
          width,
          transition: theme.transitions.create('width', {
            duration: 250,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }),
          overflowX: 'hidden',
          border: 'none',
          bgcolor: SIDEBAR_BG,
          backgroundImage: 'none',
        },
      }}
      sx={{ width, flexShrink: 0 }}
    >
      {drawerContent}
    </Drawer>
  );
}
