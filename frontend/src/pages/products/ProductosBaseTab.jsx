/**
 * Productos Base Tab — DataGrid view for base products.
 * Features: PB-ID column, normalized app names, SmartFilter (chips vs autocomplete),
 * visual row grouping, column visibility toggle, product types, animated KPIs,
 * 2-row command bar, skeleton loading, mobile cards.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, TextField, InputAdornment, Typography, Chip,
  Drawer, IconButton, Divider, Grid, Stack, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Checkbox, Alert, Slide, Collapse, Fade, Skeleton,
  Card, CardContent, CardActionArea, useMediaQuery, useTheme,
  Autocomplete, alpha, Popper, Menu, MenuItem, FormControlLabel, Switch,
  Tabs, Tab, LinearProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import PublicIcon from '@mui/icons-material/Public';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import InventoryIcon from '@mui/icons-material/Inventory';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CategoryIcon from '@mui/icons-material/Category';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import StairsOutlinedIcon from '@mui/icons-material/StairsOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import { formatNumber } from '../../utils/formatters';
import usePersistedFilters from '../../hooks/usePersistedFilters';
import SmartFilter from '../../components/common/SmartFilter';
import productsApi from '../../api/products.api';
import countriesApi from '../../api/countries.api';
import { getTypeSpecs } from './productTypeSpecs';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';

const TRANSITION_DURATION = 250;

// Product type config with colors and icons
const PRODUCT_TYPES = [
  { value: 'Perfil', label: 'Perfiles', color: '#1565C0', bgColor: '#E3F2FD', icon: <ViewInArIcon sx={{ fontSize: 14 }} /> },
  { value: 'Lamina', label: 'Laminas', color: '#7B1FA2', bgColor: '#F3E5F5', icon: <GridViewOutlinedIcon sx={{ fontSize: 14 }} /> },
  { value: 'Escalera', label: 'Escaleras', color: '#E65100', bgColor: '#FFF3E0', icon: <StairsOutlinedIcon sx={{ fontSize: 14 }} /> },
  { value: 'Accesorio', label: 'Accesorios', color: '#2E7D32', bgColor: '#E8F5E9', icon: <BuildOutlinedIcon sx={{ fontSize: 14 }} /> },
  { value: 'Otro', label: 'Otros', color: '#616161', bgColor: '#ECEFF1', icon: <CategoryIcon sx={{ fontSize: 14 }} /> },
];

const TYPE_MAP = Object.fromEntries(PRODUCT_TYPES.map((t) => [t.value, t]));

// Group-by field config
const GROUP_BY_OPTIONS = [
  { label: 'Subcategoria', field: 'subcategoria' },
  { label: 'Sistema', field: 'sistema' },
  { label: 'Categoria', field: 'categoria' },
  { label: 'Tipo', field: 'productType' },
  { label: 'Estado', field: 'status' },
];

// Default column visibility
const DEFAULT_COLUMN_VISIBILITY = {
  id: true,
  reference: true,
  description: true,
  categoria: false, // hidden by default — many columns
  subcategoria: true,
  sistema: true,
  productType: true,
  pesoUm: true,
  variantCount: true,
  status: true,
  linea: false,
};

// All column definitions for the visibility menu
const COLUMN_LABELS = {
  id: 'ID Producto',
  reference: 'Referencia',
  description: 'Descripcion',
  categoria: 'Categoria',
  subcategoria: 'Subcategoria',
  sistema: 'Sistema',
  productType: 'Tipo',
  pesoUm: 'Peso UM',
  variantCount: 'Variantes',
  status: 'Estado',
  linea: 'Linea',
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

/**
 * Column Visibility Menu — lets users toggle which columns are visible.
 */
function ColumnVisibilityMenu({ anchorEl, open, onClose, model, onChange }) {
  const toggleColumn = (field) => {
    onChange({ ...model, [field]: !model[field] });
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 2,
          minWidth: 220,
          maxHeight: 400,
          boxShadow: 6,
        },
      }}
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          Columnas visibles
        </Typography>
      </Box>
      {Object.entries(COLUMN_LABELS).map(([field, label]) => (
        <MenuItem key={field} dense onClick={() => toggleColumn(field)} sx={{ py: 0.25 }}>
          <FormControlLabel
            control={<Switch size="small" checked={model[field] !== false} />}
            label={<Typography variant="body2" fontSize="0.8rem">{label}</Typography>}
            sx={{ ml: 0, width: '100%' }}
          />
        </MenuItem>
      ))}
      <Divider sx={{ my: 0.5 }} />
      <MenuItem dense onClick={() => onChange(DEFAULT_COLUMN_VISIBILITY)}>
        <Typography variant="caption" color="primary" fontWeight={600}>Restaurar por defecto</Typography>
      </MenuItem>
    </Menu>
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

function TableSkeleton() {
  return (
    <Box>
      {[...Array(6)].map((_, i) => (
        <Fade in timeout={200 + i * 80} key={i}>
          <Box sx={{ display: 'flex', gap: 2, py: 1, px: 1 }}>
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 0.5 }} />
            <Skeleton width={60} height={24} />
            <Skeleton width={120} height={24} />
            <Skeleton width={200} height={24} />
            <Skeleton width={100} height={24} />
            <Skeleton width={100} height={24} />
            <Skeleton width={80} height={24} />
            <Skeleton width={60} height={24} />
            <Skeleton width={60} height={24} />
            <Skeleton width={70} height={24} />
          </Box>
        </Fade>
      ))}
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// Mobile Card
// ══════════════════════════════════════════════════════════════
function ProductCard({ item, selected, onToggle, onView, index }) {
  const formattedId = `PB-${String(item.id).padStart(4, '0')}`;
  const typeConf = TYPE_MAP[item.productType] || TYPE_MAP['Otro'];
  return (
    <Fade in timeout={TRANSITION_DURATION + index * 50}>
      <Card variant="outlined" sx={{
        mb: 1, borderRadius: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        borderWidth: selected ? 2 : 1,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 },
      }}>
        <CardActionArea onClick={onView} sx={{ p: 0 }}>
          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Checkbox size="small" checked={selected} onClick={(e) => { e.stopPropagation(); onToggle(); }} sx={{ p: 0, mt: 0.25 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                  <Chip label={formattedId} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, fontFamily: 'monospace', bgcolor: '#EDE7F6', color: '#5E35B1' }} />
                  <Typography variant="body2" fontWeight={700} color="primary" noWrap sx={{ flex: 1 }}>{item.reference}</Typography>
                  <Chip
                    label={typeConf.label}
                    size="small"
                    sx={{ height: 20, fontSize: '0.6rem', fontWeight: 600, bgcolor: typeConf.bgColor, color: typeConf.color }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>{item.description}</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
                  {item.subcategoria && <Chip label={item.subcategoria} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                  {item.sistema && <Chip label={item.sistema} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                  <Chip label={`${item.variantCount ?? 0} var.`} size="small" variant="outlined" color="primary" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
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
// CSV Export
// ══════════════════════════════════════════════════════════════
function downloadCSV(items, filename) {
  if (!items?.length) return;
  const headers = ['ID', 'Referencia', 'Descripcion', 'Tipo', 'Categoria', 'Subcategoria', 'Sistema', 'Linea', 'Peso UM', 'Variantes', 'Estado'];
  const csvRows = [headers.join(',')];
  for (const r of items) {
    csvRows.push([
      `PB-${String(r.id).padStart(4, '0')}`,
      r.reference || '',
      `"${(r.description || '').replace(/"/g, '""')}"`,
      r.productType || '',
      r.categoria || '',
      r.subcategoria || '',
      r.sistema || '',
      r.linea || '',
      r.pesoUm ?? '',
      r.variantCount ?? 0,
      r.status || '',
    ].join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════
// Detail Drawer helpers
// ══════════════════════════════════════════════════════════════
function DetailSection({ title, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" color="primary" fontWeight={700}
        sx={{ mb: 1, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: 0.5 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      {children}
    </Box>
  );
}

function DetailField({ label, value }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value || '\u2014'}</Typography>
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════
// Product Detail Drawer
// ══════════════════════════════════════════════════════════════
function ProductDetailDrawer({ open, onClose, product, navigate }) {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Ficha Técnica edit state
  const [specValues, setSpecValues] = useState({});
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!open || !product) { setDetail(null); setActiveTab(0); return; }
    let cancelled = false;
    async function load() {
      setLoadingDetail(true);
      try {
        const data = await productsApi.getBaseProductDetail(product.id);
        if (!cancelled) {
          setDetail(data);
          setSpecValues(data.technicalSpecs || {});
        }
      } catch (err) {
        console.error('Error loading product detail:', err);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open, product]);

  if (!product) return null;

  const handleVariantClick = (variant) => {
    navigate(`/platform/productos/variantes?product_id=${product.id}&variant_ref=${encodeURIComponent(variant.reference_siesa)}`);
  };

  const handleGoToVariants = () => {
    navigate(`/platform/productos/variantes?product_id=${product.id}`);
  };

  const handleSpecChange = (key, value) => {
    setSpecValues((prev) => ({ ...prev, [key]: value === '' ? null : Number(value) }));
    setSaveSuccess(false);
  };

  const handleSaveSpecs = async () => {
    setSavingSpecs(true);
    try {
      await productsApi.updateTechnicalSpecs(product.id, specValues);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving technical specs:', err);
    } finally {
      setSavingSpecs(false);
    }
  };

  const variants = detail?.variants || [];
  const formattedId = `PB-${String(product.id).padStart(4, '0')}`;
  const typeConf = TYPE_MAP[product.productType] || TYPE_MAP['Otro'];
  const specFields = getTypeSpecs(product.productType);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 540 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box sx={{ px: 3, pt: 3, pb: 1.5, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Chip label={formattedId} size="small" sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: '#EDE7F6', color: '#5E35B1' }} />
              <Typography variant="h6" fontWeight={700}>{product.reference}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">{product.description}</Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <Chip label={typeConf.label} size="small" icon={typeConf.icon}
            sx={{ bgcolor: typeConf.bgColor, color: typeConf.color, fontWeight: 600 }} />
          <Chip
            label={product.status}
            size="small"
            sx={{ bgcolor: product.status === 'Activo' ? '#E8F5E9' : '#ECEFF1', color: product.status === 'Activo' ? '#2E7D32' : '#616161', fontWeight: 600 }}
          />
        </Stack>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', minHeight: 36 }}
          TabIndicatorProps={{ sx: { height: 3, borderRadius: 1.5 } }}
        >
          <Tab label="General" sx={{ textTransform: 'none', fontWeight: 600, minHeight: 36, fontSize: '0.82rem' }} />
          <Tab
            label="Ficha Técnica"
            icon={<EngineeringIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 600, minHeight: 36, fontSize: '0.82rem' }}
          />
        </Tabs>
      </Box>

      {savingSpecs && <LinearProgress sx={{ flexShrink: 0 }} />}

      {/* Tab content — scrollable */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>

        {/* ── Tab 0: General ── */}
        {activeTab === 0 && (
          <>
            <DetailSection title="Informacion General">
              <Grid container spacing={2}>
                <Grid item xs={6}><DetailField label="ID Producto" value={formattedId} /></Grid>
                <Grid item xs={6}><DetailField label="Referencia" value={product.reference} /></Grid>
                <Grid item xs={6}><DetailField label="Tipo" value={product.productType} /></Grid>
                <Grid item xs={6}><DetailField label="Categoria" value={product.categoria} /></Grid>
                <Grid item xs={6}><DetailField label="Subcategoria" value={product.subcategoria} /></Grid>
                <Grid item xs={6}><DetailField label="Sistema" value={product.sistema} /></Grid>
                <Grid item xs={6}><DetailField label="Linea" value={product.linea} /></Grid>
                <Grid item xs={6}><DetailField label="Peso UM (kg)" value={formatNumber(product.pesoUm, 4)} /></Grid>
              </Grid>
            </DetailSection>

            <DetailSection title={`Variantes (${variants.length})`}>
              {loadingDetail ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
              ) : variants.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No se encontraron variantes.</Typography>
              ) : (
                <>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Ref. SIESA</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Acabado</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Aleacion</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }} align="right">Longitud</TableCell>
                          <TableCell sx={{ width: 40 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {variants.map((v, idx) => (
                          <TableRow
                            key={v.reference_siesa || idx}
                            hover
                            sx={{ cursor: 'pointer', '&:last-child td': { borderBottom: 0 } }}
                            onClick={() => handleVariantClick(v)}
                          >
                            <TableCell sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'primary.main' }}>{v.reference_siesa}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{v.acabado || '\u2014'}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{v.aleacion || '\u2014'}</TableCell>
                            <TableCell sx={{ fontSize: '0.8rem' }} align="right">{v.longitud != null ? formatNumber(v.longitud, 2) : '\u2014'}</TableCell>
                            <TableCell><OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary' }} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AccountTreeOutlinedIcon />}
                    onClick={handleGoToVariants}
                    sx={{ mt: 1.5, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                  >
                    Ver todas las variantes en detalle
                  </Button>
                </>
              )}
            </DetailSection>
          </>
        )}

        {/* ── Tab 1: Ficha Técnica ── */}
        {activeTab === 1 && (
          loadingDetail ? (
            <Stack spacing={2}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
            </Stack>
          ) : specFields.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
              <EngineeringIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No hay especificaciones técnicas configuradas para productos de tipo <strong>{product.productType}</strong>.
              </Typography>
            </Paper>
          ) : (
            <>
              <Collapse in={saveSuccess}>
                <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Especificaciones guardadas correctamente.</Alert>
              </Collapse>

              <Grid container spacing={2}>
                {specFields.map((field) => (
                  <Grid item xs={12} sm={6} key={field.key}>
                    <TextField
                      label={field.label}
                      type="number"
                      fullWidth
                      size="small"
                      value={specValues[field.key] ?? ''}
                      onChange={(e) => handleSpecChange(field.key, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      inputProps={{ step: field.step }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                              {field.unit}
                            </Typography>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={handleSaveSpecs}
                  disabled={savingSpecs}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                >
                  {savingSpecs ? 'Guardando...' : 'Guardar especificaciones'}
                </Button>
              </Box>
            </>
          )
        )}
      </Box>
    </Drawer>
  );
}

// ══════════════════════════════════════════════════════════════
// Country Assignment Dialog
// ══════════════════════════════════════════════════════════════
function CountryAssignDialog({ open, onClose, productIds, onSuccess }) {
  const [countries, setCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) { setSelectedCountries([]); setResult(null); return; }
    setLoadingCountries(true);
    countriesApi.getCountriesSimple()
      .then((data) => setCountries(data || []))
      .catch(() => setCountries([]))
      .finally(() => setLoadingCountries(false));
  }, [open]);

  const toggleCountry = (id) => {
    setSelectedCountries((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    setSaving(true);
    try {
      const res = await countriesApi.bulkAssign({ productIds, countryIds: selectedCountries, status: 'active' });
      setResult(res);
      setTimeout(() => { onClose(); onSuccess?.(); }, 1200);
    } catch (err) {
      setResult({ error: err.response?.data?.detail || 'Error al asignar' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth TransitionComponent={Slide} TransitionProps={{ direction: 'up' }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <PublicIcon color="primary" />
        <Typography variant="h6" fontWeight={700}>Asignar Paises</Typography>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {productIds.length} producto(s) seleccionado(s). Selecciona los paises:
        </Typography>
        <Collapse in={!!result?.message}><Alert severity="success" sx={{ mb: 2 }}>{result?.message}</Alert></Collapse>
        <Collapse in={!!result?.error}><Alert severity="error" sx={{ mb: 2 }}>{result?.error}</Alert></Collapse>
        {loadingCountries ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : countries.length === 0 ? (
          <Alert severity="info">No hay paises configurados.</Alert>
        ) : (
          <Stack spacing={0.5}>
            {countries.map((c) => (
              <Paper key={c.id} variant="outlined" onClick={() => toggleCountry(c.id)}
                sx={{
                  px: 2, py: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                  borderRadius: 2, transition: 'all 0.15s ease',
                  borderColor: selectedCountries.includes(c.id) ? 'primary.main' : 'divider',
                  bgcolor: selectedCountries.includes(c.id) ? 'primary.50' : 'transparent',
                  '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                }}>
                <Checkbox size="small" checked={selectedCountries.includes(c.id)} sx={{ p: 0 }} />
                <Typography fontSize={20}>{c.flagEmoji || '\u{1F3F3}\u{FE0F}'}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{c.code} - {c.currency}</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={handleAssign}
          disabled={saving || selectedCountries.length === 0 || !!result?.message}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
          {saving ? 'Asignando...' : `Asignar a ${selectedCountries.length} pais(es)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════
export default function ProductosBaseTab() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [typeCounts, setTypeCounts] = useState({ perfil: 0, lamina: 0, escalera: 0, accesorio: 0, otro: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Persisted filters — survive navigation and app restart
  const [pf, setPf, clearPf] = usePersistedFilters('productos_base', {
    categoria: [],
    subcategoria: [],
    sistema: [],
    tipo: '',
    groupBy: null,
  });
  const categoriaFilter = Array.isArray(pf.categoria) && pf.categoria.length > 0 ? pf.categoria.join(',') : '';
  const subcatFilter = Array.isArray(pf.subcategoria) && pf.subcategoria.length > 0 ? pf.subcategoria.join(',') : '';
  const sistemaFilter = Array.isArray(pf.sistema) && pf.sistema.length > 0 ? pf.sistema.join(',') : '';
  const tipoFilter = pf.tipo;

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
  const [sortModel, setSortModel] = useState([{ field: 'reference', sort: 'asc' }]);

  // groupBy from persisted filters — restore the full option object
  const groupBy = useMemo(() => {
    if (!pf.groupBy) return null;
    return GROUP_BY_OPTIONS.find((o) => o.field === pf.groupBy) || null;
  }, [pf.groupBy]);
  const setGroupBy = useCallback((val) => {
    setPf('groupBy', val ? val.field : null);
  }, [setPf]);

  const [selectionModel, setSelectionModel] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [countryDialogOpen, setCountryDialogOpen] = useState(false);
  const [refreshSpin, setRefreshSpin] = useState(false);

  const [filterOptions, setFilterOptions] = useState({ categorias: [], subcats: [], sistemas: [] });
  const [columnVisibility, setColumnVisibility] = useState(DEFAULT_COLUMN_VISIBILITY);
  const [colMenuAnchor, setColMenuAnchor] = useState(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Load filter options with counts, sorted by frequency
  useEffect(() => {
    // Aggregate skuCount by normalizedValue (multiple raw values can map to same normalized name)
    function toRankedOptions(items) {
      const counts = {};
      items.filter((i) => i.status === 'active').forEach((i) => {
        const name = i.normalizedValue;
        if (name) counts[name] = (counts[name] || 0) + (i.skuCount || 0);
      });
      return Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
    }

    async function loadFilters() {
      try {
        const [catRes, subRes, sysRes] = await Promise.all([
          productsApi.getClassifications('categorias'),
          productsApi.getClassifications('subcategorias'),
          productsApi.getClassifications('sistemas'),
        ]);
        setFilterOptions({
          categorias: toRankedOptions(catRes.items),
          subcats: toRankedOptions(subRes.items),
          sistemas: toRankedOptions(sysRes.items),
        });
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch base products
  const fetchData = useCallback(async () => {
    setLoading(true);
    setSelectionModel([]);
    try {
      let sortField = sortModel[0]?.field || 'reference';
      let sortOrder = sortModel[0]?.sort || 'asc';
      if (groupBy) {
        sortField = groupBy.field;
        sortOrder = 'asc';
      }

      const params = {
        page: paginationModel.page + 1,
        page_size: paginationModel.pageSize,
        search: debouncedSearch || undefined,
        categoria: categoriaFilter || undefined,
        subcategory: subcatFilter || undefined,
        sistema: sistemaFilter || undefined,
        product_type: tipoFilter || undefined,
        sort_field: sortField,
        sort_order: sortOrder,
      };
      const data = await productsApi.getBaseProducts(params);
      setRows(data.items);
      setTotal(data.total);
      if (data.typeCounts) setTypeCounts(data.typeCounts);
    } catch (err) {
      console.error('Error fetching base products:', err);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, debouncedSearch, categoriaFilter, subcatFilter, sistemaFilter, tipoFilter, sortModel, groupBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // KPI stats from API — full dataset counts, not just current page
  const kpiStats = useMemo(() => ({
    Perfil: typeCounts.perfil || 0,
    Lamina: typeCounts.lamina || 0,
    Escalera: typeCounts.escalera || 0,
    Accesorio: typeCounts.accesorio || 0,
    Otro: typeCounts.otro || 0,
  }), [typeCounts]);

  // Row Grouping
  const groupInfo = useMemo(() => {
    if (!groupBy || rows.length === 0) return { transitions: {}, counts: {} };
    const field = groupBy.field;
    const transitions = {};
    const counts = {};
    let currentGroup = null;
    for (const row of rows) {
      const groupLabel = row[field] ?? 'Sin asignar';
      counts[groupLabel] = (counts[groupLabel] || 0) + 1;
      if (groupLabel !== currentGroup) {
        transitions[row.id] = groupLabel;
        currentGroup = groupLabel;
      }
    }
    return { transitions, counts };
  }, [rows, groupBy]);

  const handleOpenSelectedDetail = useCallback(() => {
    const selected = rows.find((r) => selectionModel.includes(r.id));
    if (selected) { setSelectedProduct(selected); setDrawerOpen(true); }
  }, [rows, selectionModel]);

  const handleGoToVariants = useCallback(() => {
    const selected = rows.find((r) => selectionModel.includes(r.id));
    if (selected) {
      navigate(`/platform/productos/variantes?product_id=${selected.id}`);
    }
  }, [rows, selectionModel, navigate]);

  const handleRefresh = useCallback(() => {
    setRefreshSpin(true);
    fetchData().finally(() => setTimeout(() => setRefreshSpin(false), 600));
  }, [fetchData]);

  const handleExport = useCallback((items) => {
    downloadCSV(items, `productos_base_${new Date().toISOString().slice(0, 10)}.csv`);
  }, []);

  const getSelectedItems = useCallback(() => rows.filter((r) => selectionModel.includes(r.id)), [rows, selectionModel]);

  const activeFilters = [categoriaFilter, subcatFilter, sistemaFilter, tipoFilter].filter(Boolean).length;

  const GROUP_COLORS = ['#3B82F6', '#8B5CF6', '#059669', '#D97706', '#DC2626', '#0891B2', '#7C3AED', '#CA8A04'];

  const columns = useMemo(
    () => [
      {
        field: 'id',
        headerName: 'ID',
        flex: 0.6,
        minWidth: 90,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params) => (
          <Chip
            label={`PB-${String(params.value).padStart(4, '0')}`}
            size="small"
            sx={{
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontWeight: 700, fontSize: '0.7rem', height: 24,
              bgcolor: '#EDE7F6', color: '#5E35B1', letterSpacing: '0.02em',
            }}
          />
        ),
      },
      {
        field: 'reference',
        headerName: 'Referencia',
        flex: 1.2,
        minWidth: 130,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={600} color="primary">{params.value}</Typography>
        ),
      },
      { field: 'description', headerName: 'Descripcion', flex: 2, minWidth: 180, align: 'center', headerAlign: 'center' },
      {
        field: 'productType',
        headerName: 'Tipo',
        flex: 0.8,
        minWidth: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          const conf = TYPE_MAP[params.value] || TYPE_MAP['Otro'];
          return (
            <Chip
              label={conf.label}
              size="small"
              sx={{ bgcolor: conf.bgColor, color: conf.color, fontWeight: 600, fontSize: '0.7rem' }}
            />
          );
        },
      },
      { field: 'categoria', headerName: 'Categoria', flex: 1, minWidth: 100, align: 'center', headerAlign: 'center' },
      { field: 'subcategoria', headerName: 'Subcategoria', flex: 1.2, minWidth: 120, align: 'center', headerAlign: 'center' },
      { field: 'sistema', headerName: 'Sistema', flex: 1, minWidth: 100, align: 'center', headerAlign: 'center' },
      { field: 'linea', headerName: 'Linea', flex: 0.8, minWidth: 80, align: 'center', headerAlign: 'center' },
      {
        field: 'pesoUm',
        headerName: 'Peso UM (kg)',
        flex: 0.9,
        minWidth: 100,
        type: 'number',
        align: 'center',
        headerAlign: 'center',
        valueFormatter: (value) => (value != null ? formatNumber(value, 4) : ''),
      },
      {
        field: 'variantCount',
        headerName: 'Variantes',
        flex: 0.7,
        minWidth: 80,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip label={params.value ?? 0} size="small" variant="outlined" color="primary" sx={{ fontWeight: 600, minWidth: 40 }} />
        ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        flex: 0.7,
        minWidth: 80,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => (
          <Chip
            label={params.value}
            size="small"
            sx={{
              bgcolor: params.value === 'Activo' ? '#E8F5E9' : '#ECEFF1',
              color: params.value === 'Activo' ? '#2E7D32' : '#616161',
              fontWeight: 600, fontSize: '0.7rem',
            }}
          />
        ),
      },
    ],
    []
  );

  const hasSel = selectionModel.length > 0;

  const getRowClassName = useCallback((params) => {
    if (!groupBy) return '';
    return groupInfo.transitions[params.id] ? 'group-first-row' : '';
  }, [groupBy, groupInfo]);

  return (
    <Box>
      {/* ── KPI Strip ── */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <KpiCard value={total.toLocaleString()} label="Total" loading={loading} delay={0}
          color="#334155" bgColor="#F1F5F9" icon={<InventoryIcon sx={{ fontSize: 20 }} />} />
        {PRODUCT_TYPES.map((t, i) => (
          <KpiCard
            key={t.value}
            value={kpiStats[t.value] || 0}
            label={t.label}
            loading={loading}
            delay={(i + 1) * 50}
            color={t.color}
            bgColor={t.bgColor}
            icon={t.icon ? <Box sx={{ fontSize: 20, display: 'flex' }}>{t.icon}</Box> : <CategoryIcon sx={{ fontSize: 20 }} />}
          />
        ))}
      </Stack>

      {/* ── Command Bar ── */}
      <Fade in timeout={TRANSITION_DURATION}>
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          {/* Row 1: Search + Actions */}
          <Box sx={{ px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Buscar referencia o descripcion..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              size="small"
              sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { height: 36 } }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            />

            <Fade in={!loading}>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {rows.length}{total ? ` de ${total}` : ''} {isMobile ? '' : 'productos'}
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

            <TbIcon title="Ver detalle" disabled={selectionModel.length !== 1} onClick={handleOpenSelectedDetail}>
              <VisibilityOutlinedIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Ver variantes" disabled={selectionModel.length !== 1} onClick={handleGoToVariants}>
              <AccountTreeOutlinedIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Asignar paises" disabled={!hasSel} onClick={() => setCountryDialogOpen(true)}>
              <PublicIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Exportar seleccion" disabled={!hasSel} onClick={() => handleExport(getSelectedItems())}>
              <FileDownloadOutlinedIcon fontSize="small" />
            </TbIcon>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

            <TbIcon title="Columnas" onClick={(e) => setColMenuAnchor(e.currentTarget)}>
              <ViewColumnOutlinedIcon fontSize="small" />
            </TbIcon>
            <TbIcon title="Refrescar datos" onClick={handleRefresh}>
              <RefreshIcon fontSize="small" sx={{
                transition: 'transform 0.3s',
                ...(refreshSpin && {
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                }),
              }} />
            </TbIcon>
            <TbIcon title="Exportar todo" onClick={() => handleExport(rows)}>
              <SaveAltIcon fontSize="small" />
            </TbIcon>
          </Box>

          <Divider />

          {/* Row 2: Group By + Filters */}
          <Box sx={{
            px: 1.5, py: 0.75,
            display: 'flex', alignItems: 'center', gap: 0.75,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 0 },
            scrollbarWidth: 'none',
          }}>
            {/* Group By */}
            <Autocomplete
              size="small"
              options={GROUP_BY_OPTIONS}
              getOptionLabel={(opt) => opt.label}
              value={groupBy}
              onChange={(_, newVal) => { setGroupBy(newVal); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              disableClearable={!groupBy}
              PopperComponent={(props) => (
                <Popper {...props} sx={{ '& .MuiAutocomplete-paper': { borderRadius: 2, mt: 0.5, boxShadow: 4 } }} />
              )}
              renderInput={(params) => (
                <TextField {...params} placeholder="Agrupar"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <LayersOutlinedIcon sx={{ fontSize: 16, color: groupBy ? 'primary.main' : 'text.disabled' }} />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    minWidth: 140, maxWidth: 170,
                    '& .MuiOutlinedInput-root': {
                      height: 32, fontSize: '0.75rem', borderRadius: 2,
                      bgcolor: groupBy ? alpha('#7C3AED', 0.08) : 'transparent',
                      transition: 'background-color 0.2s ease',
                    },
                  }}
                />
              )}
            />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            {/* Tipo filter — 5 options = FilterChips */}
            <Typography variant="caption" color="text.disabled"
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
              Tipo:
            </Typography>
            {PRODUCT_TYPES.map((t) => (
              <FilterChip
                key={t.value}
                label={t.label}
                active={tipoFilter === t.value}
                activeColor={t.bgColor}
                activeTextColor={t.color}
                onClick={() => { setPf('tipo', tipoFilter === t.value ? '' : t.value); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              />
            ))}

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Categoria" options={filterOptions.categorias} value={pf.categoria}
              onChange={(v) => { setPf('categoria', v); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              color="#7C3AED" bgColor="#F3E8FF" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Subcategoria" options={filterOptions.subcats} value={pf.subcategoria}
              onChange={(v) => { setPf('subcategoria', v); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              color="#1565C0" bgColor="#E3F2FD" multiple />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.25 }} />

            <SmartFilter label="Sistema" options={filterOptions.sistemas} value={pf.sistema}
              onChange={(v) => { setPf('sistema', v); setPaginationModel((p) => ({ ...p, page: 0 })); }}
              color="#E65100" bgColor="#FFF3E0" multiple />

            {/* Clear */}
            <Fade in={activeFilters > 0 || !!groupBy}>
              <Box sx={{ display: 'flex' }}>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <TbIcon title="Limpiar filtros y agrupacion" onClick={() => {
                  clearPf(); setPaginationModel((p) => ({ ...p, page: 0 }));
                }}>
                  <ClearAllIcon fontSize="small" />
                </TbIcon>
              </Box>
            </Fade>
          </Box>
        </Paper>
      </Fade>

      {/* ── Group indicator bar ── */}
      {groupBy && !loading && rows.length > 0 && (
        <Fade in timeout={200}>
          <Paper variant="outlined" sx={{
            mb: 1.5, px: 2, py: 0.75, borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 1,
            bgcolor: alpha('#7C3AED', 0.04), borderColor: alpha('#7C3AED', 0.2),
          }}>
            <LayersOutlinedIcon sx={{ fontSize: 16, color: '#7C3AED' }} />
            <Typography variant="caption" fontWeight={600} color="#7C3AED">
              Agrupado por {groupBy.label}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ gap: 0.5 }}>
              {Object.entries(groupInfo.counts).map(([label, count], idx) => (
                <Chip key={label} label={`${label} (${count})`} size="small"
                  sx={{
                    height: 22, fontSize: '0.65rem', fontWeight: 600,
                    bgcolor: alpha(GROUP_COLORS[idx % GROUP_COLORS.length], 0.1),
                    color: GROUP_COLORS[idx % GROUP_COLORS.length],
                    border: `1px solid ${alpha(GROUP_COLORS[idx % GROUP_COLORS.length], 0.3)}`,
                  }} />
              ))}
            </Stack>
          </Paper>
        </Fade>
      )}

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
                    <Skeleton width="40%" height={18} sx={{ mt: 0.5 }} />
                  </CardContent>
                </Card>
              </Fade>
            ))
          ) : rows.length === 0 ? (
            <Fade in><Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Sin resultados</Typography></Fade>
          ) : (
            rows.map((item, index) => (
              <ProductCard key={item.id} item={item} index={index}
                selected={selectionModel.includes(item.id)}
                onToggle={() => setSelectionModel((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])}
                onView={() => { setSelectedProduct(item); setDrawerOpen(true); }} />
            ))
          )}
        </Box>
      ) : loading ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}><TableSkeleton /></Paper>
      ) : (
        <Fade in timeout={TRANSITION_DURATION}>
          <Box>
            <DataGrid
              rows={rows}
              columns={columns}
              columnVisibilityModel={columnVisibility}
              onColumnVisibilityModelChange={setColumnVisibility}
              density="compact"
              autoHeight
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={(newModel) => setSelectionModel(newModel)}
              rowCount={total}
              paginationMode="server"
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[25, 50]}
              sortingMode="server"
              sortModel={sortModel}
              onSortModelChange={setSortModel}
              getRowClassName={getRowClassName}
              onRowDoubleClick={(params) => { setSelectedProduct(params.row); setDrawerOpen(true); }}
              sx={{
                '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
                ...(groupBy && {
                  '& .group-first-row': {
                    borderTop: `2.5px solid ${alpha('#7C3AED', 0.35)}`,
                  },
                }),
              }}
            />
          </Box>
        </Fade>
      )}

      {/* ── Column Visibility Menu ── */}
      <ColumnVisibilityMenu
        anchorEl={colMenuAnchor}
        open={Boolean(colMenuAnchor)}
        onClose={() => setColMenuAnchor(null)}
        model={columnVisibility}
        onChange={setColumnVisibility}
      />

      {/* ── Detail Drawer ── */}
      <ProductDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={selectedProduct}
        navigate={navigate}
      />

      {/* ── Country Assignment Dialog ── */}
      <CountryAssignDialog
        open={countryDialogOpen}
        onClose={() => setCountryDialogOpen(false)}
        productIds={selectionModel}
        onSuccess={() => setSelectionModel([])}
      />
    </Box>
  );
}
