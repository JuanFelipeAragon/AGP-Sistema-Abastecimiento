/**
 * Supply Dashboard — Abastecimiento executive summary
 * Quick access to decisions, imports, and parameters.
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, CardActionArea, Typography,
  useTheme, alpha, Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ListAltIcon from '@mui/icons-material/ListAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import TuneIcon from '@mui/icons-material/Tune';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

import PageHeader from '../../components/common/PageHeader';
import PageSkeleton from '../../components/common/PageSkeleton';
import { formatCOP, formatNumber } from '../../utils/formatters';
import { ALERT_COLORS } from '../../utils/constants';

// ── Quick Action Card ──
function QuickActionCard({ title, description, icon, color, onClick }) {
  const theme = useTheme();
  return (
    <Card>
      <CardActionArea onClick={onClick} sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{
            p: 1.5, borderRadius: 2,
            bgcolor: alpha(color || theme.palette.primary.main, 0.1),
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="bold">{title}</Typography>
            <Typography variant="caption" color="text.secondary">{description}</Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}

// ── Alert Count Card ──
function AlertCountCard({ label, count, icon, color, subtitle, onClick }) {
  return (
    <Card
      onClick={onClick}
      sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        {icon}
        <Typography variant="h3" fontWeight="bold" sx={{ color, my: 1 }}>
          {count}
        </Typography>
        <Typography variant="body2" fontWeight={600}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </CardContent>
    </Card>
  );
}

export default function SupplyDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSummary({
        critical: 23,
        alert: 67,
        ok: 1089,
        sinMov: 68,
        totalToOrder: 156,
        estimatedValue: 3200000000,
        lastCalculation: '2026-03-25T14:30:00',
        parameters: { lead_time: 4, service_level: '95%', coverage: 6 },
      });
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <Box>
      <PageHeader
        title="Abastecimiento"
        subtitle="Sistema de gestión de inventario y decisiones de compra"
        actions={[
          {
            label: 'Exportar Lista de Compra',
            icon: <FileDownloadIcon />,
            variant: 'outlined',
            onClick: () => {},
          },
        ]}
      />

      {/* ── Alert Status Cards ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <AlertCountCard
            label="Crítico"
            count={summary.critical}
            subtitle="Pedir YA"
            icon={<ErrorOutlineIcon sx={{ fontSize: 36, color: ALERT_COLORS.CRITICO }} />}
            color={ALERT_COLORS.CRITICO}
            onClick={() => navigate('decisiones?alert=CRITICO')}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AlertCountCard
            label="Alerta"
            count={summary.alert}
            subtitle="Pedir esta semana"
            icon={<WarningAmberIcon sx={{ fontSize: 36, color: ALERT_COLORS.ALERTA }} />}
            color={ALERT_COLORS.ALERTA}
            onClick={() => navigate('decisiones?alert=ALERTA')}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AlertCountCard
            label="OK"
            count={summary.ok}
            subtitle="Sin acción"
            icon={<CheckCircleOutlineIcon sx={{ fontSize: 36, color: ALERT_COLORS.OK }} />}
            color={ALERT_COLORS.OK}
            onClick={() => navigate('decisiones?alert=OK')}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AlertCountCard
            label="Sin Movimiento"
            count={summary.sinMov}
            subtitle="Revisar inactivación"
            icon={<RemoveCircleOutlineIcon sx={{ fontSize: 36, color: ALERT_COLORS.SIN_MOV }} />}
            color={ALERT_COLORS.SIN_MOV}
            onClick={() => navigate('decisiones?alert=SIN_MOV')}
          />
        </Grid>
      </Grid>

      {/* ── Summary Row ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Resumen de Compra Sugerida
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {summary.totalToOrder} SKUs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Valor estimado: {formatCOP(summary.estimatedValue)}
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                onClick={() => navigate('decisiones')}
              >
                Ver Decisiones de Compra
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Parámetros Actuales
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, mt: 1 }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{summary.parameters.lead_time}m</Typography>
                  <Typography variant="caption" color="text.secondary">Lead Time</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{summary.parameters.service_level}</Typography>
                  <Typography variant="caption" color="text.secondary">Nivel Servicio</Typography>
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{summary.parameters.coverage}m</Typography>
                  <Typography variant="caption" color="text.secondary">Cobertura</Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => navigate('parametros')}
              >
                Ajustar Parámetros
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Quick Actions ── */}
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
        Acciones Rápidas
      </Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Decisiones de Compra"
            description="Ver tabla de decisiones"
            icon={<ListAltIcon sx={{ color: theme.palette.primary.main }} />}
            color={theme.palette.primary.main}
            onClick={() => navigate('decisiones')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Importar Datos"
            description="Subir Excel del ERP"
            icon={<UploadFileIcon sx={{ color: theme.palette.secondary.main }} />}
            color={theme.palette.secondary.main}
            onClick={() => navigate('importar')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Parámetros"
            description="Lead time, nivel servicio"
            icon={<TuneIcon sx={{ color: theme.palette.info.main }} />}
            color={theme.palette.info.main}
            onClick={() => navigate('parametros')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <QuickActionCard
            title="Exportar Excel"
            description="Lista de compra sugerida"
            icon={<FileDownloadIcon sx={{ color: theme.palette.success.main }} />}
            color={theme.palette.success.main}
            onClick={() => {}}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
