/**
 * VerTodosView — "Ver Todos" dashboard for Productos module.
 * Shows KPI strip + 3 DataGrids (Base Products, Variants, Warehouse).
 * Designed to fill the full content area on wide/4K screens.
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Chip, Button, Skeleton, Alert, Fade, useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
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
// KPI Card Component (Bodegas pattern)
// ══════════════════════════════════════════════════════════════
function KpiCard({ icon: IconComponent, label, value, isWarning, loading, color, delay = 0 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Color palette per card
  const palette = isWarning
    ? { border: '#E53935', iconBg: isDark ? 'rgba(229,57,53,0.12)' : '#FFEBEE', iconColor: '#E53935' }
    : {
        border: color || theme.palette.primary.main,
        iconBg: color
          ? (isDark ? `${color}1F` : `${color}14`)
          : (isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF'),
        iconColor: color || theme.palette.primary.main,
      };

  if (loading) {
    return (
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          minWidth: 110,
          p: 1.5,
          borderRadius: 2,
          borderLeft: `3px solid ${theme.palette.divider}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Skeleton variant="circular" width={36} height={36} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="70%" height={24} sx={{ mt: 0.5 }} />
        </Box>
      </Paper>
    );
  }

  return (
    <Fade in timeout={400} style={{ transitionDelay: `${delay}ms` }}>
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          minWidth: 110,
          p: 1.5,
          borderRadius: 2,
          borderLeft: `3px solid ${palette.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          transition: 'transform 0.18s, box-shadow 0.18s',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[3],
          },
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: palette.iconBg,
            flexShrink: 0,
          }}
        >
          <IconComponent sx={{ fontSize: 18, color: palette.iconColor }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            noWrap
            sx={{ lineHeight: 1.2, display: 'block' }}
          >
            {label}
          </Typography>
          <Typography
            variant="h6"
            fontWeight={700}
            noWrap
            color={isWarning ? '#E53935' : 'text.primary'}
            sx={{ lineHeight: 1.3 }}
          >
            {value}
          </Typography>
        </Box>
      </Paper>
    </Fade>
  );
}

// ══════════════════════════════════════════════════════════════
// Mini Grid Card Component
// ══════════════════════════════════════════════════════════════
function MiniGridCard({ icon: Icon, title, total, path, rows, columns, loading, navigate, height }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: height || 'auto',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          py: 1.5,
          bgcolor: isDark ? 'grey.900' : 'grey.50',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
          <Chip
            label={formatNumber(total)}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, height: 24 }}
          />
        </Box>
        <Button
          size="small"
          endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
          onClick={() => navigate(path)}
          sx={{ fontWeight: 600, fontSize: '0.78rem' }}
        >
          Ver todos
        </Button>
      </Box>

      {/* DataGrid — fills remaining card height */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          hideFooter
          disableColumnMenu
          disableRowSelectionOnClick
          onRowClick={() => navigate(path)}
          sx={{
            border: 0,
            height: '100%',
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
            '& .MuiDataGrid-virtualScroller': { minHeight: 100 },
          }}
        />
      </Box>
    </Paper>
  );
}

// ══════════════════════════════════════════════════════════════
// Column Definitions
// ══════════════════════════════════════════════════════════════
const statusChipSx = (value) => ({
  bgcolor: value === 'Activo' ? '#E8F5E9' : '#ECEFF1',
  color: value === 'Activo' ? '#2E7D32' : '#616161',
  fontWeight: 600,
  fontSize: '0.7rem',
});

const baseProductColumns = [
  { field: 'reference', headerName: 'Referencia', flex: 1.3, minWidth: 110, align: 'center', headerAlign: 'center' },
  { field: 'description', headerName: 'Descripcion', flex: 2, minWidth: 140, align: 'center', headerAlign: 'center' },
  { field: 'subcategoria', headerName: 'Subcategoria', flex: 1.3, minWidth: 110, align: 'center', headerAlign: 'center' },
  {
    field: 'variantCount',
    headerName: 'Variantes',
    flex: 0.7,
    minWidth: 80,
    align: 'center',
    headerAlign: 'center',
  },
  {
    field: 'status',
    headerName: 'Estado',
    flex: 0.7,
    minWidth: 80,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <Chip label={params.value} size="small" sx={statusChipSx(params.value)} />
    ),
  },
];

const variantColumns = [
  { field: 'ref', headerName: 'Ref. SIESA', flex: 1.3, minWidth: 120, align: 'center', headerAlign: 'center' },
  { field: 'desc', headerName: 'Descripcion', flex: 2, minWidth: 140, align: 'center', headerAlign: 'center' },
  { field: 'acabado', headerName: 'Acabado', flex: 1, minWidth: 90, align: 'center', headerAlign: 'center' },
  { field: 'aleacion', headerName: 'Aleacion', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center' },
  {
    field: 'status',
    headerName: 'Estado',
    flex: 0.7,
    minWidth: 80,
    align: 'center',
    headerAlign: 'center',
    renderCell: (params) => (
      <Chip label={params.value} size="small" sx={statusChipSx(params.value)} />
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
  { field: 'refSiesa', headerName: 'Ref. SIESA', flex: 1.3, minWidth: 120, align: 'center', headerAlign: 'center' },
  { field: 'bodega', headerName: 'Bodega', flex: 1.3, minWidth: 120, align: 'center', headerAlign: 'center' },
  {
    field: 'costoPromedio',
    headerName: 'Costo Prom.',
    flex: 1,
    minWidth: 100,
    align: 'center',
    headerAlign: 'center',
    valueFormatter: (value) => (value != null ? formatCOP(value) : ''),
  },
  {
    field: 'abcRotacionCosto',
    headerName: 'ABC Costo',
    flex: 0.8,
    minWidth: 80,
    align: 'center',
    headerAlign: 'center',
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
    flex: 0.9,
    minWidth: 90,
    align: 'center',
    headerAlign: 'center',
    valueFormatter: (value) => formatDate(value),
  },
];

// Number of preview rows to fetch for each mini grid
const PREVIEW_ROWS = 15;

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
        productsApi.getBaseProducts({ page: 1, page_size: PREVIEW_ROWS })
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
        productsApi.getSkus({ page: 1, page_size: PREVIEW_ROWS })
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
        productsApi.getWarehouseRecords({ page: 1, page_size: PREVIEW_ROWS })
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
        color: '#1565C0',
      },
      {
        icon: AccountTreeIcon,
        label: 'Perfiles / Otros',
        value: `${formatNumber(products.profiles)} / ${formatNumber(products.accessories)}`,
        isWarning: false,
        color: '#00897B',
      },
      {
        icon: AccountTreeIcon,
        label: 'Total Variantes',
        value: formatNumber(v.total),
        isWarning: false,
        color: '#5E35B1',
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
        color: '#2E7D32',
      },
      {
        icon: TrendingDownIcon,
        label: 'Sin Venta >6m',
        value: formatNumber(w.noSales6m),
        isWarning: w.noSales6m > 0,
      },
    ];
  }, [summary]);

  // Height for the two top grids — fills available viewport
  const gridHeight = 'calc((100vh - 340px) / 2)';
  const gridMinHeight = 320;

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
          : kpis.map((kpi, idx) => (
              <KpiCard key={kpi.label} {...kpi} delay={idx * 60} loading={false} />
            ))
        }
      </Box>

      {/* ── Top row: Productos Base + Variantes (side by side) ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <MiniGridCard
            icon={Inventory2Icon}
            title="Productos Base"
            total={baseProducts.total}
            path="/platform/productos/base"
            rows={baseProducts.rows}
            columns={baseProductColumns}
            loading={baseProducts.loading}
            navigate={navigate}
            height={{ xs: 400, md: gridMinHeight, lg: gridHeight }}
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <MiniGridCard
            icon={AccountTreeIcon}
            title="Variantes"
            total={variants.total}
            path="/platform/productos/variantes"
            rows={variants.rows}
            columns={variantColumns}
            loading={variants.loading}
            navigate={navigate}
            height={{ xs: 400, md: gridMinHeight, lg: gridHeight }}
          />
        </Grid>
      </Grid>

      {/* ── Bottom row: Productos-Bodegas (full width) ── */}
      <MiniGridCard
        icon={WarehouseIcon}
        title="Productos-Bodegas"
        total={warehouse.total}
        path="/platform/productos/bodegas"
        rows={warehouse.rows}
        columns={warehouseColumns}
        loading={warehouse.loading}
        navigate={navigate}
        height={{ xs: 400, md: gridMinHeight, lg: gridHeight }}
      />
    </Box>
  );
}
