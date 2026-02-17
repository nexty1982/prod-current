// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Grid, { GridProps } from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// third party
import { format } from 'date-fns';

// assets
import { IconChevronLeft, IconChevronRight, IconLayoutGrid, IconTemplate, IconLayoutList, IconListNumbers } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

// constant
const viewOptions = [
  {
    label: 'Month',
    value: 'dayGridMonth',
    icon: IconLayoutGrid
  },
  {
    label: 'Week',
    value: 'timeGridWeek',
    icon: IconTemplate
  },
  {
    label: 'Day',
    value: 'timeGridDay',
    icon: IconLayoutList
  },
  {
    label: 'Agenda',
    value: 'listWeek',
    icon: IconListNumbers
  }
];

// ==============================|| CALENDAR TOOLBAR ||============================== //

interface ToolbarProps {
  date: number | Date;
  view: string;
  onClickNext: () => void;
  onClickPrev: () => void;
  onClickToday: () => void;
  onChangeView: (s: string) => void;
  sx?: GridProps['sx'];
}

export default function Toolbar({ date, view, onClickNext, onClickPrev, onClickToday, onChangeView, sx, ...others }: ToolbarProps) {
  const matchSm = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const [newViewOption, setNewViewOption] = useState(viewOptions);

  useEffect(() => {
    let newOption = viewOptions;
    if (matchSm) {
      newOption = viewOptions.filter((options) => options.value !== 'dayGridMonth' && options.value !== 'timeGridWeek');
    }
    setNewViewOption(newOption);
  }, [matchSm]);

  return (
    <Grid container spacing={3} {...others} sx={{ alignItems: 'center', justifyContent: 'space-between', pb: 3, ...sx }}>
      <Grid>
        <Button variant="outlined" onClick={onClickToday}>
          Today
        </Button>
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', gap: { xs: 0.5, md: 3 }, justifyContent: { xs: 'space-between', sm: 'center' } }}
        >
          <IconButton onClick={onClickPrev} size="small">
            <IconChevronLeft />
          </IconButton>
          <Typography variant="h3" color="textPrimary">
            {format(date, 'MMMM yyyy')}
          </Typography>
          <IconButton onClick={onClickNext} size="small">
            <IconChevronRight />
          </IconButton>
        </Stack>
      </Grid>
      <Grid>
        <ButtonGroup variant="outlined" aria-label="outlined button group">
          {newViewOption.map((viewOption) => {
            const Icon = viewOption.icon;
            return (
              <Tooltip title={viewOption.label} key={viewOption.value}>
                <Button
                  disableElevation
                  variant={viewOption.value === view ? 'contained' : 'outlined'}
                  onClick={() => onChangeView(viewOption.value)}
                >
                  <Icon stroke="2" size="20px" />
                </Button>
              </Tooltip>
            );
          })}
        </ButtonGroup>
      </Grid>
    </Grid>
  );
}
