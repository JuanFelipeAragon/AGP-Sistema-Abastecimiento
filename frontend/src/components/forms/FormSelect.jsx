import { Controller } from 'react-hook-form';
import { TextField, MenuItem } from '@mui/material';

export default function FormSelect({ name, control, label, options = [], helperText, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...props}
          select
          label={label}
          error={!!error}
          helperText={error?.message || helperText}
          fullWidth
        >
          <MenuItem value="" disabled><em>Seleccionar...</em></MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
