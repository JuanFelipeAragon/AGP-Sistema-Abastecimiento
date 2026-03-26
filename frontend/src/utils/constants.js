/**
 * Application constants
 */

// Alert statuses for supply module
export const ALERT_STATUS = {
  CRITICO: 'CRITICO',
  ALERTA: 'ALERTA',
  OK: 'OK',
  SIN_MOV: 'SIN_MOV',
};

// Alert colors for charts — matches theme semantic palette
export const ALERT_COLORS = {
  CRITICO: '#EF4444',
  ALERTA: '#F59E0B',
  OK: '#22C55E',
  SIN_MOV: '#94A3B8',
};

// ABC classification
export const ABC_CLASSES = ['A', 'B', 'C'];

// Service level options
export const SERVICE_LEVELS = [
  { value: 1.28, label: '90%' },
  { value: 1.65, label: '95%' },
  { value: 2.05, label: '99%' },
];

// Default supply parameters
export const DEFAULT_SUPPLY_PARAMS = {
  lead_time_months: 4,
  service_level_z: 1.65,
  coverage_months: 6,
};

// Date format
export const DATE_FORMAT = 'DD/MM/YYYY';
