/**
 * VerTodosView — "Ver Todos" dashboard for Productos module.
 * Shows KPI strip + 3 mini DataGrids (Base Products, Variants, Warehouse).
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Chip, Button, Grid, Skeleton,
  Alert,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import productsApi from '../../api/products.api';
import { formatCOP, formatNumber, formatDate } from '../../utils/formatters';

// ══════════════════════════════════════════════════════════════
// KPI Card Component
// ══════════════════════════════════════════════════════════════
function KpiCard({ icon: IconComponent, label, value, isWarning, loading }) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 160 }}>
        <Skeleton width="60%" height={20} />
        <Skeleton width="40%" height={32} sx={{ mt: 0.5 }} />
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 160 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <IconComponent sx={{ fontSize: 20, color: isWarning ? 'warning.main' : 'primary.main' }} />
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={700} color={isWarning ? 'warning.main' : 'text.primary'}>
        {value}
      </Typography>
    </Paper>
  );
}

// ══════════════════════════════════════════════════════════════
// Mini Grid Card Component
// ══════════════════════════════════════════════════════════════
function MiniGridCard({ icon: Icon, title, total, path, rows, columns, loading, navigate }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1.5, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
          <Chip label={formatNumber(total)} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600 }} />
        </Box>
        <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate(path)}>
          Ver todos
        </Button>
      </Box>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        density="compact"
        hideFooter
        disableColumnMenu
        disableRowSelectionOnClick
        autoHeight
        onRowClick={() => navigate(path)}
        sx={{
          border: 0,
          '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
        }}
      />
    </Paper>
  );
}

// ══════════════════════════════════════════════════════════════
// Column Definitions
// ══════════════════════════════════════════════════════════════
const baseProductColumns = [
  { field: 'reference', headerName: 'Referencia', width: 140 },
  { field: 'description', headerName: 'Descripcion', flex: 1, minWidth: 160 },
  { field: 'subcategoria', headerName: 'Subcategoria', width: 140 },
  {
    field: 'variantCount',
    headerName: 'Variantes',
    width: 90,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'status',
    headerName: 'Estado',
    width: 80,
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
];

const variantColumns = [
  { field: 'ref', headerName: 'Ref. SIESA', width: 160 },
  { field: 'desc', headerName: 'Descripcion', flex: 1, minWidth: 160 },
  { field: 'acabado', headerName: 'Acabado', width: 110 },
  { field: 'aleacion', headerName: 'Aleacion', width: 90 },
  {
    field: 'status',
    headerName: 'Estado',
    width: 80,
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
];

const abcColorMap = {
  A: { bgcolor: '#E8F5E9', color: '#2E7D32' },
  B: { bgcolor: '#E3F2FD', color: '#1565C0' },
  C: { bgcolor: '#FFF3E0', color: '#E65100' },
  D: { bgcolor: '#FFEBEE', color: '#C62828' },
};

const warehouseColumns = [
  { field: 'refSiesa', headerName: 'Ref. SIESA', width: 160 },
  { field: 'bodega', headerName: 'Bodega', width: 140 },
  {
    field: 'costoPromedio',
    headerName: 'Costo Prom.',
    width: 120,
    valueFormatter: (value) => (value != null ? formatCOP(value) : ''),
  },
  {
    field: 'abcRotacionCosto',
    headerName: 'ABC Costo',
    width: 90,
    renderCell: (params) => {
      if (!params.value) return null;
      const colors = abcColorMap[params.value] || { bgcolor: '#ECEFF1', color: '#616161' };
      return (
        <Chip
          label={params.value}
          size="small"
          sx={{ ...colors, fontWeight: 600, fontSize: '0.7rem' }}
        />
      );
    },
  },
  {
    field: 'fUltimaVenta',
    headerName: 'Ult. Venta',
    width: 100,
    valueFormatter: (value) => formatDate(value),
  },
];

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function VerTodosView() {
  const navigate = useNavigate();

  // KPI state
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);

  // Mini grid states
  const [baseProducts, setBaseProducts] = useState({ rows: [], total: 0, loading: true });
  const [variants, setVariants] = useState({ rows: [], total: 0, loading: true });
  const [warehouse, setWarehouse] = useState({ rows: [], total: 0, loading: true });

  // Load all data in parallel on mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const promises = [
        // Summary KPIs
        productsApi.getProductsSummary()
          .then((data) => {
            if (!cancelled) {
              setSummary(data);
              setSummaryLoading(false);
            }
          })
          .catch((err) => {
            if (!cancelled) {
              console.error('Error loading summary:', err);
              setSummaryError('No se pudieron cargar los indicadores.');
              setSummaryLoading(false);
            }
          }),

        // Base products
        productsApi.getBaseProducts({ page: 1, page_size: 10 })
          .then((data) => {
            if (!cancelled) {
              setBaseProducts({
                rows: (data.items || []).map((item, i) => ({ id: i + 1, ...item })),
                total: data.total || 0,
                loading: false,
              });
            }
          })
          .catch((err) => {
            if (!cancelled) {
              console.error('Error loading base products:', err);
              setBaseProducts({ rows: [], total: 0, loading: false });
            }
          }),

        // Variants (SKUs)
        productsApi.getSkus({ page: 1, page_size: 10 })
          .then((data) => {
            if (!cancelled) {
              setVariants({
                rows: (data.items || []).map((item, i) => ({ id: i + 1, ...item })),
                total: data.total || 0,
                loading: false,
              });
            }
          })
          .catch((err) => {
            if (!cancelled) {
              console.error('Error loading variants:', err);
              setVariants({ rows: [], total: 0, loading: false });
            }
          }),

        // Warehouse records
        productsApi.getWarehouseRecords({ page: 1, page_size: 10 })
          .then((data) => {
            if (!cancelled) {
              setWarehouse({
                rows: (data.items || []).map((item, i) => ({ id: i + 1, ...item })),
                total: data.total || 0,
                loading: false,
              });
            }
          })
          .catch((err) => {
            if (!cancelled) {
              console.error('Error loading warehouse records:', err);
              setWarehouse({ rows: [], total: 0, loading: false });
            }
          }),
      ];

      await Promise.all(promises);
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ── KPI values ──
  const kpis = useMemo(() => {
    if (!summary) return [];
    const { products, variants: v, warehouse: w } = summary;
    return [
      {
        icon: Inventory2Icon,
        label: 'Total Productos',
        value: formatNumber(products.total),
        isWarning: false,
      },
      {
        icon: AccountTreeIcon,
        label: 'Perfiles / Otros',
        value: `${formatNumber(products.profiles)} / ${formatNumber(products.accessories)}`,
        isWarning: false,
      },
      {
        icon: AccountTreeIcon,
        label: 'Total Variantes',
        value: formatNumber(v.total),
        isWarning: false,
      },
      {
        icon: WarningAmberIcon,
        label: 'Sin Bodega',
        value: formatNumber(v.withoutWarehouse),
        isWarning: v.withoutWarehouse > 0,
      },
      {
        icon: AttachMoneyIcon,
        label: 'Valor Inventario',
        value: formatCOP(w.totalInventoryValue),
        isWarning: false,
      },
      {
        icon: TrendingDownIcon,
        label: 'Sin Venta >6m',
        value: formatNumber(w.noSales6m),
        isWarning: w.noSales6m > 0,
      },
    ];
  }, [summary]);

  return (
    <Box>
      {/* ── KPI Strip ── */}
      {summaryError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {summaryError}
        </Alert>
      )}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        {summaryLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <KpiCard key={i} icon={Inventory2Icon} label="" value="" loading />
            ))
          : kpis.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} loading={false} />
            ))
        }
      </Box>

      {/* ── Mini Grids ── */}
      <Grid container spacing={2}>
        {/* Productos Base */}
        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
          <MiniGridCard
            icon={Inventory2Icon}
            title="Productos Base"
            total={baseProducts.total}
            path="/platform/productos/base"
            rows={baseProducts.rows}
            columns={baseProductColumns}
            loading={baseProducts.loading}
            navigate={navigate}
          />
        </Grid>

        {/* Variantes */}
        <Grid size={{ xs: 12, md: 6, xl: 4 }}>
          <MiniGridCard
            icon={AccountTreeIcon}
            title="Variantes"
            total={variants.total}
            path="/platform/productos/variantes"
            rows={variants.rows}
            columns={variantColumns}
            loading={variants.loading}
            navigate={navigate}
          />
        </Grid>

        {/* Bodegas */}
        <Grid size={{ xs: 12, md: 12, xl: 4 }}>
          <MiniGridCard
            icon={WarehouseIcon}
            title="Productos-Bodegas"
            total={warehouse.total}
            path="/platform/productos/bodegas"
            rows={warehouse.rows}
            columns={warehouseColumns}
            loading={warehouse.loading}
            navigate={navigate}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
