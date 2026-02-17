import { useState, SyntheticEvent } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import SubCard from 'ui-component/cards/SubCard';

// assets
import { IconPlus } from '@tabler/icons-react';
import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';

// ==============================|| QUICK ADD ||============================== //

const cardData = [
  { name: 'Client', number: 85 },
  { name: 'Items', number: 965 },
  { name: 'Invoices', number: 70 },
  { name: 'Quotes', number: 140 },
  { name: 'Purchase Order', number: 450 },
  { name: 'Bill', number: 1256 }
];

export default function QuickAdd() {
  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);

  const handleClick = (event: SyntheticEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <MainCard content={false} sx={{ px: 2, py: 2.5 }}>
      <Grid container spacing={3}>
        <Grid size={12}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography variant="h3" sx={{ fontWeight: 500 }}>
              Quick Add
            </Typography>
            <MoreHorizOutlinedIcon
              fontSize="small"
              sx={{ color: 'grey.500', cursor: 'pointer' }}
              aria-controls="menu-popular-card"
              aria-haspopup="true"
              onClick={handleClick}
            />
            <Menu
              id="menu-popular-card"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={handleClose}
              variant="selectedMenu"
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right'
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right'
              }}
            >
              <MenuItem onClick={handleClose}> Today</MenuItem>
              <MenuItem onClick={handleClose}> This Month</MenuItem>
              <MenuItem onClick={handleClose}> This Year</MenuItem>
            </Menu>
          </Stack>
        </Grid>
        <Grid size={12}>
          <Grid container spacing={2}>
            {cardData.map((card, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
                <SubCard content={false} sx={{ p: 2 }}>
                  <Stack spacing={2}>
                    <Typography variant="subtitle2" color="grey.700">
                      {card.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="h3">{card.number}</Typography>
                      <IconButton size="small" sx={{ borderRadius: 1.25, p: 0.5, border: '1px solid', borderColor: 'divider' }}>
                        <IconPlus size={14} />
                      </IconButton>
                    </Stack>
                  </Stack>
                </SubCard>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </MainCard>
  );
}
