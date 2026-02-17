import React from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Typography from '@mui/material/Typography';

// project imports
import FriendRequestCard from 'ui-component/cards/FriendRequestCard';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { dispatch, useSelector } from 'store';
import { getFriendRequests, filterFriendRequests } from 'store/slices/user';

// assets
import { IconSearch } from '@tabler/icons-react';

// types
import { FriendRequestCardProps } from 'types/user';

// ==============================|| SOCIAL PROFILE - FRIEND REQUEST ||============================== //

export default function FriendRequest() {
  const [friendRequest, setFriendRequest] = React.useState<FriendRequestCardProps[]>([]);
  const userState = useSelector((state) => state.user);

  const [search, setSearch] = React.useState<string | undefined>('');

  const handleSearch = async (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | undefined) => {
    const newString = event?.target.value;
    setSearch(newString);

    if (newString) {
      dispatch(filterFriendRequests(newString));
    } else {
      dispatch(getFriendRequests());
    }
  };

  React.useEffect(() => {
    setFriendRequest(userState.friendRequests);
  }, [userState]);

  React.useEffect(() => {
    dispatch(getFriendRequests());
  }, []);

  let friendRequestResult: React.ReactElement | React.ReactElement[] = <></>;
  if (friendRequest) {
    friendRequestResult = friendRequest.map((friend, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <FriendRequestCard {...friend} />
      </Grid>
    ));
  }

  return (
    <MainCard
      title={
        <Grid container spacing={gridSpacing} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Grid>
            <Typography variant="h3">Friend Request</Typography>
          </Grid>
          <Grid>
            <OutlinedInput
              size="small"
              id="input-search-user-profile"
              placeholder="Search Friends"
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
        {friendRequestResult}
      </Grid>
    </MainCard>
  );
}
