// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// ==============================|| AVATAR STATUS ICONS ||============================== //

interface Props {
  status: string;
  mr?: number;
}

export default function AvatarStatus({ status, mr }: Props) {
  const iconSX = { cursor: 'pointer', verticalAlign: 'middle', fontSize: '0.875rem', mr };

  switch (status) {
    case 'available':
      return <FiberManualRecordIcon sx={{ color: 'success.dark', ...iconSX }} />;
    case 'do_not_disturb':
      return <FiberManualRecordIcon sx={{ color: 'warning.dark', ...iconSX }} />;
    case 'offline':
      return <FiberManualRecordIcon sx={{ color: 'error.dark', ...iconSX }} />;
    default:
      return null;
  }
}
