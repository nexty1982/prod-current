import React from 'react';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import GalleryCard from 'ui-component/cards/GalleryCard';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { dispatch, useSelector } from 'store';
import { getGallery } from 'store/slices/user';

// types
import { GenericCardProps } from 'types';

// ==============================|| SOCIAL PROFILE - GALLERY ||============================== //

export default function Gallery() {
  const [gallery, setGallery] = React.useState<GenericCardProps[]>([]);
  const userState = useSelector((state) => state.user);
  React.useEffect(() => {
    setGallery(userState.gallery);
  }, [userState]);

  React.useEffect(() => {
    dispatch(getGallery());
  }, []);

  let galleryResult: React.ReactElement[] | React.ReactElement = <></>;
  if (gallery) {
    galleryResult = gallery.map((item, index) => (
      <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
        <GalleryCard {...item} />
      </Grid>
    ));
  }

  return (
    <MainCard
      title={
        <Grid container spacing={gridSpacing} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Grid>
            <Typography variant="h3">Gallery</Typography>
          </Grid>
          <Grid>
            <Button variant="contained" color="secondary">
              Add Photos
            </Button>
          </Grid>
        </Grid>
      }
    >
      <Grid container direction="row" spacing={gridSpacing}>
        {galleryResult}
      </Grid>
    </MainCard>
  );
}
