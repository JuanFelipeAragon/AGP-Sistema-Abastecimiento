/**
 * Variantes Tab — Variant (SKU) catalog with server-side pagination,
 * sorting, filters, detail drawer, and cross-navigation to Bodegas.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, MenuItem, InputAdornment, Typography, Chip,
  Drawer, IconButton, Divider, Grid, Stack, Link,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { formatCOP, formatNumber, formatDate } from '../../utils/formatters';
import productsApi from '../../api/products.api';

// ══════════════════════════════════════════════════════════════
// Detail Drawer
// ══════════════════════════════════════════════════════════════
function DetailSection({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="subtitle2"
        color="primary"
        fontWeight={700}
        sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}
      >
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

function VariantDetailDrawer({ open, onClose, sku }) {
  if (!sku) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{sku.ref}</Typography>
          <Typography variant="body2" color="text.secondary">{sku.desc}</Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {sku.cat && <Chip label={sku.cat} size="small" color="primary" variant="outlined" />}
        {sku.sys && <Chip label={sku.sys} size="small" variant="outlined" />}
        <Chip
          label={sku.status}
          size="small"
          sx={{ bgcolor: sku.status === 'Activo' ? '#E8F5E9' : '#ECEFF1', fontWeight: 600 }}
        />
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
// Main Component
// ══════════════════════════════════════════════════════════════
export default function VariantesTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subcatFilter, setSubcatFilter] = useState('');
  const [acabadoFilter, setAcabadoFilter] = useState('');
  const [aleacionFilter, setAleacionFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSku, setSelectedSku] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'ref', sort: 'asc' }]);

  // Filter options loaded from API
  const [filterOptions, setFilterOptions] = useState({
    subcats: [],
    acabados: [],
    aleaciones: [],
  });

  // Read product_id from URL (cross-nav from Productos Base — reserved for future use)
  const productId = searchParams.get('product_id') || '';

  // Debounce search (400 ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load filter dropdown options
  useEffect(() => {
    async function loadFilters() {
      try {
        const [subRes, acabRes, aleRes] = await Promise.all([
          productsApi.getClassifications('subcategorias'),
          productsApi.getAcabados(),
          productsApi.getClassifications('aleaciones'),
        ]);
        setFilterOptions({
          subcats: subRes.items.map((i) => i.originalValue),
          acabados: acabRes.items.map((i) => i.originalValue),
          aleaciones: aleRes.items.map((i) => i.originalValue),
        });
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch variant rows from API
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
          search: debouncedSearch || undefined,
          subcategory: subcatFilter || undefined,
          acabado: acabadoFilter || undefined,
          // aleacion filter — mapped to the same query-param name the backend expects
          aleacion: aleacionFilter || undefined,
          sort_field: sortModel[0]?.field || 'ref',
          sort_order: sortModel[0]?.sort || 'asc',
        };
        const data = await productsApi.getSkus(params);
        const offset = paginationModel.page * paginationModel.pageSize;
        setRows(data.items.map((item, i) => ({ id: offset + i + 1, ...item })));
        setTotal(data.total);
      } catch (err) {
        console.error('Error fetching variantes:', err);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [paginationModel, debouncedSearch, subcatFilter, acabadoFilter, aleacionFilter, sortModel]);

  // Open detail drawer on ref click
  const handleRefClick = useCallback((row) => {
    setSelectedSku(row);
    setDrawerOpen(true);
  }, []);

  // Navigate to Bodegas for a given variant
  const handleBodegasClick = useCallback(
    (ref) => {
      navigate(`/platform/productos/bodegas?variant_ref=${encodeURIComponent(ref)}`);
    },
    [navigate],
  );

  // Column definitions
  const columns = useMemo(
    () => [
      {
        field: 'ref',
        headerName: 'Ref. SIESA',
        width: 180,
        renderCell: (params) => (
          <Typography
            variant="body2"
            fontWeight={600}
            color="primary"
            sx={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              handleRefClick(params.row);
            }}
          >
            {params.value}
          </Typography>
        ),
      },
      { field: 'desc', headerName: 'Descripcion', width: 240, flex: 1 },
      { field: 'sub', headerName: 'Subcategoria', width: 160 },
      { field: 'acabado', headerName: 'Acabado', width: 120 },
      {
        field: 'codAcabado',
        headerName: 'Cod.',
        width: 80,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) =>
          params.value ? (
            <Chip
              label={params.value}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, minWidth: 40 }}
            />
          ) : null,
      },
      { field: 'aleacion', headerName: 'Aleacion', width: 100 },
      {
        field: 'wt',
        headerName: 'Peso UM',
        width: 90,
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value) => (value ? formatNumber(value, 2) : ''),
      },
      {
        field: 'nBod',
        headerName: 'Bodegas',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Link
            component="button"
            variant="body2"
            underline="hover"
            fontWeight={600}
            onClick={(e) => {
              e.stopPropagation();
              handleBodegasClick(params.row.ref);
            }}
            sx={{ cursor: 'pointer' }}
          >
            {params.value ?? '—'}
          </Link>
        ),
      },
      {
        field: 'fCreacion',
        headerName: 'Creacion',
        width: 110,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 90,
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            sx={{
              bgcolor: params.value === 'Activo' ? '#E8F5E9' : '#ECEFF1',
              color: params.value === 'Activo' ? '#2E7D32' : '#616161',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        ),
      },
    ],
    [handleRefClick, handleBodegasClick],
  );

  return (
    <Box>
      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por referencia o descripcion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Filter row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            size="small"
            label="Subcategoria"
            value={subcatFilter}
            onChange={(e) => {
              setSubcatFilter(e.target.value);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            {filterOptions.subcats.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            size="small"
            label="Acabado"
            value={acabadoFilter}
            onChange={(e) => {
              setAcabadoFilter(e.target.value);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            fullWidth
          >
            <MenuItem value="">Todos</MenuItem>
            {filterOptions.acabados.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            size="small"
            label="Aleacion"
            value={aleacionFilter}
            onChange={(e) => {
              setAleacionFilter(e.target.value);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            {filterOptions.aleaciones.map((al) => (
              <MenuItem key={al} value={al}>{al}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Results count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {total.toLocaleString()} variantes encontradas
      </Typography>

      {/* DataGrid */}
      <Box sx={{ height: 'calc(100vh - 320px)', minHeight: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          rowCount={total}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50, 100]}
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
            '--DataGrid-overlayHeight': '300px',
          }}
        />
      </Box>

      {/* Detail Drawer */}
      <VariantDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sku={selectedSku}
      />
    </Box>
  );
}
