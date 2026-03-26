/**
 * Acabados Tab — Manage finish types (acabados).
 * Connected to the backend API.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Chip, InputAdornment, Typography,
  IconButton, Tooltip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Paper, Divider,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import MergeIcon from '@mui/icons-material/Merge';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CloseIcon from '@mui/icons-material/Close';
import productsApi from '../../api/products.api';
import { formatDate } from '../../utils/formatters';

// ══════════════════════════════════════════════════════════════
// Create Modal
// ══════════════════════════════════════════════════════════════
function CreateAcabadoModal({ open, onClose, onSave }) {
  const [form, setForm] = useState({ originalValue: '', normalizedValue: '', description: '', notes: '' });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    onSave(form);
    setForm({ originalValue: '', normalizedValue: '', description: '', notes: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Crear Acabado</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nombre Original (Siesa)"
            value={form.originalValue}
            onChange={handleChange('originalValue')}
            required
          />
          <TextField
            label="Nombre Normalizado"
            value={form.normalizedValue}
            onChange={handleChange('normalizedValue')}
            required
          />
          <TextField
            label="Descripcion"
            value={form.description}
            onChange={handleChange('description')}
            multiline
            rows={2}
          />
          <TextField
            label="Notas"
            value={form.notes}
            onChange={handleChange('notes')}
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!form.originalValue || !form.normalizedValue}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Detail Modal
// ══════════════════════════════════════════════════════════════
function AcabadoDetailModal({ open, onClose, item }) {
  if (!item) return null;

  const changelog = item.changeLog && item.changeLog.length > 0
    ? item.changeLog
    : [{ date: item.updatedAt, action: item.isEdited ? 'Nombre normalizado editado' : 'Creado desde importacion Siesa' }];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Detalle de Acabado</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">ID</Typography>
            <Typography variant="body2" fontWeight={600}>{item.id}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Codigo</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={item.code || '—'}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Estado</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={item.status === 'active' ? 'Activo' : 'Inactivo'}
                size="small"
                sx={{
                  bgcolor: item.status === 'active' ? '#E8F5E9' : '#ECEFF1',
                  color: item.status === 'active' ? '#2E7D32' : '#616161',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">SKUs asociados</Typography>
            <Typography variant="body2" fontWeight={600}>{item.skuCount}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Acabado Original (Siesa)</Typography>
            <Typography variant="body2" fontWeight={500}>{item.originalValue}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Acabado Normalizado</Typography>
            <Typography variant="body2" fontWeight={600} sx={item.isEdited ? { color: '#E65100' } : {}}>
              {item.normalizedValue}
              {item.isEdited && <Chip label="Editado" size="small" sx={{ ml: 1, bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600, fontSize: '0.65rem' }} />}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Descripcion</Typography>
            <Typography variant="body2">{item.description || '—'}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Ultima modificacion</Typography>
            <Typography variant="body2">{formatDate(item.updatedAt)}</Typography>
          </Grid>
          {item.notes && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Notas</Typography>
              <Typography variant="body2">{item.notes}</Typography>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Historial de Cambios</Typography>
        {changelog.map((entry, i) => (
          <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">{entry.action}</Typography>
              <Typography variant="caption" color="text.secondary">{formatDate(entry.date)}</Typography>
            </Stack>
            {entry.user && (
              <Typography variant="caption" color="text.secondary">{entry.user}</Typography>
            )}
          </Paper>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function AcabadosTab() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, edited: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Fetch data from API
  const fetchData = useCallback(async (searchTerm = '') => {
    setLoading(true);
    try {
      const data = await productsApi.getAcabados(searchTerm);
      setRows(data.items);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching acabados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on search change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchData]);

  const handleCreate = useCallback(async (form) => {
    try {
      await productsApi.createAcabado({
        originalValue: form.originalValue,
        normalizedValue: form.normalizedValue,
        description: form.description,
        notes: form.notes,
      });
      fetchData(search);
    } catch (err) {
      console.error('Error creating acabado:', err);
    }
  }, [fetchData, search]);

  const handleViewDetail = useCallback((item) => {
    setDetailItem(item);
    setDetailOpen(true);
  }, []);

  // Bulk actions
  const handleBulkRename = async () => {
    const newValue = prompt('Nuevo nombre normalizado:');
    if (!newValue) return;
    try {
      await productsApi.bulkAcabadoAction({ action: 'rename', ids: selectionModel, newValue });
      setSelectionModel([]);
      fetchData(search);
    } catch (err) {
      console.error('Error in bulk rename:', err);
    }
  };

  const handleBulkMerge = async () => {
    const newValue = prompt('Nombre del acabado destino para fusionar:');
    if (!newValue) return;
    try {
      await productsApi.bulkAcabadoAction({ action: 'merge', ids: selectionModel, newValue });
      setSelectionModel([]);
      fetchData(search);
    } catch (err) {
      console.error('Error in bulk merge:', err);
    }
  };

  const handleBulkInactivate = async () => {
    try {
      await productsApi.bulkAcabadoAction({ action: 'inactivate', ids: selectionModel });
      setSelectionModel([]);
      fetchData(search);
    } catch (err) {
      console.error('Error in bulk inactivate:', err);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await productsApi.bulkAcabadoAction({ action: 'delete', ids: selectionModel });
      setSelectionModel([]);
      fetchData(search);
    } catch (err) {
      console.error('Error in bulk delete:', err);
    }
  };

  const handleBulkExport = async () => {
    try {
      await productsApi.bulkAcabadoAction({ action: 'export', ids: selectionModel });
    } catch (err) {
      console.error('Error in bulk export:', err);
    }
  };

  // Column definitions
  const columns = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        width: 100,
        renderCell: (params) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'code',
        headerName: 'Codigo',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            label={params.value || '—'}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700, minWidth: 40 }}
          />
        ),
      },
      {
        field: 'originalValue',
        headerName: 'Acabado Original (Siesa)',
        width: 190,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={500}>{params.value}</Typography>
        ),
      },
      {
        field: 'normalizedValue',
        headerName: 'Acabado Normalizado',
        width: 180,
        renderCell: (params) => (
          <Box
            sx={
              params.row.isEdited
                ? { bgcolor: '#FFFDE7', borderLeft: '3px solid #FF9800', pl: 1, py: 0.5, width: '100%', display: 'flex', alignItems: 'center' }
                : { pl: 1, py: 0.5, width: '100%', display: 'flex', alignItems: 'center' }
            }
          >
            <Typography variant="body2" fontWeight={600}>{params.value}</Typography>
          </Box>
        ),
      },
      {
        field: 'description',
        headerName: 'Descripcion',
        width: 260,
      },
      {
        field: 'skuCount',
        headerName: 'SKUs',
        width: 80,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            variant="outlined"
            color={params.value > 0 ? 'primary' : 'default'}
            sx={{ fontWeight: 600, minWidth: 40 }}
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 100,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            label={params.value === 'active' ? 'Activo' : 'Inactivo'}
            size="small"
            sx={{
              bgcolor: params.value === 'active' ? '#E8F5E9' : '#ECEFF1',
              color: params.value === 'active' ? '#2E7D32' : '#616161',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        ),
      },
      {
        field: 'isEdited',
        headerName: 'Norm.',
        width: 100,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            label={params.value ? 'Editado' : 'Original'}
            size="small"
            sx={{
              bgcolor: params.value ? '#FFF3E0' : '#ECEFF1',
              color: params.value ? '#E65100' : '#616161',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Modificado',
        width: 110,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'actions',
        headerName: '',
        width: 50,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Tooltip title="Ver detalle">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleViewDetail(params.row); }}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    [handleViewDetail]
  );

  return (
    <Box>
      {/* Stats Chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip label={`${stats.total} acabados`} size="small" variant="outlined" />
        <Chip
          label={`${stats.edited} editados`}
          size="small"
          sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600 }}
        />
        <Chip
          label={`${stats.active} activos`}
          size="small"
          sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}
        />
      </Stack>

      {/* Search + Create */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField
          placeholder="Buscar por codigo, nombre o descripcion..."
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
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
        >
          Crear
        </Button>
      </Stack>

      {/* Bulk Action Bar */}
      {selectionModel.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            mb: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#E3F2FD',
            borderColor: 'primary.light',
          }}
        >
          <Typography variant="body2" fontWeight={600} sx={{ mr: 1 }}>
            {selectionModel.length} seleccionado{selectionModel.length > 1 ? 's' : ''}
          </Typography>
          <Button size="small" startIcon={<DriveFileRenameOutlineIcon />} onClick={handleBulkRename}>
            Renombrar
          </Button>
          <Button size="small" startIcon={<MergeIcon />} onClick={handleBulkMerge}>
            Fusionar
          </Button>
          <Button size="small" startIcon={<BlockIcon />} onClick={handleBulkInactivate}>
            Inactivar
          </Button>
          <Button size="small" startIcon={<DeleteIcon />} color="error" onClick={handleBulkDelete}>
            Eliminar
          </Button>
          <Button size="small" startIcon={<FileDownloadIcon />} onClick={handleBulkExport}>
            Exportar
          </Button>
        </Paper>
      )}

      {/* DataGrid */}
      <Box sx={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          density="compact"
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(newModel) => setSelectionModel(newModel)}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'id', sort: 'asc' }] },
          }}
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
            '--DataGrid-overlayHeight': '200px',
          }}
        />
      </Box>

      {/* Create Modal */}
      <CreateAcabadoModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
      />

      {/* Detail Modal */}
      <AcabadoDetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        item={detailItem}
      />
    </Box>
  );
}
