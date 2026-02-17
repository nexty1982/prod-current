import { useEffect, useState } from 'react';

// material-ui
import { styled, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

// project imports
import MailDrawer from './MailDrawer';
import MailDetails from './MailDetails';
import MailList from './MailList';
import Loader from 'ui-component/Loader';

import { dispatch, useSelector } from 'store';
import { appDrawerWidth as drawerWidth, gridSpacing } from 'store/constant';
import { getMails, filterMails, setImportant, setStarred, setRead } from 'store/slices/mail';

// types
import { KeyedObject } from 'types';
import { MailProps, MailDetailsProps, MailBoxCount } from 'types/mail';

// drawer content element
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{ open: boolean }>(({ theme, open }) => ({
  width: 'calc(100% - 320px)',
  flexGrow: 1,
  paddingLeft: open ? theme.spacing(3) : 0,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.shorter
  }),
  marginLeft: `-${drawerWidth}px`,
  [theme.breakpoints.down('xl')]: {
    paddingLeft: 0,
    marginLeft: 0
  },
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.shorter
    }),
    marginLeft: 0
  })
}));

// ==============================|| MAIL MAIN PAGE ||============================== //

export default function MailPage() {
  const theme = useTheme();
  const matchDownSM = useMediaQuery(theme.breakpoints.down('xl'));
  const [loading, setLoading] = useState<boolean>(true);

  const [emailDetails, setEmailDetailsValue] = useState(false);
  const [selectedMail, setSelectedMail] = useState<MailProps | null>(null);
  const handleUserChange = async (data: MailProps | null) => {
    if (data) {
      await dispatch(setRead(data.id));
      await dispatch(getMails());
    }
    setSelectedMail(data);
    setEmailDetailsValue((prev) => !prev);
  };

  const [openMailSidebar, setOpenMailSidebar] = useState(true);
  const handleDrawerOpen = () => {
    setOpenMailSidebar((prevState) => !prevState);
  };

  useEffect(() => {
    if (matchDownSM) {
      setOpenMailSidebar(false);
    } else {
      setOpenMailSidebar(true);
    }
  }, [matchDownSM]);

  const [data, setData] = useState<MailProps[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<MailBoxCount>();
  const mailState = useSelector((state) => state.mail);

  useEffect(() => {
    setData(mailState.mails);
    setUnreadCounts(mailState.unreadCount);
  }, [mailState]);

  useEffect(() => {
    dispatch(getMails()).then(() => setLoading(false));
  }, []);

  const [filter, setFilter] = useState('all');
  const handleFilter = async (string: string) => {
    setEmailDetailsValue(false);
    setFilter(string);
    await dispatch(filterMails(string));
  };

  const handleImportantChange: MailDetailsProps['handleImportantChange'] = async (event, dataImportant) => {
    if (dataImportant) {
      await dispatch(setImportant(dataImportant.id));
      handleFilter(filter);
    }
  };

  const handleStarredChange: MailDetailsProps['handleStarredChange'] = async (event, dataStarred) => {
    if (dataStarred) {
      await dispatch(setStarred(dataStarred.id));
      handleFilter(filter);
    }
  };

  // search email using name
  const [search, setSearch] = useState('');
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newString = event.target.value;
    setSearch(newString);

    if (newString) {
      const newRows = data.filter((row: KeyedObject) => {
        let matches = true;

        const properties = ['name'];
        let containsQuery = false;

        properties.forEach((property) => {
          if (row.profile[property].toString().toLowerCase().includes(newString.toString().toLowerCase())) {
            containsQuery = true;
          }
        });

        if (!containsQuery) {
          matches = false;
        }
        return matches;
      });
      setData(newRows);
    } else {
      handleFilter(filter);
    }
  };

  if (loading) return <Loader />;

  return (
    <Box sx={{ display: 'flex' }}>
      <MailDrawer
        openMailSidebar={openMailSidebar}
        handleDrawerOpen={handleDrawerOpen}
        filter={filter}
        handleFilter={handleFilter}
        unreadCounts={unreadCounts}
      />
      <Main open={openMailSidebar}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            {/* mail details & list */}
            {emailDetails ? (
              <MailDetails
                data={selectedMail}
                handleUserDetails={(e, d) => handleUserChange(d)}
                handleImportantChange={handleImportantChange}
                handleStarredChange={handleStarredChange}
              />
            ) : (
              <MailList
                handleUserDetails={(e, d) => handleUserChange(d)}
                handleDrawerOpen={handleDrawerOpen}
                handleImportantChange={handleImportantChange}
                handleStarredChange={handleStarredChange}
                data={data}
                search={search}
                handleSearch={handleSearch}
              />
            )}
          </Grid>
        </Grid>
      </Main>
    </Box>
  );
}
