// material-ui
import CardMedia from '@mui/material/CardMedia';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import useConfig from 'hooks/useConfig';

// assets
import big from 'assets/images/customization/big.svg';
import small from 'assets/images/customization/small.svg';

enum ContainerType {
  CONTAINER = 'container',
  FLUID = 'fluid'
}

// ==============================|| CUSTOMIZATION - MODE ||============================== //

export default function BoxContainer() {
  const { container, onChangeContainer } = useConfig();

  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', pb: 2, px: 2, justifyContent: 'space-between', width: '100%' }}>
      <Typography variant="h5">THEME WIDTH</Typography>
      <RadioGroup
        row
        aria-label="container-fluid"
        value={container ? ContainerType.CONTAINER : ContainerType.FLUID}
        onChange={(e) => onChangeContainer(e.target.value === ContainerType.CONTAINER)}
        name="row-radio-buttons-group"
      >
        <Tooltip title="Fluid">
          <FormControlLabel
            control={<Radio value={ContainerType.FLUID} sx={{ display: 'none' }} />}
            label={
              <Avatar
                size="md"
                variant="rounded"
                outline
                sx={{ mr: 1.25, width: 48, height: 48, ...(container && { borderColor: 'divider' }) }}
              >
                <CardMedia component="img" src={big} alt="defaultLayout" sx={{ width: 28, height: 28 }} />
              </Avatar>
            }
          />
        </Tooltip>
        <Tooltip title="Container">
          <FormControlLabel
            control={<Radio value={ContainerType.CONTAINER} sx={{ display: 'none' }} />}
            label={
              <Avatar size="md" variant="rounded" outline sx={{ width: 48, height: 48, ...(!container && { borderColor: 'divider' }) }}>
                <CardMedia component="img" src={small} alt="defaultLayout" sx={{ width: 16, height: 28 }} />
              </Avatar>
            }
          />
        </Tooltip>
      </RadioGroup>
    </Stack>
  );
}
