/**
 * Productos Base Tab — DataGrid view for base products (products table).
 * Server-side pagination, sorting, filtering, and detail drawer.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, MenuItem, InputAdornment, Typography, Chip,
  Drawer, IconButton, Divider, Grid, Stack, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { formatNumber } from '../../utils/formatters';
import productsApi from '../../api/products.api';

// ══════════════════════════════════════════════════════════════
// Detail Drawer helpers
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

// ══════════════════════════════════════════════════════════════
// Product Detail Drawer
// ══════════════════════════════════════════════════════════════
function ProductDetailDrawer({ open, onClose, product, navigate }) {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!open || !product) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingDetail(true);
      try {
        const data = await productsApi.getBaseProductDetail(product.id);
        if (!cancelled) setDetail(data);
      } catch (err) {
        console.error('Error loading product detail:', err);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open, product]);

  if (!product) return null;

  const handleVariantClick = (variant) => {
    navigate(`/platform/productos/variantes?product_id=${product.id}&variant_ref=${encodeURIComponent(variant.reference_siesa)}`);
  };

  const variants = detail?.variants || [];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, p: 3 } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{product.reference}</Typography>
          <Typography variant="body2" color="text.secondary">{product.description}</Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        <Chip
          label={product.isProfile ? 'Perfil' : 'Otro'}
          size="small"
          sx={{
            bgcolor: product.isProfile ? '#E8F5E9' : '#ECEFF1',
            color: product.isProfile ? '#2E7D32' : '#616161',
            fontWeight: 600,
          }}
        />
        <Chip
          label={product.status}
          size="small"
          sx={{
            bgcolor: product.status === 'Activo' ? '#E8F5E9' : '#ECEFF1',
            color: product.status === 'Activo' ? '#2E7D32' : '#616161',
            fontWeight: 600,
          }}
        />
      </Stack>

      <DetailSection title="Informacion General">
        <Grid container spacing={2}>
          <Grid item xs={6}><DetailField label="Referencia" value={product.reference} /></Grid>
          <Grid item xs={6}><DetailField label="Linea" value={product.linea} /></Grid>
          <Grid item xs={6}><DetailField label="Subcategoria" value={product.subcategoria} /></Grid>
          <Grid item xs={6}><DetailField label="Sistema" value={product.sistema} /></Grid>
          <Grid item xs={6}><DetailField label="Peso UM (kg)" value={formatNumber(product.pesoUm, 4)} /></Grid>
          <Grid item xs={6}><DetailField label="Variantes" value={product.variantCount} /></Grid>
        </Grid>
      </DetailSection>

      <DetailSection title={`Variantes (${variants.length})`}>
        {loadingDetail ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : variants.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No se encontraron variantes.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Ref. SIESA</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Acabado</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Aleacion</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Longitud</TableCell>
                  <TableCell sx={{ width: 40 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {variants.map((v, idx) => (
                  <TableRow
                    key={v.reference_siesa || idx}
                    hover
                    sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                    onClick={() => handleVariantClick(v)}
                  >
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'primary.main' }}>
                      {v.reference_siesa}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{v.acabado || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{v.aleacion || '—'}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }} align="right">
                      {v.longitud != null ? formatNumber(v.longitud, 2) : '—'}
                    </TableCell>
                    <TableCell>
                      <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DetailSection>
    </Drawer>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function ProductosBaseTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Data state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [subcatFilter, setSubcatFilter] = useState('');
  const [sistemaFilter, setSistemaFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos'); // todos | perfiles | otros

  // Pagination & sorting
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'reference', sort: 'asc' }]);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Filter options loaded from classifications
  const [filterOptions, setFilterOptions] = useState({ subcats: [], sistemas: [] });

  // ── Debounce search ──
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Load filter options ──
  useEffect(() => {
    async function loadFilters() {
      try {
        const [subRes, sysRes] = await Promise.all([
          productsApi.getClassifications('subcategorias'),
          productsApi.getClassifications('sistemas'),
        ]);
        setFilterOptions({
          subcats: subRes.items.map((i) => i.originalValue),
          sistemas: sysRes.items.map((i) => i.originalValue),
        });
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // ── Fetch base products ──
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params = {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
          search: debouncedSearch || undefined,
          subcategoria: subcatFilter || undefined,
          sistema: sistemaFilter || undefined,
          is_profile: tipoFilter === 'perfiles' ? true : tipoFilter === 'otros' ? false : undefined,
          sort_field: sortModel[0]?.field || 'reference',
          sort_order: sortModel[0]?.sort || 'asc',
        };
        const data = await productsApi.getBaseProducts(params);
        setRows(data.items);
        setTotal(data.total);
      } catch (err) {
        console.error('Error fetching base products:', err);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [paginationModel, debouncedSearch, subcatFilter, sistemaFilter, tipoFilter, sortModel]);

  // ── Handlers ──
  const handleRowClick = useCallback((params) => {
    setSelectedProduct(params.row);
    setDrawerOpen(true);
  }, []);

  const handleVariantCountClick = useCallback(
    (e, row) => {
      e.stopPropagation();
      navigate(`/platform/productos/variantes?product_id=${row.id}`);
    },
    [navigate]
  );

  const handleTipoChange = useCallback((_, newVal) => {
    if (newVal !== null) {
      setTipoFilter(newVal);
      setPaginationModel((p) => ({ ...p, page: 0 }));
    }
  }, []);

  // ── Columns ──
  const columns = useMemo(
    () => [
      {
        field: 'reference',
        headerName: 'Referencia',
        width: 160,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={600} color="primary" sx={{ cursor: 'pointer' }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'description',
        headerName: 'Descripcion',
        width: 260,
        flex: 1,
      },
      {
        field: 'subcategoria',
        headerName: 'Subcategoria',
        width: 160,
      },
      {
        field: 'sistema',
        headerName: 'Sistema',
        width: 140,
      },
      {
        field: 'pesoUm',
        headerName: 'Peso UM (kg)',
        width: 110,
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value) => (value != null ? formatNumber(value, 4) : ''),
      },
      {
        field: 'isProfile',
        headerName: 'Tipo',
        width: 100,
        renderCell: (params) => (
          <Chip
            label={params.value ? 'Perfil' : 'Otro'}
            size="small"
            sx={{
              bgcolor: params.value ? '#E8F5E9' : '#ECEFF1',
              color: params.value ? '#2E7D32' : '#616161',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        ),
      },
      {
        field: 'variantCount',
        headerName: 'Variantes',
        width: 100,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Typography
            variant="body2"
            fontWeight={500}
            color="primary"
            sx={{
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              '&:hover': { textDecorationStyle: 'solid' },
            }}
            onClick={(e) => handleVariantCountClick(e, params.row)}
          >
            {params.value ?? 0}
          </Typography>
        ),
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
    [handleVariantCountClick]
  );

  return (
    <Box>
      {/* ── Search ── */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por referencia o descripcion..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPaginationModel((p) => ({ ...p, page: 0 }));
          }}
          sx={{ minWidth: 320, maxWidth: 460 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* ── Filters row ── */}
      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
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
            label="Sistema"
            value={sistemaFilter}
            onChange={(e) => {
              setSistemaFilter(e.target.value);
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            fullWidth
          >
            <MenuItem value="">Todos</MenuItem>
            {filterOptions.sistemas.map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <ToggleButtonGroup
            value={tipoFilter}
            exclusive
            onChange={handleTipoChange}
            size="small"
            sx={{ height: 40 }}
          >
            <ToggleButton value="todos" sx={{ px: 2, textTransform: 'none', fontSize: '0.8rem' }}>
              Todos
            </ToggleButton>
            <ToggleButton value="perfiles" sx={{ px: 2, textTransform: 'none', fontSize: '0.8rem' }}>
              Perfiles
            </ToggleButton>
            <ToggleButton value="otros" sx={{ px: 2, textTransform: 'none', fontSize: '0.8rem' }}>
              Otros
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
      </Grid>

      {/* ── Results count ── */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {total.toLocaleString()} productos encontrados
      </Typography>

      {/* ── DataGrid ── */}
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
          onRowClick={handleRowClick}
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
            '--DataGrid-overlayHeight': '300px',
          }}
        />
      </Box>

      {/* ── Detail Drawer ── */}
      <ProductDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={selectedProduct}
        navigate={navigate}
      />
    </Box>
  );
}
