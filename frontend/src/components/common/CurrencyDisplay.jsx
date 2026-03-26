import { Typography } from '@mui/material';

export const formatCOP = (amount) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function CurrencyDisplay({ amount, variant = 'body2', ...props }) {
  return (
    <Typography variant={variant} sx={{ fontVariantNumeric: 'tabular-nums' }} {...props}>
      {formatCOP(amount)}
    </Typography>
  );
}
