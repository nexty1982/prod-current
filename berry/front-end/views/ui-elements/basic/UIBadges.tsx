import React from 'react';

// material-ui
import { styled } from '@mui/material/styles';
import Badge, { BadgeProps } from '@mui/material/Badge';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import MainCard from 'ui-component/cards/MainCard';
import SecondaryAction from 'ui-component/cards/CardSecondaryAction';
import { gridSpacing } from 'store/constant';

// assets
import MailIcon from '@mui/icons-material/EmailTwoTone';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartTwoTone';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const CustomizedBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: -3,
    top: 13,
    border: `2px solid ${theme.palette.background.paper}`,
    padding: '0 4px'
  }
}));

const OutlinedBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
  '& .MuiBadge-badge': {
    background: theme.palette.background.paper,
    color: theme.palette.primary.main,
    border: `1px solid ${theme.palette.primary.main}`,
    padding: '0 4px'
  }
}));

const FillBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
  '& .MuiBadge-badge': {
    background: theme.palette.primary.light,
    color: theme.palette.primary.main,
    padding: '0 4px'
  }
}));

// style constant
const shapeStyles = { bgcolor: 'primary.light', width: 40, height: 40 };
const shapeCircleStyles = { borderRadius: '50%' };

// ===============================|| UI BADGES ||=============================== //

export default function UIBadges() {
  const rectangle = <Box sx={shapeStyles} />;
  const circle = <Box sx={{ ...shapeStyles, ...shapeCircleStyles }} />;

  const [count, setCount] = React.useState(1);
  const [invisible, setInvisible] = React.useState(false);
  const handleBadgeVisibility = () => {
    setInvisible(!invisible);
  };

  return (
    <MainCard title="Badges" secondary={<SecondaryAction link="https://next.material-ui.com/components/badges/" />}>
      <Grid container spacing={gridSpacing}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Basic">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid>
                <Badge badgeContent={4} color="default">
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge badgeContent={4} color="primary">
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge badgeContent={4} color="secondary">
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge badgeContent={4} color="error">
                  <MailIcon />
                </Badge>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Maximum Value Badges">
            <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
              <Grid>
                <Badge badgeContent={99} color="primary">
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge badgeContent={100} color="secondary">
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge badgeContent={1000} max={999} color="error">
                  <MailIcon />
                </Badge>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Dot Badges">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid>
                <Badge variant="dot" color="primary">
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge variant="dot" color="secondary">
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge variant="dot" color="error">
                  <Typography>Typography</Typography>
                </Badge>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Badge Alignment">
            <Grid container spacing={2} sx={{ justifyContent: 'center' }}>
              <Grid>
                <Badge badgeContent={4} color="primary" anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge variant="dot" color="error" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge badgeContent={4} color="primary" anchorOrigin={{ vertical: 'top', horizontal: 'left' }}>
                  <MailIcon />
                </Badge>
              </Grid>
              <Grid>
                <Badge variant="dot" color="error" anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
                  <MailIcon />
                </Badge>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Customized Badges">
            <Grid container spacing={3} sx={{ justifyContent: 'center', alignItems: 'center' }}>
              <Grid>
                <IconButton aria-label="cart" size="large">
                  <CustomizedBadge badgeContent={4} color="error">
                    <ShoppingCartIcon />
                  </CustomizedBadge>
                </IconButton>
              </Grid>
              <Grid>
                <FillBadge badgeContent={4}>
                  <MailIcon />
                </FillBadge>
              </Grid>
              <Grid>
                <OutlinedBadge badgeContent={4}>
                  <MailIcon />
                </OutlinedBadge>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Badge Visibility">
            <Grid container spacing={2} direction="column">
              <Grid>
                <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
                  <Grid>
                    <Badge color="secondary" badgeContent={count}>
                      <MailIcon />
                    </Badge>
                  </Grid>
                  <Grid>
                    <ButtonGroup>
                      <Button
                        aria-label="reduce"
                        onClick={() => {
                          setCount(Math.max(count - 1, 0));
                        }}
                      >
                        <RemoveIcon fontSize="small" />
                      </Button>
                      <Button
                        aria-label="increase"
                        onClick={() => {
                          setCount(count + 1);
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </Button>
                    </ButtonGroup>
                  </Grid>
                </Grid>
              </Grid>
              <Grid>
                <Grid container spacing={3} sx={{ justifyContent: 'center' }}>
                  <Grid>
                    <Badge color="secondary" variant="dot" invisible={invisible}>
                      <MailIcon />
                    </Badge>
                  </Grid>
                  <Grid>
                    <FormControlLabel
                      control={<Switch color="primary" checked={!invisible} onChange={handleBadgeVisibility} />}
                      label="Show Badge"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <SubCard title="Badge Overlap">
            <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
              <Grid>
                <Badge color="secondary" badgeContent=" ">
                  {rectangle}
                </Badge>
              </Grid>
              <Grid>
                <Badge color="secondary" badgeContent=" " variant="dot">
                  {rectangle}
                </Badge>
              </Grid>
              <Grid>
                <Badge color="secondary" overlap="circular" badgeContent=" ">
                  {circle}
                </Badge>
              </Grid>
              <Grid>
                <Badge color="secondary" overlap="circular" badgeContent=" " variant="dot">
                  {circle}
                </Badge>
              </Grid>
            </Grid>
          </SubCard>
        </Grid>
      </Grid>
    </MainCard>
  );
}
