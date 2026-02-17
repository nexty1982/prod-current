import React from 'react';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

// project imports
import UserList from './UserList';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';

// assets
import { IconSearch } from '@tabler/icons-react';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

// ==============================|| USER LIST STYLE 2 ||============================== //

export default function ListStylePage2() {
  const [anchorEl, setAnchorEl] = React.useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <MainCard
      title={
        <Grid container spacing={gridSpacing} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Grid>
            <Typography variant="h3">List</Typography>
          </Grid>
          <Grid>
            <OutlinedInput
              id="input-search-list-style2"
              placeholder="Search"
              startAdornment={
                <InputAdornment position="start">
                  <IconSearch stroke={1.5} size="16px" />
                </InputAdornment>
              }
              size="small"
            />
          </Grid>
        </Grid>
      }
    >
      <UserList />
      <Grid sx={{ mt: 1.75 }} size={12}>
        <Grid container spacing={gridSpacing} sx={{ justifyContent: 'space-between' }}>
          <Grid>
            <Pagination count={10} color="primary" />
          </Grid>
          <Grid>
            <Button
              variant="text"
              size="large"
              sx={{ color: 'grey.900' }}
              color="secondary"
              endIcon={<ExpandMoreRoundedIcon />}
              onClick={handleClick}
            >
              10 Rows
            </Button>
            <Menu
              id="menu-user-list-style2"
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
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
}
