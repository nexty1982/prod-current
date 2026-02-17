import React from 'react';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Pagination from '@mui/material/Pagination';

// project imports
import ContactCard from 'ui-component/cards/ContactCard';
import MainCard from 'ui-component/cards/MainCard';

import { dispatch, useSelector } from 'store';
import { gridSpacing } from 'store/constant';
import { getDetailCards, filterDetailCards } from 'store/slices/user';

// assets
import { IconSearch } from '@tabler/icons-react';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

// types
import { UserProfile } from 'types/user-profile';

// ==============================|| CONTACT CARD ||============================== //

export default function CrmContactCard() {
  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [anchorEl, setAnchorEl] = React.useState<Element | (() => Element) | null | undefined>(null);
  const [search, setSearch] = React.useState<string | undefined>('');

  const { detailCards } = useSelector((state) => state.user);

  React.useEffect(() => {
    setUsers(detailCards);
  }, [detailCards]);

  React.useEffect(() => {
    dispatch(getDetailCards());
  }, []);

  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | undefined) => {
    const newString = event?.target.value;
    setSearch(newString);

    if (newString) {
      dispatch(filterDetailCards(newString));
    } else {
      dispatch(getDetailCards());
    }
  };

  let usersResult: React.ReactElement | React.ReactElement[] = <></>;
  if (users) {
    usersResult = users.map((user, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, lg: 4, xl: 3 }}>
        <ContactCard
          avatar={user.avatar}
          name={user.name}
          role={user.role}
          email={user.email}
          contact={user.contact}
          location={user.location}
        />
      </Grid>
    ));
  }

  return (
    <MainCard
      title="Contact"
      secondary={
        <OutlinedInput
          id="input-search-card-style1"
          placeholder="Search"
          value={search}
          onChange={handleSearch}
          startAdornment={
            <InputAdornment position="start">
              <IconSearch stroke={1.5} size="16px" />
            </InputAdornment>
          }
          sx={{ width: { xs: 200, sm: 213 } }}
          size="small"
        />
      }
    >
      <Grid container direction="row" spacing={gridSpacing}>
        {usersResult}
        <Grid container spacing={gridSpacing} sx={{ justifyContent: 'space-between' }} size={12}>
          <Grid>
            <Pagination count={10} color="primary" />
          </Grid>
          <Grid>
            <Button
              variant="text"
              size="large"
              sx={{ color: 'grey.900' }}
              color="inherit"
              endIcon={<ExpandMoreRoundedIcon />}
              onClick={handleClick}
            >
              10 Rows
            </Button>
            {anchorEl && (
              <Menu
                id="menu-user-card-style1"
                anchorEl={anchorEl}
                keepMounted
                open={Boolean(anchorEl)}
                onClose={handleClose}
                variant="selectedMenu"
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right'
                }}
                transformOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right'
                }}
              >
                <MenuItem onClick={handleClose}> 10 Rows</MenuItem>
                <MenuItem onClick={handleClose}> 20 Rows</MenuItem>
                <MenuItem onClick={handleClose}> 30 Rows </MenuItem>
              </Menu>
            )}
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
}
