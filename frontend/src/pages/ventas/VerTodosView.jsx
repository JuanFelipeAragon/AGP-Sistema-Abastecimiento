/**
 * Ventas — Ver Todos Dashboard
 * KPI strip + 3 preview panels: recent invoices, top clients, top salespeople.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Stack, Paper, Typography, Skeleton, Divider,
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Fade,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PeopleIcon from '@mui/icons-material/People';
import ScaleIcon from '@mui/icons-material/Scale';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorefrontIcon from '@mui/icons-material/Storefront';
import BadgeIcon from '@mui/icons-material/Badge';
import salesApi from '../../api/sales.api';
import { formatCOP, formatDate, formatNumber } from '../../utils/formatters';

// ── KPI Card ──
function KpiCard({ value, label, color, bgColor, icon, delay = 0, loading }) {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={36} height={36} />
          <Box><Skeleton width={50} height={28} /><Skeleton width={80} height={14} /></Box>
        </Stack>
      </Paper>
    );
  }
  return (
    <Fade in timeout={400 + delay}>
      <Paper
        variant="outlined"
        sx={{
          px: 2, py: 1.5, borderRadius: 1.5, minWidth: 110, flex: 1,
          borderLeft: `3px solid ${color}`,
          transition: 'transform 0.15s, box-shadow 0.15s',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1, display: 'flex',
            alignItems: 'center', justifyContent: 'center', bgcolor: bgColor, flexShrink: 0,
          }}>
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color }}>
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        </Stack>
      </Paper>
    </Fade>
  );
}

// ── Section header ──
function SectionHeader({ title, subtitle, onClick, linkLabel = 'Ver todo' }) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
      {onClick && (
        <Typography
          variant="caption"
          color="primary"
          sx={{ cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}
          onClick={onClick}
        >
          {linkLabel} →
        </Typography>
      )}
    </Stack>
  );
}

export default function VerTodosView() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [topSalespeople, setTopSalespeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sumRes, salesRes, custRes, spRes] = await Promise.all([
          salesApi.getSummary(),
          salesApi.getSales({ page: 1, page_size: 5, sort_field: 'invoiceDate', sort_order: 'desc' }),
          salesApi.getCustomers({ sort_field: 'totalNetCop', sort_order: 'desc' }),
          salesApi.getSalespeople({ sort_field: 'totalNetCop', sort_order: 'desc' }),
        ]);
        setSummary(sumRes);
        setRecentSales(salesRes.items || []);
        setTopCustomers((custRes.items || []).slice(0, 5));
        setTopSalespeople((spRes.items || []).slice(0, 5));
      } catch (err) {
        console.error('VerTodosView load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Gracefully handle both old (totalNetCop) and new (subtotalCop) response shapes
  const copVal = summary?.subtotalCop || summary?.totalNetCop || 0;
  const usdVal = summary?.subtotalUsd || summary?.totalNetUsd || 0;

  const kpis = [
    {
      value: loading ? '—' : formatNumber(summary?.totalQuantity),
      label: 'Unidades Vendidas',
      color: '#1565C0',
      bgColor: '#E3F2FD',
      icon: <ReceiptLongIcon sx={{ fontSize: 20, color: '#1565C0' }} />,
      delay: 0,
    },
    {
      value: loading ? '—' : `${formatNumber(summary?.totalWeightTon, 1)} t`,
      label: 'Peso Vendido',
      color: '#E65100',
      bgColor: '#FFF3E0',
      icon: <ScaleIcon sx={{ fontSize: 20, color: '#E65100' }} />,
      delay: 50,
    },
    {
      value: loading ? '—' : formatCOP(copVal),
      label: 'Subtotal COP',
      color: '#2E7D32',
      bgColor: '#E8F5E9',
      icon: <AttachMoneyIcon sx={{ fontSize: 20, color: '#2E7D32' }} />,
      delay: 100,
    },
    {
      value: loading ? '—' : `$${formatNumber(usdVal, 0)}`,
      label: 'Subtotal USD',
      color: '#1B5E20',
      bgColor: '#F1F8E9',
      icon: <TrendingUpIcon sx={{ fontSize: 20, color: '#1B5E20' }} />,
      delay: 150,
    },
    {
      value: loading ? '—' : formatNumber(summary?.uniqueCustomers),
      label: 'Clientes',
      color: '#6A1B9A',
      bgColor: '#F3E5F5',
      icon: <PeopleIcon sx={{ fontSize: 20, color: '#6A1B9A' }} />,
      delay: 200,
    },
    {
      value: loading ? '—' : formatNumber(summary?.uniqueReferences),
      label: 'Referencias',
      color: '#00695C',
      bgColor: '#E0F2F1',
      icon: <StorefrontIcon sx={{ fontSize: 20, color: '#00695C' }} />,
      delay: 250,
    },
  ];

  return (
    <Box>
      {/* KPI Strip */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
        {kpis.map((kpi, i) => (
          <KpiCard key={i} {...kpi} loading={loading} />
        ))}
      </Stack>

      {/* Three preview panels */}
      <Stack spacing={2}>
        {/* Recent invoices */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <SectionHeader
            title="Últimas Facturas"
            subtitle="5 facturas más recientes"
            onClick={() => navigate('/platform/ventas/facturacion')}
          />
          <Divider sx={{ mb: 1.5 }} />
          {loading ? (
            <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} height={36} />)}</Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Factura</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Referencia</TableCell>
                  <TableCell align="right">Neto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSales.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell>{s.invoiceNumber || '—'}</TableCell>
                    <TableCell>{formatDate(s.invoiceDate)}</TableCell>
                    <TableCell sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.customerName || '—'}
                    </TableCell>
                    <TableCell>{s.referenceSiesa}</TableCell>
                    <TableCell align="right">
                      {s.currency === 'USD'
                        ? `$${formatNumber(s.netTotal, 2)} USD`
                        : formatCOP(s.netTotal)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentSales.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">Sin datos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          {/* Top clients */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
            <SectionHeader
              title="Top Clientes"
              subtitle="Por valor neto COP"
              icon={<PeopleIcon />}
              onClick={() => navigate('/platform/ventas/clientes')}
            />
            <Divider sx={{ mb: 1.5 }} />
            {loading ? (
              <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} height={36} />)}</Stack>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell align="right">Facturas</TableCell>
                    <TableCell align="right">Neto COP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topCustomers.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </TableCell>
                      <TableCell align="right">{formatNumber(c.totalSales)}</TableCell>
                      <TableCell align="right">{formatCOP(c.totalNetCop)}</TableCell>
                    </TableRow>
                  ))}
                  {topCustomers.length === 0 && (
                    <TableRow><TableCell colSpan={3} align="center">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Paper>

          {/* Top salespeople */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1 }}>
            <SectionHeader
              title="Vendedores"
              subtitle="Por valor neto COP"
              onClick={() => navigate('/platform/ventas/vendedores')}
            />
            <Divider sx={{ mb: 1.5 }} />
            {loading ? (
              <Stack spacing={1}>{[...Array(5)].map((_, i) => <Skeleton key={i} height={36} />)}</Stack>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Vendedor</TableCell>
                    <TableCell align="right">Facturas</TableCell>
                    <TableCell align="right">Neto COP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topSalespeople.map((sp) => (
                    <TableRow key={sp.id} hover>
                      <TableCell>{sp.name}</TableCell>
                      <TableCell align="right">{formatNumber(sp.totalSales)}</TableCell>
                      <TableCell align="right">{formatCOP(sp.totalNetCop)}</TableCell>
                    </TableRow>
                  ))}
                  {topSalespeople.length === 0 && (
                    <TableRow><TableCell colSpan={3} align="center">Sin datos</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Stack>
      </Stack>
    </Box>
  );
}
