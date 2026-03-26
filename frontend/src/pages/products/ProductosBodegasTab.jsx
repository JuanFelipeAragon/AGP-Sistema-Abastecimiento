/**
 * Productos-Bodegas Tab — Per-warehouse data for product variants.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, MenuItem, InputAdornment, Typography, Chip,
  Drawer, IconButton, Divider, Grid, Stack,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { formatCOP, formatDate } from '../../utils/formatters';
import productsApi from '../../api/products.api';

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
  return (
    <Chip label={value} size="small" sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, minWidth: 32 }} />
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
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{record.refSiesa}</Typography>
          <Typography variant="body2" color="text.secondary">{record.descProducto}</Typography>
        </Box>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
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
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [abcCostoFilter, setAbcCostoFilter] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'refSiesa', sort: 'asc' }]);

  // Warehouse options for filter dropdown
  const [warehouses, setWarehouses] = useState([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load warehouses for dropdown
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

  const handleRowClick = useCallback((params) => {
    setSelectedRecord(params.row);
    setDrawerOpen(true);
  }, []);

  // Column definitions
  const columns = useMemo(
    () => [
      {
        field: 'refSiesa',
        headerName: 'Ref. SIESA',
        width: 180,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={600} color="primary" sx={{ cursor: 'pointer' }}>
            {params.value}
          </Typography>
        ),
      },
      { field: 'descProducto', headerName: 'Descripcion', width: 220, flex: 1 },
      { field: 'bodega', headerName: 'Bodega', width: 160 },
      { field: 'ciudad', headerName: 'Ciudad', width: 100 },
      {
        field: 'costoPromedio',
        headerName: 'Costo Prom.',
        width: 120,
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value) => value != null ? formatCOP(value) : '',
      },
      {
        field: 'precioUnitario',
        headerName: 'Precio Unit.',
        width: 120,
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value) => value != null ? formatCOP(value) : '',
      },
      {
        field: 'costoTotal',
        headerName: 'Costo Total',
        width: 130,
        type: 'number',
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (value) => value != null ? formatCOP(value) : '',
      },
      {
        field: 'abcRotacionCosto',
        headerName: 'ABC Costo',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => <AbcChip value={params.value} />,
      },
      {
        field: 'abcRotacionVeces',
        headerName: 'ABC Frec.',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => <AbcChip value={params.value} />,
      },
      {
        field: 'fUltimaVenta',
        headerName: 'Ult. Venta',
        width: 110,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'fUltimaCompra',
        headerName: 'Ult. Compra',
        width: 110,
        valueFormatter: (value) => formatDate(value),
      },
    ],
    []
  );

  return (
    <Box>
      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por referencia de variante..."
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
            label="Bodega"
            value={warehouseFilter}
            onChange={(e) => { setWarehouseFilter(e.target.value); setPaginationModel(p => ({ ...p, page: 0 })); }}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name} — {w.city}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            size="small"
            label="ABC Rotacion Costo"
            value={abcCostoFilter}
            onChange={(e) => { setAbcCostoFilter(e.target.value); setPaginationModel(p => ({ ...p, page: 0 })); }}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="A">A</MenuItem>
            <MenuItem value="B">B</MenuItem>
            <MenuItem value="C">C</MenuItem>
            <MenuItem value="D">D</MenuItem>
          </TextField>
        </Grid>
      </Grid>

      {/* Results count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {total.toLocaleString()} registros encontrados
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
          onRowClick={handleRowClick}
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
            '--DataGrid-overlayHeight': '300px',
          }}
        />
      </Box>

      {/* Detail Drawer */}
      <WarehouseDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        record={selectedRecord}
      />
    </Box>
  );
}
