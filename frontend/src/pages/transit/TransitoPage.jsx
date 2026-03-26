/**
 * TransitoPage — Transit tracking page.
 * Shows all items currently in transit with search, sorting, and pagination.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, InputAdornment, Chip, Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';

import PageHeader from '../../components/common/PageHeader';
import { formatDate, formatNumber } from '../../utils/formatters';

// ── Shipping method chip ──
function EnvioChip({ method }) {
  const colorMap = {
    'Marítimo':  'info',
    'Aéreo':     'warning',
    'Terrestre': 'success',
  };
  return (
    <Chip
      label={method}
      size="small"
      color={colorMap[method] || 'default'}
    />
  );
}

// ── Mock Data Generator ──
function generateMockTransit() {
  const items = [
    { ref: 'PF-60120', desc: 'Perfil 6063-T5 120mm', qty: 500, peso: 2400, prov: 'Alumina S.A.', origen: 'China', eta: '2026-04-15', envio: 'Marítimo' },
    { ref: 'VD-8MM', desc: 'Vidrio templado 8mm claro', qty: 320, peso: 6400, prov: 'Vidrio Andino', origen: 'Colombia', eta: '2026-04-02', envio: 'Terrestre' },
    { ref: 'HR-2045', desc: 'Herraje pivotante H-20', qty: 1200, peso: 360, prov: 'Technal', origen: 'España', eta: '2026-04-22', envio: 'Marítimo' },
    { ref: 'AL-3050', desc: 'Ángulo aluminio 30x50mm', qty: 800, peso: 1200, prov: 'Alusin', origen: 'Brasil', eta: '2026-04-08', envio: 'Marítimo' },
    { ref: 'PF-60080', desc: 'Perfil 6063-T5 80mm', qty: 350, peso: 1400, prov: 'Alumina S.A.', origen: 'China', eta: '2026-05-01', envio: 'Marítimo' },
    { ref: 'SL-1020', desc: 'Sellante silicona estructural', qty: 2000, peso: 600, prov: 'Alusin', origen: 'Brasil', eta: '2026-04-05', envio: 'Terrestre' },
    { ref: 'TB-4060', desc: 'Tubo cuadrado 40x60mm', qty: 420, peso: 1890, prov: 'Alumina S.A.', origen: 'China', eta: '2026-04-28', envio: 'Marítimo' },
    { ref: 'VD-10MM', desc: 'Vidrio laminado 10mm', qty: 180, peso: 4500, prov: 'Vidrio Andino', origen: 'Colombia', eta: '2026-04-10', envio: 'Terrestre' },
    { ref: 'HR-3060', desc: 'Bisagra oculta H-30', qty: 900, peso: 270, prov: 'Technal', origen: 'España', eta: '2026-05-05', envio: 'Aéreo' },
    { ref: 'PF-60045', desc: 'Perfil 6060-T5 45mm', qty: 600, peso: 1080, prov: 'Alumina S.A.', origen: 'China', eta: '2026-04-18', envio: 'Marítimo' },
    { ref: 'AC-TORN', desc: 'Tornillería acero inox M6', qty: 5000, peso: 150, prov: 'Alusin', origen: 'Brasil', eta: '2026-04-03', envio: 'Aéreo' },
    { ref: 'VD-6MM', desc: 'Vidrio templado 6mm bronce', qty: 250, peso: 3750, prov: 'Vidrio Andino', origen: 'Colombia', eta: '2026-04-12', envio: 'Terrestre' },
    { ref: 'PF-60100', desc: 'Perfil 6063-T5 100mm', qty: 450, peso: 1800, prov: 'Alumina S.A.', origen: 'China', eta: '2026-05-10', envio: 'Marítimo' },
    { ref: 'HR-1025', desc: 'Manija tipo L aluminio', qty: 2200, peso: 440, prov: 'Technal', origen: 'España', eta: '2026-04-25', envio: 'Marítimo' },
    { ref: 'EM-5070', desc: 'Empaque EPDM 5x7mm', qty: 10000, peso: 300, prov: 'Alusin', origen: 'Brasil', eta: '2026-04-06', envio: 'Terrestre' },
    { ref: 'PF-60060', desc: 'Perfil 6005-T5 60mm', qty: 380, peso: 1140, prov: 'Alumina S.A.', origen: 'China', eta: '2026-05-15', envio: 'Marítimo' },
    { ref: 'VD-12MM', desc: 'Vidrio doble cámara 12mm', qty: 140, peso: 4200, prov: 'Vidrio Andino', origen: 'Colombia', eta: '2026-04-20', envio: 'Terrestre' },
    { ref: 'HR-4080', desc: 'Cierre multipunto H-40', qty: 600, peso: 240, prov: 'Technal', origen: 'España', eta: '2026-05-08', envio: 'Aéreo' },
    { ref: 'TB-5050', desc: 'Tubo redondo 50mm', qty: 300, peso: 1350, prov: 'Alumina S.A.', origen: 'China', eta: '2026-04-30', envio: 'Marítimo' },
    { ref: 'AL-2020', desc: 'Ángulo aluminio 20x20mm', qty: 1000, peso: 500, prov: 'Alusin', origen: 'Brasil', eta: '2026-04-09', envio: 'Terrestre' },
    { ref: 'PF-60090', desc: 'Perfil 6061-T6 90mm', qty: 280, peso: 1260, prov: 'Alumina S.A.', origen: 'China', eta: '2026-05-20', envio: 'Marítimo' },
    { ref: 'SL-2040', desc: 'Sellante poliuretano PU-20', qty: 1500, peso: 450, prov: 'Alusin', origen: 'Brasil', eta: '2026-04-14', envio: 'Terrestre' },
    { ref: 'HR-5090', desc: 'Rodamiento corredera nylon', qty: 3000, peso: 180, prov: 'Technal', origen: 'España', eta: '2026-05-12', envio: 'Marítimo' },
    { ref: 'VD-4MM', desc: 'Vidrio flotado 4mm claro', qty: 400, peso: 4000, prov: 'Vidrio Andino', origen: 'Colombia', eta: '2026-04-16', envio: 'Terrestre' },
    { ref: 'PF-60075', desc: 'Perfil 6063-T5 75mm', qty: 520, peso: 1560, prov: 'Alumina S.A.', origen: 'China', eta: '2026-05-25', envio: 'Marítimo' },
    { ref: 'AC-REMA', desc: 'Remaches pop aluminio 4.8mm', qty: 20000, peso: 120, prov: 'Alusin', origen: 'Brasil', eta: '2026-04-07', envio: 'Aéreo' },
    { ref: 'HR-6010', desc: 'Felpa antipolvos 6.5mm', qty: 8000, peso: 240, prov: 'Technal', origen: 'España', eta: '2026-05-02', envio: 'Marítimo' },
    { ref: 'TB-3030', desc: 'Tubo cuadrado 30x30mm', qty: 360, peso: 1080, prov: 'Alumina S.A.', origen: 'China', eta: '2026-05-18', envio: 'Marítimo' },
    { ref: 'VD-LAMI', desc: 'Vidrio laminado seguridad 6+6', qty: 100, peso: 3000, prov: 'Vidrio Andino', origen: 'Colombia', eta: '2026-04-22', envio: 'Terrestre' },
    { ref: 'PF-60110', desc: 'Perfil 6061-T6 110mm', qty: 200, peso: 1000, prov: 'Alumina S.A.', origen: 'China', eta: '2026-06-01', envio: 'Marítimo' },
  ];

  return items.map((item, i) => ({
    id: i + 1,
    reference: item.ref,
    description: item.desc,
    quantity: item.qty,
    weight: item.peso,
    provider: item.prov,
    origin: item.origen,
    eta: item.eta,
    shipping_method: item.envio,
  }));
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function TransitoPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'eta', sort: 'asc' }]);

  // Load mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      setRows(generateMockTransit());
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.reference.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        r.provider.toLowerCase().includes(s) ||
        r.origin.toLowerCase().includes(s)
    );
  }, [rows, search]);

  // Column definitions
  const columns = useMemo(() => [
    {
      field: 'reference',
      headerName: 'Referencia',
      width: 130,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight={700}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'description',
      headerName: 'Descripción',
      width: 250,
      flex: 1,
    },
    {
      field: 'quantity',
      headerName: 'Cantidad',
      width: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatNumber(value),
    },
    {
      field: 'weight',
      headerName: 'Peso (kg)',
      width: 110,
      type: 'number',
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatNumber(value),
    },
    {
      field: 'provider',
      headerName: 'Proveedor',
      width: 150,
    },
    {
      field: 'origin',
      headerName: 'Origen',
      width: 110,
    },
    {
      field: 'eta',
      headerName: 'ETA',
      width: 120,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'shipping_method',
      headerName: 'Envío',
      width: 120,
      renderCell: (params) => <EnvioChip method={params.value} />,
    },
  ], []);

  return (
    <Box>
      <PageHeader
        title="Tránsito"
        subtitle={`${filteredRows.length} envíos en tránsito`}
      />

      {/* Search bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Buscar por referencia, descripción, proveedor u origen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 400 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Data Table */}
      <Box sx={{ height: 640, width: '100%' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          loading={loading}
          density="compact"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 25, 50]}
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
            '--DataGrid-overlayHeight': '300px',
          }}
        />
      </Box>
    </Box>
  );
}
