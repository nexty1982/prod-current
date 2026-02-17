import { ChangeEvent, KeyboardEvent, useState } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';

// third party
import { Chance } from 'chance';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';
import { ThemeDirection, ThemeMode } from 'config';
import useConfig from 'hooks/useConfig';
import { openSnackbar } from 'store/slices/snackbar';
import { useDispatch, useSelector } from 'store';
import { addColumn } from 'store/slices/kanban';

const chance = new Chance();

// ==============================|| KANBAN BOARD - ADD COLUMN ||============================== //

export default function AddColumn() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { themeDirection } = useConfig();

  const [title, setTitle] = useState('');
  const [isTitle, setIsTitle] = useState(false);

  const [isAddColumn, setIsAddColumn] = useState(false);
  const { columns, columnsOrder } = useSelector((state) => state.kanban);
  const handleAddColumnChange = () => {
    setIsAddColumn((prev) => !prev);
  };

  const addNewColumn = () => {
    if (title.length > 0) {
      const newColumn = {
        id: `${chance.integer({ min: 1000, max: 9999 })}`,
        title,
        itemIds: []
      };

      dispatch(addColumn(newColumn, columns, columnsOrder));
      dispatch(
        openSnackbar({
          open: true,
          message: 'Column Add successfully',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          variant: 'alert',
          alert: {
            color: 'success'
          },
          close: false
        })
      );
      setIsAddColumn((prev) => !prev);
      setTitle('');
    } else {
      setIsTitle(true);
    }
  };

  const handleAddColumn = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.keyCode === 13) {
      addNewColumn();
    }
  };

  const handleColumnTitle = (event: ChangeEvent<HTMLInputElement>) => {
    const newTitle = event.target.value;
    setTitle(newTitle);
    if (newTitle.length <= 0) {
      setIsTitle(true);
    } else {
      setIsTitle(false);
    }
  };

  return (
    <MainCard
      sx={{
        minWidth: 250,
        bgcolor: theme.palette.mode === ThemeMode.DARK ? 'background.default' : 'primary.light',
        height: '100%',
        ...(themeDirection === ThemeDirection.RTL && { marginLeft: 2 })
      }}
      contentSX={{ p: 1.5, '&:last-of-type': { pb: 1.5 } }}
    >
      <Grid container spacing={1} sx={{ alignItems: 'center' }}>
        {isAddColumn && (
          <Grid size={12}>
            <SubCard contentSX={{ p: 2, transition: 'background-color 0.25s ease-out' }}>
              <Grid container spacing={0.5} sx={{ alignItems: 'center' }}>
                <Grid size={12}>
                  <TextField
                    fullWidth
                    placeholder="Add Column"
                    value={title}
                    onChange={handleColumnTitle}
                    sx={{
                      mb: 2,
                      '& input': { bgcolor: 'transparent', p: 0, borderRadius: '0px' },
                      '& fieldset': { display: 'none' },
                      '& .MuiFormHelperText-root': {
                        ml: 0
                      },
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'transparent'
                      }
                    }}
                    onKeyUp={handleAddColumn}
                    helperText={isTitle ? 'Column title is required.' : ''}
                    error={isTitle}
                  />
                </Grid>
                <Grid size="grow" />
                <Grid>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Button variant="text" color="error" sx={{ width: '100%' }} onClick={handleAddColumnChange}>
                      Cancel
                    </Button>
                    <Button variant="contained" color="primary" onClick={addNewColumn} size="small">
                      Add
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </SubCard>
          </Grid>
        )}
        {!isAddColumn && (
          <Grid size={12}>
            <Button variant="text" color="primary" sx={{ width: '100%' }} onClick={handleAddColumnChange}>
              Add Column
            </Button>
          </Grid>
        )}
      </Grid>
    </MainCard>
  );
}
