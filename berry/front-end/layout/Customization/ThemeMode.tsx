// material-ui
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import useConfig from 'hooks/useConfig';

// assets
import { IconMoon, IconSun } from '@tabler/icons-react';

// ==============================|| CUSTOMIZATION - MODE ||============================== //

export default function ThemeModeLayout() {
  const { mode, onChangeMode } = useConfig();

  return (
    <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2, width: '100%' }}>
      <Typography variant="h5">THEME MODE</Typography>
      <RadioGroup
        row
        aria-label="layout"
        value={mode}
        onChange={(e) => onChangeMode(e.target.value as ThemeMode)}
        name="row-radio-buttons-group"
      >
        <Tooltip title="Light Mode">
          <FormControlLabel
            control={<Radio value={ThemeMode.LIGHT} sx={{ display: 'none' }} />}
            label={
              <Avatar
                variant="rounded"
                outline
                color={mode !== ThemeMode.DARK ? 'primary' : 'dark'}
                sx={{ mr: 1, width: 48, height: 48, color: 'warning.dark' }}
              >
                <IconSun />
              </Avatar>
            }
          />
        </Tooltip>
        <Tooltip title="Dark Mode">
          <FormControlLabel
            control={<Radio value={ThemeMode.DARK} sx={{ display: 'none' }} />}
            label={
              <Avatar
                size="md"
                variant="rounded"
                {...(mode === ThemeMode.DARK && { outline: true })}
                color={mode === ThemeMode.DARK ? 'primary' : 'dark'}
                sx={{ width: 48, height: 48, color: 'grey.100' }}
              >
                <IconMoon style={{ transform: 'rotate(220deg)' }} />
              </Avatar>
            }
          />
        </Tooltip>
      </RadioGroup>
    </Stack>
  );
}
