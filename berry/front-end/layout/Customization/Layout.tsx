// material-ui
import CardMedia from '@mui/material/CardMedia';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeDirection } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import useConfig from 'hooks/useConfig';

// assets
import ltr from 'assets/images/customization/ltr.svg';
import rtl from 'assets/images/customization/rtl.svg';

// ==============================|| CUSTOMIZATION - MODE ||============================== //

export default function Layout() {
  const { themeDirection, onChangeDirection } = useConfig();

  const changeLayout = (e: any) => {
    onChangeDirection(e.target.value as ThemeDirection);
  };
  return (
    <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', pb: 2, px: 2, justifyContent: 'space-between', width: '100%' }}>
      <Typography variant="h5">RTL</Typography>
      <RadioGroup row aria-label="layout" onChange={changeLayout} value={themeDirection} name="row-radio-buttons-group">
        <Tooltip title="LTR">
          <FormControlLabel
            control={<Radio value={ThemeDirection.LTR} sx={{ display: 'none' }} />}
            label={
              <Avatar
                size="md"
                variant="rounded"
                outline
                sx={{
                  mr: 1.25,
                  width: 48,
                  height: 48,
                  ...(themeDirection === ThemeDirection.RTL && { borderColor: 'divider' })
                }}
              >
                <CardMedia component="img" src={ltr} alt="defaultLayout" sx={{ width: 34, height: 34 }} />
              </Avatar>
            }
          />
        </Tooltip>
        <Tooltip title="RTL">
          <FormControlLabel
            control={<Radio value={ThemeDirection.RTL} sx={{ display: 'none' }} />}
            label={
              <Avatar
                size="md"
                variant="rounded"
                outline
                sx={{ width: 48, height: 48, ...(themeDirection !== ThemeDirection.RTL && { borderColor: 'divider' }) }}
              >
                <CardMedia component="img" src={rtl} alt="defaultLayout" sx={{ width: 34, height: 34 }} />
              </Avatar>
            }
          />
        </Tooltip>
      </RadioGroup>
    </Stack>
  );
}
