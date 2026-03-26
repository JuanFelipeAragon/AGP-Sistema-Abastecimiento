/**
 * Supply Decisions — Main purchase decision table
 * Core of the abastecimiento module: what to buy, how much, when.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, TextField, MenuItem, IconButton,
  Tooltip, Typography, InputAdornment, Grid,
} from '@mui/material';
import { DataGrid, GridToolbarContainer, GridToolbarColumnsButton } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import TuneIcon from '@mui/icons-material/Tune';
import BlockIcon from '@mui/icons-material/Block';

import PageHeader from '../../components/common/PageHeader';
import StatusChip from '../../components/common/StatusChip';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatCOP, formatNumber } from '../../utils/formatters';
import { ALERT_COLORS, SERVICE_LEVELS, ABC_CLASSES } from '../../utils/constants';

// ── Alert Badge (custom for supply) ──
function AlertBadge({ status }) {
  const config = {
    CRITICO: { bgcolor: ALERT_COLORS.CRITICO, label: 'CRÍTICO' },
    ALERTA: { bgcolor: ALERT_COLORS.ALERTA, label: 'ALERTA' },
    OK: { bgcolor: ALERT_COLORS.OK, label: 'OK' },
    SIN_MOV: { bgcolor: ALERT_COLORS.SIN_MOV, label: 'SIN MOV' },
  };
  const c = config[status] || config.OK;
  return (
    <Chip
      label={c.label}
      size="small"
      sx={{ bgcolor: c.bgcolor, color: '#fff', fontWeight: 700, minWidth: 72 }}
    />
  );
}

// ── Custom Toolbar ──
function DecisionToolbar({ search, onSearch, onExport, onRecalculate }) {
  return (
    <GridToolbarContainer sx={{ p: 1.5, gap: 1, flexWrap: 'wrap' }}>
      <TextField
        size="small"
        placeholder="Buscar referencia..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        sx={{ width: 260 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
      />
      <Box sx={{ flexGrow: 1 }} />
      <GridToolbarColumnsButton />
      <Tooltip title="Recalcular decisiones">
        <Button size="small" startIcon={<RefreshIcon />} onClick={onRecalculate}>
          Recalcular
        </Button>
      </Tooltip>
      <Button size="small" startIcon={<FileDownloadIcon />} onClick={onExport}>
        Exportar
      </Button>
    </GridToolbarContainer>
  );
}

// ── Mock Data Generator ──
function generateMockDecisions() {
  const refs = [
    'ALU-6063-T5-100', 'ALU-6061-T6-050', 'ALU-6063-T5-075', 'ALU-6060-T5-040',
    'ALU-6063-T5-060', 'ALU-6005-T5-080', 'ALU-6063-T5-120', 'ALU-6061-T6-090',
    'ALU-6060-T5-030', 'ALU-6063-T5-045', 'ALU-6005-T5-070', 'ALU-6061-T6-110',
    'ALU-6063-T5-055', 'ALU-6060-T5-065', 'ALU-6063-T5-085', 'ALU-6005-T5-095',
    'ALU-6061-T6-035', 'ALU-6063-T5-025', 'ALU-6060-T5-115', 'ALU-6063-T5-105',
  ];
  const descs = [
    'Perfil estructural', 'Ángulo aluminio', 'Tubo redondo', 'Perfil U', 'Barra plana',
    'Tubo cuadrado', 'Perfil H', 'Ángulo desigual', 'Platina', 'Varilla redonda',
    'Tubo rectangular', 'Perfil T', 'Canal', 'Riel', 'Marco ventana',
    'Bisagra', 'Manija', 'Cierre', 'Quicio', 'Adaptador',
  ];
  const cats = ['Perfiles', 'Tubos', 'Barras', 'Accesorios', 'Sistemas'];
  const abcs = ['A', 'A', 'A', 'B', 'B', 'B', 'B', 'C', 'C', 'C'];
  const alerts = ['CRITICO', 'CRITICO', 'ALERTA', 'ALERTA', 'ALERTA', 'OK', 'OK', 'OK', 'OK', 'SIN_MOV'];

  return refs.map((ref, i) => {
    const stockActual = Math.floor(Math.random() * 300);
    const enTransito = Math.floor(Math.random() * 150);
    const ss = Math.floor(Math.random() * 100) + 20;
    const rop = ss + Math.floor(Math.random() * 200) + 50;
    const demandaAvg = Math.floor(Math.random() * 80) + 10;
    const qtyToOrder = Math.max(0, (demandaAvg * 6) - (stockActual + enTransito) + ss);
    const costoUnit = Math.floor(Math.random() * 50000) + 5000;
    const alert = alerts[i % alerts.length];

    return {
      id: i + 1,
      reference: ref,
      description: descs[i % descs.length] + ` ${(i + 1) * 5}mm`,
      category: cats[i % cats.length],
      abc_class: abcs[i % abcs.length],
      stock_actual: stockActual,
      en_transito: enTransito,
      stock_disponible: stockActual + enTransito,
      ss,
      rop,
      demand_avg: demandaAvg,
      demand_std: Math.floor(demandaAvg * (Math.random() * 0.5 + 0.1)),
      cv: +(Math.random() * 1.5 + 0.2).toFixed(2),
      qty_to_order: qtyToOrder,
      estimated_value: qtyToOrder * costoUnit,
      unit_cost: costoUnit,
      alert_status: alert,
      months_with_sales: Math.floor(Math.random() * 12) + 1,
    };
  });
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function SupplyDecisions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState(searchParams.get('alert') || '');
  const [abcFilter, setAbcFilter] = useState('');
  const [inactivateTarget, setInactivateTarget] = useState(null);

  // Load mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      setRows(generateMockDecisions());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // ── Filtered rows ──
  const filteredRows = useMemo(() => {
    let result = rows;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (r) => r.reference.toLowerCase().includes(s) || r.description.toLowerCase().includes(s)
      );
    }
    if (alertFilter) result = result.filter((r) => r.alert_status === alertFilter);
    if (abcFilter) result = result.filter((r) => r.abc_class === abcFilter);
    return result;
  }, [rows, search, alertFilter, abcFilter]);

  // ── Column definitions ──
  const columns = useMemo(() => [
    {
      field: 'alert_status',
      headerName: 'Estado',
      width: 100,
      renderCell: (params) => <AlertBadge status={params.value} />,
      sortComparator: (a, b) => {
        const order = { CRITICO: 0, ALERTA: 1, OK: 2, SIN_MOV: 3 };
        return (order[a] ?? 4) - (order[b] ?? 4);
      },
    },
    {
      field: 'reference',
      headerName: 'Referencia',
      width: 170,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={600} sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
          {params.value}
        </Typography>
      ),
    },
    { field: 'description', headerName: 'Descripción', width: 200 },
    { field: 'abc_class', headerName: 'ABC', width: 70, align: 'center', headerAlign: 'center' },
    { field: 'category', headerName: 'Categoría', width: 120 },
    {
      field: 'stock_actual',
      headerName: 'Stock',
      width: 90,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatNumber(value),
    },
    {
      field: 'en_transito',
      headerName: 'Tránsito',
      width: 90,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatNumber(value),
    },
    {
      field: 'stock_disponible',
      headerName: 'Disponible',
      width: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatNumber(value),
    },
    {
      field: 'ss',
      headerName: 'SS',
      width: 80,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      description: 'Stock de Seguridad',
    },
    {
      field: 'rop',
      headerName: 'ROP',
      width: 80,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      description: 'Punto de Reorden',
    },
    {
      field: 'demand_avg',
      headerName: 'Dem. Prom.',
      width: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      description: 'Demanda promedio mensual',
    },
    {
      field: 'qty_to_order',
      headerName: 'Qty Pedir',
      width: 100,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Typography
          variant="body2"
          fontWeight={params.value > 0 ? 700 : 400}
          color={params.value > 0 ? 'primary.main' : 'text.secondary'}
        >
          {formatNumber(params.value)}
        </Typography>
      ),
    },
    {
      field: 'estimated_value',
      headerName: 'Valor Est.',
      width: 140,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCOP(value),
    },
    {
      field: 'actions',
      headerName: '',
      width: 50,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Tooltip title="Inactivar referencia">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setInactivateTarget(params.row); }}>
            <BlockIcon fontSize="small" color="error" />
          </IconButton>
        </Tooltip>
      ),
    },
  ], []);

  // Default hidden columns
  const defaultHidden = { demand_std: false, cv: false, months_with_sales: false };

  const handleExport = () => {
    // TODO: implement with SheetJS
  };

  const handleRecalculate = () => {
    setLoading(true);
    setTimeout(() => {
      setRows(generateMockDecisions());
      setLoading(false);
    }, 1000);
  };

  const handleInactivate = () => {
    if (!inactivateTarget) return;
    setRows((prev) => prev.filter((r) => r.id !== inactivateTarget.id));
    setInactivateTarget(null);
  };

  return (
    <Box>
      <PageHeader
        title="Decisiones de Compra"
        subtitle={`${filteredRows.length} referencias${alertFilter ? ` — Filtro: ${alertFilter}` : ''}`}
      />

      {/* ── Filters ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            select
            size="small"
            label="Estado de Alerta"
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value)}
            fullWidth
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="CRITICO">Crítico</MenuItem>
            <MenuItem value="ALERTA">Alerta</MenuItem>
            <MenuItem value="OK">OK</MenuItem>
            <MenuItem value="SIN_MOV">Sin Movimiento</MenuItem>
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 3 }}>
          <TextField
            select
            size="small"
            label="Clase ABC"
            value={abcFilter}
            onChange={(e) => setAbcFilter(e.target.value)}
            fullWidth
          >
            <MenuItem value="">Todas</MenuItem>
            {ABC_CLASSES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid size={{ xs: 12, sm: 4, md: 6 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              size="small"
              startIcon={<TuneIcon />}
              onClick={() => navigate('/platform/abastecimiento/parametros')}
            >
              Parámetros
            </Button>
          </Box>
        </Grid>
      </Grid>

      {/* ── Data Table ── */}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={loading}
          density="compact"
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'alert_status', sort: 'asc' }] },
            columns: { columnVisibilityModel: defaultHidden },
          }}
          disableRowSelectionOnClick
          slots={{
            toolbar: DecisionToolbar,
            noRowsOverlay: () => (
              <EmptyState
                title="No hay decisiones de compra"
                description="Importa datos del ERP para generar las decisiones"
                actionLabel="Importar Datos"
                onAction={() => navigate('/platform/abastecimiento/importar')}
              />
            ),
          }}
          slotProps={{
            toolbar: { search, onSearch: setSearch, onExport: handleExport, onRecalculate: handleRecalculate },
          }}
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
            '--DataGrid-overlayHeight': '300px',
          }}
        />
      </Box>

      {/* ── Inactivate Confirmation ── */}
      <ConfirmDialog
        open={!!inactivateTarget}
        title={`¿Inactivar "${inactivateTarget?.reference}"?`}
        message="Esta referencia no aparecerá más en las decisiones de compra. Puede reactivarla después."
        confirmLabel="Inactivar"
        confirmColor="error"
        onConfirm={handleInactivate}
        onCancel={() => setInactivateTarget(null)}
      />
    </Box>
  );
}
