/**
 * Paises (Countries) CRUD — Manage countries for multi-country operations.
 * Features: Animated KPI strip, integrated command bar, filter chips,
 * auto-height DataGrid, create/edit dialog, flag emoji, mobile cards,
 * skeleton loading, CSV export, transitions.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Chip, InputAdornment, Typography,
  IconButton, Tooltip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Paper, Divider, Alert, Card, CardContent,
  CardActionArea, Checkbox, useMediaQuery, useTheme,
  MenuItem, Select, FormControl, InputLabel,
  Fade, Collapse, Slide, Skeleton, LinearProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import PublicIcon from '@mui/icons-material/Public';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import RefreshIcon from '@mui/icons-material/Refresh';
import FlagIcon from '@mui/icons-material/Flag';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import LanguageIcon from '@mui/icons-material/Language';
import countriesApi from '../../api/countries.api';

const TRANSITION_DURATION = 250;

const CURRENCY_OPTIONS = [
  { value: 'COP', label: 'COP - Peso Colombiano' },
  { value: 'USD', label: 'USD - Dolar Estadounidense' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'MXN', label: 'MXN - Peso Mexicano' },
  { value: 'PEN', label: 'PEN - Sol Peruano' },
  { value: 'CLP', label: 'CLP - Peso Chileno' },
  { value: 'BRL', label: 'BRL - Real Brasileno' },
  { value: 'PAB', label: 'PAB - Balboa Panameno' },
  { value: 'GTQ', label: 'GTQ - Quetzal' },
  { value: 'CRC', label: 'CRC - Colon Costarricense' },
];

const FLAG_SUGGESTIONS = [
  { code: 'CO', emoji: '\u{1F1E8}\u{1F1F4}', name: 'Colombia' },
  { code: 'EC', emoji: '\u{1F1EA}\u{1F1E8}', name: 'Ecuador' },
  { code: 'PA', emoji: '\u{1F1F5}\u{1F1E6}', name: 'Panama' },
  { code: 'PE', emoji: '\u{1F1F5}\u{1F1EA}', name: 'Peru' },
  { code: 'US', emoji: '\u{1F1FA}\u{1F1F8}', name: 'Estados Unidos' },
  { code: 'MX', emoji: '\u{1F1F2}\u{1F1FD}', name: 'Mexico' },
  { code: 'CL', emoji: '\u{1F1E8}\u{1F1F1}', name: 'Chile' },
  { code: 'CR', emoji: '\u{1F1E8}\u{1F1F7}', name: 'Costa Rica' },
  { code: 'GT', emoji: '\u{1F1EC}\u{1F1F9}', name: 'Guatemala' },
  { code: 'BR', emoji: '\u{1F1E7}\u{1F1F7}', name: 'Brasil' },
  { code: 'DO', emoji: '\u{1F1E9}\u{1F1F4}', name: 'Rep. Dominicana' },
  { code: 'HN', emoji: '\u{1F1ED}\u{1F1F3}', name: 'Honduras' },
  { code: 'SV', emoji: '\u{1F1F8}\u{1F1FB}', name: 'El Salvador' },
];

// ── Shared Components ──
function TbIcon({ title, disabled, onClick, color, children }) {
  return (
    <Tooltip title={title} arrow>
      <span>
        <IconButton size="small" disabled={disabled} onClick={onClick} color={color}
          sx={{ opacity: disabled ? 0.28 : 1, transition: 'all 0.2s ease' }}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

/** Clickable filter chip — toggles on/off with color feedback */
function FilterChip({ label, active, onClick, activeColor, activeTextColor, icon, size = 'small' }) {
  return (
    <Chip
      label={label}
      icon={icon}
      size={size}
      onClick={onClick}
      variant={active ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 28,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        bgcolor: active ? (activeColor || 'primary.main') : 'transparent',
        color: active ? (activeTextColor || '#fff') : 'text.secondary',
        borderColor: active ? 'transparent' : 'divider',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 1,
          bgcolor: active ? (activeColor || 'primary.main') : 'action.hover',
        },
      }}
    />
  );
}

function KpiCard({ value, label, color, bgColor, icon, delay = 0, loading }) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={32} height={32} />
          <Box>
            <Skeleton width={30} height={28} />
            <Skeleton width={70} height={14} />
          </Box>
        </Stack>
      </Paper>
    );
  }
  return (
    <Fade in timeout={TRANSITION_DURATION + delay}>
      <Paper variant="outlined" sx={{
        px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1,
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderLeft: `3px solid ${color || '#94A3B8'}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: bgColor || '#F1F5F9',
          color: color || '#64748B',
          flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color={color || 'text.primary'} sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </Typography>
        </Box>
      </Paper>
    </Fade>
  );
}

// ══════════════════════════════════════════════════════════════
// Skeleton Loading Table
// ══════════════════════════════════════════════════════════════
function TableSkeleton() {
  return (
    <Box>
      {[...Array(6)].map((_, i) => (
        <Fade in timeout={200 + i * 80} key={i}>
          <Box sx={{ display: 'flex', gap: 2, py: 1, px: 1 }}>
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 0.5 }} />
            <Skeleton width={40} height={24} />
            <Skeleton width={60} height={24} />
            <Skeleton width={180} height={24} />
            <Skeleton width={80} height={24} />
            <Skeleton width={70} height={24} />
            <Skeleton width={70} height={24} />
            <Skeleton width={80} height={24} />
          </Box>
        </Fade>
      ))}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// CSV Export
// ══════════════════════════════════════════════════════════════
function downloadCSV(items, filename) {
  if (!items?.length) return;
  const headers = [
    'ID', 'Codigo', 'Nombre', 'Moneda', 'Prefijo Tel.', 'Bandera',
    'Bodegas', 'Productos', 'Orden', 'Activo',
  ];
  const csvRows = [headers.join(',')];
  for (const r of items) {
    csvRows.push([
      r.id, r.code || '', `"${(r.name || '').replace(/"/g, '""')}"`,
      r.currency || '', r.phonePrefix || '', r.flagEmoji || '',
      r.warehouseCount || 0, r.productCount || 0,
      r.displayOrder || 0, r.isActive ? 'Si' : 'No',
    ].join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// Mobile Card
// ══════════════════════════════════════════════════════════════
function CountryCard({ item, selected, onToggle, onEdit, index }) {
  return (
    <Fade in timeout={TRANSITION_DURATION + index * 50}>
      <Card variant="outlined" sx={{
        mb: 1, borderRadius: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        opacity: item.isActive ? 1 : 0.6,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 },
      }}>
        <CardActionArea onClick={onEdit} sx={{ p: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Checkbox size="small" checked={selected} onClick={(e) => { e.stopPropagation(); onToggle(); }} sx={{ p: 0, mt: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                  <Typography fontSize={20}>{item.flagEmoji || '\u{1F3F3}\u{FE0F}'}</Typography>
                  <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>{item.name}</Typography>
                  <Chip label={item.code} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace' }} />
                </Stack>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                  <Chip icon={<AttachMoneyIcon sx={{ fontSize: 12 }} />} label={item.currency} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#E8F5E9', color: '#2E7D32' }} />
                  <Chip label={`${item.warehouseCount || 0} bodegas`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                  <Chip label={`${item.productCount || 0} prod.`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                  <Chip label={item.isActive ? 'Activo' : 'Inactivo'} size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: item.isActive ? '#E8F5E9' : '#FFEBEE', color: item.isActive ? '#2E7D32' : '#C62828' }} />
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </Fade>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function PaisesView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Data state
  const [countries, setCountries] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  // Filters
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Form state
  const [form, setForm] = useState({
    code: '', name: '', currency: 'USD', phonePrefix: '', flagEmoji: '', displayOrder: 0,
  });

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelected([]);
    try {
      const res = await countriesApi.getCountries(true);
      setCountries(res.items || []);
      setStats(res.stats || {});
    } catch (err) {
      setError('Error al cargar paises');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtering ──
  const filtered = useMemo(() => {
    let result = countries;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s) || (c.currency || '').toLowerCase().includes(s)
      );
    }
    if (filterCurrency) {
      result = result.filter((c) => c.currency === filterCurrency);
    }
    if (filterActive === 'true') {
      result = result.filter((c) => c.isActive);
    } else if (filterActive === 'false') {
      result = result.filter((c) => !c.isActive);
    }
    return result;
  }, [countries, search, filterCurrency, filterActive]);

  // Derive unique currencies from data for filter chips
  const uniqueCurrencies = useMemo(() => {
    const set = new Set(countries.map((c) => c.currency).filter(Boolean));
    return [...set].sort();
  }, [countries]);

  // ── Dialog ──
  const openCreate = () => {
    setEditItem(null);
    setForm({ code: '', name: '', currency: 'USD', phonePrefix: '', flagEmoji: '', displayOrder: countries.length + 1 });
    setDialogOpen(true);
    setSaveSuccess(false);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      code: item.code,
      name: item.name,
      currency: item.currency || 'USD',
      phonePrefix: item.phonePrefix || '',
      flagEmoji: item.flagEmoji || '',
      displayOrder: item.displayOrder || 0,
    });
    setDialogOpen(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editItem) {
        await countriesApi.updateCountry(editItem.id, {
          name: form.name,
          currency: form.currency,
          phonePrefix: form.phonePrefix || null,
          flagEmoji: form.flagEmoji || null,
          displayOrder: form.displayOrder,
        });
      } else {
        await countriesApi.createCountry({
          code: form.code.toUpperCase(),
          name: form.name,
          currency: form.currency,
          phonePrefix: form.phonePrefix || null,
          flagEmoji: form.flagEmoji || null,
          displayOrder: form.displayOrder,
        });
      }
      setSaveSuccess(true);
      setTimeout(() => { setDialogOpen(false); fetchData(); }, 600);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await countriesApi.updateCountry(item.id, { isActive: !item.isActive });
      fetchData();
    } catch (err) {
      setError('Error al cambiar estado');
    }
  };

  // Auto-fill flag when code matches
  const handleCodeChange = (val) => {
    const upper = val.toUpperCase().slice(0, 3);
    setForm((f) => {
      const suggestion = FLAG_SUGGESTIONS.find((s) => s.code === upper);
      return {
        ...f,
        code: upper,
        flagEmoji: suggestion ? suggestion.emoji : f.flagEmoji,
        name: suggestion && !f.name ? suggestion.name : f.name,
      };
    });
  };

  // ── Helpers ──
  const getSelectedItems = useCallback(() => countries.filter((r) => selected.includes(r.id)), [countries, selected]);
  const hasSel = selected.length > 0;
  const hasActiveSelected = useMemo(() => countries.some((r) => selected.includes(r.id) && r.isActive), [countries, selected]);
  const hasInactiveSelected = useMemo(() => countries.some((r) => selected.includes(r.id) && !r.isActive), [countries, selected]);
  const activeFilters = [filterCurrency, filterActive].filter(Boolean).length;

  const handleExport = (items) => {
    downloadCSV(items, `paises_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleBulkToggle = async (activate) => {
    const items = getSelectedItems();
    try {
      for (const item of items) {
        if (activate && !item.isActive) {
          await countriesApi.updateCountry(item.id, { isActive: true });
        } else if (!activate && item.isActive) {
          await countriesApi.updateCountry(item.id, { isActive: false });
        }
      }
      fetchData();
    } catch (err) {
      setError('Error al cambiar estado');
    }
  };

  // ── Columns ──
  const columns = useMemo(() => [
    {
      field: 'flag',
      headerName: '',
      flex: 0.4,
      minWidth: 50,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography fontSize={22}>{row.flagEmoji || '\u{1F3F3}\u{FE0F}'}</Typography>
        </Box>
      ),
    },
    {
      field: 'code',
      headerName: 'Codigo',
      flex: 0.6,
      minWidth: 70,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Chip label={row.code} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
      ),
    },
    {
      field: 'name',
      headerName: 'Nombre',
      flex: 1.5,
      minWidth: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (p) => <Typography variant="body2" fontWeight={600}>{p.value}</Typography>,
    },
    {
      field: 'currency',
      headerName: 'Moneda',
      flex: 0.7,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Chip
          icon={<AttachMoneyIcon sx={{ fontSize: 14 }} />}
          label={row.currency}
          size="small"
          sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600, fontFamily: 'monospace' }}
        />
      ),
    },
    {
      field: 'warehouseCount',
      headerName: 'Bodegas',
      flex: 0.6,
      minWidth: 75,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Chip
          icon={<WarehouseIcon sx={{ fontSize: 14 }} />}
          label={row.warehouseCount}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: 'productCount',
      headerName: 'Productos',
      flex: 0.7,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Chip
          icon={<InventoryIcon sx={{ fontSize: 14 }} />}
          label={row.productCount}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    {
      field: 'isActive',
      headerName: 'Estado',
      flex: 0.7,
      minWidth: 80,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Chip
          label={row.isActive ? 'Activo' : 'Inactivo'}
          size="small"
          sx={{
            bgcolor: row.isActive ? '#E8F5E9' : '#FFEBEE',
            color: row.isActive ? '#2E7D32' : '#C62828',
            fontWeight: 600,
            fontSize: '0.7rem',
          }}
        />
      ),
    },
  ], []);

  // ══════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════
  return (
    <Box>
      {/* ── KPI Strip with staggered fade ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <KpiCard value={stats.total || 0} label="Total Paises" loading={loading} delay={0}
          color="#334155" bgColor="#F1F5F9" icon={<PublicIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.active || 0} label="Activos" loading={loading} delay={50}
          color="#2E7D32" bgColor="#E8F5E9" icon={<CheckCircleOutlineIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.totalWarehouses || 0} label="Bodegas" loading={loading} delay={100}
          color="#E65100" bgColor="#FFF3E0" icon={<WarehouseIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.totalProducts || 0} label="Productos Asignados" loading={loading} delay={150}
          color="#7B1FA2" bgColor="#F3E5F5" icon={<InventoryIcon sx={{ fontSize: 20 }} />} />
      </Stack>

      {/* ── Error ── */}
      <Collapse in={!!error}>
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
      </Collapse>

      {/* ══════════════════════════════════════════════════════════
          Command Bar — Integrated search, filters, actions
         ══════════════════════════════════════════════════════════ */}
      <Fade in timeout={TRANSITION_DURATION}>
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          {/* Row 1: Search + Result count + Actions */}
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <TextField placeholder="Buscar pais..." value={search} onChange={(e) => setSearch(e.target.value)} size="small"
              sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { height: 36 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

            {/* Result count */}
            <Fade in={!loading}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {filtered.length}{stats.total ? ` de ${stats.total}` : ''} {isMobile ? '' : 'pais(es)'}
              </Typography>
            </Fade>

            <Box sx={{ flexGrow: 1 }} />

            {/* Selection indicator */}
            {hasSel && (
              <Fade in>
                <Chip label={`${selected.length} sel.`} size="small" color="primary"
                  onDelete={() => setSelected([])} sx={{ fontWeight: 600, mr: 0.5 }} />
              </Fade>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            {/* Selection actions */}
            <TbIcon title="Editar" disabled={selected.length !== 1} onClick={() => { const items = getSelectedItems(); if (items.length === 1) openEdit(items[0]); }}>
              <EditIcon fontSize="small" />
            </TbIcon>
            {hasActiveSelected && (
              <TbIcon title="Inactivar" disabled={!hasSel} onClick={() => handleBulkToggle(false)}>
                <BlockIcon fontSize="small" />
              </TbIcon>
            )}
            {hasInactiveSelected && (
              <TbIcon title="Activar" disabled={!hasSel} onClick={() => handleBulkToggle(true)}>
                <CheckCircleOutlineIcon fontSize="small" />
              </TbIcon>
            )}
            <TbIcon title="Exportar seleccion" disabled={!hasSel} onClick={() => handleExport(getSelectedItems())}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </TbIcon>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            {/* Global actions */}
            <TbIcon title="Refrescar datos" onClick={fetchData}>
              <RefreshIcon fontSize="small" sx={{ transition: 'transform 0.3s', ...(loading && { animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }) }} />
            </TbIcon>
            <TbIcon title="Exportar todo" onClick={() => handleExport(filtered)}>
              <SaveAltIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Crear pais" color="primary" onClick={openCreate}>
              <AddCircleOutlineIcon fontSize="small" />
            </TbIcon>
          </Box>

          {/* Divider between rows */}
          <Divider />

          {/* Row 2: Always-visible filters */}
          <Box sx={{
            px: 1.5, py: 0.75,
            display: 'flex', alignItems: 'center', gap: 0.75,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 0 },
            scrollbarWidth: 'none',
          }}>
            {/* Currency filters */}
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Moneda:
            </Typography>
            {uniqueCurrencies.map((curr) => (
              <FilterChip
                key={curr}
                label={curr}
                icon={<AttachMoneyIcon sx={{ fontSize: 14 }} />}
                active={filterCurrency === curr}
                activeColor="#E8F5E9"
                activeTextColor="#2E7D32"
                onClick={() => setFilterCurrency(filterCurrency === curr ? '' : curr)}
              />
            ))}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Active filter */}
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Estado:
            </Typography>
            <FilterChip label="Activo" active={filterActive === 'true'} activeColor="#E8F5E9" activeTextColor="#2E7D32"
              onClick={() => setFilterActive(filterActive === 'true' ? '' : 'true')} />
            <FilterChip label="Inactivo" active={filterActive === 'false'} activeColor="#FFEBEE" activeTextColor="#C62828"
              onClick={() => setFilterActive(filterActive === 'false' ? '' : 'false')} />

            {/* Clear all filters */}
            <Fade in={activeFilters > 0}>
              <Box sx={{ display: 'flex' }}>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <TbIcon title="Limpiar todos los filtros" onClick={() => { setFilterCurrency(''); setFilterActive(''); }}>
                  <ClearAllIcon fontSize="small" />
                </TbIcon>
              </Box>
            </Fade>
          </Box>
        </Paper>
      </Fade>

      {/* ── Table / Cards ── */}
      {isMobile ? (
        <Box>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Fade in timeout={200 + i * 80} key={i}>
                <Card variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Skeleton width="60%" height={24} />
                    <Skeleton width="80%" height={20} sx={{ mt: 0.5 }} />
                  </CardContent>
                </Card>
              </Fade>
            ))
          ) : filtered.length === 0 ? (
            <Fade in><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Sin resultados</Typography></Fade>
          ) : (
            filtered.map((item, index) => (
              <CountryCard key={item.id} item={item} index={index}
                selected={selected.includes(item.id)}
                onToggle={() => setSelected((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                onEdit={() => openEdit(item)} />
            ))
          )}
        </Box>
      ) : loading ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
          <TableSkeleton />
        </Paper>
      ) : (
        <Fade in timeout={TRANSITION_DURATION}>
          <Box>
            <DataGrid
              rows={filtered}
              columns={columns}
              autoHeight
              density="compact"
              disableRowSelectionOnClick
              checkboxSelection
              onRowSelectionModelChange={setSelected}
              rowSelectionModel={selected}
              pageSizeOptions={[10, 25, 50]}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              onRowDoubleClick={(p) => openEdit(p.row)}
              getRowId={(row) => row.id}
              initialState={{ sorting: { sortModel: [{ field: 'code', sort: 'asc' }] } }}
              sx={{
                '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
              }}
              localeText={{
                noRowsLabel: 'No hay paises registrados',
                MuiTablePagination: { labelRowsPerPage: 'Filas:' },
              }}
            />
          </Box>
        </Fade>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* Create / Edit Dialog */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'up' }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PublicIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {editItem ? 'Editar Pais' : 'Nuevo Pais'}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => !saving && setDialogOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Collapse in={saveSuccess}>
            <Alert severity="success" sx={{ mb: 2 }}>
              {editItem ? 'Pais actualizado correctamente' : 'Pais creado correctamente'}
            </Alert>
          </Collapse>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Code + Flag row */}
            <Grid item xs={4}>
              <TextField
                label="Codigo ISO"
                value={form.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                disabled={!!editItem}
                fullWidth
                size="small"
                inputProps={{ maxLength: 3, style: { textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 } }}
                helperText="Ej: CO, EC, PA"
                onFocus={(e) => e.target.select()}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Bandera"
                value={form.flagEmoji}
                onChange={(e) => setForm((f) => ({ ...f, flagEmoji: e.target.value }))}
                fullWidth
                size="small"
                inputProps={{ style: { fontSize: 24, textAlign: 'center' } }}
                helperText="Emoji de bandera"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Orden"
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm((f) => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))}
                fullWidth
                size="small"
                onFocus={(e) => e.target.select()}
              />
            </Grid>

            {/* Name */}
            <Grid item xs={12}>
              <TextField
                label="Nombre del Pais"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                fullWidth
                size="small"
                required
              />
            </Grid>

            {/* Currency + Phone */}
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Moneda</InputLabel>
                <Select
                  value={form.currency}
                  label="Moneda"
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Prefijo Telefonico"
                value={form.phonePrefix}
                onChange={(e) => setForm((f) => ({ ...f, phonePrefix: e.target.value }))}
                fullWidth
                size="small"
                placeholder="+57"
              />
            </Grid>

            {/* Quick flag suggestions */}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Sugerencias rapidas:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {FLAG_SUGGESTIONS.map((s) => (
                  <Chip
                    key={s.code}
                    label={`${s.emoji} ${s.code}`}
                    size="small"
                    variant={form.code === s.code ? 'filled' : 'outlined'}
                    color={form.code === s.code ? 'primary' : 'default'}
                    onClick={() => {
                      setForm((f) => ({
                        ...f,
                        code: s.code,
                        name: f.name || s.name,
                        flagEmoji: s.emoji,
                      }));
                    }}
                    sx={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                  />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.code || !form.name || saveSuccess}
            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 120, borderRadius: 2 }}
          >
            {saving ? 'Guardando...' : saveSuccess ? 'Guardado!' : editItem ? 'Actualizar' : 'Crear Pais'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
