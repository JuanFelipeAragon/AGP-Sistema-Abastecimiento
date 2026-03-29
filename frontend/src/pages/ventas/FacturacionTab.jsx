/**
 * Facturación Tab — Server-side paginated sales DataGrid (66K rows).
 * Power BI-style filters following VariantesTab pattern:
 *   SmartFilter with counts + threshold, usePersistedFilters, column visibility.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box, TextField, Paper, Typography, IconButton, Tooltip, Stack,
  Divider, Chip, Fade, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Grid, useMediaQuery, useTheme,
  Switch, FormControlLabel, Menu,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ScaleIcon from '@mui/icons-material/Scale';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import salesApi from '../../api/sales.api';
import SmartFilter from '../../components/common/SmartFilter';
import usePersistedFilters from '../../hooks/usePersistedFilters';
import { formatCOP, formatDate, formatNumber } from '../../utils/formatters';

// ── Micro-components (following BodegasView pattern) ──
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

function FilterChip({ label, active, onClick, activeColor = 'primary.main', activeTextColor = '#fff' }) {
  return (
    <Chip label={label} size="small" onClick={onClick} variant={active ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600, fontSize: '0.7rem', height: 28, cursor: 'pointer', transition: 'all 0.2s ease',
        bgcolor: active ? activeColor : 'transparent',
        color: active ? activeTextColor : 'text.secondary',
        borderColor: active ? 'transparent' : 'divider',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 1 },
      }}
    />
  );
}

function KpiCard({ value, label, color, bgColor, icon, delay = 0, loading }) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={36} height={36} />
          <Box><Skeleton width={50} height={28} /><Skeleton width={70} height={14} /></Box>
        </Stack>
      </Paper>
    );
  }
  return (
    <Fade in timeout={400 + delay}>
      <Paper variant="outlined" sx={{
        px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1,
        borderLeft: `3px solid ${color}`,
        transition: 'transform 0.15s, box-shadow 0.15s',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 },
      }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{ width: 36, height: 36, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bgColor, flexShrink: 0 }}>
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color, fontSize: { xs: '0.95rem', md: '1.15rem' }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        </Stack>
      </Paper>
    </Fade>
  );
}

function DetailRow({ label, value }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, py: 0.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 130 }}>{label}</Typography>
      <Typography variant="caption" fontWeight={600}>{value || '—'}</Typography>
    </Box>
  );
}

// ── Column visibility ──
const DEFAULT_COL_VIS = {
  invoiceNumber: true, invoiceDate: true, docType: true, customerName: true,
  salespersonName: true, referenceSiesa: true, acabadoCode: false,
  sistemaRaw: true, quantity: true, weightTon: true, currency: true,
  unitPrice: false, subtotal: true, status: false, city: false,
  warehouseName: true, categoriaRaw: false, pricePerKg: false,
};

const COL_LABELS = {
  invoiceNumber: 'Factura', invoiceDate: 'Fecha', docType: 'Tipo Doc.',
  customerName: 'Cliente', salespersonName: 'Vendedor', referenceSiesa: 'Referencia',
  acabadoCode: 'Acabado', sistemaRaw: 'Sistema', quantity: 'Cantidad',
  weightTon: 'Peso (t)', currency: 'Moneda', unitPrice: 'P. Unit.',
  subtotal: 'Subtotal', status: 'Estado', city: 'Ciudad',
  warehouseName: 'Bodega', categoriaRaw: 'Categoría', pricePerKg: 'Precio/KG',
};

const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1' }, { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' }, { value: 4, label: 'Q4' },
];

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const FILTER_DEFAULTS = {
  search: '',
  year: null,
  quarter: null,
  month: null,
  dateFrom: '',
  dateTo: '',
  currency: '',
  status: '',
  docType: '',
  vendedor: '',
  cliente: '',
  sistema: '',
  subcategoria: '',
  categoria: '',
  bodega: '',
};

export default function FacturacionTab() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [filterOptions, setFilterOptions] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COL_VIS);
  const [colMenuAnchor, setColMenuAnchor] = useState(null);

  // Persisted filters (following VariantesTab pattern)
  const [pf, setPf, clearPf] = usePersistedFilters('ventas_facturacion', FILTER_DEFAULTS);

  // Pagination (not persisted)
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortModel, setSortModel] = useState([{ field: 'invoiceDate', sort: 'desc' }]);

  // Detail modal
  const [detailRow, setDetailRow] = useState(null);

  const searchTimeout = useRef(null);

  // Load filter options on mount
  useEffect(() => {
    salesApi.getFilterOptions().then(setFilterOptions).catch(console.error);
  }, []);

  // ── Build API params from persisted filters ──
  const buildParams = useCallback(() => {
    const p = {};
    if (pf.search) p.search = pf.search;
    if (pf.dateFrom) p.date_from = pf.dateFrom;
    if (pf.dateTo) p.date_to = pf.dateTo;
    if (pf.currency) p.currency = pf.currency;
    if (pf.status) p.status = pf.status;
    if (pf.year) p.year = pf.year;
    if (pf.quarter) p.quarter = pf.quarter;
    if (pf.month) p.month = pf.month;
    if (pf.sistema) p.sistema = pf.sistema;
    if (pf.subcategoria) p.subcategoria = pf.subcategoria;
    if (pf.categoria) p.categoria = pf.categoria;
    if (pf.docType) p.doc_type = pf.docType;
    if (pf.vendedor && filterOptions?.vendedores) {
      const v = filterOptions.vendedores.find((x) => x.name === pf.vendedor);
      if (v) p.salesperson_id = v.id;
    }
    if (pf.cliente && filterOptions?.clientes) {
      const c = filterOptions.clientes.find((x) => x.name === pf.cliente);
      if (c) p.customer_id = c.id;
    }
    if (pf.bodega && filterOptions?.bodegas) {
      const b = filterOptions.bodegas.find((x) => x.name === pf.bodega);
      if (b) p.warehouse_id = b.id;
    }
    p.sort_field = sortModel[0]?.field || 'invoiceDate';
    p.sort_order = sortModel[0]?.sort || 'desc';
    p.page = page + 1;
    p.page_size = pageSize;
    return p;
  }, [pf, filterOptions, sortModel, page, pageSize]);

  const buildSummaryParams = useCallback(() => {
    const p = buildParams();
    delete p.page; delete p.page_size; delete p.sort_field; delete p.sort_order; delete p.search;
    return p;
  }, [buildParams]);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesApi.getSales(buildParams());
      setRows(res.items || []);
      setTotal(res.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [buildParams]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await salesApi.getSummary(buildSummaryParams());
      setSummary(res);
    } catch (err) { console.error(err); }
    finally { setSummaryLoading(false); }
  }, [buildSummaryParams]);

  useEffect(() => { loadSales(); }, [loadSales]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleRefresh = async () => {
    setSpinning(true);
    await Promise.all([loadSales(), loadSummary()]);
    setSpinning(false);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setPf('search', val); setPage(0); }, 400);
  };

  const set = (key, val) => { setPf(key, val); setPage(0); };

  const handleExport = () => {
    if (!rows.length) return;
    const headers = ['Factura', 'Fecha', 'Tipo', 'Cliente', 'Vendedor', 'Referencia', 'Acabado', 'Sistema', 'Categoria', 'Cant', 'Peso(t)', 'Mon', 'P.Unit', 'Subtotal', 'Neto', 'Estado', 'Ciudad', 'Bodega'];
    const csvRows = rows.map((r) => [
      r.invoiceNumber, r.invoiceDate?.slice(0, 10), r.docType, r.customerName, r.salespersonName,
      r.referenceSiesa, r.acabadoCode, r.sistemaRaw, r.categoriaRaw, r.quantity, r.weightTon,
      r.currency, r.unitPrice, r.subtotal, r.netTotal, r.status, r.city, r.warehouseName,
    ].map((v) => `"${v ?? ''}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'facturacion.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── SmartFilter option lists (with counts from RPC) ──
  const vendedorNames = filterOptions?.vendedores?.map((v) => v.name) || [];
  const clienteNames = filterOptions?.clientes?.map((c) => c.name) || [];
  const bodegaNames = filterOptions?.bodegas?.map((b) => b.name) || [];
  const docTypeOptions = filterOptions?.doc_types || [];
  const sistemaOptions = filterOptions?.sistemas || [];
  const subcategoriaOptions = filterOptions?.subcategorias || [];
  const categoriaOptions = filterOptions?.categorias || [];

  // Count active filters (excluding search)
  const activeFilters = useMemo(() =>
    Object.entries(pf).filter(([k, v]) => k !== 'search' && v !== null && v !== '' && v !== FILTER_DEFAULTS[k]).length
  , [pf]);

  // KPIs — gracefully handle both old/new response shapes
  const copVal = summary?.subtotalCop || summary?.totalNetCop || 0;
  const usdVal = summary?.subtotalUsd || summary?.totalNetUsd || 0;
  const invoicesVal = summary?.uniqueInvoices || summary?.totalInvoices || 0;

  const kpis = [
    { value: summaryLoading ? '—' : formatNumber(summary?.totalQuantity), label: 'Unidades Vendidas', color: '#1565C0', bgColor: '#E3F2FD', icon: <ViewInArIcon sx={{ fontSize: 20, color: '#1565C0' }} />, delay: 0 },
    { value: summaryLoading ? '—' : `${formatNumber(summary?.totalWeightTon, 1)} t`, label: 'Peso Vendido', color: '#E65100', bgColor: '#FFF3E0', icon: <ScaleIcon sx={{ fontSize: 20, color: '#E65100' }} />, delay: 50 },
    { value: summaryLoading ? '—' : formatCOP(copVal), label: 'Subtotal COP', color: '#2E7D32', bgColor: '#E8F5E9', icon: <AttachMoneyIcon sx={{ fontSize: 20, color: '#2E7D32' }} />, delay: 100 },
    { value: summaryLoading ? '—' : `$${formatNumber(usdVal, 0)}`, label: 'Subtotal USD', color: '#1B5E20', bgColor: '#F1F8E9', icon: <TrendingUpIcon sx={{ fontSize: 20, color: '#1B5E20' }} />, delay: 150 },
    { value: summaryLoading ? '—' : formatNumber(invoicesVal), label: 'Facturas Únicas', color: '#6A1B9A', bgColor: '#F3E5F5', icon: <ReceiptLongIcon sx={{ fontSize: 20, color: '#6A1B9A' }} />, delay: 200 },
  ];

  // ── DataGrid columns ──
  const columns = useMemo(() => {
    const all = [
      { field: 'invoiceNumber', headerName: 'Factura', flex: 1.1, minWidth: 100 },
      { field: 'invoiceDate', headerName: 'Fecha', flex: 0.9, minWidth: 90, renderCell: (p) => formatDate(p.value) },
      { field: 'docType', headerName: 'Tipo', flex: 0.9, minWidth: 90,
        renderCell: (p) => p.value ? <Chip label={p.value} size="small" sx={{ fontSize: '0.6rem', height: 20,
          bgcolor: p.value === 'Nota Crédito' ? '#FFEBEE' : p.value === 'Exportación' ? '#E3F2FD' : '#F5F5F5',
          color: p.value === 'Nota Crédito' ? '#C62828' : p.value === 'Exportación' ? '#1565C0' : 'text.primary',
        }} /> : '—' },
      { field: 'customerName', headerName: 'Cliente', flex: 1.8, minWidth: 130 },
      { field: 'salespersonName', headerName: 'Vendedor', flex: 1.3, minWidth: 110 },
      { field: 'referenceSiesa', headerName: 'Referencia', flex: 1.1, minWidth: 100 },
      { field: 'acabadoCode', headerName: 'Acabado', flex: 0.8, minWidth: 75 },
      { field: 'sistemaRaw', headerName: 'Sistema', flex: 0.9, minWidth: 85 },
      { field: 'categoriaRaw', headerName: 'Categoría', flex: 0.9, minWidth: 90 },
      { field: 'quantity', headerName: 'Cant.', flex: 0.7, minWidth: 65, type: 'number', renderCell: (p) => formatNumber(p.value) },
      { field: 'weightTon', headerName: 'Peso (t)', flex: 0.8, minWidth: 75, type: 'number', renderCell: (p) => formatNumber(p.value, 3) },
      { field: 'currency', headerName: 'Mon.', flex: 0.5, minWidth: 55 },
      { field: 'unitPrice', headerName: 'P. Unit.', flex: 1, minWidth: 90, type: 'number', renderCell: (p) => formatNumber(p.value, 2) },
      { field: 'pricePerKg', headerName: 'Precio/KG', flex: 0.9, minWidth: 85, type: 'number', renderCell: (p) => formatNumber(p.value, 4) },
      { field: 'subtotal', headerName: 'Subtotal', flex: 1.2, minWidth: 110, type: 'number',
        renderCell: (p) => (p.row.currency === 'USD' ? `$${formatNumber(p.value, 2)}` : formatCOP(p.value)) },
      { field: 'status', headerName: 'Estado', flex: 0.7, minWidth: 75,
        renderCell: (p) => <Chip label={p.value} size="small" color={p.value === 'aprobada' ? 'success' : 'default'} sx={{ fontSize: '0.65rem', height: 20 }} /> },
      { field: 'city', headerName: 'Ciudad', flex: 0.9, minWidth: 85 },
      { field: 'warehouseName', headerName: 'Bodega', flex: 0.9, minWidth: 85 },
    ];
    return all.map((c) => ({ ...c, align: 'center', headerAlign: 'center' }));
  }, []);

  const visibleColumns = useMemo(() =>
    Object.fromEntries(Object.entries(columnVisibility).map(([k, v]) => [k, v]))
  , [columnVisibility]);

  return (
    <Box>
      {/* KPI Strip */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} loading={summaryLoading} />)}
      </Stack>

      {/* Command Bar (following VariantesTab pattern) */}
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        {/* Row 1: Search + actions */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1 }}>
          <TextField
            placeholder="Buscar factura, referencia, cliente..."
            size="small"
            defaultValue={pf.search}
            onChange={handleSearchChange}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
            sx={{ width: isSmall ? '100%' : 300 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {loading ? '...' : `${formatNumber(total)} registros`}
          </Typography>
          <Box flex={1} />
          <Divider orientation="vertical" flexItem />
          <TbIcon title="Columnas" onClick={(e) => setColMenuAnchor(e.currentTarget)}>
            <ViewColumnOutlinedIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Exportar página" onClick={handleExport}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Refrescar datos" onClick={handleRefresh}>
            <RefreshIcon fontSize="small" sx={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          </TbIcon>
        </Stack>

        <Divider />

        {/* Row 2: All filters (SmartFilter pattern from VariantesTab) */}
        <Box sx={{
          px: 1.5, py: 0.75,
          display: 'flex', alignItems: 'center', gap: 0.75,
          overflowX: 'auto', scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}>
          {/* Tipo Documento — SmartFilter with counts */}
          <SmartFilter label="Tipo Doc." options={docTypeOptions} value={pf.docType}
            onChange={(v) => set('docType', v)}
            color="#C62828" bgColor="#FFEBEE" />

          <Divider orientation="vertical" flexItem />

          {/* Año — FilterChips (always few values) */}
          {!isSmall && <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Año:</Typography>}
          {(filterOptions?.years || []).map((y) => (
            <FilterChip key={y} label={String(y)} active={pf.year === y}
              onClick={() => set('year', pf.year === y ? null : y)} />
          ))}

          <Divider orientation="vertical" flexItem />

          {/* Trimestre — FilterChips (always 4) */}
          {!isSmall && <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Trim:</Typography>}
          {QUARTER_OPTIONS.map((q) => (
            <FilterChip key={q.value} label={q.label} active={pf.quarter === q.value}
              activeColor="#7B1FA2"
              onClick={() => set('quarter', pf.quarter === q.value ? null : q.value)} />
          ))}

          <Divider orientation="vertical" flexItem />

          {/* Mes — SmartFilter (12 values → Autocomplete) */}
          <SmartFilter label="Mes" options={MONTH_NAMES}
            value={pf.month ? MONTH_NAMES[pf.month - 1] : ''}
            onChange={(v) => { const idx = MONTH_NAMES.indexOf(v); set('month', idx >= 0 ? idx + 1 : null); }}
            color="#00695C" bgColor="#E0F2F1" threshold={0} />

          <Divider orientation="vertical" flexItem />

          {/* Moneda — FilterChips (2 values) */}
          {!isSmall && <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Mon:</Typography>}
          <FilterChip label="COP" active={pf.currency === 'COP'} activeColor="#2E7D32"
            onClick={() => set('currency', pf.currency === 'COP' ? '' : 'COP')} />
          <FilterChip label="USD" active={pf.currency === 'USD'} activeColor="#1565C0"
            onClick={() => set('currency', pf.currency === 'USD' ? '' : 'USD')} />

          <Divider orientation="vertical" flexItem />

          {/* Estado — FilterChips (2 values) */}
          <FilterChip label="Aprobada" active={pf.status === 'aprobada'} activeColor="#2E7D32"
            onClick={() => set('status', pf.status === 'aprobada' ? '' : 'aprobada')} />
          <FilterChip label="Anulada" active={pf.status === 'anulada'} activeColor="#d32f2f"
            onClick={() => set('status', pf.status === 'anulada' ? '' : 'anulada')} />

          <Divider orientation="vertical" flexItem />

          {/* Vendedor — SmartFilter (12 → chips with threshold) */}
          <SmartFilter label="Vendedor" options={vendedorNames} value={pf.vendedor}
            onChange={(v) => set('vendedor', v)}
            color="#1565C0" bgColor="#E3F2FD" threshold={15} />

          <Divider orientation="vertical" flexItem />

          {/* Cliente — SmartFilter (354 → Autocomplete forced) */}
          <SmartFilter label="Cliente" options={clienteNames} value={pf.cliente}
            onChange={(v) => set('cliente', v)}
            color="#6A1B9A" bgColor="#F3E5F5" threshold={0} />

          <Divider orientation="vertical" flexItem />

          {/* Sistema — SmartFilter with counts */}
          <SmartFilter label="Sistema" options={sistemaOptions} value={pf.sistema}
            onChange={(v) => set('sistema', v)}
            color="#E65100" bgColor="#FFF3E0" />

          <Divider orientation="vertical" flexItem />

          {/* Subcategoría — SmartFilter with counts */}
          <SmartFilter label="Subcategoría" options={subcategoriaOptions} value={pf.subcategoria}
            onChange={(v) => set('subcategoria', v)}
            color="#0277BD" bgColor="#E1F5FE" />

          <Divider orientation="vertical" flexItem />

          {/* Categoría — SmartFilter with counts */}
          <SmartFilter label="Categoría" options={categoriaOptions} value={pf.categoria}
            onChange={(v) => set('categoria', v)}
            color="#7C3AED" bgColor="#F3E8FF" />

          <Divider orientation="vertical" flexItem />

          {/* Bodega — SmartFilter (10 → chips) */}
          <SmartFilter label="Bodega" options={bodegaNames} value={pf.bodega}
            onChange={(v) => set('bodega', v)}
            color="#37474F" bgColor="#ECEFF1" threshold={15} />

          <Divider orientation="vertical" flexItem />

          {/* Date range */}
          {!isSmall && <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>Desde:</Typography>}
          <TextField type="date" size="small" value={pf.dateFrom}
            onChange={(e) => set('dateFrom', e.target.value)}
            sx={{ width: 135, flexShrink: 0 }} InputLabelProps={{ shrink: true }} />
          {!isSmall && <Typography variant="caption" color="text.disabled">Hasta:</Typography>}
          <TextField type="date" size="small" value={pf.dateTo}
            onChange={(e) => set('dateTo', e.target.value)}
            sx={{ width: 135, flexShrink: 0 }} InputLabelProps={{ shrink: true }} />

          {/* Clear all */}
          {activeFilters > 0 && (
            <Fade in>
              <Chip icon={<ClearAllIcon sx={{ fontSize: 16 }} />} label={`Limpiar (${activeFilters})`} size="small"
                onDelete={() => { clearPf(); setPage(0); }} onClick={() => { clearPf(); setPage(0); }}
                color="error" variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.7rem', flexShrink: 0 }} />
            </Fade>
          )}
        </Box>
      </Paper>

      {/* DataGrid */}
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          columnVisibilityModel={visibleColumns}
          onColumnVisibilityModelChange={setColumnVisibility}
          density="compact"
          autoHeight
          disableRowSelectionOnClick
          paginationMode="server"
          rowCount={total}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
          pageSizeOptions={[25, 50, 100, 200]}
          sortModel={sortModel}
          onSortModelChange={(m) => { setSortModel(m); setPage(0); }}
          sortingMode="server"
          loading={loading}
          onRowDoubleClick={(p) => setDetailRow(p.row)}
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#0F172A', color: '#fff' } }}
        />
      </Paper>

      {/* Column Visibility Menu */}
      <Menu anchorEl={colMenuAnchor} open={!!colMenuAnchor} onClose={() => setColMenuAnchor(null)}
        PaperProps={{ sx: { maxHeight: 400, minWidth: 200, p: 1 } }}>
        <Typography variant="caption" fontWeight={700} sx={{ px: 1, pb: 0.5 }}>Columnas visibles</Typography>
        {Object.entries(COL_LABELS).map(([key, label]) => (
          <FormControlLabel key={key} sx={{ display: 'flex', mx: 0, '& .MuiTypography-root': { fontSize: '0.8rem' } }}
            control={<Switch size="small" checked={columnVisibility[key] !== false}
              onChange={(e) => setColumnVisibility((prev) => ({ ...prev, [key]: e.target.checked }))} />}
            label={label} />
        ))}
        <Divider sx={{ my: 0.5 }} />
        <Button size="small" fullWidth onClick={() => setColumnVisibility(DEFAULT_COL_VIS)}>
          Restaurar por defecto
        </Button>
      </Menu>

      {/* Detail Modal */}
      <Dialog open={!!detailRow} onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth
        TransitionComponent={Fade} TransitionProps={{ timeout: 300 }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ReceiptLongIcon color="primary" />
            <Typography fontWeight={700}>{detailRow?.invoiceNumber || 'Factura'}</Typography>
            {detailRow?.docType && <Chip label={detailRow.docType} size="small" variant="outlined" />}
            {detailRow?.status && <Chip label={detailRow.status} size="small" color={detailRow.status === 'aprobada' ? 'success' : 'default'} />}
          </Stack>
          <IconButton size="small" onClick={() => setDetailRow(null)}><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {detailRow && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Identificación</Typography>
                <DetailRow label="Factura" value={detailRow.invoiceNumber} />
                <DetailRow label="Tipo Documento" value={detailRow.docType} />
                <DetailRow label="Prefijo" value={detailRow.docPrefix} />
                <DetailRow label="Pedido" value={detailRow.orderNumber} />
                <DetailRow label="Referencia" value={detailRow.referenceSiesa} />
                <DetailRow label="Acabado" value={detailRow.acabadoCode} />
                <DetailRow label="Sistema" value={detailRow.sistemaRaw} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Partes</Typography>
                <DetailRow label="Cliente" value={detailRow.customerName} />
                <DetailRow label="Vendedor" value={detailRow.salespersonName} />
                <DetailRow label="Bodega" value={detailRow.warehouseName} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Fechas</Typography>
                <DetailRow label="Fecha Factura" value={formatDate(detailRow.invoiceDate)} />
                <DetailRow label="Fecha Pedido" value={formatDate(detailRow.orderDate)} />
                <DetailRow label="Fecha Entrega" value={formatDate(detailRow.deliveryDate)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Valores</Typography>
                <DetailRow label="Moneda" value={detailRow.currency} />
                <DetailRow label="Cantidad" value={formatNumber(detailRow.quantity)} />
                <DetailRow label="Peso (ton)" value={formatNumber(detailRow.weightTon, 4)} />
                <DetailRow label="Precio Unit." value={formatNumber(detailRow.unitPrice, 2)} />
                <DetailRow label="Precio/KG" value={formatNumber(detailRow.pricePerKg, 4)} />
                <DetailRow label="Subtotal" value={detailRow.currency === 'USD' ? `$${formatNumber(detailRow.subtotal, 2)}` : formatCOP(detailRow.subtotal)} />
                <DetailRow label="Impuestos" value={detailRow.currency === 'USD' ? `$${formatNumber(detailRow.taxes, 2)}` : formatCOP(detailRow.taxes)} />
                <DetailRow label="Descuentos" value={detailRow.currency === 'USD' ? `$${formatNumber(detailRow.discounts, 2)}` : formatCOP(detailRow.discounts)} />
                <DetailRow label="Neto" value={detailRow.currency === 'USD' ? `$${formatNumber(detailRow.netTotal, 2)}` : formatCOP(detailRow.netTotal)} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>Geografía</Typography>
                <DetailRow label="Ciudad" value={detailRow.city} />
                <DetailRow label="Departamento" value={detailRow.department} />
                <DetailRow label="País" value={detailRow.country} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailRow(null)}>Cerrar</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
