/**
 * Supply Parameters — Configure lead time, service level, coverage
 */
import { useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Slider, Button, Alert,
  ToggleButtonGroup, ToggleButton, Divider,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import PageHeader from '../../components/common/PageHeader';
import { SERVICE_LEVELS, DEFAULT_SUPPLY_PARAMS } from '../../utils/constants';

export default function SupplyParameters() {
  const [params, setParams] = useState({ ...DEFAULT_SUPPLY_PARAMS });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: POST /api/supply/recalculate with new params
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
  };

  const handleReset = () => {
    setParams({ ...DEFAULT_SUPPLY_PARAMS });
  };

  const serviceLevelLabel = SERVICE_LEVELS.find((s) => s.value === params.service_level_z)?.label || `${params.service_level_z}`;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageHeader
        title="Parámetros de Abastecimiento"
        subtitle="Ajusta los parámetros y recalcula todas las decisiones"
      />

      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Parámetros guardados y decisiones recalculadas exitosamente.
        </Alert>
      )}

      {/* ── Lead Time ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Lead Time (Tiempo de entrega)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Meses desde que se realiza la orden de importación hasta que llega la mercancía.
            Valor conservador recomendado: 4 meses.
          </Typography>
          <Box sx={{ px: 2 }}>
            <Slider
              value={params.lead_time_months}
              onChange={(_, v) => setParams((p) => ({ ...p, lead_time_months: v }))}
              min={1}
              max={8}
              step={0.5}
              marks={[
                { value: 1, label: '1m' },
                { value: 2, label: '2m' },
                { value: 3, label: '3m' },
                { value: 4, label: '4m' },
                { value: 5, label: '5m' },
                { value: 6, label: '6m' },
                { value: 7, label: '7m' },
                { value: 8, label: '8m' },
              ]}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${v} meses`}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Actual: <strong>{params.lead_time_months} meses ({params.lead_time_months * 30} días)</strong>
          </Typography>
        </CardContent>
      </Card>

      {/* ── Service Level ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Nivel de Servicio (Z)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Probabilidad de no quedarse sin stock. Mayor nivel = más stock de seguridad = más inversión.
          </Typography>
          <ToggleButtonGroup
            value={params.service_level_z}
            exclusive
            onChange={(_, v) => v !== null && setParams((p) => ({ ...p, service_level_z: v }))}
            sx={{ mb: 1 }}
          >
            {SERVICE_LEVELS.map((sl) => (
              <ToggleButton key={sl.value} value={sl.value} sx={{ px: 4, py: 1.5 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">{sl.label}</Typography>
                  <Typography variant="caption" color="text.secondary">Z = {sl.value}</Typography>
                </Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" display="block">
            Actual: <strong>{serviceLevelLabel}</strong> — Factor Z = {params.service_level_z}
          </Typography>
        </CardContent>
      </Card>

      {/* ── Coverage ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Cobertura Objetivo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Meses de demanda proyectada que la cantidad a pedir debe cubrir.
            Recomendado: 2x el lead time.
          </Typography>
          <Box sx={{ px: 2 }}>
            <Slider
              value={params.coverage_months}
              onChange={(_, v) => setParams((p) => ({ ...p, coverage_months: v }))}
              min={2}
              max={12}
              step={1}
              marks={[
                { value: 2, label: '2m' },
                { value: 4, label: '4m' },
                { value: 6, label: '6m' },
                { value: 8, label: '8m' },
                { value: 10, label: '10m' },
                { value: 12, label: '12m' },
              ]}
              valueLabelDisplay="on"
              valueLabelFormat={(v) => `${v} meses`}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Actual: <strong>{params.coverage_months} meses</strong> (recomendado: {params.lead_time_months * 2} meses)
          </Typography>
        </CardContent>
      </Card>

      {/* ── Action Bar ── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
        <Button variant="outlined" startIcon={<RestoreIcon />} onClick={handleReset}>
          Restaurar Valores
        </Button>
        <LoadingButton
          variant="contained"
          startIcon={<SaveIcon />}
          loading={saving}
          onClick={handleSave}
        >
          Guardar y Recalcular
        </LoadingButton>
      </Box>
    </Box>
  );
}
