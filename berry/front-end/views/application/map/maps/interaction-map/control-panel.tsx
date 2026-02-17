import { memo } from 'react';

// material-ui
import { alpha } from '@mui/material/styles';
import InputBase from '@mui/material/InputBase';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

// project imports
import ControlPanelStyled from 'ui-component/third-party/map/ControlPanelStyled';

// types
import { MapControlKeys, MapControlProps } from 'types/map';

const camelPattern = /(^|[A-Z])[a-z]*/g;

function formatSettingName(name: string) {
  return name.match(camelPattern)?.join(' ');
}

type Props = {
  settings: MapControlProps;
  onChange: (name: MapControlKeys, value: boolean | number) => void;
};

// ==============================|| CONTROL - INTERATION MAP ||============================== //

function ControlPanel({ settings, onChange }: Props) {
  const renderSetting = (name: MapControlKeys, value: boolean | number) => {
    switch (typeof value) {
      case 'boolean':
        return (
          <Stack
            direction="row"
            spacing={0.75}
            key={name}
            sx={{ alignItems: 'center', justifyContent: 'space-between', textTransform: 'capitalize', '&:not(:last-of-type)': { mb: 1 } }}
          >
            <Typography variant="body2">{formatSettingName(name)}</Typography>
            <Switch size="small" checked={value} onChange={(event) => onChange(name, event.target.checked)} />
          </Stack>
        );
      case 'number':
        return (
          <Stack
            direction="row"
            spacing={0.75}
            key={name}
            sx={{ alignItems: 'center', justifyContent: 'space-between', textTransform: 'capitalize', '&:not(:last-of-type)': { mb: 1 } }}
          >
            <Typography variant="body2">{formatSettingName(name)}</Typography>
            <InputBase
              value={value}
              onChange={(event) => onChange(name, Number(event.target.value))}
              slotProps={{ input: { type: 'number' } }}
              sx={{
                '& input': {
                  py: 0.25,
                  width: 40,
                  fontSize: 14,
                  borderRadius: 1,
                  textAlign: 'center',
                  bgcolor: (theme) => alpha(theme.palette.grey[500], 0.12)
                }
              }}
            />
          </Stack>
        );
      default:
        return null;
    }
  };

  return (
    <ControlPanelStyled>
      {Object.keys(settings).map((name) => renderSetting(name as MapControlKeys, settings[name as MapControlKeys]))}
    </ControlPanelStyled>
  );
}

export default memo(ControlPanel);
