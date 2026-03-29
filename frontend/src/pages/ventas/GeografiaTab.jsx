/**
 * Geografía Tab — Geography with aggregated stats. Read-only (91 entries).
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, Paper, Typography, IconButton, Tooltip, Stack,
  Divider, Chip, Fade, Skeleton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PublicIcon from '@mui/icons-material/Public';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import salesApi from '../../api/sales.api';
import { formatCOP, formatNumber } from '../../utils/formatters';

function TbIcon({ title, disabled, onClick, children }) {
  return (
    <Tooltip title={title} arrow>
      <span>
        <IconButton size="small" disabled={disabled} onClick={onClick}
          sx={{ opacity: disabled ? 0.28 : 1, transition: 'all 0.2s ease' }}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <Chip label={label} size="small" onClick={onClick} variant={active ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600, fontSize: '0.7rem', height: 28, cursor: 'pointer', transition: 'all 0.2s ease',
        bgcolor: active ? 'primary.main' : 'transparent',
        color: active ? '#fff' : 'text.secondary',
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
  { field: 'country', headerName: 'País', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center' },
  { field: 'department', headerName: 'Departamento', flex: 1.2, minWidth: 120, align: 'center', headerAlign: 'center' },
  { field: 'city', headerName: 'Ciudad', flex: 1.2, minWidth: 120, align: 'center', headerAlign: 'center' },
  { field: 'totalSales', headerName: 'Facturas', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => formatNumber(p.value) },
  { field: 'totalNetCop', headerName: 'Neto COP', flex: 1.5, minWidth: 130, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => formatCOP(p.value) },
  { field: 'totalNetUsd', headerName: 'Neto USD', flex: 1.2, minWidth: 110, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => p.value > 0 ? `$${formatNumber(p.value, 2)}` : '—' },
  { field: 'totalWeightTon', headerName: 'Peso (t)', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center', type: 'number',
    renderCell: (p) => formatNumber(p.value, 1) },
];

export default function GeografiaTab() {
  const [allRows, setAllRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesApi.getGeography();
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

  const countries = [...new Set(allRows.map((r) => r.country).filter(Boolean))].sort();

  const filtered = allRows.filter((r) => {
    const matchSearch = !search
      || (r.city || '').toLowerCase().includes(search.toLowerCase())
      || (r.department || '').toLowerCase().includes(search.toLowerCase())
      || (r.country || '').toLowerCase().includes(search.toLowerCase());
    const matchCountry = !countryFilter || r.country === countryFilter;
    return matchSearch && matchCountry;
  });

  const handleExport = () => {
    const headers = ['País', 'Departamento', 'Ciudad', 'Facturas', 'Neto COP', 'Neto USD'];
    const csvRows = filtered.map((r) => [
      r.country, r.department, r.city, r.totalSales, r.totalNetCop, r.totalNetUsd,
    ].map((v) => `"${v ?? ''}"`).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'geografia.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalCop = allRows.reduce((s, r) => s + (r.totalNetCop || 0), 0);
  const uniqueCountries = countries.length;

  const kpis = [
    { value: loading ? '—' : formatNumber(allRows.length), label: 'Ciudades/Zonas', color: '#1565C0', bgColor: '#E3F2FD', icon: <LocationOnIcon sx={{ fontSize: 20, color: '#1565C0' }} />, delay: 0 },
    { value: loading ? '—' : formatNumber(uniqueCountries), label: 'Países', color: '#00695C', bgColor: '#E0F2F1', icon: <PublicIcon sx={{ fontSize: 20, color: '#00695C' }} />, delay: 50 },
    { value: loading ? '—' : formatCOP(totalCop), label: 'Total Neto COP', color: '#E65100', bgColor: '#FFF3E0', icon: <AttachMoneyIcon sx={{ fontSize: 20, color: '#E65100' }} />, delay: 100 },
  ];

  const hasFilters = !!(search || countryFilter);

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
            placeholder="Buscar ciudad, depto, país..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
            sx={{ width: 260 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {loading ? '...' : `${filtered.length} entradas`}
          </Typography>
          <Box flex={1} />
          <TbIcon title="Exportar CSV" onClick={handleExport}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Actualizar" onClick={handleRefresh}>
            <RefreshIcon fontSize="small" sx={{ transition: 'transform 0.5s', transform: spinning ? 'rotate(360deg)' : 'none' }} />
          </TbIcon>
        </Stack>

        <Divider />

        <Stack direction="row" alignItems="center" spacing={1}
          sx={{ px: 1.5, py: 0.75, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>País:</Typography>
          {countries.map((c) => (
            <FilterChip key={c} label={c} active={countryFilter === c}
              onClick={() => setCountryFilter(countryFilter === c ? '' : c)} />
          ))}
          {hasFilters && (
            <Chip label="Limpiar" size="small" onDelete={() => { setSearch(''); setCountryFilter(''); }} sx={{ ml: 1 }} />
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
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 50 } } }}
          pageSizeOptions={[25, 50, 100]}
          loading={loading}
          sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { bgcolor: '#0F172A', color: '#fff' } }}
        />
      </Paper>
    </Box>
  );
}
