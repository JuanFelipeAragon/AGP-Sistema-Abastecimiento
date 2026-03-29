/**
 * Bodegas / Warehouses CRUD — Manage warehouse locations.
 * Features: Animated KPI strip, integrated command bar, unified toolbar,
 * auto-height DataGrid, tabbed detail/edit modal, create modal with sections,
 * bulk actions, CSV export, mobile cards, skeleton loading, MUI transitions.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, TextField, Button, Chip, InputAdornment, Typography,
  IconButton, Tooltip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, Paper, Divider, Alert, Card, CardContent,
  CardActionArea, Checkbox, useMediaQuery, useTheme,
  MenuItem, Select, FormControl, InputLabel, Switch, FormControlLabel,
  Fade, Collapse, Slide, Skeleton, Tab, Tabs, LinearProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import PlaceIcon from '@mui/icons-material/Place';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PublicIcon from '@mui/icons-material/Public';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import StorefrontIcon from '@mui/icons-material/Storefront';
import DomainIcon from '@mui/icons-material/Domain';
import warehousesApi from '../../api/warehouses.api';
import { formatDate, formatCOP } from '../../utils/formatters';

// ══════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════
const PURPOSE_OPTIONS = [
  { value: 'storage', label: 'Almacenamiento', color: '#E3F2FD', textColor: '#1565C0', icon: <WarehouseIcon sx={{ fontSize: 14 }} /> },
  { value: 'transit', label: 'Transito', color: '#FFF3E0', textColor: '#E65100', icon: <LocalShippingIcon sx={{ fontSize: 14 }} /> },
  { value: 'damaged', label: 'Averias', color: '#FFEBEE', textColor: '#C62828', icon: <ReportProblemIcon sx={{ fontSize: 14 }} /> },
  { value: 'external', label: 'Exterior', color: '#E8F5E9', textColor: '#2E7D32', icon: <PublicIcon sx={{ fontSize: 14 }} /> },
  { value: 'billing', label: 'Facturacion', color: '#F3E5F5', textColor: '#7B1FA2' },
];

const TYPE_OPTIONS = [
  { value: 'bodega', label: 'Bodega' },
  { value: 'averias', label: 'Averias' },
  { value: 'contenedores', label: 'Contenedores' },
];

function getPurposeStyle(purpose) {
  return PURPOSE_OPTIONS.find((p) => p.value === purpose) || { label: purpose || 'N/A', color: '#ECEFF1', textColor: '#9E9E9E' };
}

const TRANSITION_DURATION = 250;

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

/** Clickable filter chip — toggles on/off with color feedback */
function FilterChip({ label, active, onClick, activeColor, activeTextColor, icon, size = 'small' }) {
  return (
    <Chip
      label={label}
      icon={icon}
      size={size}
      onClick={onClick}
      variant={active ? 'filled' : 'outlined'}
      sx={{
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 28,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        bgcolor: active ? (activeColor || 'primary.main') : 'transparent',
        color: active ? (activeTextColor || '#fff') : 'text.secondary',
        borderColor: active ? 'transparent' : 'divider',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 1,
          bgcolor: active ? (activeColor || 'primary.main') : 'action.hover',
        },
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
          <Box>
            <Skeleton width={30} height={28} />
            <Skeleton width={70} height={14} />
          </Box>
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
          bgcolor: bgColor || '#F1F5F9',
          color: color || '#64748B',
          flexShrink: 0,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color={color || 'text.primary'} sx={{ lineHeight: 1.1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </Typography>
        </Box>
      </Paper>
    </Fade>
  );
}

function SectionHeader({ icon, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, mt: 1 }}>
      {icon}
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Stack>
  );
}

// ══════════════════════════════════════════════════════════════
// Create Modal — With sections for base + operational fields
// ══════════════════════════════════════════════════════════════
function CreateModal({ open, onClose, onSave, saving }) {
  const INITIAL = {
    name: '', code: '', city: '', country: 'Colombia', address: '',
    type: 'bodega', isPhysical: true, purpose: 'storage',
    siesaName: '', notes: '', displayOrder: 0,
    contactName: '', contactPhone: '', contactEmail: '',
    capacityM2: '', monthlyCostCop: '', isThirdParty: false,
    tags: '',
  };
  const [form, setForm] = useState(INITIAL);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  useEffect(() => { if (open) setForm(INITIAL); }, [open]);

  const handleSave = () => {
    const payload = {
      ...form,
      capacityM2: form.capacityM2 ? parseFloat(form.capacityM2) : null,
      monthlyCostCop: form.monthlyCostCop ? parseFloat(form.monthlyCostCop) : null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      TransitionComponent={Slide} TransitionProps={{ direction: 'up' }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Crear Bodega</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {/* Base Info */}
          <SectionHeader icon={<WarehouseIcon sx={{ fontSize: 18, color: 'primary.main' }} />} label="Informacion basica" />
          <Stack direction="row" spacing={2}>
            <TextField label="Nombre *" value={form.name} onChange={set('name')} fullWidth size="small" />
            <TextField label="Codigo" value={form.code} onChange={set('code')} sx={{ maxWidth: 120 }}
              size="small" helperText="Ej: TNJ, PLM" />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="Ciudad" value={form.city} onChange={set('city')} fullWidth size="small" />
            <TextField label="Pais" value={form.country} onChange={set('country')} fullWidth size="small" />
          </Stack>
          <TextField label="Direccion" value={form.address} onChange={set('address')} size="small" />
          <Stack direction="row" spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Proposito</InputLabel>
              <Select value={form.purpose} onChange={set('purpose')} label="Proposito">
                {PURPOSE_OPTIONS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo Siesa</InputLabel>
              <Select value={form.type} onChange={set('type')} label="Tipo Siesa">
                {TYPE_OPTIONS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <FormControlLabel
              control={<Switch checked={form.isPhysical} onChange={(e) => setForm((p) => ({ ...p, isPhysical: e.target.checked }))} />}
              label="Bodega fisica" />
            <FormControlLabel
              control={<Switch checked={form.isThirdParty} onChange={(e) => setForm((p) => ({ ...p, isThirdParty: e.target.checked }))} />}
              label="Tercero" />
            <TextField label="Orden" type="number" value={form.displayOrder}
              onChange={(e) => setForm((p) => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
              onFocus={(e) => e.target.select()}
              sx={{ maxWidth: 100 }} size="small" />
          </Stack>
          <TextField label="Nombre Siesa" value={form.siesaName} onChange={set('siesaName')} size="small"
            helperText="Nombre exacto en Siesa para mapeo de importaciones" />

          {/* Contact Info */}
          <SectionHeader icon={<PersonIcon sx={{ fontSize: 18, color: 'info.main' }} />} label="Contacto" />
          <Stack direction="row" spacing={2}>
            <TextField label="Nombre contacto" value={form.contactName} onChange={set('contactName')} fullWidth size="small" />
            <TextField label="Telefono" value={form.contactPhone} onChange={set('contactPhone')} sx={{ maxWidth: 160 }} size="small" />
          </Stack>
          <TextField label="Email contacto" value={form.contactEmail} onChange={set('contactEmail')} size="small" />

          {/* Operational */}
          <SectionHeader icon={<AttachMoneyIcon sx={{ fontSize: 18, color: 'success.main' }} />} label="Operacional" />
          <Stack direction="row" spacing={2}>
            <TextField label="Capacidad (m2)" type="number" value={form.capacityM2} onChange={set('capacityM2')}
              onFocus={(e) => e.target.select()} fullWidth size="small" />
            <TextField label="Costo mensual (COP)" type="number" value={form.monthlyCostCop} onChange={set('monthlyCostCop')}
              onFocus={(e) => e.target.select()} fullWidth size="small" />
          </Stack>
          <TextField label="Tags (separados por coma)" value={form.tags} onChange={set('tags')} size="small"
            helperText="Ej: principal, importaciones, aluminio" />
          <TextField label="Notas" value={form.notes} onChange={set('notes')} multiline rows={2} size="small" />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={!form.name || saving}>
          {saving ? 'Creando...' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Detail / Edit Modal — Tabbed layout
// ══════════════════════════════════════════════════════════════
function DetailModal({ open, onClose, item, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [fullItem, setFullItem] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (item?.id && open) {
      setLoadingDetail(true);
      setTab(0);
      warehousesApi.getWarehouseById(item.id)
        .then((data) => setFullItem(data))
        .catch(() => setFullItem(item))
        .finally(() => setLoadingDetail(false));
    }
  }, [item, open]);

  useEffect(() => {
    const src = fullItem || item;
    if (src) {
      setForm({
        name: src.name || '', code: src.code || '', city: src.city || '',
        country: src.country || '', address: src.address || '',
        type: src.type || 'bodega', isPhysical: src.isPhysical ?? true,
        purpose: src.purpose || 'storage', siesaName: src.siesaName || '',
        notes: src.notes || '', displayOrder: src.displayOrder || 0,
        isActive: src.isActive ?? true, isThirdParty: src.isThirdParty ?? false,
        contactName: src.contactName || '', contactPhone: src.contactPhone || '',
        contactEmail: src.contactEmail || '',
        capacityM2: src.capacityM2 ?? '', monthlyCostCop: src.monthlyCostCop ?? '',
        lastAuditDate: src.lastAuditDate || '',
        tags: Array.isArray(src.tags) ? src.tags.join(', ') : '',
      });
      setEditing(false);
    }
  }, [fullItem, item]);

  if (!item) return null;
  const src = fullItem || item;
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSave = () => {
    const changes = {};
    if (form.name !== (src.name || '')) changes.name = form.name;
    if (form.code !== (src.code || '')) changes.code = form.code;
    if (form.city !== (src.city || '')) changes.city = form.city;
    if (form.country !== (src.country || '')) changes.country = form.country;
    if (form.address !== (src.address || '')) changes.address = form.address;
    if (form.type !== (src.type || '')) changes.type = form.type;
    if (form.isPhysical !== (src.isPhysical ?? true)) changes.isPhysical = form.isPhysical;
    if (form.purpose !== (src.purpose || '')) changes.purpose = form.purpose;
    if (form.siesaName !== (src.siesaName || '')) changes.siesaName = form.siesaName;
    if (form.notes !== (src.notes || '')) changes.notes = form.notes;
    if (form.displayOrder !== (src.displayOrder || 0)) changes.displayOrder = form.displayOrder;
    if (form.isActive !== (src.isActive ?? true)) changes.isActive = form.isActive;
    if (form.isThirdParty !== (src.isThirdParty ?? false)) changes.isThirdParty = form.isThirdParty;
    if (form.contactName !== (src.contactName || '')) changes.contactName = form.contactName;
    if (form.contactPhone !== (src.contactPhone || '')) changes.contactPhone = form.contactPhone;
    if (form.contactEmail !== (src.contactEmail || '')) changes.contactEmail = form.contactEmail;

    const newCap = form.capacityM2 !== '' ? parseFloat(form.capacityM2) : null;
    if (newCap !== (src.capacityM2 ?? null)) changes.capacityM2 = newCap;
    const newCost = form.monthlyCostCop !== '' ? parseFloat(form.monthlyCostCop) : null;
    if (newCost !== (src.monthlyCostCop ?? null)) changes.monthlyCostCop = newCost;
    if (form.lastAuditDate !== (src.lastAuditDate || '')) changes.lastAuditDate = form.lastAuditDate || null;

    const newTags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const oldTags = Array.isArray(src.tags) ? src.tags : [];
    if (JSON.stringify(newTags) !== JSON.stringify(oldTags)) changes.tags = newTags;

    if (Object.keys(changes).length > 0) onSave(src.id, changes);
    setEditing(false);
  };

  const purposeStyle = getPurposeStyle(src.purpose);
  const invSummary = src.inventorySummary;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth
      TransitionComponent={Fade} TransitionProps={{ timeout: TRANSITION_DURATION }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h6" fontWeight={700}>Detalle de Bodega</Typography>
          {src.code && <Chip label={src.code} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace' }} />}
          <Chip label={purposeStyle.label} size="small" sx={{ bgcolor: purposeStyle.color, color: purposeStyle.textColor, fontWeight: 600 }} />
          <Chip label={src.isActive ? 'Activa' : 'Inactiva'} size="small"
            sx={{ bgcolor: src.isActive ? '#E8F5E9' : '#FFEBEE', color: src.isActive ? '#2E7D32' : '#C62828', fontWeight: 600 }} />
        </Stack>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      {loadingDetail && <LinearProgress sx={{ mx: 3 }} />}

      <Box sx={{ px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="General" />
          <Tab label="Contacto y Operacion" />
          {invSummary && <Tab label="Inventario" />}
        </Tabs>
      </Box>

      <DialogContent sx={{ minHeight: 300 }}>
        {loadingDetail ? (
          <Box sx={{ py: 2 }}>
            {[...Array(6)].map((_, i) => <Skeleton key={i} height={32} sx={{ mb: 1 }} />)}
          </Box>
        ) : (
          <>
            {/* Tab 0: General */}
            <Fade in={tab === 0} unmountOnExit>
              <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {/* Status controls */}
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Estado</Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {editing ? (
                        <FormControlLabel
                          control={<Switch checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} size="small" />}
                          label={form.isActive ? 'Activa' : 'Inactiva'} />
                      ) : (
                        <Chip label={src.isActive ? 'Activa' : 'Inactiva'} size="small"
                          sx={{ bgcolor: src.isActive ? '#E8F5E9' : '#FFEBEE', color: src.isActive ? '#2E7D32' : '#C62828', fontWeight: 600 }} />
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Proposito</Typography>
                    {editing ? (
                      <Select fullWidth size="small" value={form.purpose} onChange={set('purpose')} sx={{ mt: 0.5 }}>
                        {PURPOSE_OPTIONS.map((p) => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                      </Select>
                    ) : (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={purposeStyle.label} size="small" sx={{ bgcolor: purposeStyle.color, color: purposeStyle.textColor, fontWeight: 600 }} />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Registros Producto-Bodega</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{src.productWarehouseCount || 0}</Typography>
                  </Grid>

                  {/* Physical + Type + Third party */}
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Fisica</Typography>
                    {editing ? (
                      <Switch checked={form.isPhysical} onChange={(e) => setForm((p) => ({ ...p, isPhysical: e.target.checked }))} size="small" />
                    ) : (
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{src.isPhysical ? 'Si' : 'No'}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Tipo Siesa</Typography>
                    {editing ? (
                      <Select fullWidth size="small" value={form.type} onChange={set('type')} sx={{ mt: 0.5 }}>
                        {TYPE_OPTIONS.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                      </Select>
                    ) : (
                      <Typography variant="body2" fontWeight={500} sx={{ mt: 0.5, textTransform: 'capitalize' }}>{src.type || '—'}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={2}>
                    <Typography variant="caption" color="text.secondary">Tercero</Typography>
                    {editing ? (
                      <Switch checked={form.isThirdParty} onChange={(e) => setForm((p) => ({ ...p, isThirdParty: e.target.checked }))} size="small" />
                    ) : (
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{src.isThirdParty ? 'Si' : 'No'}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="caption" color="text.secondary">Orden</Typography>
                    {editing ? (
                      <TextField fullWidth size="small" type="number" value={form.displayOrder}
                        onChange={(e) => setForm((p) => ({ ...p, displayOrder: parseInt(e.target.value) || 0 }))}
                        onFocus={(e) => e.target.select()} sx={{ mt: 0.5 }} />
                    ) : (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{src.displayOrder}</Typography>
                    )}
                  </Grid>

                  {/* Name */}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Nombre</Typography>
                    {editing ? (
                      <TextField fullWidth size="small" value={form.name} onChange={set('name')} sx={{ mt: 0.5 }} />
                    ) : (
                      <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>{src.name}</Typography>
                    )}
                  </Grid>

                  {/* Siesa Name */}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Nombre Siesa — Mapeo importaciones</Typography>
                    {editing ? (
                      <TextField fullWidth size="small" value={form.siesaName} onChange={set('siesaName')} sx={{ mt: 0.5 }} />
                    ) : (
                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#F5F5F5', mt: 0.5 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace' }}>{src.siesaName || '—'}</Typography>
                      </Paper>
                    )}
                  </Grid>

                  {/* Location */}
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Ciudad</Typography>
                    {editing ? <TextField fullWidth size="small" value={form.city} onChange={set('city')} sx={{ mt: 0.5 }} /> : <Typography variant="body2" sx={{ mt: 0.5 }}>{src.city || '—'}</Typography>}
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Pais</Typography>
                    {editing ? <TextField fullWidth size="small" value={form.country} onChange={set('country')} sx={{ mt: 0.5 }} /> : <Typography variant="body2" sx={{ mt: 0.5 }}>{src.country || '—'}</Typography>}
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Tags</Typography>
                    {editing ? (
                      <TextField fullWidth size="small" value={form.tags} onChange={set('tags')} sx={{ mt: 0.5 }} helperText="Separados por coma" />
                    ) : (
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {(src.tags || []).length > 0
                          ? src.tags.map((t) => <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />)
                          : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </Box>
                    )}
                  </Grid>

                  {/* Address */}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Direccion</Typography>
                    {editing ? <TextField fullWidth size="small" value={form.address} onChange={set('address')} sx={{ mt: 0.5 }} /> : <Typography variant="body2" sx={{ mt: 0.5 }}>{src.address || '—'}</Typography>}
                  </Grid>

                  {/* Notes */}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Notas</Typography>
                    {editing ? <TextField fullWidth size="small" multiline rows={2} value={form.notes} onChange={set('notes')} sx={{ mt: 0.5 }} /> : <Typography variant="body2" sx={{ mt: 0.5 }}>{src.notes || '—'}</Typography>}
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Creado</Typography>
                    <Typography variant="body2">{formatDate(src.createdAt)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Modificado</Typography>
                    <Typography variant="body2">{formatDate(src.updatedAt)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Fade>

            {/* Tab 1: Contact & Operations */}
            <Fade in={tab === 1} unmountOnExit>
              <Box sx={{ display: tab === 1 ? 'block' : 'none' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <SectionHeader icon={<PersonIcon sx={{ fontSize: 18, color: 'info.main' }} />} label="Contacto" />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Nombre</Typography>
                    {editing ? <TextField fullWidth size="small" value={form.contactName} onChange={set('contactName')} sx={{ mt: 0.5 }} /> : <Typography variant="body2" sx={{ mt: 0.5 }}>{src.contactName || '—'}</Typography>}
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Telefono</Typography>
                    {editing ? <TextField fullWidth size="small" value={form.contactPhone} onChange={set('contactPhone')} sx={{ mt: 0.5 }} /> : <Typography variant="body2" sx={{ mt: 0.5 }}>{src.contactPhone || '—'}</Typography>}
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    {editing ? <TextField fullWidth size="small" value={form.contactEmail} onChange={set('contactEmail')} sx={{ mt: 0.5 }} /> : <Typography variant="body2" sx={{ mt: 0.5 }}>{src.contactEmail || '—'}</Typography>}
                  </Grid>

                  <Grid item xs={12}>
                    <SectionHeader icon={<AttachMoneyIcon sx={{ fontSize: 18, color: 'success.main' }} />} label="Operacional" />
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Capacidad (m2)</Typography>
                    {editing ? (
                      <TextField fullWidth size="small" type="number" value={form.capacityM2} onChange={set('capacityM2')} onFocus={(e) => e.target.select()} sx={{ mt: 0.5 }} />
                    ) : (
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{src.capacityM2 ? `${src.capacityM2} m²` : '—'}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Costo mensual</Typography>
                    {editing ? (
                      <TextField fullWidth size="small" type="number" value={form.monthlyCostCop} onChange={set('monthlyCostCop')} onFocus={(e) => e.target.select()} sx={{ mt: 0.5 }} />
                    ) : (
                      <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>{src.monthlyCostCop ? formatCOP(src.monthlyCostCop) : '—'}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Ultima auditoria</Typography>
                    {editing ? (
                      <TextField fullWidth size="small" type="date" value={form.lastAuditDate} onChange={set('lastAuditDate')}
                        InputLabelProps={{ shrink: true }} sx={{ mt: 0.5 }} />
                    ) : (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{src.lastAuditDate ? formatDate(src.lastAuditDate) : '—'}</Typography>
                    )}
                  </Grid>
                </Grid>
              </Box>
            </Fade>

            {/* Tab 2: Inventory Summary */}
            {invSummary && (
              <Fade in={tab === 2} unmountOnExit>
                <Box sx={{ display: tab === 2 ? 'block' : 'none' }}>
                  <SectionHeader icon={<InventoryIcon sx={{ fontSize: 18, color: 'warning.main' }} />} label="Resumen de inventario" />
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Paper variant="outlined" sx={{ px: 3, py: 2, borderRadius: 2, textAlign: 'center', flex: 1 }}>
                      <Typography variant="h5" fontWeight={700} color="primary.main">{invSummary.totalProducts || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Productos</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ px: 3, py: 2, borderRadius: 2, textAlign: 'center', flex: 1 }}>
                      <Typography variant="h5" fontWeight={700} color="info.main">{invSummary.totalQuantity || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Unidades</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ px: 3, py: 2, borderRadius: 2, textAlign: 'center', flex: 1 }}>
                      <Typography variant="h5" fontWeight={700} color="success.main">{formatCOP(invSummary.totalValueCop || 0)}</Typography>
                      <Typography variant="caption" color="text.secondary">Valor total</Typography>
                    </Paper>
                  </Stack>
                </Box>
              </Fade>
            )}
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
// Confirm Dialog
// ══════════════════════════════════════════════════════════════
function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, saving, color }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      TransitionComponent={Fade} TransitionProps={{ timeout: 200 }}>
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
function downloadCSV(items, filename) {
  if (!items?.length) return;
  const headers = [
    'ID', 'Codigo', 'Nombre', 'Ciudad', 'Pais', 'Proposito', 'Tipo', 'Fisica',
    'Activa', 'Tercero', 'Contacto', 'Telefono', 'Email', 'Capacidad m2',
    'Costo Mensual', 'Tags', 'Nombre Siesa', 'Notas',
  ];
  const csvRows = [headers.join(',')];
  for (const r of items) {
    csvRows.push([
      r.id, r.code || '', `"${(r.name || '').replace(/"/g, '""')}"`,
      r.city || '', r.country || '', r.purpose, r.type || '',
      r.isPhysical ? 'Si' : 'No', r.isActive ? 'Si' : 'No',
      r.isThirdParty ? 'Si' : 'No',
      `"${(r.contactName || '').replace(/"/g, '""')}"`,
      r.contactPhone || '', r.contactEmail || '',
      r.capacityM2 || '', r.monthlyCostCop || '',
      `"${(r.tags || []).join(', ')}"`,
      `"${(r.siesaName || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ].join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// Mobile Card
// ══════════════════════════════════════════════════════════════
function WarehouseCard({ item, selected, onToggle, onView, index }) {
  const purposeStyle = getPurposeStyle(item.purpose);

  return (
    <Fade in timeout={TRANSITION_DURATION + index * 50}>
      <Card variant="outlined" sx={{
        mb: 1, borderRadius: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        opacity: item.isActive ? 1 : 0.6,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 },
      }}>
        <CardActionArea onClick={onView} sx={{ p: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Checkbox size="small" checked={selected} onClick={(e) => { e.stopPropagation(); onToggle(); }} sx={{ p: 0, mt: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>{item.name}</Typography>
                  {item.code && <Chip label={item.code} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace' }} />}
                </Stack>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
                  <Chip label={purposeStyle.label} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: purposeStyle.color, color: purposeStyle.textColor }} />
                  {item.city && <Chip icon={<PlaceIcon sx={{ fontSize: 12 }} />} label={item.city} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                  <Chip label={item.isPhysical ? 'Fisica' : 'Virtual'} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600 }} />
                  <Chip label={`${item.productWarehouseCount} reg.`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                  {item.isThirdParty && <Chip label="3ro" size="small" color="warning" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </CardActionArea>
      </Card>
    </Fade>
  );
}

// ══════════════════════════════════════════════════════════════
// Skeleton Loading Table
// ══════════════════════════════════════════════════════════════
function TableSkeleton() {
  return (
    <Box>
      {[...Array(6)].map((_, i) => (
        <Fade in timeout={200 + i * 80} key={i}>
          <Box sx={{ display: 'flex', gap: 2, py: 1, px: 1 }}>
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 0.5 }} />
            <Skeleton width={70} height={24} />
            <Skeleton width={180} height={24} />
            <Skeleton width={100} height={24} />
            <Skeleton width={80} height={24} />
            <Skeleton width={110} height={24} />
            <Skeleton width={60} height={24} />
            <Skeleton width={70} height={24} />
          </Box>
        </Fade>
      ))}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function BodegasView() {
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
  const [filterPurpose, setFilterPurpose] = useState('');
  const [filterPhysical, setFilterPhysical] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectionModel([]);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterPurpose) params.purpose = filterPurpose;
      if (filterPhysical !== '') params.is_physical = filterPhysical === 'true';
      if (filterActive !== '') params.is_active = filterActive === 'true';
      const data = await warehousesApi.getWarehouses(params);
      setRows(data.items || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Error fetching warehouses:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterPurpose, filterPhysical, filterActive]);

  useEffect(() => {
    const t = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData]);

  useEffect(() => {
    if (snackMsg) { const t = setTimeout(() => setSnackMsg(''), 4000); return () => clearTimeout(t); }
  }, [snackMsg]);

  // CRUD
  const handleCreate = useCallback(async (form) => {
    setSaving(true);
    try {
      await warehousesApi.createWarehouse(form);
      setCreateOpen(false);
      setSnackMsg('Bodega creada exitosamente');
      fetchData();
    } catch (err) { console.error(err); setSnackMsg('Error al crear bodega'); } finally { setSaving(false); }
  }, [fetchData]);

  const handleViewDetail = useCallback((item) => { setDetailItem(item); setDetailOpen(true); }, []);

  const handleDetailSave = useCallback(async (id, changes) => {
    setSaving(true);
    try {
      await warehousesApi.updateWarehouse(id, changes);
      setSnackMsg('Bodega actualizada');
      fetchData();
      setDetailOpen(false);
      setDetailItem(null);
    } catch (err) { console.error(err); setSnackMsg('Error al actualizar'); } finally { setSaving(false); }
  }, [fetchData]);

  const getSelectedItems = useCallback(() => rows.filter((r) => selectionModel.includes(r.id)), [rows, selectionModel]);

  const handleBulkConfirm = async () => {
    setSaving(true);
    try {
      await warehousesApi.bulkAction({ action: confirmAction, ids: selectionModel });
      setSelectionModel([]); setConfirmOpen(false);
      setSnackMsg(`${selectionModel.length} bodega(s) ${confirmAction === 'activate' ? 'activada(s)' : 'inactivada(s)'}`);
      fetchData();
    } catch (err) { console.error(err); } finally { setSaving(false); setConfirmAction(null); }
  };

  const handleExport = (items) => {
    downloadCSV(items, `bodegas_${new Date().toISOString().slice(0, 10)}.csv`);
    setSnackMsg('Exportacion completada');
  };

  const hasActiveSelected = useMemo(() => rows.some((r) => selectionModel.includes(r.id) && r.isActive), [rows, selectionModel]);
  const hasInactiveSelected = useMemo(() => rows.some((r) => selectionModel.includes(r.id) && !r.isActive), [rows, selectionModel]);
  const hasSel = selectionModel.length > 0;
  const activeFilters = [filterPurpose, filterPhysical, filterActive].filter(Boolean).length;

  // ── Columns ──
  const columns = useMemo(() => [
    {
      field: 'code', headerName: 'Codigo', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value
        ? <Chip label={p.value} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.75rem' }} />
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'name', headerName: 'Nombre', flex: 1.6, minWidth: 140, align: 'center', headerAlign: 'center',
      renderCell: (p) => <Typography variant="body2" fontWeight={600}>{p.value}</Typography>,
    },
    {
      field: 'city', headerName: 'Ciudad', flex: 1, minWidth: 90, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value
        ? <Stack direction="row" alignItems="center" spacing={0.5}><PlaceIcon sx={{ fontSize: 14, color: 'text.secondary' }} /><Typography variant="body2">{p.value}</Typography></Stack>
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    { field: 'country', headerName: 'Pais', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center' },
    {
      field: 'purpose', headerName: 'Proposito', flex: 1.1, minWidth: 110, align: 'center', headerAlign: 'center',
      renderCell: (p) => {
        const s = getPurposeStyle(p.value);
        return <Chip label={s.label} size="small" sx={{ bgcolor: s.color, color: s.textColor, fontWeight: 600, fontSize: '0.7rem' }} />;
      },
    },
    {
      field: 'isPhysical', headerName: 'Fisica', flex: 0.6, minWidth: 65, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Chip label={p.value ? 'Si' : 'No'} size="small" variant="outlined"
          color={p.value ? 'success' : 'default'} sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
      ),
    },
    {
      field: 'isThirdParty', headerName: '3ro', flex: 0.5, minWidth: 55, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value
        ? <Chip label="Si" size="small" color="warning" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
        : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'productWarehouseCount', headerName: 'Registros', flex: 0.7, minWidth: 75, align: 'center', headerAlign: 'center',
      renderCell: (p) => <Chip label={p.value} size="small" variant="outlined" color={p.value > 0 ? 'primary' : 'default'} sx={{ fontWeight: 600, minWidth: 40 }} />,
    },
    {
      field: 'isActive', headerName: 'Estado', flex: 0.7, minWidth: 75, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Chip label={p.value ? 'Activa' : 'Inactiva'} size="small"
          sx={{ bgcolor: p.value ? '#E8F5E9' : '#FFEBEE', color: p.value ? '#2E7D32' : '#C62828', fontWeight: 600, fontSize: '0.7rem' }} />
      ),
    },
    {
      field: 'type', headerName: 'Tipo Siesa', flex: 0.9, minWidth: 90, align: 'center', headerAlign: 'center',
      renderCell: (p) => <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>{p.value || '—'}</Typography>,
    },
  ], []);

  return (
    <Box>
      {/* ── KPI Strip with staggered fade ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <KpiCard value={stats.total || 0} label="Total Bodegas" loading={loading} delay={0}
          color="#334155" bgColor="#F1F5F9" icon={<DomainIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.physical || 0} label="Fisicas" loading={loading} delay={50}
          color="#1565C0" bgColor="#E3F2FD" icon={<StorefrontIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.storage || 0} label="Almacenamiento" loading={loading} delay={100}
          color="#2E7D32" bgColor="#E8F5E9" icon={<WarehouseIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.transit || 0} label="Transito" loading={loading} delay={150}
          color="#E65100" bgColor="#FFF3E0" icon={<LocalShippingIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.damaged || 0} label="Averias" loading={loading} delay={200}
          color="#C62828" bgColor="#FFEBEE" icon={<ReportProblemIcon sx={{ fontSize: 20 }} />} />
        <KpiCard value={stats.external || 0} label="Exterior" loading={loading} delay={250}
          color="#7B1FA2" bgColor="#F3E5F5" icon={<PublicIcon sx={{ fontSize: 20 }} />} />
      </Stack>

      <Collapse in={!!snackMsg}>
        <Alert severity="success" onClose={() => setSnackMsg('')} sx={{ mb: 2 }}>{snackMsg}</Alert>
      </Collapse>

      {/* ══════════════════════════════════════════════════════════
          Command Bar — Integrated search, filters, actions
          Desktop: two rows (search+actions / filters)
          Mobile: stacked with horizontally scrollable filters
         ══════════════════════════════════════════════════════════ */}
      <Fade in timeout={TRANSITION_DURATION}>
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          {/* Row 1: Search + Result count + Actions */}
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <TextField placeholder="Buscar bodega..." value={search} onChange={(e) => setSearch(e.target.value)} size="small"
              sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { height: 36 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />

            {/* Result count */}
            <Fade in={!loading}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {rows.length}{stats.total ? ` de ${stats.total}` : ''} {isMobile ? '' : 'bodegas'}
              </Typography>
            </Fade>

            <Box sx={{ flexGrow: 1 }} />

            {/* Selection indicator */}
            {hasSel && (
              <Fade in>
                <Chip label={`${selectionModel.length} sel.`} size="small" color="primary"
                  onDelete={() => setSelectionModel([])} sx={{ fontWeight: 600, mr: 0.5 }} />
              </Fade>
            )}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            {/* Selection actions */}
            <TbIcon title="Ver detalle" disabled={selectionModel.length !== 1} onClick={() => { const items = getSelectedItems(); if (items.length === 1) handleViewDetail(items[0]); }}>
              <VisibilityOutlinedIcon fontSize="small" />
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
            <TbIcon title="Exportar seleccion" disabled={!hasSel} onClick={() => handleExport(getSelectedItems())}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </TbIcon>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            {/* Global actions */}
            <TbIcon title="Refrescar datos" onClick={fetchData}>
              <RefreshIcon fontSize="small" sx={{ transition: 'transform 0.3s', ...(loading && { animation: 'spin 1s linear infinite', '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } } }) }} />
            </TbIcon>
            <TbIcon title="Exportar todo" onClick={() => handleExport(rows)}>
              <SaveAltIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Crear bodega" color="primary" onClick={() => setCreateOpen(true)}>
              <AddCircleOutlineIcon fontSize="small" />
            </TbIcon>
          </Box>

          {/* Divider between rows */}
          <Divider />

          {/* Row 2: Always-visible filters */}
          <Box sx={{
            px: 1.5, py: 0.75,
            display: 'flex', alignItems: 'center', gap: 0.75,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 0 },
            scrollbarWidth: 'none',
          }}>
            {/* Purpose filters */}
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Proposito:
            </Typography>
            {PURPOSE_OPTIONS.map((p) => (
              <FilterChip
                key={p.value}
                label={p.label}
                icon={p.icon}
                active={filterPurpose === p.value}
                activeColor={p.color}
                activeTextColor={p.textColor}
                onClick={() => setFilterPurpose(filterPurpose === p.value ? '' : p.value)}
              />
            ))}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Physical filter */}
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Tipo:
            </Typography>
            <FilterChip label="Fisica" active={filterPhysical === 'true'} activeColor="#E3F2FD" activeTextColor="#1565C0"
              onClick={() => setFilterPhysical(filterPhysical === 'true' ? '' : 'true')} />
            <FilterChip label="Virtual" active={filterPhysical === 'false'} activeColor="#F3E5F5" activeTextColor="#7B1FA2"
              onClick={() => setFilterPhysical(filterPhysical === 'false' ? '' : 'false')} />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Active filter */}
            <Typography variant="caption" color="text.disabled" sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Estado:
            </Typography>
            <FilterChip label="Activa" active={filterActive === 'true'} activeColor="#E8F5E9" activeTextColor="#2E7D32"
              onClick={() => setFilterActive(filterActive === 'true' ? '' : 'true')} />
            <FilterChip label="Inactiva" active={filterActive === 'false'} activeColor="#FFEBEE" activeTextColor="#C62828"
              onClick={() => setFilterActive(filterActive === 'false' ? '' : 'false')} />

            {/* Clear all filters */}
            <Fade in={activeFilters > 0}>
              <Box sx={{ display: 'flex' }}>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <TbIcon title="Limpiar todos los filtros" onClick={() => { setFilterPurpose(''); setFilterPhysical(''); setFilterActive(''); }}>
                  <ClearAllIcon fontSize="small" />
                </TbIcon>
              </Box>
            </Fade>
          </Box>
        </Paper>
      </Fade>

      {/* ── Table / Cards ── */}
      {isMobile ? (
        <Box>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Fade in timeout={200 + i * 80} key={i}>
                <Card variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Skeleton width="60%" height={24} />
                    <Skeleton width="80%" height={20} sx={{ mt: 0.5 }} />
                  </CardContent>
                </Card>
              </Fade>
            ))
          ) : rows.length === 0 ? (
            <Fade in><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Sin resultados</Typography></Fade>
          ) : (
            rows.map((item, index) => (
              <WarehouseCard key={item.id} item={item} index={index}
                selected={selectionModel.includes(item.id)}
                onToggle={() => setSelectionModel((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                onView={() => handleViewDetail(item)} />
            ))
          )}
        </Box>
      ) : loading ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
          <TableSkeleton />
        </Paper>
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
              initialState={{ sorting: { sortModel: [{ field: 'code', sort: 'asc' }] } }}
              sx={{ '& .MuiDataGrid-row:hover': { cursor: 'pointer' } }} />
          </Box>
        </Fade>
      )}

      {/* ── Modals ── */}
      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSave={handleCreate} saving={saving} />
      <DetailModal open={detailOpen} onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        item={detailItem} onSave={handleDetailSave} saving={saving} />
      <ConfirmDialog open={confirmOpen}
        onClose={() => { setConfirmOpen(false); setConfirmAction(null); }}
        onConfirm={handleBulkConfirm}
        title={confirmAction === 'activate' ? 'Activar Bodegas' : 'Inactivar Bodegas'}
        message={`¿${confirmAction === 'activate' ? 'Activar' : 'Inactivar'} ${selectionModel.length} bodega(s)?`}
        confirmLabel={confirmAction === 'activate' ? 'Activar' : 'Inactivar'}
        saving={saving} />
    </Box>
  );
}
