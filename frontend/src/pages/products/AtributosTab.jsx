/**
 * AtributosTab — Container for product attribute management.
 * Two-level selector: Product Type → Attribute Dimension.
 * Renders AttributeManager with the appropriate config.
 *
 * URL state: ?type=Perfil&attr=temple for deep-linking.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Chip, Typography, Stack, Paper, Skeleton,
  Fade, Divider, alpha, useTheme,
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import CategoryIcon from '@mui/icons-material/Category';
import productsApi from '../../api/products.api';
import { getAttributeConfig } from './attributeConfigs';
import AttributeManager from './AttributeManager';

// Product type icons/colors for chips
const TYPE_STYLES = {
  Perfil: { color: '#1565C0', bg: '#E3F2FD' },
  Lamina: { color: '#E65100', bg: '#FFF3E0' },
  Escalera: { color: '#2E7D32', bg: '#E8F5E9' },
  Accesorio: { color: '#7B1FA2', bg: '#F3E5F5' },
  Otro: { color: '#546E7A', bg: '#ECEFF1' },
};

// Map attribute_key from product_type_config to dimension names used in product_attributes
const ATTR_KEY_TO_DIMENSION = {
  acabado:            'acabado',
  codAcabado:         null,              // skip — sub-field of acabado
  temple:             'temple',
  aleacionCode:       'aleacion',
  longitud:           'longitud',
  espesor:            'espesor',
  norma:              'norma',
  paisOrigen:         'pais_origen',
  codigoArancelario:  'codigo_arancelario',
  refSiesa:           null,              // skip — not a manageable attribute
  fCreacion:          null,              // skip
};

export default function AtributosTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();

  const [typeConfig, setTypeConfig] = useState({});
  const [loading, setLoading] = useState(true);

  // Selected state from URL params
  const selectedType = searchParams.get('type') || '';
  const selectedAttr = searchParams.get('attr') || '';

  const setSelectedType = useCallback((type) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (type) {
        next.set('type', type);
      } else {
        next.delete('type');
      }
      next.delete('attr'); // reset attribute when type changes
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSelectedAttr = useCallback((attr) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (attr) {
        next.set('attr', attr);
      } else {
        next.delete('attr');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // Load type config
  useEffect(() => {
    setLoading(true);
    productsApi.getTypeConfig()
      .then((data) => setTypeConfig(data.config || {}))
      .catch((err) => console.error('Error loading type config:', err))
      .finally(() => setLoading(false));
  }, []);

  // Available product types
  const productTypes = useMemo(() => Object.keys(typeConfig).sort(), [typeConfig]);

  // Available attributes for selected type (filtered to manageable dimensions)
  const availableAttributes = useMemo(() => {
    if (!selectedType || !typeConfig[selectedType]) return [];
    return typeConfig[selectedType]
      .filter((attr) => {
        const dim = ATTR_KEY_TO_DIMENSION[attr.key];
        return dim !== null && dim !== undefined;
      })
      .map((attr) => ({
        key: ATTR_KEY_TO_DIMENSION[attr.key],
        label: attr.label,
        sortOrder: attr.sortOrder,
      }))
      // Deduplicate by key (in case acabado and codAcabado both map)
      .filter((attr, idx, arr) => arr.findIndex((a) => a.key === attr.key) === idx)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedType, typeConfig]);

  // Auto-select first type if none selected
  useEffect(() => {
    if (!loading && productTypes.length > 0 && !selectedType) {
      setSelectedType(productTypes[0]);
    }
  }, [loading, productTypes, selectedType, setSelectedType]);

  // Get config for selected attribute
  const attrConfig = useMemo(() => {
    if (!selectedAttr) return null;
    return getAttributeConfig(selectedAttr);
  }, [selectedAttr]);

  if (loading) {
    return (
      <Box>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" width={100} height={32} />)}
        </Stack>
        <Skeleton variant="rounded" width="100%" height={200} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Level 1: Product Type Selector */}
      <Fade in timeout={200}>
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <TuneIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mr: 1 }}>
              Tipo de Producto:
            </Typography>
            {productTypes.map((type) => {
              const style = TYPE_STYLES[type] || TYPE_STYLES.Otro;
              const isActive = selectedType === type;
              return (
                <Chip
                  key={type}
                  label={type}
                  onClick={() => setSelectedType(isActive ? '' : type)}
                  variant={isActive ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    bgcolor: isActive ? style.bg : 'transparent',
                    color: isActive ? style.color : 'text.secondary',
                    borderColor: isActive ? 'transparent' : 'divider',
                    '&:hover': {
                      transform: 'translateY(-1px)', boxShadow: 1,
                      bgcolor: isActive ? style.bg : 'action.hover',
                    },
                  }}
                />
              );
            })}
          </Box>

          {/* Level 2: Attribute Selector (shown when type is selected) */}
          {selectedType && availableAttributes.length > 0 && (
            <>
              <Divider />
              <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                bgcolor: alpha(theme.palette.primary.main, 0.02),
              }}>
                <CategoryIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                <Typography variant="caption" fontWeight={600} color="text.disabled" sx={{ mr: 0.5 }}>
                  Atributo:
                </Typography>
                {availableAttributes.map((attr) => {
                  const conf = getAttributeConfig(attr.key);
                  const AttrIcon = conf.icon;
                  const isActive = selectedAttr === attr.key;
                  return (
                    <Chip
                      key={attr.key}
                      icon={<AttrIcon sx={{ fontSize: 16 }} />}
                      label={attr.label}
                      onClick={() => setSelectedAttr(isActive ? '' : attr.key)}
                      variant={isActive ? 'filled' : 'outlined'}
                      color={isActive ? 'primary' : 'default'}
                      sx={{
                        fontWeight: isActive ? 700 : 500, fontSize: '0.75rem', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: 1 },
                      }}
                    />
                  );
                })}
              </Box>
            </>
          )}
        </Paper>
      </Fade>

      {/* Render AttributeManager when attribute is selected */}
      {selectedAttr && attrConfig ? (
        <Fade in timeout={300} key={`${selectedType}-${selectedAttr}`}>
          <Box>
            <AttributeManager
              dimension={selectedAttr}
              productType={selectedType}
              config={attrConfig}
            />
          </Box>
        </Fade>
      ) : selectedType ? (
        <Fade in timeout={200}>
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
            <CategoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              Selecciona un atributo
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Elige un atributo de {selectedType} para administrar sus valores
            </Typography>
          </Paper>
        </Fade>
      ) : null}
    </Box>
  );
}
