import { Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

export default function DateDisplay({ date, showTime = false, variant = 'body2' }) {
  if (!date) return <Typography variant={variant}>—</Typography>;
  const d = dayjs(date);
  const formatted = showTime ? d.format('DD/MM/YYYY HH:mm') : d.format('DD/MM/YYYY');
  const relative = d.fromNow();

  return (
    <Tooltip title={relative} arrow>
      <Typography variant={variant}>{formatted}</Typography>
    </Tooltip>
  );
}
