// material-ui
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third party
import Slider, { Settings } from 'react-slick';

// project imports
import { ThemeMode } from 'config';

// types
import { AuthSliderProps } from 'types';

const CustomSlider = styled(Slider)(({ theme }) => ({
  '.slick-dots li button:before': {
    color: theme.palette.mode === ThemeMode.DARK ? theme.palette.dark.light : theme.palette.grey[500]
  },

  '.slick-dots li.slick-active button:before': {
    color: theme.palette.mode === ThemeMode.DARK ? theme.palette.common.white : theme.palette.grey[800]
  }
}));

export default function AuthSlider({ items }: { items: AuthSliderProps[] }) {
  const settings: Settings = {
    autoplay: false,
    arrows: false,
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1
  };

  return (
    <CustomSlider {...settings}>
      {items.map((item, i) => (
        <Box key={i}>
          <Stack sx={{ alignItems: 'center', textAlign: 'center', width: 1, gap: 3 }}>
            <Typography variant="h1">{item.title}</Typography>
            <Typography variant="subtitle2">{item.description}</Typography>
          </Stack>
        </Box>
      ))}
    </CustomSlider>
  );
}
