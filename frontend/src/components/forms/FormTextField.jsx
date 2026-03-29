import { Controller } from 'react-hook-form';
import { TextField } from '@mui/material';

export default function FormTextField({ name, control, label, helperText, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...props}
          label={label}
          error={!!error}
          helperText={error?.message || helperText}
          fullWidth
          onFocus={(e) => {
            if (props.type === 'number' || e.target.type === 'number') e.target.select();
            props.onFocus?.(e);
          }}
        />
      )}
    />
  );
}
