/**
 * Archivos / File Uploads — Upload Excel files, view audit trail, diff, and sync.
 *
 * Features: KPI strip (by type), command bar (icon-only), DataGrid with sync status,
 * 3-step Upload Stepper (Upload → Preview → Sync), 3-tab Detail modal
 * (Info / Changelog / Sincronización), mobile cards, CSV export.
 */
import { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from 'react';
import {
  Box, TextField, Button, Chip, InputAdornment, Typography,
  IconButton, Tooltip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, Paper, Divider, Alert, useMediaQuery, useTheme,
  Fade, Slide, Skeleton, Tab, Tabs, LinearProgress, Card, CardContent,
  Stepper, Step, StepLabel, StepContent,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DescriptionIcon from '@mui/icons-material/Description';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import StorageIcon from '@mui/icons-material/Storage';
import SyncIcon from '@mui/icons-material/Sync';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CategoryIcon from '@mui/icons-material/Category';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import fileUploadsApi from '../../api/fileUploads.api';
import { formatDate } from '../../utils/formatters';

const TRANSITION_DURATION = 250;

const TYPE_OPTIONS = [
  { value: 'maestro', label: 'Maestro', color: '#E3F2FD', textColor: '#1565C0', icon: <InventoryIcon sx={{ fontSize: 14 }} /> },
  { value: 'ventas', label: 'Ventas', color: '#FFF3E0', textColor: '#E65100', icon: <ReceiptLongIcon sx={{ fontSize: 14 }} /> },
  { value: 'transito', label: 'Tránsito', color: '#E8F5E9', textColor: '#2E7D32', icon: <LocalShippingIcon sx={{ fontSize: 14 }} /> },
];

const STATUS_OPTIONS = [
  { value: 'success', label: 'Exitoso', color: '#E8F5E9', textColor: '#2E7D32' },
  { value: 'error', label: 'Error', color: '#FFEBEE', textColor: '#C62828' },
  { value: 'processing', label: 'Procesando', color: '#FFF8E1', textColor: '#F57F17' },
];

function getTypeStyle(type) {
  return TYPE_OPTIONS.find((t) => t.value === type) || { label: type || 'N/A', color: '#ECEFF1', textColor: '#9E9E9E' };
}
function getStatusStyle(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || { label: status || 'N/A', color: '#ECEFF1', textColor: '#9E9E9E' };
}
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function getSyncStatus(item) {
  if (item.fileType !== 'maestro') return { label: 'N/A', color: '#ECEFF1', textColor: '#9E9E9E' };
  const sr = item.changesSummary?.sync_result;
  if (sr) return { label: 'Sincronizado', color: '#E8F5E9', textColor: '#2E7D32' };
  return { label: 'Pendiente', color: '#FFF8E1', textColor: '#F57F17' };
}

// ══════════════════════════════════════════════════════════════
// Shared Components
// ══════════════════════════════════════════════════════════════
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

function FilterChip({ label, active, onClick, activeColor, activeTextColor, icon }) {
  return (
    <Chip label={label} icon={icon} size="small" onClick={onClick}
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
        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: bgColor || '#F1F5F9', color: color || '#64748B', flexShrink: 0 }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} color={color || 'text.primary'} sx={{ lineHeight: 1.1 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
        </Box>
      </Paper>
    </Fade>
  );
}

function SectionHeader({ icon, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5, mt: 1 }}>
      {icon}
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Typography>
      <Divider sx={{ flex: 1 }} />
    </Stack>
  );
}

function InfoField({ label, value }) {
  return (
    <Box sx={{ minWidth: 140, flex: 1 }}>
      <Typography variant="caption" color="text.disabled" fontWeight={600} sx={{ textTransform: 'uppercase' }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
    </Box>
  );
}

/** Sync result detail — reused in Upload stepper and Detail modal */
function SyncResultDetail({ syncResult }) {
  if (!syncResult) return null;
  const isOk = syncResult.status === 'success';
  return (
    <Fade in>
      <Box>
        <Alert severity={isOk ? 'success' : 'error'} sx={{ mb: 1.5 }}>
          <Typography variant="body2" fontWeight={700}>
            {isOk ? 'Sincronización completada' : 'Error en sincronización'}
          </Typography>
        </Alert>
        {isOk && (
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <StatChip icon={<AddIcon />} label={`${syncResult.productsCreated} productos nuevos`} bg="#E8F5E9" fg="#2E7D32" />
              <StatChip icon={<EditIcon />} label={`${syncResult.productsUpdated} productos actualizados`} bg="#FFF3E0" fg="#E65100" />
              <StatChip icon={<AddIcon />} label={`${syncResult.variantsCreated} variantes nuevas`} bg="#E3F2FD" fg="#1565C0" />
              <StatChip icon={<EditIcon />} label={`${syncResult.variantsUpdated} variantes actualizadas`} bg="#EDE7F6" fg="#5E35B1" />
            </Stack>
            {syncResult.classificationsDiscovered > 0 && (
              <StatChip icon={<CategoryIcon />} label={`${syncResult.classificationsDiscovered} clasificaciones descubiertas`} bg="#F3E5F5" fg="#7B1FA2" />
            )}
            {syncResult.acabadosDiscovered > 0 && (
              <StatChip icon={<AccountTreeIcon />} label={`${syncResult.acabadosDiscovered} acabados descubiertos`} bg="#FFF3E0" fg="#E65100" />
            )}
            {syncResult.refsNotInFile > 0 && (
              <Alert severity="warning" variant="outlined" sx={{ py: 0, fontSize: '0.75rem' }}>
                {syncResult.refsNotInFile} referencias en la base de datos no están en este archivo
              </Alert>
            )}
            {syncResult.refsInactivated > 0 && (
              <Alert severity="info" variant="outlined" sx={{ py: 0, fontSize: '0.75rem' }}>
                {syncResult.refsInactivated} referencias marcadas como inactivas desde Siesa
              </Alert>
            )}
          </Stack>
        )}
        {syncResult.errors?.length > 0 && (
          <Alert severity="error" sx={{ mt: 1, fontSize: '0.8rem' }}>{syncResult.errors[0]}</Alert>
        )}
      </Box>
    </Fade>
  );
}

function StatChip({ icon, label, bg, fg }) {
  return <Chip icon={icon} label={label} size="small" sx={{ bgcolor: bg, color: fg, fontWeight: 600, fontSize: '0.72rem' }} />;
}

// ══════════════════════════════════════════════════════════════
// Upload Modal — 3-Step Stepper (Upload → Preview → Sync)
// ══════════════════════════════════════════════════════════════
const SlideUp = forwardRef((props, ref) => <Slide direction="up" ref={ref} {...props} />);

function UploadModal({ open, onClose, onUploadDone }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [diff, setDiff] = useState(null);
  const inputRef = useRef(null);

  const reset = () => {
    setStep(0); setFile(null); setUploading(false); setResult(null);
    setError(''); setDragOver(false); setSyncing(false); setSyncResult(null); setDiff(null);
  };
  useEffect(() => { if (open) reset(); }, [open]);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) { setError('Solo .xlsx, .xls o .csv'); return; }
    if (f.size > 50 * 1024 * 1024) { setError('Máximo 50MB'); return; }
    setFile(f); setError('');
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const res = await fileUploadsApi.upload(file);
      setResult(res);
      onUploadDone?.();
      setStep(1);
      // Auto-load diff
      if (res.id) {
        try {
          const d = await fileUploadsApi.getUploadDiff(res.id);
          setDiff(d);
        } catch { /* diff optional */ }
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al procesar el archivo');
    } finally { setUploading(false); }
  };

  const handleSync = async () => {
    if (!result?.id) return;
    setSyncing(true);
    try {
      const res = await fileUploadsApi.applySync(result.id);
      setSyncResult(res);
      onUploadDone?.();
      setStep(2);
    } catch (err) {
      setSyncResult({ status: 'error', errors: [err?.response?.data?.detail || 'Error en sync'] });
      setStep(2);
    } finally { setSyncing(false); }
  };

  const busy = uploading || syncing;
  const isMaestro = result?.fileType === 'maestro';

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth TransitionComponent={SlideUp}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudUploadIcon color="primary" />
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>Importar Archivo</Typography>
        {result && (
          <Chip label={getTypeStyle(result.fileType).label} size="small"
            sx={{ bgcolor: getTypeStyle(result.fileType).color, color: getTypeStyle(result.fileType).textColor, fontWeight: 600 }} />
        )}
        <IconButton size="small" onClick={onClose} disabled={busy}><CloseIcon /></IconButton>
      </DialogTitle>

      {busy && <LinearProgress />}

      <DialogContent dividers>
        {/* ── Stepper ── */}
        <Stepper activeStep={step} sx={{ mb: 2 }}>
          <Step completed={step > 0}><StepLabel>Subir</StepLabel></Step>
          <Step completed={step > 1}><StepLabel>Preview</StepLabel></Step>
          <Step completed={!!syncResult && syncResult.status === 'success'}>
            <StepLabel optional={!isMaestro && step >= 1 ? <Typography variant="caption">N/A</Typography> : undefined}>
              Sincronizar
            </StepLabel>
          </Step>
        </Stepper>

        {/* ── Step 0: Upload ── */}
        {step === 0 && (
          <Fade in>
            <Box>
              <Box
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => inputRef.current?.click()}
                sx={{
                  border: '2px dashed', borderColor: dragOver ? 'primary.main' : 'divider',
                  borderRadius: 2, p: 4, textAlign: 'center', cursor: 'pointer',
                  bgcolor: dragOver ? 'primary.50' : 'background.default',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
                }}
              >
                <CloudUploadIcon sx={{ fontSize: 48, color: dragOver ? 'primary.main' : 'text.disabled', mb: 1 }} />
                <Typography variant="body1" fontWeight={600} color={dragOver ? 'primary.main' : 'text.secondary'}>
                  {file ? file.name : 'Arrastra tu archivo aquí'}
                </Typography>
                {file && <Typography variant="caption" color="text.disabled">{formatBytes(file.size)}</Typography>}
                <Typography variant="caption" display="block" color="text.disabled" sx={{ mt: 1 }}>
                  .xlsx, .xls, .csv — Máx 50MB — Detección automática
                </Typography>
                <input ref={inputRef} type="file" hidden accept=".xlsx,.xls,.csv"
                  onChange={(e) => handleFile(e.target.files[0])} />
              </Box>
              {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
            </Box>
          </Fade>
        )}

        {/* ── Step 1: Preview ── */}
        {step === 1 && result && (
          <Fade in>
            <Stack spacing={1.5}>
              <Alert severity={result.status === 'success' ? 'success' : 'error'}>
                {result.status === 'success'
                  ? `${result.fileTypeLabel} — ${result.recordsTotal.toLocaleString()} registros procesados`
                  : result.errorMessage || 'Error'}
              </Alert>

              {result.status === 'success' && (
                <>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <StatChip icon={<AddIcon />} label={`${result.recordsNew} nuevos`} bg="#E8F5E9" fg="#2E7D32" />
                    <StatChip icon={<EditIcon />} label={`${result.recordsUpdated} modificados`} bg="#FFF3E0" fg="#E65100" />
                    <StatChip icon={<RemoveIcon />} label={`${result.recordsDeleted} eliminados`} bg="#FFEBEE" fg="#C62828" />
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    Archivo: {result.fileName} ({formatBytes(result.fileSizeBytes)})
                  </Typography>

                  {/* Mini diff preview */}
                  {diff && (diff.newRows.length > 0 || diff.updatedRows.length > 0 || diff.deletedRows.length > 0) && (
                    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, maxHeight: 180, overflow: 'auto' }}>
                      {diff.newRows.slice(0, 5).map((r, i) => (
                        <Stack key={`n${i}`} direction="row" spacing={1} alignItems="center" sx={{ py: 0.25 }}>
                          <Chip label="+" size="small" sx={{ width: 24, height: 20, bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 800, fontSize: '0.7rem', '& .MuiChip-label': { px: 0 } }} />
                          <Typography variant="caption" fontWeight={600}>{r.reference}</Typography>
                          <Typography variant="caption" color="text.disabled" noWrap>{r.description}</Typography>
                        </Stack>
                      ))}
                      {diff.updatedRows.slice(0, 5).map((r, i) => (
                        <Stack key={`u${i}`} direction="row" spacing={1} alignItems="center" sx={{ py: 0.25 }}>
                          <Chip label="~" size="small" sx={{ width: 24, height: 20, bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 800, fontSize: '0.7rem', '& .MuiChip-label': { px: 0 } }} />
                          <Typography variant="caption" fontWeight={600}>{r.reference}</Typography>
                          <Typography variant="caption" color="text.disabled">{r.changes?.length || 0} campos</Typography>
                        </Stack>
                      ))}
                      {diff.deletedRows.slice(0, 5).map((r, i) => (
                        <Stack key={`d${i}`} direction="row" spacing={1} alignItems="center" sx={{ py: 0.25 }}>
                          <Chip label="−" size="small" sx={{ width: 24, height: 20, bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 800, fontSize: '0.7rem', '& .MuiChip-label': { px: 0 } }} />
                          <Typography variant="caption" fontWeight={600}>{r.reference}</Typography>
                          <Typography variant="caption" color="text.disabled" noWrap>{r.description}</Typography>
                        </Stack>
                      ))}
                      {(diff.totalNew + diff.totalUpdated + diff.totalDeleted) > 15 && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                          ... y {(diff.totalNew + diff.totalUpdated + diff.totalDeleted) - 15} más (ver detalle en historial)
                        </Typography>
                      )}
                    </Paper>
                  )}

                  {isMaestro && (
                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }} icon={<SyncIcon />}>
                      <Typography variant="caption">
                        Haz clic en <strong>Sincronizar</strong> para aplicar estos cambios a productos, variantes y clasificaciones.
                        Los campos editados desde la App se preservan.
                      </Typography>
                    </Alert>
                  )}
                  {!isMaestro && (
                    <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                      <Typography variant="caption">
                        Archivo registrado en historial. La sincronización automática para {result.fileTypeLabel} estará disponible próximamente.
                      </Typography>
                    </Alert>
                  )}
                </>
              )}
            </Stack>
          </Fade>
        )}

        {/* ── Step 2: Sync result ── */}
        {step === 2 && <SyncResultDetail syncResult={syncResult} />}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">
          {step === 2 || (step === 1 && !isMaestro) ? 'Cerrar' : 'Cancelar'}
        </Button>
        {step === 0 && (
          <Button variant="contained" onClick={handleUpload} disabled={!file || uploading}
            startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {uploading ? 'Procesando...' : 'Subir y Analizar'}
          </Button>
        )}
        {step === 1 && isMaestro && !syncResult && (
          <Button variant="contained" color="warning" onClick={handleSync} disabled={syncing}
            startIcon={<SyncIcon />} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {syncing ? 'Sincronizando...' : 'Sincronizar con DB'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Detail Modal — 3 Tabs (Info / Changelog / Sincronización)
// ══════════════════════════════════════════════════════════════
function DetailModal({ open, onClose, item, onRefresh }) {
  const [tab, setTab] = useState(0);
  const [diff, setDiff] = useState(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    if (open && item) { setTab(0); setDiff(null); setSyncResult(null); }
  }, [open, item]);

  const loadDiff = async () => {
    if (diff || !item) return;
    setLoadingDiff(true);
    try { setDiff(await fileUploadsApi.getUploadDiff(item.id)); }
    catch { setDiff(null); }
    finally { setLoadingDiff(false); }
  };

  useEffect(() => { if (tab === 1 && !diff && item) loadDiff(); }, [tab]);

  const handleSync = async () => {
    if (!item?.id) return;
    setSyncing(true);
    try {
      const res = await fileUploadsApi.applySync(item.id);
      setSyncResult(res);
      onRefresh?.();
    } catch (err) {
      setSyncResult({ status: 'error', errors: [err?.response?.data?.detail || 'Error'] });
    } finally { setSyncing(false); }
  };

  if (!item) return null;
  const ts = getTypeStyle(item.fileType);
  const ss = getStatusStyle(item.status);
  const sync = getSyncStatus(item);
  const isMaestro = item.fileType === 'maestro';
  const hasSynced = !!item.changesSummary?.sync_result || syncResult?.status === 'success';
  const existingSyncResult = item.changesSummary?.sync_result;

  const diffColumns = [
    { field: 'reference', headerName: 'Referencia', flex: 1, minWidth: 120, align: 'center', headerAlign: 'center' },
    { field: 'description', headerName: 'Descripción', flex: 2, minWidth: 180, align: 'center', headerAlign: 'center' },
  ];
  const changesColumns = [
    { field: 'reference', headerName: 'Referencia', flex: 1, minWidth: 100, align: 'center', headerAlign: 'center' },
    { field: 'changesText', headerName: 'Cambios', flex: 3, minWidth: 250, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Box sx={{ whiteSpace: 'normal', lineHeight: 1.3, py: 0.5 }}>
          {(p.row.changes || []).map((c, i) => (
            <Typography key={i} variant="caption" display="block">
              <strong>{c.field}</strong>: <span style={{ color: '#C62828', textDecoration: 'line-through' }}>{c.old || '—'}</span>
              {' → '}<span style={{ color: '#2E7D32' }}>{c.new || '—'}</span>
            </Typography>
          ))}
        </Box>
      ),
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <DescriptionIcon color="primary" />
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }} noWrap>{item.fileName}</Typography>
        <Chip label={ts.label} size="small" sx={{ bgcolor: ts.color, color: ts.textColor, fontWeight: 600 }} />
        <Chip label={ss.label} size="small" sx={{ bgcolor: ss.color, color: ss.textColor, fontWeight: 600 }} />
        <Chip label={sync.label} size="small" sx={{ bgcolor: sync.color, color: sync.textColor, fontWeight: 600 }} />
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      {(loadingDiff || syncing) && <LinearProgress />}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Información" />
        <Tab label={
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <span>Changelog</span>
            {item.recordsNew + item.recordsUpdated + item.recordsDeleted > 0 && (
              <Chip label={item.recordsNew + item.recordsUpdated + item.recordsDeleted} size="small"
                sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, bgcolor: '#E3F2FD', color: '#1565C0' }} />
            )}
          </Stack>
        } />
        <Tab label={
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <span>Sincronización</span>
            {isMaestro && !hasSynced && (
              <Chip label="!" size="small"
                sx={{ height: 18, width: 18, fontSize: '0.65rem', fontWeight: 800, bgcolor: '#FFF8E1', color: '#F57F17', '& .MuiChip-label': { px: 0 } }} />
            )}
          </Stack>
        } />
      </Tabs>

      <DialogContent sx={{ pt: 2, minHeight: 300 }}>
        {/* ── Tab 0: Info ── */}
        {tab === 0 && (
          <Fade in>
            <Stack spacing={2}>
              <SectionHeader icon={<InsertDriveFileIcon sx={{ fontSize: 18, color: '#64748B' }} />} label="Detalles del Archivo" />
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <InfoField label="Archivo" value={item.fileName} />
                <InfoField label="Tipo" value={item.fileTypeLabel} />
                <InfoField label="Tamaño" value={formatBytes(item.fileSizeBytes)} />
                <InfoField label="Subido por" value={item.uploadedBy || '—'} />
                <InfoField label="Fecha" value={formatDate(item.createdAt)} />
                <InfoField label="Estado" value={ss.label} />
              </Stack>

              <SectionHeader icon={<StorageIcon sx={{ fontSize: 18, color: '#64748B' }} />} label="Registros" />
              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Chip label={`${item.recordsTotal.toLocaleString()} total`} size="small" sx={{ fontWeight: 600 }} />
                <StatChip icon={<AddIcon />} label={`${item.recordsNew} nuevos`} bg="#E8F5E9" fg="#2E7D32" />
                <StatChip icon={<EditIcon />} label={`${item.recordsUpdated} modificados`} bg="#FFF3E0" fg="#E65100" />
                <StatChip icon={<RemoveIcon />} label={`${item.recordsDeleted} eliminados`} bg="#FFEBEE" fg="#C62828" />
              </Stack>

              {item.errorMessage && <Alert severity="error" sx={{ mt: 1 }}>{item.errorMessage}</Alert>}
            </Stack>
          </Fade>
        )}

        {/* ── Tab 1: Changelog ── */}
        {tab === 1 && (
          <Fade in>
            <Box>
              {loadingDiff ? (
                <Stack spacing={1}><Skeleton height={40} /><Skeleton height={200} /></Stack>
              ) : !diff ? (
                <Alert severity="info">No hay datos de diff disponibles.</Alert>
              ) : (
                <Stack spacing={2}>
                  {diff.newRows.length > 0 && (
                    <>
                      <SectionHeader icon={<AddIcon sx={{ fontSize: 18, color: '#2E7D32' }} />} label={`Filas Nuevas (${diff.totalNew})`} />
                      <DataGrid rows={diff.newRows.map((r, i) => ({ id: i, ...r }))}
                        columns={diffColumns} density="compact" autoHeight hideFooter
                        sx={{ '& .MuiDataGrid-row': { bgcolor: '#E8F5E950' } }} />
                    </>
                  )}
                  {diff.updatedRows.length > 0 && (
                    <>
                      <SectionHeader icon={<EditIcon sx={{ fontSize: 18, color: '#E65100' }} />} label={`Filas Modificadas (${diff.totalUpdated})`} />
                      <DataGrid rows={diff.updatedRows.map((r, i) => ({ id: i, ...r, changesText: '' }))}
                        columns={changesColumns} density="compact" autoHeight hideFooter
                        getRowHeight={() => 'auto'}
                        sx={{ '& .MuiDataGrid-row': { bgcolor: '#FFF3E050' } }} />
                    </>
                  )}
                  {diff.deletedRows.length > 0 && (
                    <>
                      <SectionHeader icon={<RemoveIcon sx={{ fontSize: 18, color: '#C62828' }} />} label={`Filas Eliminadas (${diff.totalDeleted})`} />
                      <DataGrid rows={diff.deletedRows.map((r, i) => ({ id: i, ...r }))}
                        columns={diffColumns} density="compact" autoHeight hideFooter
                        sx={{ '& .MuiDataGrid-row': { bgcolor: '#FFEBEE50' } }} />
                    </>
                  )}
                  {diff.newRows.length === 0 && diff.updatedRows.length === 0 && diff.deletedRows.length === 0 && (
                    <Alert severity="info">Sin cambios respecto a la subida anterior (o primera subida).</Alert>
                  )}
                </Stack>
              )}
            </Box>
          </Fade>
        )}

        {/* ── Tab 2: Sincronización ── */}
        {tab === 2 && (
          <Fade in>
            <Box>
              {!isMaestro ? (
                <Alert severity="info" sx={{ mt: 1 }}>
                  La sincronización automática solo está disponible para archivos tipo <strong>Maestro</strong>. Ventas y Tránsito se implementarán próximamente.
                </Alert>
              ) : hasSynced ? (
                <Stack spacing={2}>
                  <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                    <Typography variant="body2" fontWeight={700}>Este archivo ya fue sincronizado</Typography>
                  </Alert>
                  {/* Show existing sync result or just-completed one */}
                  <SyncResultDetail syncResult={syncResult || {
                    status: 'success',
                    productsCreated: existingSyncResult?.products_created || 0,
                    productsUpdated: existingSyncResult?.products_updated || 0,
                    variantsCreated: existingSyncResult?.variants_created || 0,
                    variantsUpdated: existingSyncResult?.variants_updated || 0,
                    classificationsDiscovered: existingSyncResult?.classifications_discovered || 0,
                    acabadosDiscovered: existingSyncResult?.acabados_discovered || 0,
                    refsNotInFile: existingSyncResult?.refs_not_in_file || 0,
                    refsInactivated: existingSyncResult?.refs_inactivated || 0,
                    errors: [],
                  }} />
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Alert severity="warning" icon={<SyncIcon />}>
                    <Typography variant="body2" fontWeight={700}>Pendiente de sincronización</Typography>
                    <Typography variant="caption">
                      Este archivo fue analizado pero los cambios no se han aplicado a la base de datos.
                      La sincronización actualizará productos, variantes y clasificaciones.
                      Los campos editados desde la App se preservan.
                    </Typography>
                  </Alert>
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Button variant="contained" color="warning" size="large" onClick={handleSync}
                      disabled={syncing} startIcon={<SyncIcon />}
                      sx={{ textTransform: 'none', fontWeight: 700, px: 4, borderRadius: 2 }}>
                      {syncing ? 'Sincronizando...' : 'Sincronizar con Base de Datos'}
                    </Button>
                  </Box>
                </Stack>
              )}
            </Box>
          </Fade>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════
// Main View
// ══════════════════════════════════════════════════════════════
export default function ArchivosView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterType) params.file_type = filterType;
      if (filterStatus) params.status = filterStatus;
      const data = await fileUploadsApi.getUploads(params);
      setRows(data.items || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error('Error fetching uploads:', err);
    } finally { setLoading(false); }
  }, [search, filterType, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setSpinning(true);
    await fetchData();
    setTimeout(() => setSpinning(false), 600);
  };

  const hasFilters = filterType || filterStatus;
  const clearFilters = () => { setFilterType(''); setFilterStatus(''); };

  const handleExport = () => {
    const header = 'ID,Archivo,Tipo,Estado,Total,Nuevos,Modificados,Eliminados,Tamaño,Subido por,Fecha,Sync\n';
    const csv = rows.map((r) => {
      const sync = getSyncStatus(r);
      return `${r.id},"${r.fileName}","${r.fileTypeLabel}","${r.status}",${r.recordsTotal},${r.recordsNew},${r.recordsUpdated},${r.recordsDeleted},${r.fileSizeBytes},"${r.uploadedBy || ''}","${r.createdAt || ''}","${sync.label}"`;
    }).join('\n');
    const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `historial_archivos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Can sync selected?
  const canSyncSelected = selected.length === 1 && (() => {
    const r = rows.find((x) => x.id === selected[0]);
    return r?.fileType === 'maestro' && !r?.changesSummary?.sync_result;
  })();

  const columns = useMemo(() => [
    {
      field: 'fileName', headerName: 'Archivo', flex: 2.5, minWidth: 200, align: 'center', headerAlign: 'center',
      renderCell: (p) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <DescriptionIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          <Typography variant="body2" fontWeight={600} noWrap>{p.value}</Typography>
        </Stack>
      ),
    },
    {
      field: 'fileType', headerName: 'Tipo', flex: 0.8, minWidth: 90, align: 'center', headerAlign: 'center',
      renderCell: (p) => { const s = getTypeStyle(p.value); return <Chip label={s.label} size="small" sx={{ bgcolor: s.color, color: s.textColor, fontWeight: 600, fontSize: '0.7rem' }} />; },
    },
    {
      field: 'status', headerName: 'Estado', flex: 0.8, minWidth: 90, align: 'center', headerAlign: 'center',
      renderCell: (p) => { const s = getStatusStyle(p.value); return <Chip label={s.label} size="small" sx={{ bgcolor: s.color, color: s.textColor, fontWeight: 600, fontSize: '0.7rem' }} />; },
    },
    { field: 'recordsTotal', headerName: 'Total', flex: 0.6, minWidth: 70, align: 'center', headerAlign: 'center',
      renderCell: (p) => (p.value || 0).toLocaleString(),
    },
    {
      field: 'recordsNew', headerName: 'Nuevos', flex: 0.5, minWidth: 65, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value > 0 ? <Chip label={`+${p.value}`} size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: '0.7rem' }} /> : '—',
    },
    {
      field: 'recordsUpdated', headerName: 'Modif.', flex: 0.5, minWidth: 65, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value > 0 ? <Chip label={`~${p.value}`} size="small" sx={{ bgcolor: '#FFF3E0', color: '#E65100', fontWeight: 700, fontSize: '0.7rem' }} /> : '—',
    },
    {
      field: 'recordsDeleted', headerName: 'Elim.', flex: 0.5, minWidth: 65, align: 'center', headerAlign: 'center',
      renderCell: (p) => p.value > 0 ? <Chip label={`-${p.value}`} size="small" sx={{ bgcolor: '#FFEBEE', color: '#C62828', fontWeight: 700, fontSize: '0.7rem' }} /> : '—',
    },
    {
      field: 'syncStatus', headerName: 'Sync', flex: 0.9, minWidth: 100, align: 'center', headerAlign: 'center',
      renderCell: (p) => {
        const s = getSyncStatus(p.row);
        return <Chip label={s.label} size="small" sx={{ bgcolor: s.color, color: s.textColor, fontWeight: 600, fontSize: '0.68rem' }} />;
      },
    },
    {
      field: 'createdAt', headerName: 'Fecha', flex: 1, minWidth: 120, align: 'center', headerAlign: 'center',
      renderCell: (p) => formatDate(p.value),
    },
  ], []);

  const UploadCard = ({ row }) => {
    const ts = getTypeStyle(row.fileType);
    const ss = getStatusStyle(row.status);
    const sync = getSyncStatus(row);
    return (
      <Card variant="outlined" sx={{ mb: 1, cursor: 'pointer' }} onClick={() => setDetailItem(row)}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>{row.fileName}</Typography>
            <Chip label={sync.label} size="small" sx={{ bgcolor: sync.color, color: sync.textColor, fontWeight: 600, fontSize: '0.6rem', ml: 1 }} />
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" gap={0.5}>
            <Chip label={ts.label} size="small" sx={{ bgcolor: ts.color, color: ts.textColor, fontWeight: 600, fontSize: '0.65rem' }} />
            <Chip label={`${row.recordsTotal} reg`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
            {row.recordsNew > 0 && <Chip label={`+${row.recordsNew}`} size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32', fontSize: '0.65rem' }} />}
          </Stack>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {formatDate(row.createdAt)} — {row.uploadedBy || '—'}
          </Typography>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* ── KPI Strip ── */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <KpiCard value={stats.total ?? '—'} label="Total Subidas" color="#1565C0" bgColor="#E3F2FD"
          icon={<UploadFileIcon sx={{ fontSize: 20 }} />} loading={loading} delay={0} />
        <KpiCard value={stats.maestro ?? '—'} label="Maestro" color="#5E35B1" bgColor="#EDE7F6"
          icon={<InventoryIcon sx={{ fontSize: 20 }} />} loading={loading} delay={50} />
        <KpiCard value={stats.ventas ?? '—'} label="Ventas" color="#E65100" bgColor="#FFF3E0"
          icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />} loading={loading} delay={100} />
        <KpiCard value={stats.transito ?? '—'} label="Tránsito" color="#2E7D32" bgColor="#E8F5E9"
          icon={<LocalShippingIcon sx={{ fontSize: 20 }} />} loading={loading} delay={150} />
        <KpiCard value={stats.error ?? '—'} label="Errores" color="#C62828" bgColor="#FFEBEE"
          icon={<ErrorOutlineIcon sx={{ fontSize: 20 }} />} loading={loading} delay={200} />
      </Stack>

      {/* ── Command Bar ── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ px: 2, py: 1 }}>
          <TextField size="small" placeholder="Buscar archivo..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', md: 'block' } }}>
            {rows.length} resultado{rows.length !== 1 ? 's' : ''}
          </Typography>

          {selected.length > 0 && (
            <Chip size="small" label={`${selected.length} sel.`}
              color="primary" variant="outlined" onDelete={() => setSelected([])} />
          )}

          <Box sx={{ flex: 1 }} />

          {selected.length > 0 && (
            <TbIcon title="Ver detalle" onClick={() => setDetailItem(rows.find((r) => r.id === selected[0]))}>
              <VisibilityOutlinedIcon fontSize="small" />
            </TbIcon>
          )}
          {canSyncSelected && (
            <TbIcon title="Sincronizar con DB" onClick={() => {
              const r = rows.find((x) => x.id === selected[0]);
              if (r) setDetailItem(r);
              // Will open detail modal on Sync tab
              setTimeout(() => {}, 0);
            }}>
              <SyncIcon fontSize="small" />
            </TbIcon>
          )}

          <TbIcon title="Refrescar" onClick={handleRefresh}>
            <RefreshIcon fontSize="small" sx={{ animation: spinning ? 'spin 0.6s linear' : 'none', '@keyframes spin': { from: { transform: 'rotate(0deg)' }, to: { transform: 'rotate(360deg)' } } }} />
          </TbIcon>
          <TbIcon title="Exportar CSV" onClick={handleExport} disabled={rows.length === 0}>
            <FileDownloadOutlinedIcon fontSize="small" />
          </TbIcon>
          <TbIcon title="Subir Archivo" onClick={() => setUploadOpen(true)}>
            <AddCircleOutlineIcon fontSize="small" />
          </TbIcon>
        </Stack>

        <Divider />

        <Stack direction="row" alignItems="center" gap={0.5} sx={{
          px: 2, py: 0.75, overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
        }}>
          <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ mr: 0.5, display: { xs: 'none', md: 'block' } }}>Tipo:</Typography>
          {TYPE_OPTIONS.map((t) => (
            <FilterChip key={t.value} label={t.label} active={filterType === t.value}
              activeColor={t.color} activeTextColor={t.textColor} icon={t.icon}
              onClick={() => setFilterType((p) => p === t.value ? '' : t.value)} />
          ))}

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ mr: 0.5, display: { xs: 'none', md: 'block' } }}>Estado:</Typography>
          {STATUS_OPTIONS.map((s) => (
            <FilterChip key={s.value} label={s.label} active={filterStatus === s.value}
              activeColor={s.color} activeTextColor={s.textColor}
              onClick={() => setFilterStatus((p) => p === s.value ? '' : s.value)} />
          ))}

          {hasFilters && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Chip label="Limpiar" size="small" icon={<ClearAllIcon />} onClick={clearFilters}
                sx={{ fontWeight: 600, fontSize: '0.7rem', height: 28 }} />
            </>
          )}
        </Stack>
      </Paper>

      {/* ── DataGrid / Mobile Cards ── */}
      {loading ? (
        <Stack spacing={1}>
          {[...Array(5)].map((_, i) => <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />)}
        </Stack>
      ) : isMobile ? (
        rows.map((r) => <UploadCard key={r.id} row={r} />)
      ) : (
        <DataGrid
          rows={rows}
          columns={columns}
          density="compact"
          autoHeight
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(m) => setSelected(m)}
          rowSelectionModel={selected}
          onRowDoubleClick={(p) => setDetailItem(p.row)}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          pageSizeOptions={[25, 50]}
          sx={{ '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', justifyContent: 'center' } }}
        />
      )}

      {rows.length === 0 && !loading && (
        <Fade in>
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2, mt: 2 }}>
            <UploadFileIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary">No hay archivos subidos</Typography>
            <Typography variant="caption" color="text.disabled">Sube tu primer archivo Excel para comenzar el historial</Typography>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => setUploadOpen(true)}>
                Subir Archivo
              </Button>
            </Box>
          </Paper>
        </Fade>
      )}

      {/* ── Modals ── */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploadDone={fetchData} />
      <DetailModal open={!!detailItem} onClose={() => setDetailItem(null)} item={detailItem} onRefresh={fetchData} />
    </Box>
  );
}
