// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import useConfig from 'hooks/useConfig';

// color import
import colors from 'assets/scss/_themes-vars.module.scss';
import theme1 from 'assets/scss/_theme1.module.scss';
import theme2 from 'assets/scss/_theme2.module.scss';
import theme3 from 'assets/scss/_theme3.module.scss';
import theme4 from 'assets/scss/_theme4.module.scss';
import theme5 from 'assets/scss/_theme5.module.scss';
import theme6 from 'assets/scss/_theme6.module.scss';

// assets
import { IconCheck } from '@tabler/icons-react';

// types
import { PresetColor } from 'types/config';

interface PresetColorProps {
  id: PresetColor;
  primary: string;
  secondary: string;
}

interface Props {
  color: PresetColorProps;
  presetColor: PresetColor;
  setPresetColor: (presetColor: PresetColor) => void;
}

function PresetColorBox({ color, presetColor, setPresetColor }: Props) {
  return (
    <Grid>
      <Avatar
        color="inherit"
        title={color.id}
        size="md"
        sx={{
          width: 48,
          height: 48,
          background: `linear-gradient(135deg, ${color.primary} 50%, ${color.secondary} 50%)`,
          opacity: presetColor === color.id ? 0.6 : 1,
          cursor: 'pointer'
        }}
        onClick={() => setPresetColor(color?.id!)}
      >
        {presetColor === color.id ? <IconCheck color="#fff" size={28} /> : ' '}
      </Avatar>
    </Grid>
  );
}

export default function PresetColorPage() {
  const { mode, presetColor, onChangePresetColor } = useConfig();

  const colorOptions: PresetColorProps[] = [
    {
      id: 'default',
      primary: mode === ThemeMode.DARK ? colors.darkPrimaryMain : colors.primaryMain,
      secondary: mode === ThemeMode.DARK ? colors.darkSecondaryMain : colors.secondaryMain
    },
    {
      id: 'theme1',
      primary: mode === ThemeMode.DARK ? theme1.darkPrimaryMain : theme1.primaryMain,
      secondary: mode === ThemeMode.DARK ? theme1.darkSecondaryMain : theme1.secondaryMain
    },
    {
      id: 'theme2',
      primary: mode === ThemeMode.DARK ? theme2.darkPrimaryMain : theme2.primaryMain,
      secondary: mode === ThemeMode.DARK ? theme2.darkSecondaryMain : theme2.secondaryMain
    },
    {
      id: 'theme3',
      primary: mode === ThemeMode.DARK ? theme3.darkPrimaryMain : theme3.primaryMain,
      secondary: mode === ThemeMode.DARK ? theme3.darkSecondaryMain : theme3.secondaryMain
    },
    {
      id: 'theme4',
      primary: mode === ThemeMode.DARK ? theme4.darkPrimaryMain : theme4.primaryMain,
      secondary: mode === ThemeMode.DARK ? theme4.darkSecondaryMain : theme4.secondaryMain
    },
    {
      id: 'theme5',
      primary: mode === ThemeMode.DARK ? theme5.darkPrimaryMain : theme5.primaryMain,
      secondary: mode === ThemeMode.DARK ? theme5.darkSecondaryMain : theme5.secondaryMain
    },
    {
      id: 'theme6',
      primary: mode === ThemeMode.DARK ? theme6.darkPrimaryMain : theme6.primaryMain,
      secondary: mode === ThemeMode.DARK ? theme6.darkSecondaryMain : theme6.secondaryMain
    }
  ];

  return (
    <Stack spacing={1} sx={{ px: 2, pb: 2 }}>
      <Typography variant="h5">PRESET COLOR</Typography>
      <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
        {colorOptions.map((color, index) => (
          <PresetColorBox key={index} color={color} presetColor={presetColor} setPresetColor={onChangePresetColor} />
        ))}
      </Grid>
    </Stack>
  );
}
