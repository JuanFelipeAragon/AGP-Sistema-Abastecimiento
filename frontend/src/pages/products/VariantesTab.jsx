/**
 * Variantes Tab — Variant (SKU) catalog split by subcategoria.
 * Each subcategoria renders its own collapsible DataGrid section.
 * Sticky command bar controls all sections (search, filters, column visibility).
 * Features: SmartFilter, persisted filters, column visibility, KPIs, lazy-load sections.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, InputAdornment, Typography, Chip,
  Drawer, IconButton, Divider, Grid, Stack, Paper, Tooltip,
  Fade, Skeleton, Card, CardContent, CardActionArea, Checkbox,
  useMediaQuery, useTheme, Autocomplete, alpha, Popper,
  Menu, MenuItem, FormControlLabel, Switch, Collapse,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ViewListIcon from '@mui/icons-material/ViewList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import ScienceIcon from '@mui/icons-material/Science';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CategoryIcon from '@mui/icons-material/Category';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { formatCOP, formatNumber, formatDate } from '../../utils/formatters';
import usePersistedFilters from '../../hooks/usePersistedFilters';
import SmartFilter from '../../components/common/SmartFilter';
import productsApi from '../../api/products.api';

const TRANSITION_DURATION = 250;

// ══════════════════════════════════════════════════════════════
// Shared Components (same as ProductosBase patterns)
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

function FilterChip({ label, active, onClick, activeColor, activeTextColor, size = 'small' }) {
  return (
    <Chip
      label={label}
      size={size}
      onClick={onClick}
      variant={active ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600, fontSize: '0.7rem', height: 28, cursor: 'pointer',
        transition: 'all 0.2s ease',
        bgcolor: active ? (activeColor || 'primary.main') : 'transparent',
        color: active ? (activeTextColor || '#fff') : 'text.secondary',
        borderColor: active ? 'transparent' : 'divider',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 1, bgcolor: active ? (activeColor || 'primary.main') : 'action.hover' },
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
          <Box><Skeleton width={30} height={28} /><Skeleton width={70} height={14} /></Box>
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
          bgcolor: bgColor || '#F1F5F9', color: color || '#64748B', flexShrink: 0,
        }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color={color || 'text.primary'} sx={{ lineHeight: 1.1 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
        </Box>
      </Paper>
    </Fade>
  );
}

// Column visibility
const DEFAULT_COL_VIS = {
  variantId: true, ref: true, refSiesa: false, desc: true, longitud: true, sub: false, acabado: true, codAcabado: true,
  temple: true, aleacionCode: true, wt: true, nBod: true, fCreacion: false, status: true,
};
const COL_LABELS = {
  variantId: 'ID', ref: 'Referencia', refSiesa: 'Ref. SIESA', desc: 'Descripcion', longitud: 'Longitud (m)',
  sub: 'Subcategoria', acabado: 'Acabado', codAcabado: 'Cod. Acabado',
  temple: 'Temple', aleacionCode: 'Aleacion',
  wt: 'Peso UM', nBod: 'Bodegas', fCreacion: 'Creacion', status: 'Estado',
};

function ColumnVisibilityMenu({ anchorEl, open, onClose, model, onChange }) {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}
      PaperProps={{ sx: { borderRadius: 2, minWidth: 220, maxHeight: 400, boxShadow: 6 } }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">Columnas visibles</Typography>
      </Box>
      {Object.entries(COL_LABELS).map(([field, label]) => (
        <MenuItem key={field} dense onClick={() => onChange({ ...model, [field]: !model[field] })} sx={{ py: 0.25 }}>
          <FormControlLabel
            control={<Switch size="small" checked={model[field] !== false} />}
            label={<Typography variant="body2" fontSize="0.8rem">{label}</Typography>}
            sx={{ ml: 0, width: '100%' }}
          />
        </MenuItem>
      ))}
      <Divider sx={{ my: 0.5 }} />
      <MenuItem dense onClick={() => onChange(DEFAULT_COL_VIS)}>
        <Typography variant="caption" color="primary" fontWeight={600}>Restaurar por defecto</Typography>
      </MenuItem>
    </Menu>
  );
}

// CSV Export
function downloadCSV(items, filename) {
  if (!items?.length) return;
  const headers = ['Ref SIESA', 'Descripcion', 'Subcategoria', 'Acabado', 'Cod Acabado', 'Aleacion', 'Peso UM', 'Bodegas', 'Creacion', 'Estado'];
  const csvRows = [headers.join(',')];
  for (const r of items) {
    csvRows.push([
      r.ref || '', `"${(r.desc || '').replace(/"/g, '""')}"`, r.sub || '',
      r.acabado || '', r.codAcabado || '', r.aleacion || '',
      r.wt ?? '', r.nBod ?? '', r.fCreacion || '', r.status || '',
    ].join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// Detail helpers
function DetailSection({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>{title}</Typography>
      <Divider sx={{ mb: 1.5 }} />{children}
    </Box>
  );
}
function DetailField({ label, value }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value || '\u2014'}</Typography>
    </Box>
  );
}

function VariantDetailDrawer({ open, onClose, sku, navigate }) {
  if (!sku) return null;
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{sku.ref}</Typography>
          <Typography variant="body2" color="text.secondary">{sku.desc}</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {sku.sub && <Chip label={sku.sub} size="small" color="primary" variant="outlined" />}
        {sku.sys && <Chip label={sku.sys} size="small" variant="outlined" />}
        <Chip label={sku.status} size="small" sx={{ bgcolor: sku.status === 'Activo' ? '#E8F5E9' : '#ECEFF1', fontWeight: 600 }} />
      </Stack>
      <DetailSection title="Informacion General">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Referencia SIESA" value={sku.ref} /></Grid>
          <Grid item xs={6}><DetailField label="Linea" value={sku.lin} /></Grid>
          <Grid item xs={6}><DetailField label="Categoria" value={sku.cat} /></Grid>
          <Grid item xs={6}><DetailField label="Subcategoria" value={sku.sub} /></Grid>
          <Grid item xs={6}><DetailField label="Sistema" value={sku.sys} /></Grid>
          <Grid item xs={6}><DetailField label="Estado" value={sku.status} /></Grid>
        </Grid>
      </DetailSection>
      <DetailSection title="Especificaciones">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Acabado" value={sku.acabado} /></Grid>
          <Grid item xs={6}><DetailField label="Codigo Acabado" value={sku.codAcabado} /></Grid>
          <Grid item xs={6}><DetailField label="Aleacion" value={sku.aleacion} /></Grid>
          <Grid item xs={6}><DetailField label="Peso UM (kg)" value={formatNumber(sku.wt, 4)} /></Grid>
        </Grid>
      </DetailSection>
      <DetailSection title="Datos Financieros">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Costo Promedio" value={formatCOP(sku.cost)} /></Grid>
          <Grid item xs={6}><DetailField label="Valor Inventario" value={formatCOP(sku.valInv)} /></Grid>
          <Grid item xs={6}><DetailField label="No. Bodegas" value={sku.nBod} /></Grid>
        </Grid>
      </DetailSection>
      <DetailSection title="Fechas">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Fecha Creacion" value={formatDate(sku.fCreacion)} /></Grid>
          <Grid item xs={6}><DetailField label="Ultima Venta" value={formatDate(sku.fVenta)} /></Grid>
        </Grid>
      </DetailSection>
    </Drawer>
  );
}

// ══════════════════════════════════════════════════════════════
// Subcategoria Section — collapsible DataGrid per subcategoria
// ══════════════════════════════════════════════════════════════
const SECTION_COLORS = ['#3B82F6', '#8B5CF6', '#059669', '#D97706', '#DC2626', '#0891B2', '#7C3AED', '#CA8A04', '#BE185D', '#4F46E5'];

// Universal columns — always shown regardless of type config
const UNIVERSAL_COLUMNS = new Set(['variantId', 'ref', 'desc', 'longitud', 'wt', 'nBod', 'status']);

function SubcategoriaSection({
  subcategoria, displayName, totalCount, colorIdx, search,
  categoriaFilter, sistemaFilter,
  acabadoFilter, templeFilter, aleacionFilter, longitudFilter, longitudMinFilter, longitudMaxFilter, estadoFilter,
  columns, columnVisibility, typeConfig, productType, onSelectSku, defaultExpanded,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Compute effective column visibility:
  // User toggle (columnVisibility) ALWAYS wins.
  // TypeConfig only provides the *default* when user hasn't toggled.
  const effectiveColumnVisibility = useMemo(() => {
    const typeAttrs = typeConfig?.[productType] || [];

    const vis = {};
    for (const col of columns) {
      const field = col.field;
      if (field === '__check__') continue;

      // If user has explicitly toggled this column, respect that
      if (columnVisibility[field] !== undefined) {
        vis[field] = columnVisibility[field];
        continue;
      }

      // Otherwise use defaults: universal columns ON, type-configured columns per config, rest OFF
      if (UNIVERSAL_COLUMNS.has(field)) {
        vis[field] = true;
      } else {
        const attrConf = typeAttrs.find((a) => a.key === field);
        vis[field] = attrConf?.visible ?? DEFAULT_COL_VIS[field] ?? false;
      }
    }
    return vis;
  }, [columns, columnVisibility, typeConfig, productType]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'ref', sort: 'asc' }]);

  const color = SECTION_COLORS[colorIdx % SECTION_COLORS.length];

  // Fetch data when expanded or filters change
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const joinArr = (v) => Array.isArray(v) && v.length ? v.join(',') : (v || undefined);
      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        subcategory: subcategoria,
        search: search || undefined,
        category: joinArr(categoriaFilter),
        sistema: joinArr(sistemaFilter),
        acabado: joinArr(acabadoFilter),
        temple: joinArr(templeFilter),
        aleacion_code: joinArr(aleacionFilter),
        longitud: longitudFilter ? parseFloat(longitudFilter) : undefined,
        longitud_min: longitudMinFilter ? parseFloat(longitudMinFilter) : undefined,
        longitud_max: longitudMaxFilter ? parseFloat(longitudMaxFilter) : undefined,
        status: estadoFilter || undefined,
        sort_field: sortModel[0]?.field || 'ref',
        sort_order: sortModel[0]?.sort || 'asc',
      };
      const data = await productsApi.getSkus(params);
      setRows(data.items.map((item, i) => ({ ...item, id: `${subcategoria}-${paginationModel.page}-${i}` })));
      setTotal(data.total);
      setLoaded(true);
    } catch (err) {
      console.error(`Error fetching variants for ${subcategoria}:`, err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [subcategoria, search, categoriaFilter, sistemaFilter, acabadoFilter, templeFilter, aleacionFilter, longitudFilter, longitudMinFilter, longitudMaxFilter, estadoFilter, paginationModel, sortModel]);

  // Lazy load: fetch only when expanded
  useEffect(() => {
    if (expanded) fetchData();
  }, [expanded, fetchData]);

  return (
    <Fade in timeout={TRANSITION_DURATION + colorIdx * 60}>
      <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', borderLeft: `3px solid ${color}` }}>
        {/* Section header — clickable to expand/collapse */}
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5,
            cursor: 'pointer', userSelect: 'none',
            bgcolor: expanded ? alpha(color, 0.04) : 'transparent',
            transition: 'background-color 0.2s ease',
            '&:hover': { bgcolor: alpha(color, 0.06) },
          }}
        >
          <Box sx={{
            width: 32, height: 32, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(color, 0.1), color,
          }}>
            <CategoryIcon sx={{ fontSize: 18 }} />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {displayName || subcategoria || 'Sin Subcategoria'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {total.toLocaleString()} variante{total !== 1 ? 's' : ''}
            </Typography>
          </Box>

          <Chip
            label={total.toLocaleString()}
            size="small"
            sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: alpha(color, 0.1), color, minWidth: 40 }}
          />

          <IconButton size="small" sx={{ color }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Collapsible content */}
        <Collapse in={expanded} timeout={300} unmountOnExit>
          <Divider />
          <Box sx={{ p: 0 }}>
            {loading && !loaded ? (
              <Box sx={{ p: 2 }}>
                {[...Array(3)].map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, py: 0.75 }}>
                    <Skeleton width={120} height={22} /><Skeleton width={200} height={22} />
                    <Skeleton width={80} height={22} /><Skeleton width={60} height={22} />
                  </Box>
                ))}
              </Box>
            ) : (
              <DataGrid
                rows={rows}
                columns={columns}
                columnVisibilityModel={effectiveColumnVisibility}
                density="compact"
                autoHeight
                checkboxSelection
                disableRowSelectionOnClick
                rowCount={total}
                paginationMode="server"
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[25, 50]}
                sortingMode="server"
                sortModel={sortModel}
                onSortModelChange={setSortModel}
                loading={loading}
                onRowDoubleClick={(params) => onSelectSku(params.row)}
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
                }}
              />
            )}
          </Box>
        </Collapse>
      </Paper>
    </Fade>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function VariantesTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [subcatSummary, setSubcatSummary] = useState([]); // [{name, count}]
  const [totalVariants, setTotalVariants] = useState(0);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Persisted filters
  const [pf, setPf, clearPf] = usePersistedFilters('variantes', {
    categoria: [],
    subcategoria: [],
    sistema: [],
    acabado: [],
    temple: [],
    longitud: '',       // exact value or '' (single select — numeric)
    longitudMin: '',    // range min
    longitudMax: '',    // range max
    aleacion: [],
    estado: '',         // single select — Activo/Inactivo
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COL_VIS);
  const [colMenuAnchor, setColMenuAnchor] = useState(null);

  const [filterOptions, setFilterOptions] = useState({
    categorias: [], subcats: [], sistemas: [], acabados: [], temples: [], aleaciones: [], longitudes: [],
  });
  const [typeConfig, setTypeConfig] = useState({}); // { Perfil: [{key, label, visible}], ... }
  const [subcatTypeMap, setSubcatTypeMap] = useState({}); // { "PERFILES DE ALUMINIO": "Perfil", ... }

  // URL param for product_id cross-navigation
  const productId = searchParams.get('product_id') || '';

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load static filter options with counts, sorted by frequency
  useEffect(() => {
    function toRankedOptions(items) {
      const counts = {};
      items.filter((i) => i.status === 'active').forEach((i) => {
        const name = i.normalizedValue;
        if (name) counts[name] = (counts[name] || 0) + (i.skuCount || 0);
      });
      return Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    }

    async function loadStaticFilters() {
      try {
        const [catRes, subRes, sysRes] = await Promise.all([
          productsApi.getClassifications('categorias'),
          productsApi.getClassifications('subcategorias'),
          productsApi.getClassifications('sistemas'),
        ]);
        setFilterOptions((prev) => ({
          ...prev,
          categorias: toRankedOptions(catRes.items),
          subcats: toRankedOptions(subRes.items),
          sistemas: toRankedOptions(sysRes.items),
        }));
      } catch (err) {
        console.error('Error loading static filter options:', err);
      }
    }
    loadStaticFilters();
  }, []);

  // Helper: join array values for API
  const toParam = (val) => {
    if (Array.isArray(val)) return val.length > 0 ? val.join(',') : undefined;
    return val || undefined;
  };

  // Cascading filter options — reload when any filter changes
  useEffect(() => {
    async function loadCascadingOptions() {
      try {
        const params = {};
        if (toParam(pf.subcategoria)) params.subcategory = toParam(pf.subcategoria);
        if (toParam(pf.acabado)) params.acabado = toParam(pf.acabado);
        if (toParam(pf.temple)) params.temple = toParam(pf.temple);
        if (toParam(pf.aleacion)) params.aleacion_code = toParam(pf.aleacion);
        if (pf.longitud) params.longitud = pf.longitud;

        const opts = await productsApi.getSkuFilterOptions(params);
        // Options come as [{value, count}] sorted by frequency
        setFilterOptions((prev) => ({
          ...prev,
          acabados: opts.acabados || [],
          temples: opts.temples || [],
          aleaciones: opts.aleaciones || [],
          longitudes: (opts.longitudes || []).map((o) => ({ value: String(o.value), count: o.count })),
        }));
      } catch (err) {
        console.error('Error loading cascading filter options:', err);
      }
    }
    loadCascadingOptions();
  }, [pf.subcategoria, pf.acabado, pf.temple, pf.aleacion, pf.longitud]);

  // Load subcategoria summary + type config + type map
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        // Load in parallel but handle failures individually
        const [subRes, tcRes, stmRes] = await Promise.allSettled([
          productsApi.getClassifications('subcategorias'),
          productsApi.getTypeConfig(),
          productsApi.getSubcategoriaTypeMap(),
        ]);

        const subData = subRes.status === 'fulfilled' ? subRes.value : { items: [] };
        const tcData = tcRes.status === 'fulfilled' ? tcRes.value : { config: {} };
        const stmData = stmRes.status === 'fulfilled' ? stmRes.value : { mapping: {} };

        // Type config
        setTypeConfig(tcData.config || {});
        const typeMap = stmData.mapping || {};
        setSubcatTypeMap(typeMap);

        // Build summary with product type
        const items = subData.items
          .filter((i) => i.skuCount > 0)
          .sort((a, b) => b.skuCount - a.skuCount)
          .map((i) => ({
            name: i.originalValue,
            displayName: i.normalizedValue || i.originalValue,
            count: i.skuCount,
            productType: typeMap[i.originalValue] || 'Otro',
          }));
        setSubcatSummary(items);
        setTotalVariants(items.reduce((sum, i) => sum + i.count, 0));
      } catch (err) {
        console.error('Error loading subcategoria summary:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, [refreshKey]);

  // Filter sections by subcategoria filter
  const visibleSections = useMemo(() => {
    const subcatArr = Array.isArray(pf.subcategoria) ? pf.subcategoria : (pf.subcategoria ? [pf.subcategoria] : []);
    if (subcatArr.length === 0) return subcatSummary;
    return subcatSummary.filter((s) => subcatArr.includes(s.displayName));
  }, [subcatSummary, pf.subcategoria]);

  // KPI stats
  const kpiStats = useMemo(() => {
    const totalVisible = visibleSections.reduce((sum, s) => sum + s.count, 0);
    return { total: totalVariants, visible: totalVisible, sections: visibleSections.length };
  }, [totalVariants, visibleSections]);

  const hasVal = (v) => Array.isArray(v) ? v.length > 0 : !!v;
  const activeFilters = [pf.categoria, pf.subcategoria, pf.sistema, pf.acabado, pf.temple, pf.aleacion, pf.longitud, pf.longitudMin, pf.longitudMax, pf.estado].filter(hasVal).length;

  // DataGrid columns (shared across all sections)
  const columns = useMemo(() => [
    {
      field: 'variantId', headerName: 'ID', width: 70, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'text.secondary' }}>{params.value}</Typography>
      ),
    },
    {
      field: 'ref', headerName: 'Referencia', flex: 1, minWidth: 120, align: 'center', headerAlign: 'center',
      renderCell: (params) => <Typography variant="body2" fontWeight={600} color="primary">{params.value}</Typography>,
    },
    {
      field: 'refSiesa', headerName: 'Ref. SIESA', flex: 1.2, minWidth: 150, align: 'center', headerAlign: 'center',
      renderCell: (params) => <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{params.value}</Typography>,
    },
    { field: 'desc', headerName: 'Descripcion', flex: 1.8, minWidth: 180, align: 'center', headerAlign: 'center' },
    {
      field: 'longitud', headerName: 'Longitud (m)', flex: 0.7, minWidth: 85, type: 'number', align: 'center', headerAlign: 'center',
      valueGetter: (value, row) => row.longitud,
      valueFormatter: (value) => (value ? formatNumber(value, 2) : ''),
    },
    { field: 'sub', headerName: 'Subcategoria', flex: 1.1, minWidth: 120, align: 'center', headerAlign: 'center' },
    { field: 'acabado', headerName: 'Acabado', flex: 0.9, minWidth: 100, align: 'center', headerAlign: 'center' },
    {
      field: 'codAcabado', headerName: 'Cod.', flex: 0.6, minWidth: 65, align: 'center', headerAlign: 'center',
      renderCell: (params) => params.value ? <Chip label={params.value} size="small" variant="outlined" sx={{ fontWeight: 600, minWidth: 40 }} /> : null,
    },
    {
      field: 'temple', headerName: 'Temple', flex: 0.6, minWidth: 65, align: 'center', headerAlign: 'center',
      renderCell: (params) => params.value ? (
        <Chip label={params.value} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: '#FFF3E0', color: '#E65100' }} />
      ) : null,
    },
    {
      field: 'aleacionCode', headerName: 'Aleacion', flex: 0.6, minWidth: 65, align: 'center', headerAlign: 'center',
      renderCell: (params) => params.value ? (
        <Chip label={params.value} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: '#E8F5E9', color: '#2E7D32' }} />
      ) : null,
    },
    {
      field: 'wt', headerName: 'Peso UM', flex: 0.7, minWidth: 75, type: 'number', align: 'center', headerAlign: 'center',
      valueFormatter: (value) => (value ? formatNumber(value, 2) : ''),
    },
    {
      field: 'nBod', headerName: 'Bodegas', flex: 0.6, minWidth: 70, align: 'center', headerAlign: 'center',
      renderCell: (params) => <Chip label={params.value ?? '\u2014'} size="small" variant="outlined" sx={{ fontWeight: 600, minWidth: 40 }} />,
    },
    {
      field: 'fCreacion', headerName: 'Creacion', flex: 0.8, minWidth: 90, align: 'center', headerAlign: 'center',
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'status', headerName: 'Estado', flex: 0.7, minWidth: 80, align: 'center', headerAlign: 'center',
      renderCell: (params) => (
        <Chip label={params.value} size="small" sx={{
          bgcolor: params.value === 'Activo' ? '#E8F5E9' : '#ECEFF1',
          color: params.value === 'Activo' ? '#2E7D32' : '#616161',
          fontWeight: 600, fontSize: '0.7rem',
        }} />
      ),
    },
  ], []);

  // Cascading filter handlers — clear dependent values when parent changes
  const handleSubcategoriaChange = useCallback((v) => {
    setPf('subcategoria', v);
    setPf('acabado', []);
    setPf('temple', []);
    setPf('aleacion', []);
  }, [setPf]);

  const handleAcabadoChange = useCallback((v) => setPf('acabado', v), [setPf]);
  const handleTempleChange = useCallback((v) => { setPf('temple', v); setPf('aleacion', []); }, [setPf]);
  const handleAleacionChange = useCallback((v) => setPf('aleacion', v), [setPf]);

  const handleSelectSku = useCallback((sku) => {
    setSelectedSku(sku);
    setDrawerOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <Box>
      {/* ── KPI Strip ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <KpiCard value={kpiStats.total.toLocaleString()} label="Total Variantes" loading={loading} delay={0}
          color="#334155" bgColor="#F1F5F9" icon={<ViewListIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={kpiStats.sections} label="Subcategorias" loading={loading} delay={50}
          color="#7C3AED" bgColor="#F3E8FF" icon={<CategoryIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={kpiStats.visible.toLocaleString()} label="Visibles" loading={loading} delay={100}
          color="#2E7D32" bgColor="#E8F5E9" icon={<CheckCircleIcon sx={{ fontSize: 20 }} />} />
      </Stack>

      {/* ── Sticky Command Bar ── */}
      <Fade in timeout={TRANSITION_DURATION}>
        <Paper variant="outlined" sx={{
          mb: 2, borderRadius: 2, overflow: 'hidden',
          position: 'sticky', top: 0, zIndex: 10,
          bgcolor: 'background.paper',
          boxShadow: 2,
        }}>
          {/* Row 1: Search + Actions */}
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar referencia o descripcion..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { height: 36 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />

            <Fade in={!loading}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {visibleSections.length} subcategoria{visibleSections.length !== 1 ? 's' : ''}
              </Typography>
            </Fade>

            <Box sx={{ flexGrow: 1 }} />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            <TbIcon title="Columnas" onClick={(e) => setColMenuAnchor(e.currentTarget)}>
              <ViewColumnOutlinedIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Refrescar datos" onClick={handleRefresh}>
              <RefreshIcon fontSize="small" />
            </TbIcon>
          </Box>

          <Divider />

          {/* Row 2: Filters */}
          <Box sx={{
            px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75,
            overflowX: 'auto', '&::-webkit-scrollbar': { height: 0 }, scrollbarWidth: 'none',
          }}>
            <SmartFilter label="Categoria" options={filterOptions.categorias} value={pf.categoria}
              onChange={(v) => setPf('categoria', v)} color="#7C3AED" bgColor="#F3E8FF" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Subcategoria" options={filterOptions.subcats} value={pf.subcategoria}
              onChange={handleSubcategoriaChange} color="#1565C0" bgColor="#E3F2FD" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Sistema" options={filterOptions.sistemas} value={pf.sistema}
              onChange={(v) => setPf('sistema', v)} color="#0277BD" bgColor="#E1F5FE" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Acabado" options={filterOptions.acabados} value={pf.acabado}
              onChange={handleAcabadoChange} color="#E65100" bgColor="#FFF3E0" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Temple" options={filterOptions.temples} value={pf.temple}
              onChange={handleTempleChange} color="#F57F17" bgColor="#FFF8E1" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Aleacion" options={filterOptions.aleaciones} value={pf.aleacion}
              onChange={handleAleacionChange} color="#2E7D32" bgColor="#E8F5E9" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            {/* Longitud — Autocomplete (exact) + range (min-max) */}
            <SmartFilter label="Longitud" options={filterOptions.longitudes} value={pf.longitud}
              onChange={(v) => { setPf('longitud', v); setPf('longitudMin', ''); setPf('longitudMax', ''); }}
              color="#00695C" bgColor="#E0F2F1" />

            {/* Range inputs — compact min-max */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <TextField
                placeholder="Min"
                type="number"
                value={pf.longitudMin}
                onChange={(e) => { setPf('longitudMin', e.target.value); setPf('longitud', ''); }}
                onFocus={(e) => e.target.select()}
                size="small"
                sx={{ width: 65, '& .MuiOutlinedInput-root': { height: 28, fontSize: '0.7rem', borderRadius: 1.5 } }}
                inputProps={{ step: 0.1 }}
              />
              <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600 }}>-</Typography>
              <TextField
                placeholder="Max"
                type="number"
                value={pf.longitudMax}
                onChange={(e) => { setPf('longitudMax', e.target.value); setPf('longitud', ''); }}
                onFocus={(e) => e.target.select()}
                size="small"
                sx={{ width: 65, '& .MuiOutlinedInput-root': { height: 28, fontSize: '0.7rem', borderRadius: 1.5 } }}
                inputProps={{ step: 0.1 }}
              />
              <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>m</Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            {/* Estado — always <=5 options */}
            <Typography variant="caption" color="text.disabled"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Estado:
            </Typography>
            <FilterChip label="Activo" active={pf.estado === 'Activo'} activeColor="#E8F5E9" activeTextColor="#2E7D32"
              onClick={() => setPf('estado', pf.estado === 'Activo' ? '' : 'Activo')} />
            <FilterChip label="Inactivo" active={pf.estado === 'Inactivo'} activeColor="#ECEFF1" activeTextColor="#616161"
              onClick={() => setPf('estado', pf.estado === 'Inactivo' ? '' : 'Inactivo')} />

            <Fade in={activeFilters > 0}>
              <Box sx={{ display: 'flex' }}>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <TbIcon title="Limpiar filtros" onClick={() => clearPf()}>
                  <ClearAllIcon fontSize="small" />
                </TbIcon>
              </Box>
            </Fade>
          </Box>
        </Paper>
      </Fade>

      {/* ── Subcategoria Sections ── */}
      {loading ? (
        <Box>
          {[...Array(4)].map((_, i) => (
            <Fade in timeout={200 + i * 80} key={i}>
              <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Box sx={{ flex: 1 }}><Skeleton width="40%" height={22} /><Skeleton width="20%" height={16} /></Box>
                  <Skeleton variant="rounded" width={50} height={24} />
                </Stack>
              </Paper>
            </Fade>
          ))}
        </Box>
      ) : visibleSections.length === 0 ? (
        <Fade in>
          <Paper variant="outlined" sx={{ py: 6, textAlign: 'center', borderRadius: 2 }}>
            <Typography color="text.secondary">No se encontraron subcategorias con variantes</Typography>
          </Paper>
        </Fade>
      ) : (
        visibleSections.map((section, idx) => (
          <SubcategoriaSection
            key={section.name || 'null'}
            subcategoria={section.name}
            displayName={section.displayName}
            totalCount={section.count}
            colorIdx={idx}
            search={debouncedSearch}
            categoriaFilter={pf.categoria}
            sistemaFilter={pf.sistema}
            acabadoFilter={pf.acabado}
            templeFilter={pf.temple}
            aleacionFilter={pf.aleacion}
            longitudFilter={pf.longitud}
            longitudMinFilter={pf.longitudMin}
            longitudMaxFilter={pf.longitudMax}
            estadoFilter={pf.estado}
            columns={columns}
            columnVisibility={columnVisibility}
            typeConfig={typeConfig}
            productType={section.productType}
            onSelectSku={handleSelectSku}
            defaultExpanded={idx === 0 || visibleSections.length === 1}
          />
        ))
      )}

      {/* ── Column Visibility Menu ── */}
      <ColumnVisibilityMenu
        anchorEl={colMenuAnchor} open={Boolean(colMenuAnchor)} onClose={() => setColMenuAnchor(null)}
        model={columnVisibility} onChange={setColumnVisibility}
      />

      {/* ── Detail Drawer ── */}
      <VariantDetailDrawer
        open={drawerOpen} onClose={() => setDrawerOpen(false)}
        sku={selectedSku} navigate={navigate}
      />
    </Box>
  );
}
