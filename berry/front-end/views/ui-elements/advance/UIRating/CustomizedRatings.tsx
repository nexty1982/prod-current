// material-ui
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// assets
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAltOutlined';
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';

// project imports
import { KeyedObject } from 'types';

// customized icons
const customIcons: KeyedObject = {
  1: {
    icon: <SentimentVeryDissatisfiedIcon />,
    label: 'Very Dissatisfied'
  },
  2: {
    icon: <SentimentDissatisfiedIcon />,
    label: 'Dissatisfied'
  },
  3: {
    icon: <SentimentSatisfiedIcon />,
    label: 'Neutral'
  },
  4: {
    icon: <SentimentSatisfiedAltIcon />,
    label: 'Satisfied'
  },
  5: {
    icon: <SentimentVerySatisfiedIcon />,
    label: 'Very Satisfied'
  }
};

// ===============================|| CUSTOMIZED ICON ||=============================== //

function IconContainer({ value, ...other }: { value: number }) {
  return <span {...other}>{customIcons[value].icon}</span>;
}

// ===============================|| UI RATING - CUSTOMIZED ||=============================== //

export default function CustomizedRatings() {
  return (
    <Stack sx={{ gap: { xs: 3, sm: 1.5 }, alignItems: 'center' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">Empty Icon</Typography>
        <Rating name="customized-empty" defaultValue={2} precision={0.5} emptyIcon={<StarBorderIcon fontSize="inherit" />} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">Icon & Color</Typography>
        <Rating
          name="customized-color"
          defaultValue={2}
          getLabelText={(value) => `${value} Heart${value !== 1 ? 's' : ''}`}
          precision={0.5}
          icon={<FavoriteIcon fontSize="inherit" />}
          emptyIcon={<FavoriteBorderIcon sx={{ color: 'error.main' }} fontSize="inherit" />}
          sx={{
            '& .MuiRating-iconFilled': {
              color: 'error.main'
            },
            '& .MuiRating-iconHover': {
              color: 'error.dark'
            }
          }}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">6 Stars</Typography>
        <Rating name="customized-10" defaultValue={2} max={8} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 1, sm: 3 }, alignItems: 'center' }}>
        <Typography component="legend">Icon Set</Typography>
        <Rating
          name="customized-icons"
          defaultValue={2}
          getLabelText={(value) => customIcons[value].label}
          IconContainerComponent={IconContainer}
        />
      </Stack>
    </Stack>
  );
}
