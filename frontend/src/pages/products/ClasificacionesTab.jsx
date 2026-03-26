/**
 * Clasificaciones Tab — Manage Categorías, Subcategorías, and Sistemas.
 * Connected to the classifications API.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Chip, InputAdornment, Typography,
  ToggleButtonGroup, ToggleButton, IconButton, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Paper, Divider,
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
import { formatDate } from '../../utils/formatters';
import productsApi from '../../api/products.api';

// ══════════════════════════════════════════════════════════════
// Create Modal
// ══════════════════════════════════════════════════════════════
function CreateModal({ open, onClose, onSave, dimensionLabel, saving }) {
  const [form, setForm] = useState({ originalValue: '', normalizedValue: '', description: '', notes: '' });

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    onSave(form);
    setForm({ originalValue: '', normalizedValue: '', description: '', notes: '' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        Crear {dimensionLabel}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Valor Original (Siesa)"
            value={form.originalValue}
            onChange={handleChange('originalValue')}
            required
          />
          <TextField
            label="Valor Normalizado"
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
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!form.originalValue || !form.normalizedValue || saving}
        >
          {saving ? 'Creando...' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Detail Modal
// ══════════════════════════════════════════════════════════════
function DetailModal({ open, onClose, item, dimensionLabel }) {
  if (!item) return null;

  const changelog = item.changeLog && item.changeLog.length > 0
    ? item.changeLog
    : [
        {
          fecha: item.updatedAt,
          usuario: item.createdBy || '—',
          accion: item.isEdited ? 'Valor normalizado editado' : 'Creado desde importacion Siesa',
        },
      ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Detalle de {dimensionLabel}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">ID</Typography>
            <Typography variant="body2" fontWeight={600}>{item.id}</Typography>
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
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Valor Original (Siesa)</Typography>
            <Typography variant="body2" fontWeight={500}>{item.originalValue}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Valor Normalizado</Typography>
            <Typography variant="body2" fontWeight={600} sx={item.isEdited ? { color: '#E65100' } : {}}>
              {item.normalizedValue}
              {item.isEdited && <Chip label="Editado" size="small" sx={{ ml: 1, bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600, fontSize: '0.65rem' }} />}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Descripcion</Typography>
            <Typography variant="body2">{item.description || '—'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">SKUs asociados</Typography>
            <Typography variant="body2" fontWeight={600}>{item.skuCount}</Typography>
          </Grid>
          <Grid item xs={6}>
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
              <Typography variant="body2">{entry.accion || entry.action || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">{formatDate(entry.fecha || entry.date)}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">{entry.usuario || entry.user || '—'}</Typography>
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
export default function ClasificacionesTab() {
  const [dimension, setDimension] = useState('categorias');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [stats, setStats] = useState({ total: 0, edited: 0, active: 0, inactive: 0 });

  const dimensionLabels = {
    categorias: 'Categoría',
    subcategorias: 'Subcategoría',
    sistemas: 'Sistema',
  };

  // Fetch data from API
  const fetchData = useCallback(async (dim, searchTerm) => {
    setLoading(true);
    setSelectionModel([]);
    try {
      const result = await productsApi.getClassifications(dim, searchTerm || undefined);
      setRows(result.items || []);
      setStats(result.stats || { total: 0, edited: 0, active: 0, inactive: 0 });
    } catch (err) {
      console.error('Error fetching classifications:', err);
      setRows([]);
      setStats({ total: 0, edited: 0, active: 0, inactive: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload on dimension or search change
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchData(dimension, search);
    }, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [dimension, search, fetchData]);

  // Create
  const handleCreate = useCallback(async (form) => {
    setSaving(true);
    try {
      await productsApi.createClassification(dimension, {
        originalValue: form.originalValue,
        normalizedValue: form.normalizedValue,
        description: form.description,
        notes: form.notes,
      });
      setCreateOpen(false);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error creating classification:', err);
    } finally {
      setSaving(false);
    }
  }, [dimension, search, fetchData]);

  const handleViewDetail = useCallback((item) => {
    setDetailItem(item);
    setDetailOpen(true);
  }, []);

  // Bulk actions
  const handleBulkRename = async () => {
    const newValue = prompt('Nuevo valor normalizado:');
    if (!newValue) return;
    try {
      await productsApi.bulkClassificationAction(dimension, {
        action: 'rename',
        ids: selectionModel,
        newValue,
      });
      setSelectionModel([]);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error bulk rename:', err);
    }
  };

  const handleBulkMerge = async () => {
    const newValue = prompt('Valor destino para fusionar:');
    if (!newValue) return;
    try {
      await productsApi.bulkClassificationAction(dimension, {
        action: 'merge',
        ids: selectionModel,
        newValue,
      });
      setSelectionModel([]);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error bulk merge:', err);
    }
  };

  const handleBulkInactivate = async () => {
    try {
      await productsApi.bulkClassificationAction(dimension, {
        action: 'inactivate',
        ids: selectionModel,
      });
      setSelectionModel([]);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error bulk inactivate:', err);
    }
  };

  const handleBulkDelete = async () => {
    try {
      await productsApi.bulkClassificationAction(dimension, {
        action: 'delete',
        ids: selectionModel,
      });
      setSelectionModel([]);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error bulk delete:', err);
    }
  };

  const handleBulkExport = async () => {
    try {
      await productsApi.bulkClassificationAction(dimension, {
        action: 'export',
        ids: selectionModel,
      });
    } catch (err) {
      console.error('Error bulk export:', err);
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
        field: 'originalValue',
        headerName: 'Valor Original (Siesa)',
        width: 180,
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={500}>{params.value}</Typography>
        ),
      },
      {
        field: 'normalizedValue',
        headerName: 'Valor Normalizado',
        width: 180,
        editable: true,
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
        width: 240,
        editable: true,
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
        field: 'createdBy',
        headerName: 'Modificado por',
        width: 160,
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

  // Inline edit handler
  const handleProcessRowUpdate = useCallback(async (newRow, oldRow) => {
    const changes = {};
    if (newRow.normalizedValue !== oldRow.normalizedValue) changes.normalizedValue = newRow.normalizedValue;
    if (newRow.description !== oldRow.description) changes.description = newRow.description;
    if (Object.keys(changes).length === 0) return oldRow;

    try {
      await productsApi.updateClassification(dimension, oldRow.originalValue, changes);
      fetchData(dimension, search);
      return newRow;
    } catch (err) {
      console.error('Error updating classification:', err);
      return oldRow;
    }
  }, [dimension, search, fetchData]);

  return (
    <Box>
      {/* Dimension Toggle */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={dimension}
          exclusive
          onChange={(_, val) => { if (val) { setDimension(val); setSearch(''); } }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: 'none',
            },
            '& .Mui-selected': {
              bgcolor: 'primary.main',
              color: '#fff',
              '&:hover': { bgcolor: 'primary.dark' },
            },
          }}
        >
          <ToggleButton value="categorias">Categorías</ToggleButton>
          <ToggleButton value="subcategorias">Subcategorías</ToggleButton>
          <ToggleButton value="sistemas">Sistemas</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Stats Chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Chip label={`${stats.total} valores`} size="small" variant="outlined" />
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
          placeholder="Buscar clasificacion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ maxWidth: 360 }}
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
          processRowUpdate={handleProcessRowUpdate}
          onProcessRowUpdateError={(err) => console.error('Row update error:', err)}
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
      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        dimensionLabel={dimensionLabels[dimension]}
        saving={saving}
      />

      {/* Detail Modal */}
      <DetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        item={detailItem}
        dimensionLabel={dimensionLabels[dimension]}
      />
    </Box>
  );
}
