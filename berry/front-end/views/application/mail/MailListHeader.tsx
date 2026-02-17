import { useState } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';

// assets
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import HeightIcon from '@mui/icons-material/Height';
import MoreHorizTwoToneIcon from '@mui/icons-material/MoreHorizTwoTone';
import SearchIcon from '@mui/icons-material/Search';

// project imports
import { MailListHeaderProps } from 'types/mail';

// ==============================|| MAIL LIST HEADER ||============================== //

export default function MailListHeader({
  search,
  handleSearch,
  length,
  rowsPerPage,
  page,
  handleChangePage,
  handleChangeRowsPerPage,
  handleDrawerOpen,
  handleDenseTable
}: MailListHeaderProps) {
  const matchDownSM = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClickSort = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseSort = () => {
    setAnchorEl(null);
  };

  return (
    <Grid container sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Grid size="grow">
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-start' }}>
          <IconButton onClick={handleDrawerOpen} size="small" aria-label="click to sidebar menu collapse">
            <MenuRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={handleDenseTable} size="small" aria-label="click to size change of mail">
            <HeightIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={handleClickSort} size="small" aria-label="more options">
            <MoreHorizTwoToneIcon fontSize="small" />
          </IconButton>
          <Menu id="simple-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleCloseSort}>
            <MenuItem onClick={handleCloseSort}>Name</MenuItem>
            <MenuItem onClick={handleCloseSort}>Date</MenuItem>
            <MenuItem onClick={handleCloseSort}>Ratting</MenuItem>
            <MenuItem onClick={handleCloseSort}>Unread</MenuItem>
          </Menu>
          <TextField
            sx={{ display: { xs: 'block', sm: 'none' } }}
            fullWidth={matchDownSM}
            onChange={handleSearch}
            placeholder="Search Mail"
            value={search}
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
        </Stack>
      </Grid>
      <Grid sx={{ display: { xs: 'none', sm: 'block' } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
          <TextField
            onChange={handleSearch}
            placeholder="Search Mail"
            value={search}
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }
            }}
          />
          {/* table pagination */}
          <TablePagination
            sx={{ '& .MuiToolbar-root': { pl: 1 } }}
            rowsPerPageOptions={[]}
            component="div"
            count={length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Stack>
      </Grid>
    </Grid>
  );
}
