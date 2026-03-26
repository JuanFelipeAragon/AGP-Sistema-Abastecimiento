import { Chip } from '@mui/material';

const STATUS_CONFIG = {
  activo:      { color: 'success', label: 'Activo' },
  inactivo:    { color: 'default', label: 'Inactivo' },
  pendiente:   { color: 'warning', label: 'Pendiente' },
  completado:  { color: 'success', label: 'Completado' },
  cancelado:   { color: 'error',   label: 'Cancelado' },
  borrador:    { color: 'default', label: 'Borrador' },
  en_proceso:  { color: 'info',    label: 'En Proceso' },
  pagado:      { color: 'success', label: 'Pagado' },
  vencido:     { color: 'error',   label: 'Vencido' },
  sin_stock:   { color: 'error',   label: 'Sin Stock' },
  stock_bajo:  { color: 'warning', label: 'Stock Bajo' },
  enviado:     { color: 'info',    label: 'Enviado' },
  entregado:   { color: 'success', label: 'Entregado' },
  devuelto:    { color: 'error',   label: 'Devuelto' },
  aprobado:    { color: 'success', label: 'Aprobado' },
  rechazado:   { color: 'error',   label: 'Rechazado' },
  // Supply-specific
  CRITICO:     { color: 'error',   label: 'Crítico' },
  ALERTA:      { color: 'warning', label: 'Alerta' },
  OK:          { color: 'success', label: 'OK' },
  SIN_MOV:     { color: 'default', label: 'Sin Movimiento' },
};

export default function StatusChip({ status, size = 'small' }) {
  const config = STATUS_CONFIG[status] || { color: 'default', label: status };
  return <Chip size={size} color={config.color} label={config.label} />;
}
