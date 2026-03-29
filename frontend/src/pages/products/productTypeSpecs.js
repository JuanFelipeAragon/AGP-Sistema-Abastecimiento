/**
 * productTypeSpecs.js — Config for non-shared, per-product technical specs.
 * Defines which fields appear in the "Ficha Técnica" tab per product type.
 * All values are stored in the products.technical_specs JSONB column.
 *
 * Field types: 'number' | 'text'
 * Units are display-only labels shown next to the input.
 */

export const PRODUCT_TYPE_SPECS = {
  Perfil: [
    { key: 'peso_por_metro',  label: 'Peso por metro',        type: 'number', unit: 'kg/m',  step: 0.0001, precision: 4 },
    { key: 'altura',          label: 'Altura',                type: 'number', unit: 'mm',    step: 0.01,   precision: 2 },
    { key: 'ancho',           label: 'Ancho',                 type: 'number', unit: 'mm',    step: 0.01,   precision: 2 },
    { key: 'espesor_pared',   label: 'Espesor de pared',      type: 'number', unit: 'mm',    step: 0.01,   precision: 2 },
    { key: 'area_seccion',    label: 'Área de sección',       type: 'number', unit: 'mm²',   step: 0.01,   precision: 2 },
    { key: 'momento_inercia', label: 'Momento de inercia',    type: 'number', unit: 'mm⁴',   step: 0.01,   precision: 2 },
  ],
  Lamina: [
    { key: 'peso_por_m2',     label: 'Peso por m²',           type: 'number', unit: 'kg/m²', step: 0.001,  precision: 3 },
    { key: 'ancho_estandar',  label: 'Ancho estándar',        type: 'number', unit: 'mm',    step: 1,      precision: 0 },
    { key: 'longitud_estandar',label: 'Longitud estándar',    type: 'number', unit: 'mm',    step: 1,      precision: 0 },
  ],
  Escalera: [
    { key: 'ancho',           label: 'Ancho',                 type: 'number', unit: 'mm',    step: 1,      precision: 0 },
    { key: 'huella',          label: 'Huella',                type: 'number', unit: 'mm',    step: 1,      precision: 0 },
    { key: 'contrahuella',    label: 'Contrahuella',          type: 'number', unit: 'mm',    step: 1,      precision: 0 },
    { key: 'peso_lineal',     label: 'Peso lineal',           type: 'number', unit: 'kg/m',  step: 0.001,  precision: 3 },
  ],
  Accesorio: [
    { key: 'peso_unitario',   label: 'Peso unitario',         type: 'number', unit: 'g',     step: 0.1,    precision: 1 },
    { key: 'dimension_a',     label: 'Dimensión A',           type: 'number', unit: 'mm',    step: 0.1,    precision: 1 },
    { key: 'dimension_b',     label: 'Dimensión B',           type: 'number', unit: 'mm',    step: 0.1,    precision: 1 },
    { key: 'dimension_c',     label: 'Dimensión C',           type: 'number', unit: 'mm',    step: 0.1,    precision: 1 },
  ],
};

/**
 * Returns the spec fields for a given product type, or [] if none defined.
 */
export function getTypeSpecs(productType) {
  return PRODUCT_TYPE_SPECS[productType] || [];
}
