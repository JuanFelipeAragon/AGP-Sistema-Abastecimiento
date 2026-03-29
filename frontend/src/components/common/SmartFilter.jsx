/**
 * SmartFilter — Shared adaptive filter component for the AGP Platform.
 *
 * Supports single-select and MULTI-SELECT modes.
 * Renders FilterChips when <=threshold options, Autocomplete when >threshold.
 * Options sorted by frequency (most common first) with count badges.
 *
 * Props:
 *   label      — Display label for the filter
 *   options    — Array of strings OR [{value, count}] objects
 *   value      — Selected value(s): string for single, string[] for multi
 *   onChange   — Callback: (newValue) => void — string or string[]
 *   color      — Accent color for active state (default: '#1565C0')
 *   bgColor    — Background tint for active state (default: '#E3F2FD')
 *   multiple   — Enable multi-select (default: false)
 *   threshold  — Max options before switching to Autocomplete (default: 5)
 *
 * Usage:
 *   // Single select
 *   <SmartFilter label="Temple" options={temples} value={pf.temple}
 *     onChange={(v) => setPf('temple', v)} color="#F57F17" bgColor="#FFF8E1" />
 *
 *   // Multi select
 *   <SmartFilter label="Acabado" options={acabados} value={pf.acabado}
 *     onChange={(v) => setPf('acabado', v)} color="#E65100" bgColor="#FFF3E0" multiple />
 */
import { useMemo } from 'react';
import {
  Box, Typography, Chip, TextField, Autocomplete, Popper, alpha, Stack,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';

// ── Internal: FilterChip ──
function FilterChip({ label, count, active, onClick, color, bgColor }) {
  return (
    <Chip
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <span>{label}</span>
          {count != null && (
            <Box component="span" sx={{
              fontSize: '0.6rem', fontWeight: 700, opacity: 0.8,
              bgcolor: active ? alpha('#fff', 0.2) : alpha(color || '#666', 0.1),
              color: active ? 'inherit' : (color || 'text.secondary'),
              borderRadius: 4, px: 0.5, py: 0.1,
              lineHeight: 1.3, minWidth: 16, textAlign: 'center',
            }}>
              {count.toLocaleString()}
            </Box>
          )}
        </Box>
      }
      size="small"
      onClick={onClick}
      variant={active ? 'filled' : 'outlined'}
      deleteIcon={active ? <CheckIcon sx={{ fontSize: '14px !important' }} /> : undefined}
      onDelete={active ? onClick : undefined}
      sx={{
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 28,
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: active ? (bgColor || 'primary.main') : 'transparent',
        color: active ? (color || '#fff') : 'text.secondary',
        borderColor: active ? alpha(color || '#1565C0', 0.4) : 'divider',
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: 1,
          bgcolor: active ? (bgColor || 'primary.main') : 'action.hover',
        },
        '& .MuiChip-deleteIcon': {
          color: `${color || '#1565C0'} !important`,
          fontSize: 14,
        },
      }}
    />
  );
}

// ── Internal: CountBadge for Autocomplete ──
function CountBadge({ count, color, bgColor }) {
  if (count == null) return null;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 28, height: 20, borderRadius: 10,
      bgcolor: alpha(bgColor || '#E3F2FD', 0.7),
      color: color || '#1565C0',
      fontSize: '0.65rem', fontWeight: 700,
      px: 0.75,
      fontVariantNumeric: 'tabular-nums',
      transition: 'all 0.15s ease',
    }}>
      {count.toLocaleString()}
    </Box>
  );
}

// ── Main SmartFilter ──
export default function SmartFilter({
  label,
  options = [],
  value,
  onChange,
  color = '#1565C0',
  bgColor = '#E3F2FD',
  multiple = false,
  threshold = 5,
}) {
  // Normalize to [{value, count}]
  const normalized = useMemo(() => {
    if (!options?.length) return [];
    if (typeof options[0] === 'string') return options.map((v) => ({ value: v, count: null }));
    return options;
  }, [options]);

  const optionValues = useMemo(() => normalized.map((o) => o.value), [normalized]);
  const countMap = useMemo(() => {
    const m = {};
    normalized.forEach((o) => { if (o.count != null) m[o.value] = o.count; });
    return m;
  }, [normalized]);

  // Ensure value is always the correct type
  const normalizedValue = useMemo(() => {
    if (multiple) {
      if (Array.isArray(value)) return value;
      if (value) return [value];
      return [];
    }
    return value || '';
  }, [value, multiple]);

  const isActive = (opt) => {
    if (multiple) return normalizedValue.includes(opt);
    return normalizedValue === opt;
  };

  const handleToggle = (opt) => {
    if (multiple) {
      const arr = normalizedValue.includes(opt)
        ? normalizedValue.filter((v) => v !== opt)
        : [...normalizedValue, opt];
      onChange(arr);
    } else {
      onChange(normalizedValue === opt ? '' : opt);
    }
  };

  // Count of active selections (for badge in autocomplete)
  const selCount = multiple ? normalizedValue.length : (normalizedValue ? 1 : 0);

  // ── Chip mode (<=threshold) ──
  if (normalized.length <= threshold) {
    return (
      <>
        <Typography variant="caption" color="text.disabled"
          sx={{ fontWeight: 600, whiteSpace: 'nowrap', mr: 0.25, display: { xs: 'none', md: 'block' } }}>
          {label}:
        </Typography>
        {normalized.map((opt, idx) => (
          <FilterChip
            key={`${opt.value}-${idx}`}
            label={opt.value}
            count={opt.count}
            active={isActive(opt.value)}
            color={color}
            bgColor={bgColor}
            onClick={() => handleToggle(opt.value)}
          />
        ))}
      </>
    );
  }

  // ── Autocomplete mode (>threshold) ──
  if (multiple) {
    // Show individual values when <=3 selected, count badge when >3
    const showValues = selCount > 0 && selCount <= 3;
    const showCountBadge = selCount > 3;

    return (
      <Autocomplete
        size="small"
        multiple
        disableCloseOnSelect
        options={optionValues}
        value={normalizedValue}
        onChange={(_, newVal) => onChange(newVal || [])}
        PopperComponent={(props) => (
          <Popper {...props} placement="bottom-start" sx={{
            minWidth: 280,
            '& .MuiAutocomplete-paper': {
              borderRadius: 2.5, mt: 0.5,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid', borderColor: 'divider', overflow: 'hidden',
              minWidth: 280,
            },
            '& .MuiAutocomplete-listbox': { py: 0.5, maxHeight: 360 },
          }} />
        )}
        renderTags={() => null}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selCount > 0 ? '' : label}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  {showValues && normalizedValue.map((v) => (
                    <Chip
                      key={v}
                      label={v}
                      size="small"
                      onDelete={() => onChange(normalizedValue.filter((x) => x !== v))}
                      sx={{
                        height: 20, fontSize: '0.65rem', fontWeight: 600,
                        bgcolor: alpha(bgColor, 0.7), color,
                        '& .MuiChip-deleteIcon': { color: alpha(color, 0.5), fontSize: 12 },
                        maxWidth: 120,
                      }}
                    />
                  ))}
                  {showCountBadge && (
                    <Chip
                      label={`${selCount} sel.`}
                      size="small"
                      onDelete={() => onChange([])}
                      sx={{
                        height: 20, fontSize: '0.65rem', fontWeight: 600,
                        bgcolor: alpha(bgColor, 0.7), color,
                        '& .MuiChip-deleteIcon': { color: alpha(color, 0.5), fontSize: 12 },
                      }}
                    />
                  )}
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
            sx={{
              minWidth: 160,
              '& .MuiOutlinedInput-root': {
                minHeight: 32,
                fontSize: '0.75rem', fontWeight: selCount > 0 ? 600 : 400,
                borderRadius: 2,
                py: '2px !important',
                gap: 0.5,
                flexWrap: 'nowrap',
                bgcolor: selCount > 0 ? alpha(bgColor, 0.35) : 'transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { bgcolor: selCount > 0 ? alpha(bgColor, 0.5) : alpha(bgColor, 0.15) },
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          const cnt = countMap[option];
          const selected = normalizedValue.includes(option);
          return (
            <Box component="li" key={key} {...rest} sx={{
              fontSize: '0.8rem', py: 0.75, px: 1.5,
              display: 'flex', alignItems: 'center', gap: 1,
              fontWeight: selected ? 700 : 400,
              color: selected ? color : 'text.primary',
              bgcolor: selected ? alpha(bgColor, 0.3) : 'transparent',
              borderLeft: selected ? `3px solid ${color}` : '3px solid transparent',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: alpha(bgColor, 0.2) },
              '&[aria-selected="true"]': { bgcolor: `${alpha(bgColor, 0.3)} !important` },
            }}>
              <Box sx={{
                width: 18, height: 18, borderRadius: 0.5,
                border: `1.5px solid ${selected ? color : '#CCC'}`,
                bgcolor: selected ? alpha(bgColor, 0.6) : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease', flexShrink: 0,
              }}>
                {selected && <CheckIcon sx={{ fontSize: 13, color }} />}
              </Box>
              <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'inherit', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {option}
              </Typography>
              <CountBadge count={cnt} color={color} bgColor={bgColor} />
            </Box>
          );
        }}
      />
    );
  }

  // Single-select Autocomplete
  return (
    <Autocomplete
      size="small"
      options={optionValues}
      value={normalizedValue || null}
      onChange={(_, v) => onChange(v || '')}
      disableClearable={!normalizedValue}
      PopperComponent={(props) => (
        <Popper {...props} placement="bottom-start" sx={{
          minWidth: 280,
          '& .MuiAutocomplete-paper': {
            borderRadius: 2.5, mt: 0.5,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid', borderColor: 'divider', overflow: 'hidden',
            minWidth: 280,
          },
          '& .MuiAutocomplete-listbox': { py: 0.5, maxHeight: 360 },
        }} />
      )}
      renderInput={(params) => (
        <TextField {...params} placeholder={label} sx={{
          minWidth: 160,
          '& .MuiOutlinedInput-root': {
            height: 32, fontSize: '0.75rem', fontWeight: normalizedValue ? 600 : 400,
            borderRadius: 2,
            bgcolor: normalizedValue ? alpha(bgColor, 0.45) : 'transparent',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': { bgcolor: normalizedValue ? alpha(bgColor, 0.55) : alpha(bgColor, 0.15) },
          },
        }} />
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        const cnt = countMap[option];
        const selected = option === normalizedValue;
        return (
          <Box component="li" key={key} {...rest} sx={{
            fontSize: '0.8rem', py: 0.75, px: 1.5,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1,
            fontWeight: selected ? 700 : 400, color: selected ? color : 'text.primary',
            bgcolor: selected ? alpha(bgColor, 0.3) : 'transparent',
            borderLeft: selected ? `3px solid ${color}` : '3px solid transparent',
            transition: 'all 0.15s ease',
            '&:hover': { bgcolor: alpha(bgColor, 0.2) },
            '&[aria-selected="true"]': { bgcolor: `${alpha(bgColor, 0.3)} !important` },
          }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 'inherit', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {option}
            </Typography>
            <CountBadge count={cnt} color={color} bgColor={bgColor} />
          </Box>
        );
      }}
    />
  );
}
