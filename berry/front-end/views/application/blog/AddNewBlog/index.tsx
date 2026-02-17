// material-ui
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';

// project imports
import AddNewForm from './AddNewForm';
import { gridSpacing } from 'store/constant';
import SubCard from 'ui-component/cards/SubCard';
import Categories from 'ui-component/cards/Blog/Categories';
import VideoCard from 'ui-component/cards/Blog/VideoCard';
import LikeCard from 'ui-component/cards/Blog/LikeCard';
import CommentCard from 'ui-component/cards/Blog/CommentCard';
import SocialCard from 'ui-component/cards/Blog/SocialCard';

// assets
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined';

// ==============================|| ADD NEW BLOG PAGE ||============================== //

export default function AddNewBlog() {
  return (
    <Grid container spacing={gridSpacing} sx={{ alignItems: 'flex-start' }}>
      <Grid size={{ xs: 12, md: 6, lg: 8 }}>
        <AddNewForm />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Categories />
          </Grid>
          <Grid size={12}>
            <SubCard
              title="Add Featured Image"
              contentSX={{ display: 'flex', justifyContent: 'center', alignItems: 'center', '&:last-child': { pb: 2.5 } }}
            >
              <Button variant="outlined" startIcon={<AddAPhotoOutlinedIcon />} color="primary" sx={{ textTransform: 'none' }}>
                Set featured image
              </Button>
            </SubCard>
          </Grid>
          <Grid size={12}>
            <VideoCard />
          </Grid>
          <Grid size={12}>
            <LikeCard />
          </Grid>
          <Grid size={12}>
            <CommentCard />
          </Grid>
          <Grid size={12}>
            <SocialCard />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
