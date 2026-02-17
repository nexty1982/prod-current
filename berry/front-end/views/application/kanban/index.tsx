import { useEffect, useState, SyntheticEvent } from 'react';
import { useLocation, Link, Outlet, useNavigate } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Grid from '@mui/material/Grid';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Box from '@mui/material/Box';

// project imports
import Loader from 'ui-component/Loader';
import MainCard from 'ui-component/cards/MainCard';
import Breadcrumbs from 'ui-component/extended/Breadcrumbs';

import { ThemeMode, DASHBOARD_PATH } from 'config';
import { dispatch } from 'store';
import { getUserStory, getUserStoryOrder, getProfiles, getComments, getItems, getColumns, getColumnsOrder } from 'store/slices/kanban';

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

// ==============================|| APPLICATION - KANBAN ||============================== //

export default function KanbanPage() {
  const theme = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  let tab = 'board';
  let breadcrumbTitle = '';
  let breadcrumbHeading = '';

  switch (pathname) {
    case '/apps/kanban/backlogs':
      tab = 'backlogs';
      breadcrumbTitle = 'backlogs';
      breadcrumbHeading = 'backlogs';
      break;
    case '/apps/kanban/board':
    default:
      tab = 'board';
      breadcrumbTitle = 'board';
      breadcrumbHeading = 'taskboard';
  }

  const [value, setValue] = useState(tab);
  const [loading, setLoading] = useState<boolean>(true);

  const handleChange = (event: SyntheticEvent, newValue: string) => {
    setValue(newValue);
    navigate(`/apps/kanban/${newValue}`);
  };

  useEffect(() => {
    setValue(tab);
  }, [tab]);

  let breadcrumbLinks = [{ title: 'home', to: DASHBOARD_PATH }, { title: 'kanban', to: '/apps/kanban/board' }, { title: breadcrumbTitle }];
  if (tab === 'board') {
    breadcrumbLinks = [{ title: 'home', to: DASHBOARD_PATH }, { title: 'kanban' }];
  }

  useEffect(() => {
    const items = dispatch(getItems());
    const columns = dispatch(getColumns());
    const columnOrder = dispatch(getColumnsOrder());
    const profile = dispatch(getProfiles());
    const comments = dispatch(getComments());
    const story = dispatch(getUserStory());
    const storyOrder = dispatch(getUserStoryOrder());

    Promise.all([items, columns, columnOrder, profile, comments, story, storyOrder]).then(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <>
      <Breadcrumbs custom heading={breadcrumbHeading} links={breadcrumbLinks} />
      <Box sx={{ display: 'flex' }}>
        <Grid container sx={{ width: 1 }}>
          <Grid size={12}>
            <MainCard contentSX={{ p: 2 }}>
              <Tabs
                value={value}
                variant="scrollable"
                onChange={handleChange}
                sx={{
                  px: 1,
                  pb: 2,
                  '& a': {
                    minWidth: 10,
                    px: 1,
                    py: 1.5,
                    mr: 2.25,
                    color: theme.palette.mode === ThemeMode.DARK ? 'grey.600' : 'grey.900',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center'
                  },
                  '& a.Mui-selected': {
                    color: 'primary.main'
                  },
                  '& a > svg': {
                    marginBottom: '0px !important',
                    mr: 1.25
                  }
                }}
              >
                <Tab
                  sx={{ textTransform: 'none' }}
                  component={Link}
                  value="board"
                  to="/apps/kanban/board"
                  label={value === 'board' ? 'Board' : 'View as Board'}
                  {...a11yProps(0)}
                />
                <Tab
                  sx={{ textTransform: 'none' }}
                  component={Link}
                  value="backlogs"
                  to="/apps/kanban/backlogs"
                  label={value === 'backlogs' ? 'Backlogs' : 'View as Backlog'}
                  {...a11yProps(1)}
                />
              </Tabs>
              <Outlet />
            </MainCard>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
