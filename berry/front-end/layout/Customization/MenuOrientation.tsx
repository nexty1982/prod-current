// material-ui
import CardMedia from '@mui/material/CardMedia';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import { MenuOrientation } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import useConfig from 'hooks/useConfig';

// assets
import vertical from 'assets/images/customization/vertical.svg';
import horizontal from 'assets/images/customization/horizontal.svg';

// ==============================|| CUSTOMIZATION - MODE ||============================== //

export default function MenuOrientationPage() {
  const { menuOrientation, onChangeMenuOrientation } = useConfig();
  const isHorizontal = menuOrientation === MenuOrientation.HORIZONTAL;

  return (
    <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', pb: 2, px: 2, justifyContent: 'space-between', width: '100%' }}>
      <Typography variant="h5">MENU ORIENTATION</Typography>
      <RadioGroup
        row
        aria-label="menuOrientation"
        value={menuOrientation}
        onChange={(e) => onChangeMenuOrientation(e.target.value as MenuOrientation)}
        name="row-radio-buttons-group"
      >
        <Tooltip title="Vertical">
          <FormControlLabel
            control={<Radio value={MenuOrientation.VERTICAL} sx={{ display: 'none' }} />}
            label={
              <Avatar
                size="md"
                variant="rounded"
                outline
                sx={{ mr: 1.25, width: 48, height: 48, ...(isHorizontal && { borderColor: 'divider' }) }}
              >
                <CardMedia component="img" src={vertical} alt="defaultLayout" sx={{ width: 34, height: 34 }} />
              </Avatar>
            }
          />
        </Tooltip>
        <Tooltip title="Horizontal">
          <FormControlLabel
            control={<Radio value={MenuOrientation.HORIZONTAL} sx={{ display: 'none' }} />}
            label={
              <Avatar size="md" variant="rounded" outline sx={{ width: 48, height: 48, ...(!isHorizontal && { borderColor: 'divider' }) }}>
                <CardMedia component="img" src={horizontal} alt="defaultLayout" sx={{ width: 34, height: 34 }} />
              </Avatar>
            }
          />
        </Tooltip>
      </RadioGroup>
    </Stack>
  );
}
