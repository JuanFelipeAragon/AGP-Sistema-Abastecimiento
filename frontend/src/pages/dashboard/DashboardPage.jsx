/**
 * Dashboard Page — Main executive summary with KPI cards and charts
 * Shows supply status at a glance with mock data for MVP.
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography,
  Chip, LinearProgress, IconButton, Tooltip, useTheme, alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InventoryIcon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../../components/common/PageHeader';
import PageSkeleton from '../../components/common/PageSkeleton';
import { formatCOP } from '../../utils/formatters';
import { ALERT_COLORS } from '../../utils/constants';

// ── KPI Card Component ──
function KpiCard({ title, value, subtitle, icon, color, trend, trendLabel, onClick }) {
  const theme = useTheme();
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: theme.shadows[4] } : {},
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5, color: color || 'text.primary' }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(color || theme.palette.primary.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        {trend !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, gap: 0.5 }}>
            {trend >= 0 ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
            )}
            <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'} fontWeight={600}>
              {trend >= 0 ? '+' : ''}{trend}%
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {trendLabel || 'vs mes anterior'}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Alert Summary Card ──
function AlertSummaryCard({ criticalCount, alertCount, okCount, sinMovCount }) {
  const total = criticalCount + alertCount + okCount + sinMovCount;
  const items = [
    { label: 'Crítico', count: criticalCount, color: ALERT_COLORS.CRITICO, desc: 'Pedir YA' },
    { label: 'Alerta', count: alertCount, color: ALERT_COLORS.ALERTA, desc: 'Pedir esta semana' },
    { label: 'OK', count: okCount, color: ALERT_COLORS.OK, desc: 'Sin acción' },
    { label: 'Sin Mov.', count: sinMovCount, color: ALERT_COLORS.SIN_MOV, desc: 'Revisar inactivación' },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Estado de Alertas
        </Typography>
        {items.map((item) => (
          <Box key={item.label} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                <Typography variant="body2" fontWeight={500}>{item.label}</Typography>
                <Typography variant="caption" color="text.secondary">({item.desc})</Typography>
              </Box>
              <Typography variant="body2" fontWeight="bold">{item.count}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={total > 0 ? (item.count / total) * 100 : 0}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 3 },
              }}
            />
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total referencias activas</Typography>
          <Typography variant="body2" fontWeight="bold">{total}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Top Critical SKUs Table ──
function TopCriticalTable({ skus }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Top SKUs Críticos
        </Typography>
        {skus.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No hay SKUs críticos
          </Typography>
        ) : (
          <Box>
            {skus.map((sku, i) => (
              <Box
                key={sku.reference}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1.5,
                  borderBottom: i < skus.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>{sku.reference}</Typography>
                  <Typography variant="caption" color="text.secondary">{sku.description}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip
                    size="small"
                    label={`Stock: ${sku.stock}`}
                    color="error"
                    variant="outlined"
                    sx={{ mb: 0.5 }}
                  />
                  <Typography variant="caption" display="block" color="text.secondary">
                    ROP: {sku.rop}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ── Recent Activity ──
function RecentActivity({ activities }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Actividad Reciente
        </Typography>
        {activities.map((act, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              gap: 1.5,
              py: 1.5,
              borderBottom: i < activities.length - 1 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <Box sx={{
              width: 32, height: 32, borderRadius: 1,
              bgcolor: alpha(act.color, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {act.icon}
            </Box>
            <Box>
              <Typography variant="body2">{act.text}</Typography>
              <Typography variant="caption" color="text.secondary">{act.time}</Typography>
            </Box>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// Main Dashboard Page
// ══════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);

  // Mock data — will be replaced with API calls
  const [dashData, setDashData] = useState(null);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setDashData({
        totalSkus: 1247,
        critical: 23,
        alert: 67,
        ok: 1089,
        sinMov: 68,
        totalTransitValue: 2450000000,
        totalStockValue: 8750000000,
        pendingOrders: 12,
        topCritical: [
          { reference: 'ALU-6063-T5-100', description: 'Perfil estructural 100x50', stock: 12, rop: 180 },
          { reference: 'ALU-6061-T6-050', description: 'Ángulo 50x50x3mm', stock: 5, rop: 120 },
          { reference: 'ALU-6063-T5-075', description: 'Tubo redondo 75mm', stock: 0, rop: 95 },
          { reference: 'ALU-6060-T5-040', description: 'Perfil U 40x25', stock: 8, rop: 200 },
          { reference: 'ALU-6063-T5-060', description: 'Barra plana 60x3', stock: 3, rop: 150 },
        ],
        recentActivity: [
          { text: 'Se importó maestro de ítems (1,247 referencias)', time: 'Hace 2 horas', icon: <InventoryIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />, color: theme.palette.primary.main },
          { text: '23 SKUs pasaron a estado CRÍTICO', time: 'Hace 2 horas', icon: <ErrorOutlineIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />, color: theme.palette.error.main },
          { text: 'Orden de importación #IMP-2024-089 llegó a bodega', time: 'Hace 5 horas', icon: <LocalShippingIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />, color: theme.palette.success.main },
          { text: 'Se recalcularon parámetros (lead time: 4 meses)', time: 'Ayer', icon: <CheckCircleOutlineIcon sx={{ fontSize: 16, color: theme.palette.info.main }} />, color: theme.palette.info.main },
        ],
      });
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [theme]);

  // ── Loading Skeleton ──
  if (loading) return <PageSkeleton variant="dashboard" />;

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen ejecutivo del sistema de abastecimiento"
        actions={[
          {
            label: 'Actualizar',
            icon: <RefreshIcon />,
            variant: 'outlined',
            onClick: () => { setLoading(true); setTimeout(() => setLoading(false), 800); },
          },
        ]}
      />

      {/* ── KPI Cards ── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="SKUs Críticos"
            value={dashData.critical}
            subtitle="Pedir inmediatamente"
            icon={<ErrorOutlineIcon sx={{ color: theme.palette.error.main }} />}
            color={theme.palette.error.main}
            onClick={() => navigate('/platform/abastecimiento?alert=CRITICO')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="SKUs en Alerta"
            value={dashData.alert}
            subtitle="Pedir esta semana"
            icon={<WarningAmberIcon sx={{ color: theme.palette.warning.main }} />}
            color={theme.palette.warning.main}
            onClick={() => navigate('/platform/abastecimiento?alert=ALERTA')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Valor en Tránsito"
            value={formatCOP(dashData.totalTransitValue)}
            subtitle={`${dashData.pendingOrders} órdenes activas`}
            icon={<LocalShippingIcon sx={{ color: theme.palette.info.main }} />}
            color={theme.palette.info.main}
            trend={8.2}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard
            title="Valor en Stock"
            value={formatCOP(dashData.totalStockValue)}
            subtitle={`${dashData.totalSkus} referencias activas`}
            icon={<AttachMoneyIcon sx={{ color: theme.palette.success.main }} />}
            color={theme.palette.success.main}
            trend={-2.5}
          />
        </Grid>
      </Grid>

      {/* ── Main Content Grid ── */}
      <Grid container spacing={3}>
        {/* Left: Alert Summary + Top Critical */}
        <Grid size={{ xs: 12, md: 5 }}>
          <AlertSummaryCard
            criticalCount={dashData.critical}
            alertCount={dashData.alert}
            okCount={dashData.ok}
            sinMovCount={dashData.sinMov}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <TopCriticalTable skus={dashData.topCritical} />
        </Grid>

        {/* Full width: Recent Activity */}
        <Grid size={{ xs: 12 }}>
          <RecentActivity activities={dashData.recentActivity} />
        </Grid>
      </Grid>
    </Box>
  );
}
