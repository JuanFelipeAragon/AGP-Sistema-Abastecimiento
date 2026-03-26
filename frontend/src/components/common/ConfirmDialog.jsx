import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';

export default function ConfirmDialog({
  open,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmColor = 'error',
  onConfirm,
  onCancel,
  loading = false,
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <LoadingButton onClick={onConfirm} loading={loading} variant="contained" color={confirmColor}>
          {confirmLabel}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
