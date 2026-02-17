// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import DownloadForOfflineTwoToneIcon from '@mui/icons-material/DownloadForOfflineTwoTone';

// ==============================|| ATTACHMENT CARD ||============================== //

interface AttachmentCardProps {
  title: string;
  image: string;
}

export default function AttachmentCard({ title, image }: AttachmentCardProps) {
  const theme = useTheme();

  return (
    <Card sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'grey.100' }}>
      <CardMedia component="img" image={image && getImageUrl(`${image}`, ImagePath.PROFILE)} title="Slider5 image" />
      <CardContent sx={{ p: 2, pb: '16px !important' }}>
        <Grid container spacing={gridSpacing}>
          <Grid size="grow">
            <Typography variant="h5" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </Typography>
          </Grid>
          <Grid>
            <DownloadForOfflineTwoToneIcon sx={{ cursor: 'pointer' }} />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
