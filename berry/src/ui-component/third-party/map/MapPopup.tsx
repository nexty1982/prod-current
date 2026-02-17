// third party
import { PopupProps } from 'react-map-gl/mapbox';

// material-ui
import { Theme, SxProps } from '@mui/material/styles';

// project imports
import PopupStyled from './PopupStyled';

interface Props extends PopupProps {
  sx?: SxProps<Theme>;
}

// ==============================|| MAP BOX - MODAL ||============================== //

export default function MapPopup({ sx, children, ...other }: Props) {
  return (
    <PopupStyled anchor="bottom" sx={sx} {...other}>
      {children}
    </PopupStyled>
  );
}
