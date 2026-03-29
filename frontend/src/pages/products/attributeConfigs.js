/**
 * Attribute Config Registry — defines per-dimension UI configuration
 * for the generic AttributeManager component.
 *
 * Each config defines: columns, KPIs, filter groups, form fields, CSV headers.
 * Dimensions not listed here get a default generic config.
 */
import ColorLensIcon from '@mui/icons-material/ColorLens';
import PaletteIcon from '@mui/icons-material/Palette';
import OpacityIcon from '@mui/icons-material/Opacity';
import TextureIcon from '@mui/icons-material/Texture';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CategoryIcon from '@mui/icons-material/Category';
import PendingIcon from '@mui/icons-material/Pending';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ScienceIcon from '@mui/icons-material/Science';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import StraightenIcon from '@mui/icons-material/Straighten';
import LayersIcon from '@mui/icons-material/Layers';
import SpeedIcon from '@mui/icons-material/Speed';
import VerifiedIcon from '@mui/icons-material/Verified';
import PublicIcon from '@mui/icons-material/Public';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

// ══════════════════════════════════════════════════════════════
// Acabado-specific constants (mirrors AcabadosTab)
// ══════════════════════════════════════════════════════════════

const ACABADO_TIPO_OPTIONS = [
  { value: 'anodizado', label: 'Anodizado', color: '#E3F2FD', textColor: '#1565C0' },
  { value: 'pintura', label: 'Pintura', color: '#FFF3E0', textColor: '#E65100' },
  { value: 'mill_finish', label: 'Mill Finish', color: '#E8F5E9', textColor: '#2E7D32' },
  { value: 'sublimado', label: 'Sublimado', color: '#F3E5F5', textColor: '#7B1FA2' },
  { value: 'otro', label: 'Otro', color: '#ECEFF1', textColor: '#546E7A' },
];

// ══════════════════════════════════════════════════════════════
// Shared helpers
// ══════════════════════════════════════════════════════════════

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo', color: '#E8F5E9', textColor: '#2E7D32' },
  { value: 'inactive', label: 'Inactivo', color: '#FFEBEE', textColor: '#C62828' },
];

const ENRICHMENT_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente', color: '#FFEBEE', textColor: '#C62828' },
  { value: 'parcial', label: 'Parcial', color: '#FFF8E1', textColor: '#F57F17' },
  { value: 'completo', label: 'Completo', color: '#E8F5E9', textColor: '#2E7D32' },
];

// ══════════════════════════════════════════════════════════════
// Config per dimension
// ══════════════════════════════════════════════════════════════

const ATTRIBUTE_CONFIGS = {
  /**
   * ACABADO — special: uses dedicated acabados API & table.
   * This config is used by AttributeManager in mode="acabado".
   */
  acabado: {
    label: 'Acabados',
    labelSingular: 'Acabado',
    icon: PaletteIcon,
    mode: 'acabado', // signals to use acabados API
    extraFilterGroups: [
      {
        label: 'Tipo',
        key: 'filterTipo',
        options: ACABADO_TIPO_OPTIONS,
      },
    ],
    kpis: [
      { key: 'total', label: 'Total', color: '#334155', bgColor: '#F1F5F9', Icon: CategoryIcon },
      { key: 'anodizado', label: 'Anodizado', color: '#1565C0', bgColor: '#E3F2FD', Icon: ColorLensIcon },
      { key: 'pintura', label: 'Pintura', color: '#E65100', bgColor: '#FFF3E0', Icon: PaletteIcon },
      { key: 'millFinish', label: 'Mill Finish', color: '#2E7D32', bgColor: '#E8F5E9', Icon: OpacityIcon },
      { key: 'sublimado', label: 'Sublimado', color: '#7B1FA2', bgColor: '#F3E5F5', Icon: TextureIcon },
      { key: 'pendientes', label: 'Sin Completar', color: '#C62828', bgColor: '#FFEBEE', Icon: PendingIcon },
      { key: 'completo', label: 'Ficha Completa', color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
    ],
    // Acabado columns match existing AcabadosTab exactly
    extraColumns: [
      { field: 'tipoAcabado', headerName: 'Tipo', flex: 1, minWidth: 100, chipField: true,
        getStyle: (val) => ACABADO_TIPO_OPTIONS.find((t) => t.value === val) || { label: val || 'Sin tipo', color: '#ECEFF1', textColor: '#9E9E9E' },
      },
      { field: 'familia', headerName: 'Familia', flex: 1, minWidth: 100 },
      { field: 'colorBase', headerName: 'Color', flex: 0.7, minWidth: 80 },
    ],
    formFields: [
      { key: 'tipoAcabado', label: 'Tipo Acabado', type: 'select', options: ACABADO_TIPO_OPTIONS },
      { key: 'familia', label: 'Familia', type: 'text' },
      { key: 'colorBase', label: 'Color Base', type: 'text' },
    ],
    csvExtraHeaders: ['Tipo', 'Familia', 'Color'],
    csvExtraFields: (r) => [r.tipoAcabado || '', r.familia || '', r.colorBase || ''],
  },

  /**
   * TEMPLE — generic attribute
   */
  temple: {
    label: 'Temples',
    labelSingular: 'Temple',
    icon: ThermostatIcon,
    mode: 'generic',
    kpis: [
      { key: 'total', label: 'Total', color: '#334155', bgColor: '#F1F5F9', Icon: ThermostatIcon },
      { key: 'active', label: 'Activos', color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
      { key: 'pendientes', label: 'Sin Completar', color: '#C62828', bgColor: '#FFEBEE', Icon: PendingIcon },
    ],
    extraColumns: [],
    formFields: [],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  },

  /**
   * ALEACION — generic attribute
   */
  aleacion: {
    label: 'Aleaciones',
    labelSingular: 'Aleacion',
    icon: ScienceIcon,
    mode: 'generic',
    kpis: [
      { key: 'total', label: 'Total', color: '#334155', bgColor: '#F1F5F9', Icon: ScienceIcon },
      { key: 'active', label: 'Activos', color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
      { key: 'pendientes', label: 'Sin Completar', color: '#C62828', bgColor: '#FFEBEE', Icon: PendingIcon },
    ],
    extraColumns: [],
    formFields: [],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  },

  /**
   * LONGITUD — generic attribute
   */
  longitud: {
    label: 'Longitudes',
    labelSingular: 'Longitud',
    icon: StraightenIcon,
    mode: 'generic',
    kpis: [
      { key: 'total', label: 'Total', color: '#334155', bgColor: '#F1F5F9', Icon: StraightenIcon },
      { key: 'active', label: 'Activos', color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
    ],
    extraColumns: [],
    formFields: [],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  },

  /**
   * ESPESOR — wall thickness in mm
   */
  espesor: {
    label: 'Espesores',
    labelSingular: 'Espesor',
    icon: SpeedIcon,
    mode: 'generic',
    kpis: [
      { key: 'total',     label: 'Total',        color: '#334155', bgColor: '#F1F5F9', Icon: SpeedIcon },
      { key: 'active',    label: 'Activos',       color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
      { key: 'pendientes',label: 'Sin Completar', color: '#C62828', bgColor: '#FFEBEE', Icon: PendingIcon },
    ],
    extraColumns: [],
    formFields: [],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  },

  /**
   * NORMA — technical standard / specification
   */
  norma: {
    label: 'Normas',
    labelSingular: 'Norma',
    icon: VerifiedIcon,
    mode: 'generic',
    kpis: [
      { key: 'total',     label: 'Total',        color: '#334155', bgColor: '#F1F5F9', Icon: VerifiedIcon },
      { key: 'active',    label: 'Activas',       color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
      { key: 'pendientes',label: 'Sin Completar', color: '#C62828', bgColor: '#FFEBEE', Icon: PendingIcon },
    ],
    extraColumns: [],
    formFields: [
      { key: 'descripcion', label: 'Descripción', type: 'text' },
    ],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  },

  /**
   * PAIS_ORIGEN — country of origin (for import/customs)
   */
  pais_origen: {
    label: 'Países de Origen',
    labelSingular: 'País de Origen',
    icon: PublicIcon,
    mode: 'generic',
    kpis: [
      { key: 'total',  label: 'Total',   color: '#334155', bgColor: '#F1F5F9', Icon: PublicIcon },
      { key: 'active', label: 'Activos', color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
    ],
    extraColumns: [],
    formFields: [],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  },

  /**
   * CODIGO_ARANCELARIO — HS tariff code for customs/import
   */
  codigo_arancelario: {
    label: 'Códigos Arancelarios',
    labelSingular: 'Código Arancelario',
    icon: LocalShippingIcon,
    mode: 'generic',
    kpis: [
      { key: 'total',  label: 'Total',   color: '#334155', bgColor: '#F1F5F9', Icon: LocalShippingIcon },
      { key: 'active', label: 'Activos', color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
    ],
    extraColumns: [],
    formFields: [
      { key: 'descripcion', label: 'Descripción', type: 'text' },
    ],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  },
};

/**
 * Get config for a dimension. Falls back to a generic default.
 */
export function getAttributeConfig(dimension) {
  if (ATTRIBUTE_CONFIGS[dimension]) return ATTRIBUTE_CONFIGS[dimension];

  // Default fallback for any unknown dimension
  return {
    label: dimension.charAt(0).toUpperCase() + dimension.slice(1),
    labelSingular: dimension.charAt(0).toUpperCase() + dimension.slice(1),
    icon: LayersIcon,
    mode: 'generic',
    extraFilterGroups: [],
    kpis: [
      { key: 'total', label: 'Total', color: '#334155', bgColor: '#F1F5F9', Icon: LayersIcon },
      { key: 'active', label: 'Activos', color: '#2E7D32', bgColor: '#E8F5E9', Icon: TaskAltIcon },
      { key: 'pendientes', label: 'Sin Completar', color: '#C62828', bgColor: '#FFEBEE', Icon: PendingIcon },
    ],
    extraColumns: [],
    formFields: [],
    csvExtraHeaders: [],
    csvExtraFields: () => [],
  };
}

export { STATUS_OPTIONS, ENRICHMENT_OPTIONS, ACABADO_TIPO_OPTIONS };
export default ATTRIBUTE_CONFIGS;
