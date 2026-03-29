/**
 * Clasificaciones Tab — Manage Categorías, Subcategorías, and Sistemas.
 * Redesigned: 2-row command bar, KPI cards with icons, FilterChips, auto-height table.
 * Mobile-responsive: card view on small screens, stacked toolbar.
 * Priority: numeric column for manual ordering.
 * Notes: visible indicator in table + card view.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Chip, InputAdornment, Typography,
  IconButton, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Paper, Divider, Alert, Card, CardContent, CardActionArea,
  Checkbox, Skeleton, Fade, useMediaQuery, useTheme,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/StickyNote2Outlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { formatDate } from '../../utils/formatters';
import productsApi from '../../api/products.api';

// ══════════════════════════════════════════════════════════════
// Toolbar Icon Button
// ══════════════════════════════════════════════════════════════
function TbIcon({ title, disabled, onClick, color, children }) {
  return (
    <Tooltip title={title} arrow>
      <span>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={onClick}
          color={color}
          sx={{ opacity: disabled ? 0.28 : 1, transition: 'opacity 0.15s' }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

// ══════════════════════════════════════════════════════════════
// FilterChip — toggleable chip for command-bar filters
// ══════════════════════════════════════════════════════════════
function FilterChip({ label, active, onClick, count }) {
  return (
    <Chip
      label={count != null ? `${label} (${count})` : label}
      size="small"
      variant={active ? 'filled' : 'outlined'}
      color={active ? 'primary' : 'default'}
      onClick={onClick}
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': { boxShadow: 1 },
      }}
    />
  );
}

// ══════════════════════════════════════════════════════════════
// KPI Card — colored left border, icon, hover lift, skeleton
// ══════════════════════════════════════════════════════════════
function KpiCard({ icon: IconComponent, label, value, color, loading }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (loading) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 1.5, borderRadius: 2.5, flex: 1, minWidth: 110,
          borderLeft: '4px solid', borderLeftColor: 'divider',
        }}
      >
        <Skeleton width="60%" height={16} />
        <Skeleton width="40%" height={28} sx={{ mt: 0.75 }} />
      </Paper>
    );
  }

  const resolvedColor = color || 'primary.main';
  const iconBg = isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF';
  const colorMap = {
    'primary.main': isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF',
    '#E65100': isDark ? 'rgba(230,81,0,0.12)' : '#FFF3E0',
    '#2E7D32': isDark ? 'rgba(46,125,50,0.12)' : '#E8F5E9',
    '#C62828': isDark ? 'rgba(198,40,40,0.12)' : '#FFEBEE',
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5, borderRadius: 2.5, flex: 1, minWidth: 110,
        borderLeft: '4px solid', borderLeftColor: resolvedColor,
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: theme.shadows[3], transform: 'translateY(-2px)' },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Box
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 1.5,
            bgcolor: colorMap[resolvedColor] || iconBg,
          }}
        >
          <IconComponent sx={{ fontSize: 20, color: resolvedColor }} />
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ lineHeight: 1.2 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ pl: 0.25 }}>
        {value}
      </Typography>
    </Paper>
  );
}

// ══════════════════════════════════════════════════════════════
// Table Skeleton
// ══════════════════════════════════════════════════════════════
function TableSkeleton({ rows = 8 }) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, bgcolor: 'action.hover' }}>
        {[80, 180, 180, 220, 70, 80, 100, 110, 110].map((w, i) => (
          <Skeleton key={i} width={w} height={20} />
        ))}
      </Box>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
          {[80, 180, 180, 220, 70, 80, 100, 110, 110].map((w, j) => (
            <Skeleton key={j} width={w} height={18} />
          ))}
        </Box>
      ))}
    </Paper>
  );
}

// ══════════════════════════════════════════════════════════════
// Create Modal
// ══════════════════════════════════════════════════════════════
function CreateModal({ open, onClose, onSave, dimensionLabel, saving }) {
  const [form, setForm] = useState({ originalValue: '', normalizedValue: '', description: '', notes: '', priority: 0 });

  const handleChange = (field) => (e) => {
    const val = field === 'priority' ? parseInt(e.target.value, 10) || 0 : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    onSave(form);
    setForm({ originalValue: '', normalizedValue: '', description: '', notes: '', priority: 0 });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
            label="Nombre"
            value={form.normalizedValue}
            onChange={handleChange('normalizedValue')}
            required
          />
          <TextField
            label="Prioridad"
            type="number"
            value={form.priority}
            onChange={handleChange('priority')}
            inputProps={{ min: 0 }}
            helperText="Menor numero = mayor prioridad"
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
// Detail / Edit Modal
// ══════════════════════════════════════════════════════════════
function DetailModal({ open, onClose, item, dimensionLabel, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (item) {
      setForm({
        normalizedValue: item.normalizedValue || '',
        description: item.description || '',
        notes: item.notes || '',
        priority: item.priority ?? 0,
      });
      setEditing(false);
    }
  }, [item]);

  if (!item) return null;

  const handleChange = (field) => (e) => {
    const val = field === 'priority' ? parseInt(e.target.value, 10) || 0 : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = () => {
    const changes = {};
    if (form.normalizedValue !== item.normalizedValue) changes.normalizedValue = form.normalizedValue;
    if (form.description !== (item.description || '')) changes.description = form.description;
    if (form.notes !== (item.notes || '')) changes.notes = form.notes;
    if (form.priority !== (item.priority ?? 0)) changes.priority = form.priority;
    if (Object.keys(changes).length > 0) {
      onSave(item.id, changes);
    }
    setEditing(false);
  };

  const changelog = item.changeLog && item.changeLog.length > 0
    ? item.changeLog
    : [
        {
          fecha: item.updatedAt,
          usuario: item.updatedBy || item.createdBy || '—',
          accion: item.isEdited ? 'Valor normalizado editado' : 'Creado desde importacion Siesa',
        },
      ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Detalle de {dimensionLabel}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
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
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">SKUs</Typography>
            <Typography variant="body2" fontWeight={600}>{item.skuCount}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="caption" color="text.secondary">Prioridad</Typography>
            {editing ? (
              <TextField size="small" type="number" value={form.priority} onChange={handleChange('priority')} inputProps={{ min: 0 }} sx={{ mt: 0.5, width: 80 }} />
            ) : (
              <Typography variant="body2" fontWeight={600}>{item.priority ?? 0}</Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Original (Siesa) — No editable</Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F5F5F5', mt: 0.5 }}>
              <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>
                {item.originalValue}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Nombre
              {item.isEdited && (
                <Chip label="Editado" size="small" sx={{ ml: 1, bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 600, fontSize: '0.6rem', height: 18 }} />
              )}
            </Typography>
            {editing ? (
              <TextField fullWidth size="small" value={form.normalizedValue} onChange={handleChange('normalizedValue')} sx={{ mt: 0.5 }} />
            ) : (
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, ...(item.isEdited ? { color: '#E65100' } : {}) }}>
                {item.normalizedValue}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Descripcion</Typography>
            {editing ? (
              <TextField fullWidth size="small" multiline rows={2} value={form.description} onChange={handleChange('description')} sx={{ mt: 0.5 }} />
            ) : (
              <Typography variant="body2" sx={{ mt: 0.5 }}>{item.description || '—'}</Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">Notas</Typography>
            {editing ? (
              <TextField fullWidth size="small" multiline rows={2} value={form.notes} onChange={handleChange('notes')} sx={{ mt: 0.5 }} />
            ) : (
              <Typography variant="body2" sx={{ mt: 0.5 }}>{item.notes || '—'}</Typography>
            )}
          </Grid>

          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Ultima modificacion</Typography>
            <Typography variant="body2">{formatDate(item.updatedAt)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Modificado por</Typography>
            <Typography variant="body2">{item.updatedBy || item.createdBy || '—'}</Typography>
          </Grid>
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
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cerrar</Button>
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>
              Editar
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Rename Dialog
// ══════════════════════════════════════════════════════════════
function RenameDialog({ open, onClose, onConfirm, selectedItems, saving }) {
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (open) setNewValue('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Renombrar Clasificacion</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se actualizara el nombre de {selectedItems.length} elemento{selectedItems.length > 1 ? 's' : ''} seleccionado{selectedItems.length > 1 ? 's' : ''}:
        </Typography>
        <Box sx={{ mb: 2, maxHeight: 120, overflow: 'auto' }}>
          {selectedItems.map((item, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {item.originalValue}
              </Typography>
              <Typography variant="caption">&rarr;</Typography>
              <Typography variant="caption" sx={{ color: '#E65100', fontWeight: 600 }}>
                {item.normalizedValue}
              </Typography>
            </Stack>
          ))}
        </Box>
        <TextField
          label="Nuevo nombre"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          fullWidth
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(newValue)}
          disabled={!newValue.trim() || saving}
        >
          {saving ? 'Renombrando...' : 'Renombrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Confirm Dialog (for Inactivar / Activar)
// ══════════════════════════════════════════════════════════════
function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, saving }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={onConfirm} disabled={saving}>
          {saving ? 'Procesando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// CSV Export utility
// ══════════════════════════════════════════════════════════════
function downloadCSV(data, filename) {
  if (!data || data.length === 0) return;
  const headers = ['ID', 'Dimension', 'Valor Original (Siesa)', 'Nombre', 'Descripcion', 'Prioridad', 'Estado', 'SKUs', 'Creado', 'Modificado', 'Modificado Por'];
  const csvRows = [headers.join(',')];
  for (const row of data) {
    csvRows.push([
      row.id || '',
      row.dimension || '',
      `"${(row.original_value || '').replace(/"/g, '""')}"`,
      `"${(row.normalized_value || '').replace(/"/g, '""')}"`,
      `"${(row.description || '').replace(/"/g, '""')}"`,
      row.priority ?? 0,
      row.status || '',
      row.sku_count || 0,
      row.created_at || '',
      row.updated_at || '',
      row.updated_by || row.created_by || '',
    ].join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// Mobile Card Component
// ══════════════════════════════════════════════════════════════
function ClassificationCard({ item, selected, onToggle, onView }) {
  const isActive = item.status === 'active';
  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1,
        borderRadius: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        opacity: isActive ? 1 : 0.6,
      }}
    >
      <CardActionArea onClick={onView} sx={{ p: 0 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Checkbox
              size="small"
              checked={selected}
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              sx={{ p: 0, mt: 0.25 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Row 1: Name + priority badge */}
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                  {item.normalizedValue}
                </Typography>
                {item.priority > 0 && (
                  <Chip label={`#${item.priority}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#E3F2FD', color: '#1565C0' }} />
                )}
                <Chip
                  label={isActive ? 'Activo' : 'Inactivo'}
                  size="small"
                  sx={{
                    height: 20, fontSize: '0.6rem', fontWeight: 600,
                    bgcolor: isActive ? '#E8F5E9' : '#FFEBEE',
                    color: isActive ? '#2E7D32' : '#C62828',
                  }}
                />
              </Stack>

              {/* Row 2: Original value */}
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} noWrap>
                {item.originalValue}
              </Typography>

              {/* Row 3: Meta chips */}
              <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap">
                <Chip label={`${item.skuCount} SKUs`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                {item.isEdited && (
                  <Chip label="Editado" size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#FFF3E0', color: '#E65100' }} />
                )}
                {item.notes && (
                  <Chip
                    icon={<NotesIcon sx={{ fontSize: 12 }} />}
                    label="Notas"
                    size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: '#F3E5F5', color: '#7B1FA2' }}
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function ClasificacionesTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [dimension, setDimension] = useState('categorias');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [stats, setStats] = useState({ total: 0, edited: 0, active: 0, inactive: 0 });
  const [snackMsg, setSnackMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const dimensionLabels = {
    categorias: 'Categoria',
    subcategorias: 'Subcategoria',
    sistemas: 'Sistema',
  };

  // Fetch data
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

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchData(dimension, search);
    }, search ? 300 : 0);
    return () => clearTimeout(debounce);
  }, [dimension, search, fetchData]);

  useEffect(() => {
    if (snackMsg) {
      const t = setTimeout(() => setSnackMsg(''), 4000);
      return () => clearTimeout(t);
    }
  }, [snackMsg]);

  // CRUD handlers
  const handleCreate = useCallback(async (form) => {
    setSaving(true);
    try {
      await productsApi.createClassification(dimension, {
        originalValue: form.originalValue,
        normalizedValue: form.normalizedValue,
        description: form.description,
        notes: form.notes,
        priority: form.priority,
      });
      setCreateOpen(false);
      setSnackMsg('Clasificacion creada exitosamente');
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

  const handleDetailSave = useCallback(async (classificationId, changes) => {
    setSaving(true);
    try {
      await productsApi.updateClassification(dimension, classificationId, changes);
      setSnackMsg('Clasificacion actualizada');
      fetchData(dimension, search);
      setDetailOpen(false);
      setDetailItem(null);
    } catch (err) {
      console.error('Error updating classification:', err);
    } finally {
      setSaving(false);
    }
  }, [dimension, search, fetchData]);

  const getSelectedItems = useCallback(() => {
    return rows.filter((r) => selectionModel.includes(r.id));
  }, [rows, selectionModel]);

  const hasActiveSelected = useMemo(() => {
    return rows.some((r) => selectionModel.includes(r.id) && r.status === 'active');
  }, [rows, selectionModel]);

  const hasInactiveSelected = useMemo(() => {
    return rows.some((r) => selectionModel.includes(r.id) && r.status === 'inactive');
  }, [rows, selectionModel]);

  // Bulk actions
  const handleBulkRename = async (newValue) => {
    setSaving(true);
    try {
      await productsApi.bulkClassificationAction(dimension, { action: 'rename', ids: selectionModel, newValue });
      setSelectionModel([]);
      setRenameOpen(false);
      setSnackMsg(`${selectionModel.length} elemento(s) renombrado(s)`);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error bulk rename:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkInactivate = async () => {
    setSaving(true);
    try {
      await productsApi.bulkClassificationAction(dimension, { action: 'inactivate', ids: selectionModel });
      setSelectionModel([]);
      setConfirmOpen(false);
      setSnackMsg(`${selectionModel.length} elemento(s) inactivado(s)`);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error bulk inactivate:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkActivate = async () => {
    setSaving(true);
    try {
      await productsApi.bulkClassificationAction(dimension, { action: 'activate', ids: selectionModel });
      setSelectionModel([]);
      setConfirmOpen(false);
      setSnackMsg(`${selectionModel.length} elemento(s) activado(s)`);
      fetchData(dimension, search);
    } catch (err) {
      console.error('Error bulk activate:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      const result = await productsApi.bulkClassificationAction(dimension, { action: 'export', ids: selectionModel });
      if (result.items && result.items.length > 0) {
        downloadCSV(result.items, `clasificaciones_${dimension}_${new Date().toISOString().slice(0, 10)}.csv`);
        setSnackMsg(`${result.items.length} elemento(s) exportado(s)`);
      }
    } catch (err) {
      console.error('Error bulk export:', err);
    }
  };

  const handleExportAll = async () => {
    const allIds = rows.map((r) => r.id);
    if (allIds.length === 0) return;
    try {
      const result = await productsApi.bulkClassificationAction(dimension, { action: 'export', ids: allIds });
      if (result.items && result.items.length > 0) {
        downloadCSV(result.items, `clasificaciones_${dimension}_todas_${new Date().toISOString().slice(0, 10)}.csv`);
        setSnackMsg(`${result.items.length} elemento(s) exportado(s)`);
      }
    } catch (err) {
      console.error('Error exporting all:', err);
    }
  };

  // Open detail for the single selected row
  const handleOpenSelectedDetail = useCallback(() => {
    const items = getSelectedItems();
    if (items.length === 1) handleViewDetail(items[0]);
  }, [getSelectedItems, handleViewDetail]);

  // Mobile card toggle
  const handleCardToggle = useCallback((id) => {
    setSelectionModel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // Column definitions — with priority and notes indicator
  const columns = useMemo(
    () => [
      {
        field: 'priority',
        headerName: '#',
        flex: 0.4,
        minWidth: 60,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        editable: true,
        valueFormatter: (value) => (value > 0 ? value : '—'),
      },
      {
        field: 'originalValue',
        headerName: 'Original (Siesa)',
        flex: 1,
        minWidth: 160,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {params.value}
          </Typography>
        ),
      },
      {
        field: 'normalizedValue',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 160,
        align: 'center',
        headerAlign: 'center',
        editable: true,
        renderCell: (params) => (
          <Box
            sx={
              params.row.isEdited
                ? { bgcolor: '#FFFDE7', borderLeft: '3px solid #FF9800', pl: 1, py: 0.5, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                : { pl: 1, py: 0.5, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }
          >
            <Typography variant="body2" fontWeight={600}>{params.value}</Typography>
          </Box>
        ),
      },
      {
        field: 'description',
        headerName: 'Descripcion',
        flex: 1.2,
        minWidth: 180,
        align: 'center',
        headerAlign: 'center',
        editable: true,
      },
      {
        field: 'notes',
        headerName: 'Notas',
        flex: 0.4,
        minWidth: 60,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) =>
          params.value ? (
            <Tooltip title={params.value} arrow>
              <NotesIcon fontSize="small" sx={{ color: '#7B1FA2' }} />
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.disabled">—</Typography>
          ),
      },
      {
        field: 'skuCount',
        headerName: 'SKUs',
        flex: 0.5,
        minWidth: 70,
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
        flex: 0.6,
        minWidth: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            label={params.value === 'active' ? 'Activo' : 'Inactivo'}
            size="small"
            sx={{
              bgcolor: params.value === 'active' ? '#E8F5E9' : '#FFEBEE',
              color: params.value === 'active' ? '#2E7D32' : '#C62828',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />
        ),
      },
      {
        field: 'isEdited',
        headerName: 'Normalizado',
        flex: 0.6,
        minWidth: 100,
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
        flex: 0.7,
        minWidth: 100,
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value) => formatDate(value),
      },
    ],
    []
  );

  // Inline edit handler (supports priority + normalizedValue + description)
  const handleProcessRowUpdate = useCallback(async (newRow, oldRow) => {
    const changes = {};
    if (newRow.normalizedValue !== oldRow.normalizedValue) changes.normalizedValue = newRow.normalizedValue;
    if (newRow.description !== oldRow.description) changes.description = newRow.description;
    if (newRow.priority !== oldRow.priority) changes.priority = newRow.priority;
    if (Object.keys(changes).length === 0) return oldRow;

    try {
      await productsApi.updateClassification(dimension, oldRow.id, changes);
      setSnackMsg('Actualizado');
      fetchData(dimension, search);
      return newRow;
    } catch (err) {
      console.error('Error updating classification:', err);
      return oldRow;
    }
  }, [dimension, search, fetchData]);

  const hasSel = selectionModel.length > 0;

  // Client-side status filter
  const filteredRows = useMemo(() => {
    if (!statusFilter) return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [rows, statusFilter]);

  // Paginated rows for mobile cards
  const paginatedRows = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return filteredRows.slice(start, start + paginationModel.pageSize);
  }, [filteredRows, paginationModel]);

  const totalPages = Math.ceil(filteredRows.length / paginationModel.pageSize);

  const hasActiveFilters = statusFilter !== '';
  const clearAllFilters = () => { setStatusFilter(''); setPaginationModel(p => ({ ...p, page: 0 })); };

  return (
    <Box>
      {/* ── KPI Strip ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Fade in timeout={300}><Box sx={{ flex: 1, minWidth: 110 }}><KpiCard icon={ListAltIcon} label="Total Valores" value={stats.total} color="primary.main" loading={loading} /></Box></Fade>
        <Fade in timeout={500}><Box sx={{ flex: 1, minWidth: 110 }}><KpiCard icon={EditNoteIcon} label="Editados" value={stats.edited} color="#E65100" loading={loading} /></Box></Fade>
        <Fade in timeout={700}><Box sx={{ flex: 1, minWidth: 110 }}><KpiCard icon={CheckCircleIcon} label="Activos" value={stats.active} color="#2E7D32" loading={loading} /></Box></Fade>
        <Fade in timeout={900}><Box sx={{ flex: 1, minWidth: 110 }}><KpiCard icon={BlockOutlinedIcon} label="Inactivos" value={stats.inactive} color="#C62828" loading={loading} /></Box></Fade>
      </Stack>

      {/* ── Success message ── */}
      {snackMsg && (
        <Alert severity="success" onClose={() => setSnackMsg('')} sx={{ mb: 2 }}>
          {snackMsg}
        </Alert>
      )}

      {/* ── Command Bar (2-row integrated toolbar) ── */}
      <Paper
        variant="outlined"
        sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}
      >
        {/* Row 1: Search + result count + spacer + selection actions + global actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1, py: 0.5, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ width: isMobile ? '100%' : 220, '& .MuiOutlinedInput-root': { height: 36 } }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />

          <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ whiteSpace: 'nowrap' }}>
            {filteredRows.length} resultado{filteredRows.length !== 1 ? 's' : ''}
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Selection count badge */}
          {hasSel && (
            <Chip
              label={`${selectionModel.length} sel.`}
              size="small"
              color="primary"
              onDelete={() => setSelectionModel([])}
              sx={{ fontWeight: 600, mr: 0.5 }}
            />
          )}

          {/* Selection-dependent actions */}
          <TbIcon title="Ver detalle" disabled={selectionModel.length !== 1} onClick={handleOpenSelectedDetail}>
            <VisibilityOutlinedIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Renombrar" disabled={!hasSel} onClick={() => setRenameOpen(true)}>
            <DriveFileRenameOutlineIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Inactivar" disabled={!hasActiveSelected} onClick={() => { setConfirmAction('inactivate'); setConfirmOpen(true); }}>
            <BlockIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Activar" disabled={!hasInactiveSelected} onClick={() => { setConfirmAction('activate'); setConfirmOpen(true); }}>
            <CheckCircleOutlineIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Exportar seleccion" disabled={!hasSel} onClick={handleBulkExport}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </TbIcon>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

          {/* Global actions */}
          <TbIcon title="Refrescar" onClick={() => fetchData(dimension, search)}>
            <RefreshIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Exportar todo" onClick={handleExportAll}>
            <SaveAltIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Crear" color="primary" onClick={() => setCreateOpen(true)}>
            <AddCircleOutlineIcon fontSize="small" />
          </TbIcon>
        </Box>

        {/* Row 2: FilterChip groups */}
        <Box
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.75,
            px: 1, py: 0.75,
            borderTop: '1px solid', borderColor: 'divider',
            bgcolor: 'action.hover',
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 2 },
          }}
        >
          {/* Dimension group */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ whiteSpace: 'nowrap', mr: 0.25 }}>
            Tipo:
          </Typography>
          <FilterChip label={isMobile ? 'Cat.' : 'Categorias'} active={dimension === 'categorias'} onClick={() => { setDimension('categorias'); setSearch(''); setStatusFilter(''); setPaginationModel(p => ({ ...p, page: 0 })); }} />
          <FilterChip label={isMobile ? 'Sub.' : 'Subcategorias'} active={dimension === 'subcategorias'} onClick={() => { setDimension('subcategorias'); setSearch(''); setStatusFilter(''); setPaginationModel(p => ({ ...p, page: 0 })); }} />
          <FilterChip label={isMobile ? 'Sis.' : 'Sistemas'} active={dimension === 'sistemas'} onClick={() => { setDimension('sistemas'); setSearch(''); setStatusFilter(''); setPaginationModel(p => ({ ...p, page: 0 })); }} />

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          {/* Status group */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ whiteSpace: 'nowrap', mr: 0.25 }}>
            Estado:
          </Typography>
          <FilterChip label="Todos" active={statusFilter === ''} onClick={() => { setStatusFilter(''); setPaginationModel(p => ({ ...p, page: 0 })); }} />
          <FilterChip label="Activos" active={statusFilter === 'active'} count={stats.active} onClick={() => { setStatusFilter(statusFilter === 'active' ? '' : 'active'); setPaginationModel(p => ({ ...p, page: 0 })); }} />
          <FilterChip label="Inactivos" active={statusFilter === 'inactive'} count={stats.inactive} onClick={() => { setStatusFilter(statusFilter === 'inactive' ? '' : 'inactive'); setPaginationModel(p => ({ ...p, page: 0 })); }} />

          {hasActiveFilters && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Button size="small" onClick={clearAllFilters} sx={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'none', whiteSpace: 'nowrap', minWidth: 'auto', px: 1 }}>
                Limpiar
              </Button>
            </>
          )}
        </Box>
      </Paper>

      {/* ── Content: DataGrid (desktop) or Card list (mobile) ── */}
      {isMobile ? (
        <Box>
          {loading ? (
            <Stack spacing={1}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Skeleton variant="rectangular" width={20} height={20} sx={{ borderRadius: 0.5 }} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" height={18} />
                      <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }}>
                        <Skeleton width={60} height={20} sx={{ borderRadius: 1 }} />
                        <Skeleton width={50} height={20} sx={{ borderRadius: 1 }} />
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : paginatedRows.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              Sin resultados
            </Typography>
          ) : (
            <>
              {paginatedRows.map((item) => (
                <ClassificationCard
                  key={item.id}
                  item={item}
                  selected={selectionModel.includes(item.id)}
                  onToggle={() => handleCardToggle(item.id)}
                  onView={() => handleViewDetail(item)}
                />
              ))}
              {/* Simple pagination */}
              {totalPages > 1 && (
                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    size="small"
                    disabled={paginationModel.page === 0}
                    onClick={() => setPaginationModel(p => ({ ...p, page: p.page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {paginationModel.page + 1} / {totalPages}
                  </Typography>
                  <Button
                    size="small"
                    disabled={paginationModel.page >= totalPages - 1}
                    onClick={() => setPaginationModel(p => ({ ...p, page: p.page + 1 }))}
                  >
                    Siguiente
                  </Button>
                </Stack>
              )}
            </>
          )}
        </Box>
      ) : loading ? (
        <TableSkeleton rows={10} />
      ) : (
        <DataGrid
          rows={filteredRows}
          columns={columns}
          density="compact"
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(newModel) => setSelectionModel(newModel)}
          processRowUpdate={handleProcessRowUpdate}
          onProcessRowUpdateError={(err) => console.error('Row update error:', err)}
          pageSizeOptions={[25, 50]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sortingOrder={['asc', 'desc']}
          initialState={{
            sorting: { sortModel: [{ field: 'priority', sort: 'asc' }] },
          }}
          sx={{
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
          }}
        />
      )}

      {/* Modals */}
      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
        dimensionLabel={dimensionLabels[dimension]}
        saving={saving}
      />

      <DetailModal
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        item={detailItem}
        dimensionLabel={dimensionLabels[dimension]}
        onSave={handleDetailSave}
        saving={saving}
      />

      <RenameDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        onConfirm={handleBulkRename}
        selectedItems={getSelectedItems()}
        saving={saving}
      />

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={confirmAction === 'inactivate' ? handleBulkInactivate : handleBulkActivate}
        title={confirmAction === 'inactivate' ? 'Inactivar Clasificaciones' : 'Activar Clasificaciones'}
        message={
          confirmAction === 'inactivate'
            ? `Desea inactivar ${selectionModel.length} elemento(s) seleccionado(s)? Los SKUs asociados no se veran afectados.`
            : `Desea reactivar ${selectionModel.length} elemento(s) seleccionado(s)?`
        }
        confirmLabel={confirmAction === 'inactivate' ? 'Inactivar' : 'Activar'}
        saving={saving}
      />
    </Box>
  );
}
