// material-ui
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CardMedia from '@mui/material/CardMedia';

// project imports
import EditForm from './EditForm';
import { gridSpacing } from 'store/constant';
import SubCard from 'ui-component/cards/SubCard';
import Categories from 'ui-component/cards/Blog/Categories';
import VideoCard from 'ui-component/cards/Blog/VideoCard';
import LikeCard from 'ui-component/cards/Blog/LikeCard';
import CommentCard from 'ui-component/cards/Blog/CommentCard';
import SocialCard from 'ui-component/cards/Blog/SocialCard';

// assets
import AddAPhotoOutlinedIcon from '@mui/icons-material/AddAPhotoOutlined';

import Blog1 from 'assets/images/blog/blog-2.png';

// ==============================|| EDIT BLOG PAGE ||============================== //

export default function EditBlog() {
  return (
    <Grid container spacing={gridSpacing} sx={{ alignItems: 'flex-start' }}>
      <Grid size={{ xs: 12, md: 6, lg: 8 }}>
        <EditForm />
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
              <Stack sx={{ alignItems: 'center', gap: 2 }}>
                <CardMedia component="img" image={Blog1} title="image1" width="100%" sx={{ borderRadius: 2 }} />
                <Button variant="outlined" startIcon={<AddAPhotoOutlinedIcon />} color="primary" sx={{ textTransform: 'none' }}>
                  Set featured image
                </Button>
              </Stack>
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
