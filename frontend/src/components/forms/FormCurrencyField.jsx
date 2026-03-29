import { Controller } from 'react-hook-form';
import { TextField, InputAdornment } from '@mui/material';

export default function FormCurrencyField({ name, control, label, helperText, ...props }) {
  const formatDisplay = (num) => {
    if (!num && num !== 0) return '';
    return new Intl.NumberFormat('es-CO').format(num);
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value, ...field }, fieldState: { error } }) => (
        <TextField
          {...field}
          {...props}
          label={label}
          value={formatDisplay(value)}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            onChange(raw ? parseInt(raw, 10) : 0);
          }}
          error={!!error}
          helperText={error?.message || helperText}
          fullWidth
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          inputProps={{ style: { textAlign: 'right' } }}
        />
      )}
    />
  );
}
