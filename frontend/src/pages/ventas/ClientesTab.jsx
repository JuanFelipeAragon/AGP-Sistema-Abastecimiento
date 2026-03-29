/**
 * Clientes Tab — Customers with aggregated sales stats.
 * 354 customers — client-side data with DataGrid.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Paper, Typography, IconButton, Tooltip, Stack,
  Divider, Chip, Fade, Skeleton, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, useMediaQuery, useTheme,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import salesApi from '../../api/sales.api';
import { formatCOP, formatDate, formatNumber } from '../../utils/formatters';

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

function FilterChip({ label, active, onClick, activeColor, activeTextColor }) {
  return (
    <Chip label={label} size="small" onClick={onClick} variant={active ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600, fontSize: '0.7rem', height: 28, cursor: 'pointer', transition: 'all 0.2s ease',
        bgcolor: active ? (activeColor || 'primary.main') : 'transparent',
        color: active ? (activeTextColor || '#fff') : 'text.secondary',
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
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        </Stack>
      </Paper>
    </Fade>
  );
}

const COLUMNS = [
  { field: 'siesaCode', headerName: 'Código', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center' },
  { field: 'name', headerName: 'Nombre', flex: 3, minWidth: 180, align: 'center', headerAlign: 'center' },
  { field: 'totalSales', headerName: 'Facturas', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => formatNumber(p.value) },
  { field: 'totalNetCop', headerName: 'Neto COP', flex: 1.5, minWidth: 130, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => formatCOP(p.value) },
  { field: 'totalNetUsd', headerName: 'Neto USD', flex: 1.2, minWidth: 110, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => p.value > 0 ? `$${formatNumber(p.value, 2)}` : '—' },
  { field: 'totalWeightTon', headerName: 'Peso (t)', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => formatNumber(p.value, 1) },
  { field: 'lastInvoiceDate', headerName: 'Última Factura', flex: 1, minWidth: 110, align: 'center', headerAlign: 'center',
    renderCell: (p) => formatDate(p.value) },
  { field: 'isActive', headerName: 'Estado', flex: 0.7, minWidth: 80, align: 'center', headerAlign: 'center',
    renderCell: (p) => (
      <Chip label={p.value ? 'Activo' : 'Inactivo'} size="small"
        color={p.value ? 'success' : 'default'}
        sx={{ fontSize: '0.65rem', height: 20 }} />
    ),
  },
];

export default function ClientesTab() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selected, setSelected] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesApi.getCustomers({ sort_field: 'totalNetCop', sort_order: 'desc' });
      setAllRows(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setSpinning(true);
    await load();
    setSpinning(false);
  };

  const filtered = allRows.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase())
      || String(r.siesaCode || '').includes(search);
    const matchActive = activeFilter === '' ? true
      : activeFilter === 'active' ? r.isActive : !r.isActive;
    return matchSearch && matchActive;
  });

  const handleBulk = async (action) => {
    if (!selected.length) return;
    try {
      await salesApi.bulkCustomers({ action, ids: selected });
      setSelected([]);
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = () => {
    const headers = ['Código', 'Nombre', 'Activo', 'Facturas', 'Neto COP', 'Neto USD', 'Última Factura'];
    const csvRows = filtered.map((r) => [
      r.siesaCode, r.name, r.isActive ? 'Sí' : 'No',
      r.totalSales, r.netTotalCop, r.totalNetUsd,
      r.lastInvoiceDate?.slice(0, 10),
    ].map((v) => `"${v ?? ''}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'clientes.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalCop = allRows.reduce((s, r) => s + (r.totalNetCop || 0), 0);
  const totalUsd = allRows.reduce((s, r) => s + (r.totalNetUsd || 0), 0);

  const kpis = [
    { value: loading ? '—' : formatNumber(allRows.length), label: 'Clientes Total', color: '#1565C0', bgColor: '#E3F2FD', icon: <PeopleIcon sx={{ fontSize: 20, color: '#1565C0' }} />, delay: 0 },
    { value: loading ? '—' : formatNumber(allRows.filter((r) => r.isActive).length), label: 'Activos', color: '#2E7D32', bgColor: '#E8F5E9', icon: <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#2E7D32' }} />, delay: 50 },
    { value: loading ? '—' : formatCOP(totalCop), label: 'Total Neto COP', color: '#E65100', bgColor: '#FFF3E0', icon: <AttachMoneyIcon sx={{ fontSize: 20, color: '#E65100' }} />, delay: 100 },
    { value: loading ? '—' : `$${formatNumber(totalUsd, 0)}`, label: 'Total Neto USD', color: '#6A1B9A', bgColor: '#F3E5F5', icon: <TrendingUpIcon sx={{ fontSize: 20, color: '#6A1B9A' }} />, delay: 150 },
  ];

  const hasFilters = !!(search || activeFilter);

  return (
    <Box>
      {/* KPI Strip */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        {kpis.map((kpi, i) => <KpiCard key={i} {...kpi} loading={loading} />)}
      </Stack>

      {/* Command Bar */}
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 1 }}>
          <TextField
            placeholder="Buscar cliente o código..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
            sx={{ width: isSmall ? '100%' : 280 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {loading ? '...' : `${formatNumber(filtered.length)} registros`}
          </Typography>
          {selected.length > 0 && (
            <>
              <Chip label={`${selected.length} sel.`} size="small" color="primary" />
              <TbIcon title="Inactivar selección" onClick={() => handleBulk('inactivate')} color="warning">
                <BlockIcon fontSize="small" />
              </TbIcon>
              <TbIcon title="Activar selección" onClick={() => handleBulk('activate')} color="success">
                <CheckCircleOutlineIcon fontSize="small" />
              </TbIcon>
            </>
          )}
          <Box flex={1} />
          <TbIcon title="Exportar CSV" onClick={handleExport}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Actualizar" onClick={handleRefresh}>
            <RefreshIcon fontSize="small" sx={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          </TbIcon>
        </Stack>

        <Divider />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, py: 0.75, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
          {!isSmall && <Typography variant="caption" color="text.secondary">Estado:</Typography>}
          <FilterChip label="Activos" active={activeFilter === 'active'} activeColor="#2E7D32"
            onClick={() => setActiveFilter(activeFilter === 'active' ? '' : 'active')} />
          <FilterChip label="Inactivos" active={activeFilter === 'inactive'} activeColor="#d32f2f"
            onClick={() => setActiveFilter(activeFilter === 'inactive' ? '' : 'inactive')} />
          {hasFilters && (
            <Chip label="Limpiar" size="small" onDelete={() => { setSearch(''); setActiveFilter(''); }} sx={{ ml: 1 }} />
          )}
        </Stack>
      </Paper>

      {/* DataGrid */}
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <DataGrid
          rows={filtered}
          columns={COLUMNS}
          density="compact"
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selected}
          onRowSelectionModelChange={setSelected}
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
          pageSizeOptions={[25, 50, 100]}
          loading={loading}
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#0F172A', color: '#fff' } }}
        />
      </Paper>
    </Box>
  );
}
