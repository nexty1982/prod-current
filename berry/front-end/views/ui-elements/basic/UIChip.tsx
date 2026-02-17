// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// assets
import User1 from 'assets/images/users/avatar-1.png';

// ================================|| UI CHIP ||================================ //

export default function UIChip() {
  const theme = useTheme();

  const handleDelete = () => {
    console.info('You clicked the delete icon.');
  };

  const handleClick = () => {
    console.info('You clicked the Chip.');
  };

  return (
    <MainCard title="Chip" secondary={<SecondaryAction link="https://next.material-ui.com/components/chips/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Basic">
            <Grid container spacing={3}>
              <Grid>
                <Chip label="Default" />
              </Grid>
              <Grid>
                <Chip label="Deletable" onDelete={handleDelete} />
              </Grid>
              <Grid>
                <Chip label="Disabled" disabled />
              </Grid>
              <Grid>
                <Chip label="Clickable" onClick={handleClick} onDelete={handleDelete} />
              </Grid>

              <Grid>
                <Chip
                  avatar={<Avatar>AK</Avatar>}
                  label="Clickable deletable"
                  onClick={handleClick}
                  onDelete={handleDelete}
                  color="primary"
                />
              </Grid>
              <Grid>
                <Chip label="Clickable" avatar={<Avatar alt="Avatar 1" src={User1} />} onClick={handleClick} />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SubCard title="Outlined">
            <Grid container spacing={3}>
              <Grid>
                <Chip label="Default" variant="outlined" />
              </Grid>
              <Grid>
                <Chip label="Deletable" onDelete={handleDelete} variant="outlined" />
              </Grid>
              <Grid>
                <Chip label="Disabled" disabled variant="outlined" />
              </Grid>
              <Grid>
                <Chip label="Clickable" variant="outlined" onClick={handleClick} onDelete={handleDelete} />
              </Grid>

              <Grid>
                <Chip
                  avatar={<Avatar>AK</Avatar>}
                  label="Clickable deletable"
                  onClick={handleClick}
                  onDelete={handleDelete}
                  color="primary"
                  variant="outlined"
                />
              </Grid>
              <Grid>
                <Chip label="Clickable" avatar={<Avatar alt="Avatar 1" src={User1} />} onClick={handleClick} variant="outlined" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={12}>
          <SubCard title="Outlined Color">
            <Grid container spacing={3}>
              <Grid>
                <Chip label="Default" variant="outlined" />
              </Grid>
              <Grid>
                <Chip label="Secondary" variant="outlined" color="secondary" />
              </Grid>
              <Grid>
                <Chip label="Success" onDelete={handleDelete} variant="outlined" color="success" />
              </Grid>
              <Grid>
                <Chip label="Error" onDelete={handleDelete} variant="outlined" color="error" />
              </Grid>
              <Grid>
                <Chip label="secondary" onDelete={handleDelete} variant="outlined" color="secondary" />
              </Grid>
              <Grid>
                <Chip label="Disabled" disabled variant="outlined" />
              </Grid>
              <Grid>
                <Chip label="Clickable" variant="outlined" onClick={handleClick} onDelete={handleDelete} />
              </Grid>

              <Grid>
                <Chip
                  avatar={<Avatar sx={{ bgcolor: 'warning.dark', color: `${theme.palette.background.paper} !important` }}>AK</Avatar>}
                  label="Clickable deletable"
                  onClick={handleClick}
                  onDelete={handleDelete}
                  variant="outlined"
                  color="warning"
                />
              </Grid>
              <Grid>
                <Chip label="Clickable" avatar={<Avatar alt="Avatar 1" src={User1} />} onClick={handleClick} variant="outlined" />
              </Grid>
              <Grid>
                <Chip
                  label="Clickable"
                  avatar={<Avatar alt="Avatar 1" src={User1} />}
                  onClick={handleClick}
                  variant="outlined"
                  color="secondary"
                />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>

        <Grid size={12}>
          <SubCard title="Filled Color">
            <Grid container spacing={3}>
              <Grid>
                <Chip label="Default" />
              </Grid>
              <Grid>
                <Chip label="Secondary" color="secondary" />
              </Grid>
              <Grid>
                <Chip label="Success" onDelete={handleDelete} color="success" />
              </Grid>
              <Grid>
                <Chip label="Error" onDelete={handleDelete} color="error" />
              </Grid>
              <Grid>
                <Chip label="secondary" onDelete={handleDelete} color="secondary" />
              </Grid>
              <Grid>
                <Chip label="Disabled" disabled />
              </Grid>
              <Grid>
                <Chip label="Clickable" onClick={handleClick} onDelete={handleDelete} />
              </Grid>

              <Grid>
                <Chip
                  avatar={<Avatar sx={{ bgcolor: 'warning.dark', color: `${theme.palette.background.paper} !important` }}>AK</Avatar>}
                  label="Clickable delete"
                  onClick={handleClick}
                  onDelete={handleDelete}
                  color="warning"
                />
              </Grid>
              <Grid>
                <Chip label="Clickable" avatar={<Avatar alt="Avatar 1" src={User1} />} onClick={handleClick} />
              </Grid>
              <Grid>
                <Chip label="Clickable" avatar={<Avatar alt="Avatar 1" src={User1} />} onClick={handleClick} color="secondary" />
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
