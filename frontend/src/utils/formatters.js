/**
 * Formatting utilities
 */
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

export const formatCOP = (amount) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const formatNumber = (num, decimals = 0) =>
  new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num || 0);

export const formatDate = (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '—');

export const formatDateTime = (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '—');

export const formatPercent = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format((value || 0) / 100);
