import React from 'react';

// material-ui
import Checkbox from '@mui/material/Checkbox';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { ChangeEventFunc } from 'types';

// assets
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Stack } from '@mui/material';

// ===========================|| DATA WIDGET - TODO LIST ||=========================== //

export default function ToDoList() {
  const [state, setState] = React.useState({
    checkedA: true,
    checkedB: true,
    checkedC: true,
    checkedD: false,
    checkedE: false,
    checkedF: false
  });
  const handleChangeState: ChangeEventFunc = (event) => {
    setState({ ...state, [event.target.name]: event.target.checked });
  };

  return (
    <MainCard title="To Do List" content={false}>
      <CardContent>
        <Grid container spacing={0} sx={{ '& .Mui-checked + span': { textDecoration: 'line-through' } }}>
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={state.checkedA} onChange={handleChangeState} name="checkedA" color="primary" />}
              label="Check your Email"
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={state.checkedB} onChange={handleChangeState} name="checkedB" color="primary" />}
              label="Make YouTube Video"
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={state.checkedC} onChange={handleChangeState} name="checkedC" color="primary" />}
              label="Create Banner"
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={state.checkedD} onChange={handleChangeState} name="checkedD" color="primary" />}
              label="Upload Project"
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={state.checkedE} onChange={handleChangeState} name="checkedE" color="primary" />}
              label="Update Task"
            />
          </Grid>
          <Grid size={12}>
            <FormControlLabel
              control={<Checkbox checked={state.checkedF} onChange={handleChangeState} name="checkedF" color="primary" />}
              label="Task Issue"
            />
          </Grid>
        </Grid>
      </CardContent>
      <Divider />
      <CardActions>
        <Stack direction="row-reverse" sx={{ width: 1 }}>
          <Fab size="small" color="primary" aria-label="new todo add">
            <AddRoundedIcon fontSize="small" />
          </Fab>
        </Stack>
      </CardActions>
    </MainCard>
  );
}
