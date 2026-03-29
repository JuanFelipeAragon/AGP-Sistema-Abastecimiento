/**
 * AttributeManager — Generic CRUD for product attributes.
 * Driven by config from attributeConfigs.js.
 * mode="acabado" → uses existing acabados API
 * mode="generic" → uses generic product_attributes API
 *
 * Features: KPI strip, command bar, DataGrid, create/edit/detail modals,
 * bulk actions, CSV export, mobile cards, skeleton loading.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Chip, InputAdornment, Typography,
  IconButton, Tooltip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Paper, Divider, Alert, Card, CardContent,
  CardActionArea, Checkbox, useMediaQuery, useTheme,
  MenuItem, Select, FormControl, InputLabel,
  Fade, Collapse, Skeleton,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import PendingIcon from '@mui/icons-material/Pending';
import RuleIcon from '@mui/icons-material/Rule';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import productsApi from '../../api/products.api';
import { formatDate } from '../../utils/formatters';
import { STATUS_OPTIONS, ENRICHMENT_OPTIONS } from './attributeConfigs';

const TRANSITION_DURATION = 250;

const ENRICHMENT_COLORS = {
  pendiente: { bg: '#FFEBEE', color: '#C62828', label: 'Pendiente' },
  parcial: { bg: '#FFF8E1', color: '#F57F17', label: 'Parcial' },
  completo: { bg: '#E8F5E9', color: '#2E7D32', label: 'Completo' },
};

// ══════════════════════════════════════════════════════════════
// Shared Components
// ══════════════════════════════════════════════════════════════

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

function FilterChip({ label, active, onClick, activeColor, activeTextColor, icon, size = 'small' }) {
  return (
    <Chip
      label={label}
      icon={icon}
      size={size}
      onClick={onClick}
      variant={active ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600, fontSize: '0.7rem', height: 28, cursor: 'pointer',
        transition: 'all 0.2s ease',
        bgcolor: active ? (activeColor || 'primary.main') : 'transparent',
        color: active ? (activeTextColor || '#fff') : 'text.secondary',
        borderColor: active ? 'transparent' : 'divider',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 1, bgcolor: active ? (activeColor || 'primary.main') : 'action.hover' },
      }}
    />
  );
}

function KpiCard({ value, label, color, bgColor, icon, delay = 0, loading }) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={32} height={32} />
          <Box><Skeleton width={30} height={28} /><Skeleton width={70} height={14} /></Box>
        </Stack>
      </Paper>
    );
  }
  return (
    <Fade in timeout={TRANSITION_DURATION + delay}>
      <Paper variant="outlined" sx={{
        px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1,
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderLeft: `3px solid ${color || '#94A3B8'}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: bgColor || '#F1F5F9', color: color || '#64748B', flexShrink: 0,
        }}>{icon}</Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color={color || 'text.primary'} sx={{ lineHeight: 1.1 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
        </Box>
      </Paper>
    </Fade>
  );
}

function TableSkeleton() {
  return (
    <Box>
      {[...Array(6)].map((_, i) => (
        <Fade in timeout={200 + i * 80} key={i}>
          <Box sx={{ display: 'flex', gap: 2, py: 1, px: 1 }}>
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 0.5 }} />
            <Skeleton width={80} height={24} /><Skeleton width={160} height={24} />
            <Skeleton width={120} height={24} /><Skeleton width={90} height={24} />
            <Skeleton width={60} height={24} />
          </Box>
        </Fade>
      ))}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// Create Modal
// ══════════════════════════════════════════════════════════════
function CreateModal({ open, onClose, onSave, saving, config, dimension, productType }) {
  const [form, setForm] = useState({ codigo: '', nombreSiesa: '', nombre: '', descripcion: '', notas: '' });
  const [extraFields, setExtraFields] = useState({});

  useEffect(() => {
    if (open) {
      setForm({ codigo: '', nombreSiesa: '', nombre: '', descripcion: '', notas: '' });
      const extra = {};
      (config.formFields || []).forEach((f) => { extra[f.key] = ''; });
      setExtraFields(extra);
    }
  }, [open, config]);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const setExtra = (f) => (e) => setExtraFields((p) => ({ ...p, [f]: e.target.value }));

  const handleSave = () => {
    const payload = {
      productType,
      codigo: form.codigo,
      nombreSiesa: form.nombreSiesa,
      nombre: form.nombre || undefined,
      descripcion: form.descripcion || undefined,
      notas: form.notas || undefined,
    };
    // For acabado mode, extra fields go at top level; for generic, into metadata
    if (config.mode === 'acabado') {
      Object.entries(extraFields).forEach(([k, v]) => { if (v) payload[k] = v; });
    } else {
      payload.metadata = {};
      Object.entries(extraFields).forEach(([k, v]) => { if (v) payload.metadata[k] = v; });
    }
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Crear {config.labelSingular}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Codigo *" value={form.codigo} onChange={set('codigo')} fullWidth
              onFocus={(e) => e.target.select()} />
            <TextField label="Nombre Siesa *" value={form.nombreSiesa} onChange={set('nombreSiesa')} fullWidth />
          </Stack>
          <TextField label="Nombre Normalizado" value={form.nombre} onChange={set('nombre')}
            helperText="Si esta vacio, se usa el nombre Siesa" />
          {(config.formFields || []).map((f) => (
            f.type === 'select' ? (
              <FormControl key={f.key} fullWidth size="small">
                <InputLabel>{f.label}</InputLabel>
                <Select value={extraFields[f.key] || ''} onChange={setExtra(f.key)} label={f.label}>
                  <MenuItem value="">— Ninguno —</MenuItem>
                  {(f.options || []).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField key={f.key} label={f.label} value={extraFields[f.key] || ''}
                onChange={setExtra(f.key)} fullWidth size="small" />
            )
          ))}
          <TextField label="Descripcion" value={form.descripcion} onChange={set('descripcion')} multiline rows={2} />
          <TextField label="Notas" value={form.notas} onChange={set('notas')} multiline rows={2} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!form.codigo || !form.nombreSiesa || saving}>
          {saving ? 'Creando...' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Detail / Edit Modal
// ══════════════════════════════════════════════════════════════
function DetailModal({ open, onClose, item, onSave, saving, config, dimension }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [fullItem, setFullItem] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (item?.id && open) {
      setLoadingDetail(true);
      const fetcher = config.mode === 'acabado'
        ? productsApi.getAcabadoById(item.id)
        : productsApi.getAttributeById(dimension, item.id);
      fetcher
        .then((data) => setFullItem(data))
        .catch(() => setFullItem(item))
        .finally(() => setLoadingDetail(false));
    }
  }, [item, open, config.mode, dimension]);

  useEffect(() => {
    const src = fullItem || item;
    if (src) {
      const f = {
        nombre: src.nombre || '',
        descripcion: src.descripcion || '',
        notas: src.notas || '',
      };
      // Add extra fields from config
      (config.formFields || []).forEach((ff) => {
        f[ff.key] = src[ff.key] || (src.metadata || {})[ff.key] || '';
      });
      setForm(f);
      setEditing(false);
    }
  }, [fullItem, item, config]);

  if (!item) return null;
  const src = fullItem || item;

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSave = () => {
    const changes = {};
    if (form.nombre !== (src.nombre || '')) changes.nombre = form.nombre;
    if (form.descripcion !== (src.descripcion || '')) changes.descripcion = form.descripcion;
    if (form.notas !== (src.notas || '')) changes.notas = form.notas;

    if (config.mode === 'acabado') {
      (config.formFields || []).forEach((f) => {
        if (form[f.key] !== (src[f.key] || '')) changes[f.key] = form[f.key];
      });
    } else {
      const metaChanges = {};
      (config.formFields || []).forEach((f) => {
        const srcVal = (src.metadata || {})[f.key] || '';
        if (form[f.key] !== srcVal) metaChanges[f.key] = form[f.key];
      });
      if (Object.keys(metaChanges).length > 0) {
        changes.metadata = { ...(src.metadata || {}), ...metaChanges };
      }
    }

    if (Object.keys(changes).length > 0) onSave(src.id, changes);
    setEditing(false);
  };

  const enrStyle = ENRICHMENT_COLORS[src.enrichmentStatus] || ENRICHMENT_COLORS.pendiente;
  const changelog = src.changeLog?.length > 0 ? src.changeLog : [{ date: src.updatedAt, action: 'Creado desde importacion' }];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>Detalle de {config.labelSingular}</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {loadingDetail ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Cargando...</Typography>
        ) : (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Codigo</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={src.codigo} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Estado</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={src.status === 'active' ? 'Activo' : 'Inactivo'} size="small"
                    sx={{ bgcolor: src.status === 'active' ? '#E8F5E9' : '#FFEBEE', color: src.status === 'active' ? '#2E7D32' : '#C62828', fontWeight: 600 }} />
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">Enriquecimiento</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={enrStyle.label} size="small" sx={{ bgcolor: enrStyle.bg, color: enrStyle.color, fontWeight: 600 }} />
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">SKUs</Typography>
                <Typography variant="body2" fontWeight={600}>{src.skuCount}</Typography>
              </Grid>

              {/* Nombre Siesa (read-only) */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Nombre Siesa — No editable</Typography>
                <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F5F5F5', mt: 0.5 }}>
                  <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>{src.nombreSiesa}</Typography>
                </Paper>
              </Grid>

              {/* Nombre (editable) */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Nombre Normalizado</Typography>
                {editing ? (
                  <TextField fullWidth size="small" value={form.nombre} onChange={set('nombre')} sx={{ mt: 0.5 }} />
                ) : (
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{src.nombre || src.nombreSiesa}</Typography>
                )}
              </Grid>

              {/* Extra config fields */}
              {(config.formFields || []).map((f) => (
                <Grid item xs={6} key={f.key}>
                  <Typography variant="caption" color="text.secondary">{f.label}</Typography>
                  {editing ? (
                    f.type === 'select' ? (
                      <Select fullWidth size="small" value={form[f.key] || ''} onChange={set(f.key)} sx={{ mt: 0.5 }}>
                        <MenuItem value="">— Ninguno —</MenuItem>
                        {(f.options || []).map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                      </Select>
                    ) : (
                      <TextField fullWidth size="small" value={form[f.key] || ''} onChange={set(f.key)} sx={{ mt: 0.5 }} />
                    )
                  ) : (
                    <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5 }}>
                      {(f.type === 'select' ? (f.options || []).find((o) => o.value === (src[f.key] || (src.metadata || {})[f.key]))?.label : null)
                        || src[f.key] || (src.metadata || {})[f.key] || '—'}
                    </Typography>
                  )}
                </Grid>
              ))}

              {/* Descripcion */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Descripcion</Typography>
                {editing ? (
                  <TextField fullWidth size="small" multiline rows={2} value={form.descripcion} onChange={set('descripcion')} sx={{ mt: 0.5 }} />
                ) : (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{src.descripcion || '—'}</Typography>
                )}
              </Grid>

              {/* Notas */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Notas</Typography>
                {editing ? (
                  <TextField fullWidth size="small" multiline rows={2} value={form.notas} onChange={set('notas')} sx={{ mt: 0.5 }} />
                ) : (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{src.notas || '—'}</Typography>
                )}
              </Grid>

              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Ultima modificacion</Typography>
                <Typography variant="body2">{formatDate(src.updatedAt)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Origen</Typography>
                <Typography variant="body2">{src.origen}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Historial de Cambios</Typography>
            {changelog.map((entry, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">{entry.action}</Typography>
                  <Typography variant="caption" color="text.secondary">{formatDate(entry.date)}</Typography>
                </Stack>
                {entry.user && <Typography variant="caption" color="text.secondary">{entry.user}</Typography>}
                {entry.old_value && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {entry.old_value} → {entry.new_value}
                  </Typography>
                )}
              </Paper>
            ))}
          </>
        )}
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
            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>Editar</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Dialogs
// ══════════════════════════════════════════════════════════════
function RenameDialog({ open, onClose, onConfirm, selectedItems, saving, config }) {
  const [newValue, setNewValue] = useState('');
  useEffect(() => { if (open) setNewValue(''); }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Renombrar {config.label}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Se actualizara el nombre de {selectedItems.length} {config.labelSingular.toLowerCase()}(s):
        </Typography>
        <Box sx={{ mb: 2, maxHeight: 120, overflow: 'auto' }}>
          {selectedItems.map((item, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Chip label={item.codigo} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
              <Typography variant="caption">{item.nombre || item.nombreSiesa}</Typography>
            </Stack>
          ))}
        </Box>
        <TextField label="Nuevo nombre" value={newValue} onChange={(e) => setNewValue(e.target.value)} fullWidth autoFocus />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={() => onConfirm(newValue)} disabled={!newValue.trim() || saving}>
          {saving ? 'Renombrando...' : 'Renombrar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, saving, color }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent><Typography variant="body2">{message}</Typography></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" color={color || 'primary'} onClick={onConfirm} disabled={saving}>
          {saving ? 'Procesando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// CSV Export
// ══════════════════════════════════════════════════════════════
function downloadCSV(items, filename, config) {
  if (!items?.length) return;
  const baseHeaders = ['Codigo', 'Nombre Siesa', 'Nombre', 'SKUs', 'Estado', 'Enriquecimiento'];
  const extraHeaders = config.csvExtraHeaders || [];
  const headers = [...baseHeaders, ...extraHeaders];
  const csvRows = [headers.join(',')];
  for (const r of items) {
    const baseCols = [
      r.codigo, `"${(r.nombreSiesa || '').replace(/"/g, '""')}"`,
      `"${(r.nombre || '').replace(/"/g, '""')}"`,
      r.skuCount, r.status, r.enrichmentStatus,
    ];
    const extraCols = config.csvExtraFields ? config.csvExtraFields(r) : [];
    csvRows.push([...baseCols, ...extraCols].join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// Mobile Card
// ══════════════════════════════════════════════════════════════
function AttributeCard({ item, selected, onToggle, onView, config }) {
  const enrStyle = ENRICHMENT_COLORS[item.enrichmentStatus] || ENRICHMENT_COLORS.pendiente;
  return (
    <Card variant="outlined" sx={{ mb: 1, borderRadius: 2, borderColor: selected ? 'primary.main' : 'divider', borderWidth: selected ? 2 : 1, opacity: item.status === 'active' ? 1 : 0.6 }}>
      <CardActionArea onClick={onView} sx={{ p: 0 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Checkbox size="small" checked={selected} onClick={(e) => { e.stopPropagation(); onToggle(); }} sx={{ p: 0, mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                  {item.nombre || item.nombreSiesa}
                </Typography>
                <Chip label={item.codigo} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace' }} />
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                <Chip label={`${item.skuCount} SKUs`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                <Chip label={enrStyle.label} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: enrStyle.bg, color: enrStyle.color }} />
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
export default function AttributeManager({ dimension, productType, config }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectionModel, setSelectionModel] = useState([]);
  const [snackMsg, setSnackMsg] = useState('');
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEnrichment, setFilterEnrichment] = useState('');
  const [extraFilters, setExtraFilters] = useState({});

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // Build API adapter based on mode
  const api = useMemo(() => {
    if (config.mode === 'acabado') {
      return {
        list: (params) => productsApi.getAcabados(params),
        getById: (id) => productsApi.getAcabadoById(id),
        create: (data) => productsApi.createAcabado(data),
        update: (id, data) => productsApi.updateAcabado(id, data),
        bulk: (data) => productsApi.bulkAcabadoAction(data),
      };
    }
    return {
      list: (params) => productsApi.getAttributes(dimension, { ...params, product_type: productType }),
      getById: (id) => productsApi.getAttributeById(dimension, id),
      create: (data) => productsApi.createAttribute(dimension, data),
      update: (id, data) => productsApi.updateAttribute(dimension, id, data),
      bulk: (data) => productsApi.bulkAttributeAction(dimension, data),
    };
  }, [config.mode, dimension, productType]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectionModel([]);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterEnrichment) params.enrichment = filterEnrichment;
      // Extra filters (e.g., tipo_acabado for acabados)
      Object.entries(extraFilters).forEach(([k, v]) => { if (v) params[k] = v; });

      const data = await api.list(params);
      setRows(data.items || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error(`Error fetching ${dimension}:`, err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterEnrichment, extraFilters, api, dimension]);

  useEffect(() => {
    const t = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Reset state when dimension/productType changes
  useEffect(() => {
    setSearch('');
    setFilterStatus('');
    setFilterEnrichment('');
    setExtraFilters({});
    setSelectionModel([]);
    setPaginationModel({ page: 0, pageSize: 25 });
  }, [dimension, productType]);

  useEffect(() => {
    if (snackMsg) { const t = setTimeout(() => setSnackMsg(''), 4000); return () => clearTimeout(t); }
  }, [snackMsg]);

  // CRUD handlers
  const handleCreate = useCallback(async (form) => {
    setSaving(true);
    try {
      await api.create(form);
      setCreateOpen(false);
      setSnackMsg(`${config.labelSingular} creado exitosamente`);
      fetchData();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  }, [api, fetchData, config.labelSingular]);

  const handleViewDetail = useCallback((item) => { setDetailItem(item); setDetailOpen(true); }, []);

  const handleDetailSave = useCallback(async (id, changes) => {
    setSaving(true);
    try {
      await api.update(id, changes);
      setSnackMsg(`${config.labelSingular} actualizado`);
      fetchData();
      setDetailOpen(false);
      setDetailItem(null);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  }, [api, fetchData, config.labelSingular]);

  const getSelectedItems = useCallback(() => rows.filter((r) => selectionModel.includes(r.id)), [rows, selectionModel]);

  const handleBulkRename = async (newValue) => {
    setSaving(true);
    try {
      await api.bulk({ action: 'rename', ids: selectionModel, newValue });
      setSelectionModel([]); setRenameOpen(false);
      setSnackMsg(`${selectionModel.length} ${config.labelSingular.toLowerCase()}(s) renombrado(s)`);
      fetchData();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const handleBulkConfirm = async () => {
    setSaving(true);
    try {
      await api.bulk({ action: confirmAction, ids: selectionModel });
      setSelectionModel([]); setConfirmOpen(false);
      setSnackMsg(`${selectionModel.length} ${config.labelSingular.toLowerCase()}(s) ${confirmAction === 'delete' ? 'eliminado(s)' : confirmAction === 'activate' ? 'activado(s)' : 'inactivado(s)'}`);
      fetchData();
    } catch (err) { console.error(err); } finally { setSaving(false); setConfirmAction(null); }
  };

  const handleExport = (items) => {
    downloadCSV(items, `${dimension}_${new Date().toISOString().slice(0, 10)}.csv`, config);
    setSnackMsg('Exportacion completada');
  };

  const hasActiveSelected = useMemo(() => rows.some((r) => selectionModel.includes(r.id) && r.status === 'active'), [rows, selectionModel]);
  const hasInactiveSelected = useMemo(() => rows.some((r) => selectionModel.includes(r.id) && r.status !== 'active'), [rows, selectionModel]);
  const hasSel = selectionModel.length > 0;
  const activeFilters = [filterStatus, filterEnrichment, ...Object.values(extraFilters)].filter(Boolean).length;

  // Columns
  const columns = useMemo(() => {
    const base = [
      {
        field: 'codigo', headerName: 'Codigo', flex: 0.8, minWidth: 90, align: 'center', headerAlign: 'center',
        renderCell: (p) => <Chip label={p.value} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem' }} />,
      },
      {
        field: 'nombre', headerName: 'Nombre', flex: 1.6, minWidth: 140, align: 'center', headerAlign: 'center',
        valueGetter: (value, row) => value || row.nombreSiesa,
        renderCell: (p) => <Typography variant="body2" fontWeight={600}>{p.value}</Typography>,
      },
      {
        field: 'nombreSiesa', headerName: 'Nombre Siesa', flex: 1.2, minWidth: 120, align: 'center', headerAlign: 'center',
        renderCell: (p) => <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{p.value}</Typography>,
      },
    ];

    // Insert extra columns from config
    const extra = (config.extraColumns || []).map((col) => ({
      ...col,
      align: 'center',
      headerAlign: 'center',
      ...(col.chipField ? {
        renderCell: (p) => {
          const style = col.getStyle ? col.getStyle(p.value) : { label: p.value || '—', color: '#ECEFF1', textColor: '#9E9E9E' };
          return <Chip label={style.label} size="small" sx={{ bgcolor: style.color, color: style.textColor, fontWeight: 600, fontSize: '0.7rem' }} />;
        },
      } : {}),
    }));

    const tail = [
      {
        field: 'skuCount', headerName: 'SKUs', flex: 0.6, minWidth: 70, align: 'center', headerAlign: 'center',
        renderCell: (p) => <Chip label={p.value} size="small" variant="outlined" color={p.value > 0 ? 'primary' : 'default'} sx={{ fontWeight: 600, minWidth: 40 }} />,
      },
      {
        field: 'status', headerName: 'Estado', flex: 0.8, minWidth: 85, align: 'center', headerAlign: 'center',
        renderCell: (p) => (
          <Chip label={p.value === 'active' ? 'Activo' : 'Inactivo'} size="small"
            sx={{ bgcolor: p.value === 'active' ? '#E8F5E9' : '#FFEBEE', color: p.value === 'active' ? '#2E7D32' : '#C62828', fontWeight: 600, fontSize: '0.7rem' }} />
        ),
      },
      {
        field: 'enrichmentStatus', headerName: 'Completitud', flex: 0.9, minWidth: 95, align: 'center', headerAlign: 'center',
        renderCell: (p) => {
          const s = ENRICHMENT_COLORS[p.value] || ENRICHMENT_COLORS.pendiente;
          return <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: '0.7rem' }} />;
        },
      },
      {
        field: 'updatedAt', headerName: 'Modificado', flex: 0.9, minWidth: 95, align: 'center', headerAlign: 'center',
        valueFormatter: (value) => formatDate(value),
      },
    ];

    return [...base, ...extra, ...tail];
  }, [config]);

  return (
    <Box>
      {/* KPI Strip */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {(config.kpis || []).map((kpi, i) => (
          <KpiCard
            key={kpi.key}
            value={stats[kpi.key] || 0}
            label={kpi.label}
            loading={loading}
            delay={i * 50}
            color={kpi.color}
            bgColor={kpi.bgColor}
            icon={<kpi.Icon sx={{ fontSize: 20 }} />}
          />
        ))}
      </Stack>

      <Collapse in={!!snackMsg}>
        <Alert severity="success" onClose={() => setSnackMsg('')} sx={{ mb: 2 }}>{snackMsg}</Alert>
      </Collapse>

      {/* Command Bar */}
      <Fade in timeout={TRANSITION_DURATION}>
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          {/* Row 1: Search + actions */}
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <TextField placeholder={`Buscar ${config.labelSingular.toLowerCase()}...`} value={search}
              onChange={(e) => setSearch(e.target.value)} size="small"
              sx={{ width: { xs: '100%', sm: 280 }, '& .MuiOutlinedInput-root': { height: 36 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

            <Fade in={!loading}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {rows.length}{stats.total ? ` de ${stats.total}` : ''} {isMobile ? '' : config.label.toLowerCase()}
              </Typography>
            </Fade>

            <Box sx={{ flexGrow: 1 }} />

            {hasSel && (
              <Fade in>
                <Chip label={`${selectionModel.length} sel.`} size="small" color="primary"
                  onDelete={() => setSelectionModel([])} sx={{ fontWeight: 600, mr: 0.5 }} />
              </Fade>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            {/* Selection actions */}
            <TbIcon title="Ver detalle" disabled={selectionModel.length !== 1}
              onClick={() => { const items = getSelectedItems(); if (items.length === 1) handleViewDetail(items[0]); }}>
              <VisibilityOutlinedIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Renombrar" disabled={!hasSel} onClick={() => setRenameOpen(true)}>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </TbIcon>
            {hasActiveSelected && (
              <TbIcon title="Inactivar" disabled={!hasSel} onClick={() => { setConfirmAction('inactivate'); setConfirmOpen(true); }}>
                <BlockIcon fontSize="small" />
              </TbIcon>
            )}
            {hasInactiveSelected && (
              <TbIcon title="Activar" disabled={!hasSel} onClick={() => { setConfirmAction('activate'); setConfirmOpen(true); }}>
                <CheckCircleOutlineIcon fontSize="small" />
              </TbIcon>
            )}
            <TbIcon title="Eliminar" disabled={!hasSel} onClick={() => { setConfirmAction('delete'); setConfirmOpen(true); }} color="error">
              <DeleteIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Exportar seleccion" disabled={!hasSel} onClick={() => handleExport(getSelectedItems())}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </TbIcon>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            <TbIcon title="Refrescar datos" onClick={fetchData}>
              <RefreshIcon fontSize="small" sx={{ transition: 'transform 0.3s', ...(loading && { animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }) }} />
            </TbIcon>
            <TbIcon title="Exportar todo" onClick={() => handleExport(rows)}>
              <SaveAltIcon fontSize="small" />
            </TbIcon>
            <TbIcon title={`Crear ${config.labelSingular.toLowerCase()}`} color="primary" onClick={() => setCreateOpen(true)}>
              <AddCircleOutlineIcon fontSize="small" />
            </TbIcon>
          </Box>

          <Divider />

          {/* Row 2: Filters */}
          <Box sx={{
            px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75,
            overflowX: 'auto', '&::-webkit-scrollbar': { height: 0 }, scrollbarWidth: 'none',
          }}>
            {/* Extra filter groups from config (e.g., Tipo for acabados) */}
            {(config.extraFilterGroups || []).map((group) => (
              <Box key={group.key} sx={{ display: 'contents' }}>
                <Typography variant="caption" color="text.disabled"
                  sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
                  {group.label}:
                </Typography>
                {group.options.map((opt) => (
                  <FilterChip key={opt.value} label={opt.label}
                    active={extraFilters[group.key] === opt.value}
                    activeColor={opt.color} activeTextColor={opt.textColor}
                    onClick={() => setExtraFilters((p) => ({ ...p, [group.key]: p[group.key] === opt.value ? '' : opt.value }))} />
                ))}
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              </Box>
            ))}

            {/* Status filters */}
            <Typography variant="caption" color="text.disabled"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Estado:
            </Typography>
            {STATUS_OPTIONS.map((s) => (
              <FilterChip key={s.value} label={s.label} active={filterStatus === s.value}
                activeColor={s.color} activeTextColor={s.textColor}
                onClick={() => setFilterStatus(filterStatus === s.value ? '' : s.value)} />
            ))}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Enrichment filters */}
            <Typography variant="caption" color="text.disabled"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Completitud:
            </Typography>
            <FilterChip label="Pendiente" active={filterEnrichment === 'pendiente'} activeColor={ENRICHMENT_COLORS.pendiente.bg} activeTextColor={ENRICHMENT_COLORS.pendiente.color}
              icon={<PendingIcon sx={{ fontSize: 14 }} />}
              onClick={() => setFilterEnrichment(filterEnrichment === 'pendiente' ? '' : 'pendiente')} />
            <FilterChip label="Parcial" active={filterEnrichment === 'parcial'} activeColor={ENRICHMENT_COLORS.parcial.bg} activeTextColor={ENRICHMENT_COLORS.parcial.color}
              icon={<RuleIcon sx={{ fontSize: 14 }} />}
              onClick={() => setFilterEnrichment(filterEnrichment === 'parcial' ? '' : 'parcial')} />
            <FilterChip label="Completo" active={filterEnrichment === 'completo'} activeColor={ENRICHMENT_COLORS.completo.bg} activeTextColor={ENRICHMENT_COLORS.completo.color}
              icon={<TaskAltIcon sx={{ fontSize: 14 }} />}
              onClick={() => setFilterEnrichment(filterEnrichment === 'completo' ? '' : 'completo')} />

            {/* Clear all */}
            <Fade in={activeFilters > 0}>
              <Box sx={{ display: 'flex' }}>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <TbIcon title="Limpiar todos los filtros"
                  onClick={() => { setFilterStatus(''); setFilterEnrichment(''); setExtraFilters({}); }}>
                  <ClearAllIcon fontSize="small" />
                </TbIcon>
              </Box>
            </Fade>
          </Box>
        </Paper>
      </Fade>

      {/* Table / Cards */}
      {isMobile ? (
        <Box>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Fade in timeout={200 + i * 80} key={i}>
                <Card variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Skeleton width="60%" height={24} /><Skeleton width="80%" height={20} sx={{ mt: 0.5 }} />
                  </CardContent>
                </Card>
              </Fade>
            ))
          ) : rows.length === 0 ? (
            <Fade in><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Sin resultados</Typography></Fade>
          ) : (
            rows.map((item) => (
              <AttributeCard key={item.id} item={item} config={config}
                selected={selectionModel.includes(item.id)}
                onToggle={() => setSelectionModel((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                onView={() => handleViewDetail(item)} />
            ))
          )}
        </Box>
      ) : loading ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}><TableSkeleton /></Paper>
      ) : (
        <Fade in timeout={TRANSITION_DURATION}>
          <Box>
            <DataGrid rows={rows} columns={columns} density="compact" autoHeight
              checkboxSelection disableRowSelectionOnClick
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={(m) => setSelectionModel(m)}
              pageSizeOptions={[25, 50]} paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              onRowDoubleClick={(p) => handleViewDetail(p.row)}
              initialState={{ sorting: { sortModel: [{ field: 'skuCount', sort: 'desc' }] } }}
              sx={{ '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }} />
          </Box>
        </Fade>
      )}

      {/* Modals */}
      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate}
        saving={saving} config={config} dimension={dimension} productType={productType} />
      <DetailModal open={detailOpen} onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        item={detailItem} onSave={handleDetailSave} saving={saving} config={config} dimension={dimension} />
      <RenameDialog open={renameOpen} onClose={() => setRenameOpen(false)} onConfirm={handleBulkRename}
        selectedItems={getSelectedItems()} saving={saving} config={config} />
      <ConfirmDialog open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={handleBulkConfirm}
        title={confirmAction === 'delete' ? `Eliminar ${config.label}` : confirmAction === 'activate' ? `Activar ${config.label}` : `Inactivar ${config.label}`}
        message={confirmAction === 'delete'
          ? `¿Eliminar ${selectionModel.length} ${config.labelSingular.toLowerCase()}(s)? Esta accion no se puede deshacer.`
          : `¿${confirmAction === 'activate' ? 'Activar' : 'Inactivar'} ${selectionModel.length} ${config.labelSingular.toLowerCase()}(s)?`}
        confirmLabel={confirmAction === 'delete' ? 'Eliminar' : confirmAction === 'activate' ? 'Activar' : 'Inactivar'}
        color={confirmAction === 'delete' ? 'error' : 'primary'}
        saving={saving} />
    </Box>
  );
}
