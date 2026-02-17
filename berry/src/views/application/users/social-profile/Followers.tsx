import React from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';

// project imports
import FollowerCard from 'ui-component/cards/FollowerCard';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { dispatch, useSelector } from 'store';
import { getFollowers, filterFollowers } from 'store/slices/user';

// assets
import { IconSearch } from '@tabler/icons-react';

// types
import { FollowerCardProps } from 'types/user';

// ==============================|| SOCIAL PROFILE - FOLLOWERS ||============================== //

export default function Followers() {
  const [followers, setFollowers] = React.useState<FollowerCardProps[]>([]);
  const userState = useSelector((state) => state.user);

  React.useEffect(() => {
    setFollowers(userState.followers);
  }, [userState]);

  React.useEffect(() => {
    dispatch(getFollowers());
  }, []);

  const [search, setSearch] = React.useState<string | undefined>('');
  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | undefined) => {
    const newString = event?.target.value;
    setSearch(newString);

    if (newString) {
      dispatch(filterFollowers(newString));
    } else {
      dispatch(getFollowers());
    }
  };

  let followersResult: React.ReactElement | React.ReactElement[] = <></>;
  if (followers) {
    followersResult = followers.map((follower, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <FollowerCard {...follower} />
      </Grid>
    ));
  }

  return (
    <MainCard
      title={
        <Grid container spacing={gridSpacing} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Grid>
            <Typography variant="h3">Followers</Typography>
          </Grid>
          <Grid>
            <OutlinedInput
              size="small"
              id="input-search-user-profile"
              placeholder="Search Followers"
              value={search}
              onChange={handleSearch}
              startAdornment={
                <InputAdornment position="start">
                  <IconSearch stroke={1.5} size="16px" />
                </InputAdornment>
              }
            />
          </Grid>
        </Grid>
      }
    >
      <Grid container direction="row" spacing={gridSpacing}>
        {followersResult}
      </Grid>
    </MainCard>
  );
}
