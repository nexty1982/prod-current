import { useEffect, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';

// project imports
import ColorOptions from '../ColorOptions';
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';

// assets
import CheckIcon from '@mui/icons-material/Check';

// types
import { ColorsOptionsProps } from 'types/e-commerce';

// ==============================|| PRODUCT - COLOR OPTIONS ||============================== //

interface ColorProps {
  bg: string;
  id: string;
  colors: string[];
  label: string;
  handelFilter: (type: string, params: string) => void;
}

function Color({ bg, id, colors, label, handelFilter }: ColorProps) {
  const theme = useTheme();

  return (
    <Grid>
      <Tooltip title={label}>
        <ButtonBase sx={{ borderRadius: '50%' }} onClick={() => handelFilter('colors', id)}>
          <Avatar
            color="inherit"
            size="badge"
            sx={{
              bgcolor: bg,
              color: theme.palette.mode === ThemeMode.DARK ? 'grey.800' : 'grey.50',
              opacity: colors.some((item: string) => item === id) ? 0.6 : 1
            }}
          >
            {colors.some((item: string) => item === id) ? (
              <CheckIcon sx={{ color: theme.palette.mode === ThemeMode.DARK ? 'dark.800' : 'grey.50' }} fontSize="inherit" />
            ) : (
              <></>
            )}
          </Avatar>
        </ButtonBase>
      </Tooltip>
    </Grid>
  );
}

// ==============================|| PRODUCT - COLOR ||============================== //

export default function Colors({ colors, handelFilter }: { colors: string[]; handelFilter: (type: string, params: string) => void }) {
  const [isColorsLoading, setColorLoading] = useState(true);
  useEffect(() => {
    setColorLoading(false);
  }, []);

  return (
    <>
      {isColorsLoading ? (
        <Grid size={12}>
          <Skeleton variant="rectangular" width="100%" height={158} />
        </Grid>
      ) : (
        <Grid container spacing={1} sx={{ alignItems: 'center' }}>
          {ColorOptions.map((color: ColorsOptionsProps, index) => (
            <Color key={index} id={color.value} bg={color.bg} label={color.label} colors={colors} handelFilter={handelFilter} />
          ))}
        </Grid>
      )}
    </>
  );
}
