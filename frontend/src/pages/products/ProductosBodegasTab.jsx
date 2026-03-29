/**
 * Productos-Bodegas Tab — Per-warehouse data for product variants.
 * Redesigned: BodegasView pattern — animated KPI cards, 2-row command bar
 * with FilterChip filters, flex columns, skeleton loading, mobile cards.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, InputAdornment, Typography, Chip,
  Drawer, IconButton, Divider, Grid, Stack, Paper, Tooltip,
  Card, CardContent, CardActionArea, Checkbox, useMediaQuery, useTheme,
  Fade, Skeleton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import InventoryIcon from '@mui/icons-material/Inventory';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CategoryIcon from '@mui/icons-material/Category';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import { formatCOP, formatDate } from '../../utils/formatters';
import productsApi from '../../api/products.api';

const TRANSITION_DURATION = 250;

const ABC_OPTIONS = [
  { value: 'A', label: 'A', color: '#E8F5E9', textColor: '#2E7D32' },
  { value: 'B', label: 'B', color: '#E3F2FD', textColor: '#1565C0' },
  { value: 'C', label: 'C', color: '#FFF3E0', textColor: '#E65100' },
  { value: 'D', label: 'D', color: '#FFEBEE', textColor: '#C62828' },
];

// ══════════════════════════════════════════════════════════════
// Shared Components
// ══════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════
// KPI Card — colored left border, icon container, hover lift
// ══════════════════════════════════════════════════════════════
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
// ABC Chip Helper
// ══════════════════════════════════════════════════════════════
function AbcChip({ value }) {
  if (!value) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const colors = {
    A: { bg: '#E8F5E9', color: '#2E7D32' },
    B: { bg: '#E3F2FD', color: '#1565C0' },
    C: { bg: '#FFF3E0', color: '#E65100' },
    D: { bg: '#FFEBEE', color: '#C62828' },
  };
  const c = colors[value.toUpperCase()] || { bg: '#ECEFF1', color: '#616161' };
  return <Chip label={value} size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, minWidth: 32 }} />;
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
            <Skeleton width={120} height={24} />
            <Skeleton width={180} height={24} />
            <Skeleton width={100} height={24} />
            <Skeleton width={80} height={24} />
            <Skeleton width={90} height={24} />
            <Skeleton width={90} height={24} />
            <Skeleton width={100} height={24} />
            <Skeleton width={60} height={24} />
            <Skeleton width={60} height={24} />
          </Box>
        </Fade>
      ))}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// Mobile Card
// ══════════════════════════════════════════════════════════════
function WarehouseRecordCard({ item, selected, onToggle, onView, index }) {
  return (
    <Fade in timeout={TRANSITION_DURATION + index * 50}>
      <Card variant="outlined" sx={{
        mb: 1, borderRadius: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 },
      }}>
        <CardActionArea onClick={onView} sx={{ p: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Checkbox size="small" checked={selected} onClick={(e) => { e.stopPropagation(); onToggle(); }} sx={{ p: 0, mt: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={700} color="primary" noWrap sx={{ flex: 1 }}>{item.refSiesa}</Typography>
                  {item.bodega && <Chip label={item.bodega} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 0.5 }}>
                  {item.descProducto}
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                  {item.ciudad && <Chip label={item.ciudad} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                  {item.costoTotal != null && <Chip label={formatCOP(item.costoTotal)} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600 }} />}
                  {item.abcRotacionCosto && <AbcChip value={item.abcRotacionCosto} />}
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
// Detail Drawer
// ══════════════════════════════════════════════════════════════
function DetailSection({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      {children}
    </Box>
  );
}

function DetailField({ label, value }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value || '—'}</Typography>
    </Box>
  );
}

function WarehouseDetailDrawer({ open, onClose, record }) {
  if (!record) return null;

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{record.refSiesa}</Typography>
          <Typography variant="body2" color="text.secondary">{record.descProducto}</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <DetailSection title="Producto">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Ref. SIESA" value={record.refSiesa} /></Grid>
          <Grid item xs={6}><DetailField label="Descripcion" value={record.descProducto} /></Grid>
        </Grid>
      </DetailSection>

      <DetailSection title="Bodega">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Bodega" value={record.bodega} /></Grid>
          <Grid item xs={6}><DetailField label="Ciudad" value={record.ciudad} /></Grid>
        </Grid>
      </DetailSection>

      <DetailSection title="Financiero">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Costo Promedio" value={formatCOP(record.costoPromedio)} /></Grid>
          <Grid item xs={6}><DetailField label="Precio Unitario" value={formatCOP(record.precioUnitario)} /></Grid>
          <Grid item xs={6}><DetailField label="Costo Total" value={formatCOP(record.costoTotal)} /></Grid>
        </Grid>
      </DetailSection>

      <DetailSection title="Clasificacion ABC">
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">ABC Rotacion Costo</Typography>
              <Box sx={{ mt: 0.5 }}><AbcChip value={record.abcRotacionCosto} /></Box>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">ABC Rotacion Costo Bod.</Typography>
              <Box sx={{ mt: 0.5 }}><AbcChip value={record.abcRotacionCostoBod} /></Box>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">ABC Rotacion Veces</Typography>
              <Box sx={{ mt: 0.5 }}><AbcChip value={record.abcRotacionVeces} /></Box>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">ABC Rotacion Veces Bod.</Typography>
              <Box sx={{ mt: 0.5 }}><AbcChip value={record.abcRotacionVecesBod} /></Box>
            </Box>
          </Grid>
        </Grid>
      </DetailSection>

      <DetailSection title="Fechas">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Ultima Venta" value={formatDate(record.fUltimaVenta)} /></Grid>
          <Grid item xs={6}><DetailField label="Ultima Entrada" value={formatDate(record.fUltimaEntrada)} /></Grid>
          <Grid item xs={6}><DetailField label="Ultima Salida" value={formatDate(record.fUltimaSalida)} /></Grid>
          <Grid item xs={6}><DetailField label="Ultima Compra" value={formatDate(record.fUltimaCompra)} /></Grid>
        </Grid>
      </DetailSection>
    </Drawer>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function ProductosBodegasTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [abcCostoFilter, setAbcCostoFilter] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'refSiesa', sort: 'asc' }]);

  const [warehouses, setWarehouses] = useState([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load warehouses
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await productsApi.getWarehouses();
        setWarehouses(res.items || []);
      } catch (err) {
        console.error('Error loading warehouses:', err);
      }
    }
    loadWarehouses();
  }, []);

  // Fetch warehouse records
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setSelectionModel([]);
      try {
        const params = {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
          search: debouncedSearch || undefined,
          warehouse_id: warehouseFilter || undefined,
          abc_rotacion_costo: abcCostoFilter || undefined,
          sort_field: sortModel[0]?.field || 'refSiesa',
          sort_order: sortModel[0]?.sort || 'asc',
        };
        const data = await productsApi.getWarehouseRecords(params);
        const offset = paginationModel.page * paginationModel.pageSize;
        setRows(data.items.map((item, i) => ({ id: item.id || offset + i + 1, ...item })));
        setTotal(data.total);
      } catch (err) {
        console.error('Error fetching warehouse records:', err);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [paginationModel, debouncedSearch, warehouseFilter, abcCostoFilter, sortModel]);

  // Open detail for selected
  const handleOpenSelectedDetail = useCallback(() => {
    const selected = rows.find((r) => selectionModel.includes(r.id));
    if (selected) {
      setSelectedRecord(selected);
      setDrawerOpen(true);
    }
  }, [rows, selectionModel]);

  // Open detail for a specific record (mobile card tap)
  const handleViewRecord = useCallback((record) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
  }, []);

  // Computed KPI values
  const kpiData = useMemo(() => {
    const uniqueWarehouses = new Set(rows.map((r) => r.bodega)).size;
    const totalCost = rows.reduce((acc, r) => acc + (r.costoTotal || 0), 0);
    const abcA = rows.filter((r) => r.abcRotacionCosto?.toUpperCase() === 'A').length;
    return { uniqueWarehouses, totalCost, abcA };
  }, [rows]);

  const activeFilters = [warehouseFilter, abcCostoFilter].filter(Boolean).length;

  const columns = useMemo(
    () => [
      {
        field: 'refSiesa',
        headerName: 'Ref. SIESA',
        flex: 1.2,
        minWidth: 140,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={600} color="primary">
            {params.value}
          </Typography>
        ),
      },
      { field: 'descProducto', headerName: 'Descripcion', flex: 1.8, minWidth: 180, align: 'center', headerAlign: 'center' },
      { field: 'bodega', headerName: 'Bodega', flex: 1.2, minWidth: 130, align: 'center', headerAlign: 'center' },
      { field: 'ciudad', headerName: 'Ciudad', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center' },
      {
        field: 'costoPromedio',
        headerName: 'Costo Prom.',
        flex: 1,
        minWidth: 110,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value) => value != null ? formatCOP(value) : '',
      },
      {
        field: 'precioUnitario',
        headerName: 'Precio Unit.',
        flex: 1,
        minWidth: 110,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value) => value != null ? formatCOP(value) : '',
      },
      {
        field: 'costoTotal',
        headerName: 'Costo Total',
        flex: 1,
        minWidth: 110,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value) => value != null ? formatCOP(value) : '',
      },
      {
        field: 'abcRotacionCosto',
        headerName: 'ABC Costo',
        flex: 0.7,
        minWidth: 80,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => <AbcChip value={params.value} />,
      },
      {
        field: 'abcRotacionVeces',
        headerName: 'ABC Frec.',
        flex: 0.7,
        minWidth: 80,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => <AbcChip value={params.value} />,
      },
      {
        field: 'fUltimaVenta',
        headerName: 'Ult. Venta',
        flex: 0.9,
        minWidth: 100,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'fUltimaCompra',
        headerName: 'Ult. Compra',
        flex: 0.9,
        minWidth: 100,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value) => formatDate(value),
      },
    ],
    []
  );

  const hasSel = selectionModel.length > 0;

  return (
    <Box>
      {/* ── KPI Strip with staggered fade ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <KpiCard value={total.toLocaleString()} label="Registros" loading={loading} delay={0}
          color="#334155" bgColor="#F1F5F9" icon={<InventoryIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={kpiData.uniqueWarehouses} label="Bodegas" loading={loading} delay={50}
          color="#1565C0" bgColor="#E3F2FD" icon={<WarehouseIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={formatCOP(kpiData.totalCost)} label="Costo Total" loading={loading} delay={100}
          color="#2E7D32" bgColor="#E8F5E9" icon={<AttachMoneyIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={kpiData.abcA} label="ABC A" loading={loading} delay={150}
          color="#E65100" bgColor="#FFF3E0" icon={<CategoryIcon sx={{ fontSize: 20 }} />} />
      </Stack>

      {/* ══════════════════════════════════════════════════════════
          Command Bar — 2-row integrated toolbar
          Row 1: Search + result count + selection actions + view detail
          Row 2: FilterChip groups for Bodega and ABC Costo
         ══════════════════════════════════════════════════════════ */}
      <Fade in timeout={TRANSITION_DURATION}>
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          {/* Row 1: Search + Result count + Actions */}
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar por referencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { height: 36 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />

            {/* Result count */}
            <Fade in={!loading}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {rows.length}{total ? ` de ${total.toLocaleString()}` : ''} {isMobile ? '' : 'registros'}
              </Typography>
            </Fade>

            <Box sx={{ flexGrow: 1 }} />

            {/* Selection indicator */}
            {hasSel && (
              <Fade in>
                <Chip label={`${selectionModel.length} sel.`} size="small" color="primary"
                  onDelete={() => setSelectionModel([])} sx={{ fontWeight: 600, mr: 0.5 }} />
              </Fade>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            {/* Selection actions */}
            <TbIcon title="Ver detalle" disabled={selectionModel.length !== 1} onClick={handleOpenSelectedDetail}>
              <VisibilityOutlinedIcon fontSize="small" />
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
            {/* Bodega filters */}
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Bodega:
            </Typography>
            {warehouses.map((w) => (
              <FilterChip
                key={w.id}
                label={w.name || w.city || `Bod. ${w.id}`}
                active={warehouseFilter === w.id}
                activeColor="#E3F2FD"
                activeTextColor="#1565C0"
                onClick={() => {
                  setWarehouseFilter(warehouseFilter === w.id ? '' : w.id);
                  setPaginationModel((p) => ({ ...p, page: 0 }));
                }}
              />
            ))}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* ABC Costo filters */}
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              ABC Costo:
            </Typography>
            {ABC_OPTIONS.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={abcCostoFilter === opt.value}
                activeColor={opt.color}
                activeTextColor={opt.textColor}
                onClick={() => {
                  setAbcCostoFilter(abcCostoFilter === opt.value ? '' : opt.value);
                  setPaginationModel((p) => ({ ...p, page: 0 }));
                }}
              />
            ))}

            {/* Clear all filters */}
            <Fade in={activeFilters > 0}>
              <Box sx={{ display: 'flex' }}>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <TbIcon title="Limpiar todos los filtros" onClick={() => { setWarehouseFilter(''); setAbcCostoFilter(''); setPaginationModel((p) => ({ ...p, page: 0 })); }}>
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
                    <Skeleton width="40%" height={16} sx={{ mt: 0.5 }} />
                  </CardContent>
                </Card>
              </Fade>
            ))
          ) : rows.length === 0 ? (
            <Fade in><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Sin resultados</Typography></Fade>
          ) : (
            rows.map((item, index) => (
              <WarehouseRecordCard key={item.id} item={item} index={index}
                selected={selectionModel.includes(item.id)}
                onToggle={() => setSelectionModel((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                onView={() => handleViewRecord(item)} />
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
              rows={rows}
              columns={columns}
              density="compact"
              autoHeight
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={(newModel) => setSelectionModel(newModel)}
              rowCount={total}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[25, 50]}
              sortingMode="server"
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              sx={{ '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }}
            />
          </Box>
        </Fade>
      )}

      {/* ── Detail Drawer ── */}
      <WarehouseDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        record={selectedRecord}
      />
    </Box>
  );
}
