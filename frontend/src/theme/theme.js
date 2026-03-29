/**
 * AGP Platform — Premium Theme Configuration
 * Modern, high-contrast design system with Light + Dark modes.
 * Inspired by Linear, Vercel, and Stripe design languages.
 */
import { createTheme, alpha } from '@mui/material/styles';
import { esES } from '@mui/material/locale';

// ══════════════════════════════════════════════════════════════
// COLOR TOKENS
// ══════════════════════════════════════════════════════════════

const PALETTE = {
  // Primary — Vibrant blue
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A5F',
  },
  // Secondary — Warm orange for accents & CTAs
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
  },
  // Semantic
  red:    { light: '#FCA5A5', main: '#EF4444', dark: '#DC2626', bg: '#FEF2F2' },
  amber:  { light: '#FCD34D', main: '#F59E0B', dark: '#D97706', bg: '#FFFBEB' },
  green:  { light: '#86EFAC', main: '#22C55E', dark: '#16A34A', bg: '#F0FDF4' },
  cyan:   { light: '#67E8F9', main: '#06B6D4', dark: '#0891B2', bg: '#ECFEFF' },
  // Neutral — Slate tones
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#0B1120',
  },
};

// ══════════════════════════════════════════════════════════════
// SHARED TYPOGRAPHY
// ══════════════════════════════════════════════════════════════

const typography = {
  fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  // Display — hero/large headings
  h1: { fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em' },
  h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em' },
  h3: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.015em' },
  h4: { fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.01em' },
  h5: { fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.4 },
  h6: { fontSize: '1rem', fontWeight: 700, lineHeight: 1.4 },
  // Body
  subtitle1: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 },
  body1: { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.6 },
  body2: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.55 },
  caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.01em' },
  overline: { fontSize: '0.6875rem', fontWeight: 700, lineHeight: 1.5, letterSpacing: '0.08em', textTransform: 'uppercase' },
  button: { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', letterSpacing: '0.01em' },
};

// ══════════════════════════════════════════════════════════════
// SHARED SHAPE & SHADOWS
// ══════════════════════════════════════════════════════════════

const shape = { borderRadius: 10 };

// Custom shadow scale — softer, more modern than MUI defaults
const lightShadows = [
  'none',
  '0 1px 2px 0 rgba(0,0,0,0.04)',                                          // 1
  '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',        // 2
  '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',     // 3
  '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',   // 4
  '0 20px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04)',  // 5
  ...Array(19).fill('0 25px 50px -12px rgba(0,0,0,0.15)'),                 // 6-24
];

const darkShadows = [
  'none',
  '0 1px 2px 0 rgba(0,0,0,0.3)',
  '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.3)',
  '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3)',
  '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.2)',
  '0 20px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.3)',
  ...Array(19).fill('0 25px 50px -12px rgba(0,0,0,0.6)'),
];

// ══════════════════════════════════════════════════════════════
// COMPONENT BUILDER — generates overrides for a given mode
// ══════════════════════════════════════════════════════════════

function buildComponents(mode) {
  const isDark = mode === 'dark';

  // Contextual tokens
  const bg = isDark ? PALETTE.slate[950] : PALETTE.slate[50];
  const paper = isDark ? PALETTE.slate[800] : '#FFFFFF';
  const paperElevated = isDark ? PALETTE.slate[700] : '#FFFFFF';
  const border = isDark ? alpha('#fff', 0.08) : PALETTE.slate[200];
  const borderHover = isDark ? alpha('#fff', 0.16) : PALETTE.slate[300];
  const primary = isDark ? PALETTE.blue[400] : PALETTE.blue[600];
  const textPrimary = isDark ? PALETTE.slate[50] : PALETTE.slate[900];
  const textSecondary = isDark ? PALETTE.slate[400] : PALETTE.slate[500];

  return {
    // ── CssBaseline ──
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: `${isDark ? alpha('#fff', 0.15) : PALETTE.slate[300]} transparent`,
        },
        '::-webkit-scrollbar': { width: 6, height: 6 },
        '::-webkit-scrollbar-track': { background: 'transparent' },
        '::-webkit-scrollbar-thumb': {
          background: isDark ? alpha('#fff', 0.15) : PALETTE.slate[300],
          borderRadius: 3,
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: isDark ? alpha('#fff', 0.25) : PALETTE.slate[400],
        },
      },
    },

    // ── Buttons ──
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
          fontSize: '0.8125rem',
          transition: 'all 150ms ease',
        },
        sizeSmall: { padding: '5px 12px', fontSize: '0.75rem' },
        sizeLarge: { padding: '11px 24px', fontSize: '0.9375rem' },
        contained: {
          boxShadow: isDark
            ? `0 1px 2px ${alpha('#000', 0.4)}`
            : `0 1px 2px ${alpha(primary, 0.3)}`,
          '&:hover': {
            boxShadow: isDark
              ? `0 2px 8px ${alpha('#000', 0.5)}`
              : `0 4px 12px ${alpha(primary, 0.25)}`,
          },
        },
        outlined: {
          borderColor: border,
          backgroundColor: isDark ? alpha('#fff', 0.02) : '#fff',
          '&:hover': {
            borderColor: borderHover,
            backgroundColor: isDark ? alpha('#fff', 0.05) : PALETTE.slate[50],
          },
        },
        text: {
          '&:hover': {
            backgroundColor: isDark ? alpha('#fff', 0.06) : alpha(primary, 0.06),
          },
        },
      },
    },
    MuiLoadingButton: {
      defaultProps: { disableElevation: true },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 150ms ease',
          '&:hover': {
            backgroundColor: isDark ? alpha('#fff', 0.08) : alpha(PALETTE.slate[900], 0.05),
          },
        },
      },
    },

    // ── Cards ──
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          borderRadius: 12,
          borderColor: border,
          backgroundColor: paper,
          backgroundImage: 'none',
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
      },
    },

    // ── Paper ──
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: border },
      },
    },

    // ── Chips ──
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
          borderRadius: 6,
          height: 26,
        },
        sizeSmall: { height: 22, fontSize: '0.6875rem' },
        filled: { border: 'none' },
        outlined: { borderWidth: 1.5 },
        colorSuccess: {
          ...(isDark
            ? { backgroundColor: alpha(PALETTE.green.main, 0.15), color: PALETTE.green.light }
            : { backgroundColor: PALETTE.green.bg, color: PALETTE.green.dark }),
        },
        colorError: {
          ...(isDark
            ? { backgroundColor: alpha(PALETTE.red.main, 0.15), color: PALETTE.red.light }
            : { backgroundColor: PALETTE.red.bg, color: PALETTE.red.dark }),
        },
        colorWarning: {
          ...(isDark
            ? { backgroundColor: alpha(PALETTE.amber.main, 0.15), color: PALETTE.amber.light }
            : { backgroundColor: PALETTE.amber.bg, color: PALETTE.amber.dark }),
        },
        colorInfo: {
          ...(isDark
            ? { backgroundColor: alpha(PALETTE.cyan.main, 0.15), color: PALETTE.cyan.light }
            : { backgroundColor: PALETTE.cyan.bg, color: PALETTE.cyan.dark }),
        },
      },
    },

    // ── TextField & Inputs ──
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small', fullWidth: true },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontSize: '0.875rem',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: border,
            transition: 'border-color 150ms ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: borderHover,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: primary,
            borderWidth: 1.5,
            boxShadow: `0 0 0 3px ${alpha(primary, isDark ? 0.15 : 0.1)}`,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
      },
    },

    // ── Select ──
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? '0 10px 40px rgba(0,0,0,0.5)'
            : '0 10px 40px rgba(0,0,0,0.08)',
          marginTop: 4,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          borderRadius: 6,
          margin: '2px 6px',
          padding: '8px 12px',
          transition: 'background-color 120ms ease',
          '&:hover': {
            backgroundColor: isDark ? alpha('#fff', 0.06) : PALETTE.slate[50],
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? alpha(primary, 0.12) : alpha(primary, 0.08),
            '&:hover': {
              backgroundColor: isDark ? alpha(primary, 0.18) : alpha(primary, 0.12),
            },
          },
        },
      },
    },

    // ── Dialog ──
    MuiDialog: {
      defaultProps: { fullWidth: true },
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${border}`,
          backgroundImage: 'none',
          boxShadow: isDark
            ? '0 24px 48px rgba(0,0,0,0.6)'
            : '0 24px 48px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontSize: '1.125rem', fontWeight: 700, padding: '20px 24px 8px' },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: { padding: '12px 24px' },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: { padding: '12px 24px 20px', gap: 8 },
      },
    },

    // ── Tabs ──
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: {
          height: 2.5,
          borderRadius: '2px 2px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          minHeight: 44,
          padding: '10px 16px',
          color: textSecondary,
          transition: 'color 150ms ease',
          '&.Mui-selected': { color: primary },
        },
      },
    },

    // ── Table & DataGrid ──
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 700,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: textSecondary,
            backgroundColor: isDark ? PALETTE.slate[900] : PALETTE.slate[50],
            borderBottom: `1px solid ${border}`,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          borderColor: border,
          padding: '12px 16px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 120ms ease',
          '&:hover': {
            backgroundColor: isDark ? alpha('#fff', 0.03) : PALETTE.slate[50],
          },
        },
      },
    },

    // ── Tooltip ──
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? PALETTE.slate[700] : PALETTE.slate[800],
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: 6,
          padding: '6px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        arrow: {
          color: isDark ? PALETTE.slate[700] : PALETTE.slate[800],
        },
      },
    },

    // ── Alert ──
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10, fontSize: '0.8125rem', fontWeight: 500 },
        standardSuccess: {
          backgroundColor: isDark ? alpha(PALETTE.green.main, 0.1) : PALETTE.green.bg,
          color: isDark ? PALETTE.green.light : PALETTE.green.dark,
        },
        standardError: {
          backgroundColor: isDark ? alpha(PALETTE.red.main, 0.1) : PALETTE.red.bg,
          color: isDark ? PALETTE.red.light : PALETTE.red.dark,
        },
        standardWarning: {
          backgroundColor: isDark ? alpha(PALETTE.amber.main, 0.1) : PALETTE.amber.bg,
          color: isDark ? PALETTE.amber.light : PALETTE.amber.dark,
        },
        standardInfo: {
          backgroundColor: isDark ? alpha(PALETTE.cyan.main, 0.1) : PALETTE.cyan.bg,
          color: isDark ? PALETTE.cyan.light : PALETTE.cyan.dark,
        },
        filled: { fontWeight: 600 },
      },
    },

    // ── Snackbar ──
    MuiSnackbar: {
      styleOverrides: {
        root: {
          '& .MuiAlert-filled': { borderRadius: 10 },
        },
      },
    },

    // ── LinearProgress ──
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, height: 6 },
        bar: { borderRadius: 4 },
      },
    },

    // ── Skeleton ──
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },

    // ── Breadcrumbs ──
    MuiBreadcrumbs: {
      styleOverrides: {
        root: { fontSize: '0.8125rem' },
        separator: { color: textSecondary },
      },
    },

    // ── Badge ──
    MuiBadge: {
      styleOverrides: {
        standard: { fontWeight: 700, fontSize: '0.6875rem' },
      },
    },

    // ── Divider ──
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: border },
      },
    },

    // ── Drawer ──
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: 'none' },
      },
    },

    // ── AppBar ──
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
          backgroundColor: isDark ? alpha(PALETTE.slate[950], 0.8) : alpha('#fff', 0.85),
        },
      },
    },

    // ── Avatar ──
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '0.875rem' },
      },
    },

    // ── ToggleButton ──
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: { borderRadius: 8, border: `1px solid ${border}` },
        grouped: {
          border: 'none',
          borderRadius: '8px !important',
          margin: 2,
          padding: '6px 14px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          '&.Mui-selected': {
            backgroundColor: isDark ? alpha(primary, 0.15) : alpha(primary, 0.1),
            color: primary,
            '&:hover': {
              backgroundColor: isDark ? alpha(primary, 0.2) : alpha(primary, 0.15),
            },
          },
        },
      },
    },

    // ── Slider ──
    MuiSlider: {
      styleOverrides: {
        root: { height: 6 },
        thumb: { width: 16, height: 16, boxShadow: `0 2px 6px ${alpha('#000', 0.15)}` },
        track: { borderRadius: 3, border: 'none' },
        rail: {
          borderRadius: 3,
          backgroundColor: isDark ? PALETTE.slate[600] : PALETTE.slate[200],
        },
      },
    },

    // ── Autocomplete ──
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? '0 10px 40px rgba(0,0,0,0.5)'
            : '0 10px 40px rgba(0,0,0,0.08)',
        },
      },
    },

    // ── List ──
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 150ms ease',
        },
      },
    },

    // ── DataGrid (MUI X) ──
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          borderRadius: 12,
          fontSize: '0.8125rem',
          overflow: 'hidden',
          boxShadow: isDark
            ? `0 0 0 1px ${alpha('#fff', 0.06)}`
            : `0 0 0 1px ${PALETTE.slate[200]}`,
          '& .MuiDataGrid-withBorderColor': {
            borderColor: isDark ? alpha('#fff', 0.06) : PALETTE.slate[100],
          },
        },
        columnHeaders: {
          backgroundColor: PALETTE.slate[900],
          borderBottom: 'none',
          // Force bg on every nested element in the header
          '& .MuiDataGrid-row--borderBottom': {
            backgroundColor: PALETTE.slate[900],
          },
        },
        columnHeader: {
          backgroundColor: PALETTE.slate[900],
          '&:focus, &:focus-within': {
            outline: 'none',
          },
        },
        columnHeaderTitle: {
          fontWeight: 700,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: alpha('#fff', 0.85),
        },
        // Checkbox & sort icons in header — white tones on dark bg
        columnHeaderCheckbox: {
          '& .MuiCheckbox-root': {
            color: alpha('#fff', 0.5),
            '&.Mui-checked, &.MuiCheckbox-indeterminate': {
              color: PALETTE.blue[300],
            },
          },
        },
        sortIcon: {
          color: alpha('#fff', 0.7),
        },
        menuIconButton: {
          color: alpha('#fff', 0.7),
        },
        iconSeparator: {
          color: alpha('#fff', 0.15),
        },
        cell: {
          borderColor: isDark ? alpha('#fff', 0.06) : PALETTE.slate[100],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          lineHeight: 1.4,
          '&:focus, &:focus-within': {
            outline: 'none',
          },
        },
        row: {
          transition: 'background-color 120ms ease',
          '&:hover': {
            backgroundColor: isDark ? alpha('#fff', 0.03) : PALETTE.blue[50],
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? alpha(primary, 0.1) : alpha(PALETTE.blue[600], 0.06),
            '&:hover': {
              backgroundColor: isDark ? alpha(primary, 0.15) : alpha(PALETTE.blue[600], 0.1),
            },
          },
        },
        footerContainer: {
          backgroundColor: PALETTE.slate[900],
          borderTop: 'none',
          minHeight: 44,
          color: alpha('#fff', 0.85),
          // All text, icons, and controls inside footer → white
          '& .MuiTablePagination-root': {
            color: alpha('#fff', 0.85),
          },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            color: alpha('#fff', 0.7),
            fontSize: '0.75rem',
            fontWeight: 500,
          },
          '& .MuiTablePagination-select': {
            color: '#fff',
          },
          '& .MuiSelect-icon': {
            color: alpha('#fff', 0.6),
          },
          '& .MuiIconButton-root': {
            color: alpha('#fff', 0.7),
            '&.Mui-disabled': {
              color: alpha('#fff', 0.25),
            },
          },
          '& .MuiDataGrid-selectedRowCount': {
            color: alpha('#fff', 0.7),
            fontWeight: 600,
            fontSize: '0.75rem',
          },
        },
        toolbarContainer: {
          borderBottom: `1px solid ${border}`,
          padding: '8px 12px',
        },
        overlay: {
          backgroundColor: isDark ? alpha(PALETTE.slate[950], 0.6) : alpha('#fff', 0.7),
        },
      },
    },
  };
}

// ══════════════════════════════════════════════════════════════
// LIGHT THEME
// ══════════════════════════════════════════════════════════════

export const lightTheme = createTheme(
  {
    palette: {
      mode: 'light',
      primary:    { main: PALETTE.blue[600], dark: PALETTE.blue[700], light: PALETTE.blue[400], contrastText: '#fff' },
      secondary:  { main: PALETTE.orange[500], dark: PALETTE.orange[600], light: PALETTE.orange[400], contrastText: '#fff' },
      error:      { main: PALETTE.red.main, dark: PALETTE.red.dark, light: PALETTE.red.light },
      warning:    { main: PALETTE.amber.main, dark: PALETTE.amber.dark, light: PALETTE.amber.light },
      success:    { main: PALETTE.green.main, dark: PALETTE.green.dark, light: PALETTE.green.light },
      info:       { main: PALETTE.cyan.main, dark: PALETTE.cyan.dark, light: PALETTE.cyan.light },
      text: {
        primary: PALETTE.slate[900],
        secondary: PALETTE.slate[500],
        disabled: PALETTE.slate[400],
      },
      background: {
        default: PALETTE.slate[50],
        paper: '#FFFFFF',
      },
      divider: PALETTE.slate[200],
      action: {
        hover: alpha(PALETTE.slate[900], 0.04),
        selected: alpha(PALETTE.blue[600], 0.08),
        focus: alpha(PALETTE.blue[600], 0.12),
      },
    },
    typography,
    shape,
    shadows: lightShadows,
    components: buildComponents('light'),
  },
  esES,
);

// ══════════════════════════════════════════════════════════════
// DARK THEME
// ══════════════════════════════════════════════════════════════

export const darkTheme = createTheme(
  {
    palette: {
      mode: 'dark',
      primary:    { main: PALETTE.blue[400], dark: PALETTE.blue[500], light: PALETTE.blue[300], contrastText: '#fff' },
      secondary:  { main: PALETTE.orange[400], dark: PALETTE.orange[500], light: PALETTE.orange[300], contrastText: '#fff' },
      error:      { main: PALETTE.red.main, dark: PALETTE.red.dark, light: PALETTE.red.light },
      warning:    { main: PALETTE.amber.main, dark: PALETTE.amber.dark, light: PALETTE.amber.light },
      success:    { main: PALETTE.green.main, dark: PALETTE.green.dark, light: PALETTE.green.light },
      info:       { main: PALETTE.cyan.main, dark: PALETTE.cyan.dark, light: PALETTE.cyan.light },
      text: {
        primary: PALETTE.slate[50],
        secondary: PALETTE.slate[400],
        disabled: PALETTE.slate[600],
      },
      background: {
        default: PALETTE.slate[950],
        paper: PALETTE.slate[800],
      },
      divider: alpha('#fff', 0.08),
      action: {
        hover: alpha('#fff', 0.05),
        selected: alpha(PALETTE.blue[400], 0.12),
        focus: alpha(PALETTE.blue[400], 0.16),
      },
    },
    typography,
    shape,
    shadows: darkShadows,
    components: buildComponents('dark'),
  },
  esES,
);

// ── Export palette tokens for direct use in components ──
export { PALETTE };
