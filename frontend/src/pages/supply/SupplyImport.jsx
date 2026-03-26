/**
 * Supply Import — Upload Excel files from ERP (Siesa)
 */
import { useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Alert,
  LinearProgress, List, ListItem, ListItemIcon, ListItemText,
  Chip, Grid,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';

import PageHeader from '../../components/common/PageHeader';

const FILE_TYPES = [
  {
    key: 'maestro',
    label: 'Maestro de Ítems',
    file: 'Maestro_Commercial_Items.xlsx',
    description: 'Catálogo de referencias: código, descripción, categoría, costo, clasificación ABC.',
    required: true,
  },
  {
    key: 'ventas',
    label: 'Ventas Históricas',
    file: 'Ventas_Siesa_Resumido.xlsx',
    description: 'Transacciones de venta: referencia, fecha, cantidad, precio, cliente, bodega.',
    required: true,
  },
  {
    key: 'transito',
    label: 'Tránsito Activo',
    file: 'Transito_Flexible_Combinado.xlsx o Transito_Siesa.xlsx',
    description: 'Órdenes de importación en curso: referencia, cantidad, fecha arribo, proveedor.',
    required: false,
  },
];

function FileUploadCard({ fileType, uploadState, onUpload }) {
  const { key, label, file, description, required } = fileType;
  const state = uploadState[key] || { status: 'idle' };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) onUpload(key, selected);
    e.target.value = '';
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">{label}</Typography>
          {required ? (
            <Chip size="small" label="Requerido" color="error" variant="outlined" />
          ) : (
            <Chip size="small" label="Opcional" variant="outlined" />
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {description}
        </Typography>

        <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 2 }}>
          Archivo: {file}
        </Typography>

        {state.status === 'uploading' && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">Procesando archivo...</Typography>
          </Box>
        )}

        {state.status === 'success' && (
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
            {state.message || 'Archivo procesado exitosamente'}
          </Alert>
        )}

        {state.status === 'error' && (
          <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
            {state.message || 'Error al procesar el archivo'}
          </Alert>
        )}

        <Button
          variant={state.status === 'success' ? 'outlined' : 'contained'}
          component="label"
          startIcon={<CloudUploadIcon />}
          size="small"
          disabled={state.status === 'uploading'}
          fullWidth
        >
          {state.status === 'success' ? 'Reemplazar Archivo' : 'Seleccionar Archivo'}
          <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SupplyImport() {
  const [uploadState, setUploadState] = useState({});

  const handleUpload = useCallback(async (fileKey, file) => {
    setUploadState((prev) => ({ ...prev, [fileKey]: { status: 'uploading' } }));

    // Simulate upload + processing
    await new Promise((r) => setTimeout(r, 2000));

    // Mock success
    setUploadState((prev) => ({
      ...prev,
      [fileKey]: {
        status: 'success',
        message: `${file.name} procesado: ${Math.floor(Math.random() * 1000 + 200)} registros importados.`,
      },
    }));
  }, []);

  const allRequiredUploaded = FILE_TYPES
    .filter((f) => f.required)
    .every((f) => uploadState[f.key]?.status === 'success');

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageHeader
        title="Importar Datos del ERP"
        subtitle="Sube los archivos Excel exportados de Siesa para alimentar el sistema"
      />

      {/* ── Instructions ── */}
      <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          El sistema detecta automáticamente el tipo de archivo por sus columnas.
          Sube los archivos en cualquier orden. Los archivos de <strong>Maestro</strong> y <strong>Ventas</strong> son
          requeridos para calcular las decisiones de compra.
        </Typography>
      </Alert>

      {/* ── Upload Cards ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {FILE_TYPES.map((ft) => (
          <Grid key={ft.key} size={{ xs: 12, md: 4 }}>
            <FileUploadCard
              fileType={ft}
              uploadState={uploadState}
              onUpload={handleUpload}
            />
          </Grid>
        ))}
      </Grid>

      {/* ── Post-upload action ── */}
      {allRequiredUploaded && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Datos importados exitosamente
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Los archivos requeridos han sido procesados. Ahora puedes calcular las decisiones de compra.
            </Typography>
            <Button variant="contained" size="large" href="/platform/abastecimiento/decisiones">
              Ver Decisiones de Compra
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
