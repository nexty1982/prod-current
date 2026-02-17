import { useEffect, useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';

// project imports
import RecentBlogList from './RecentBlogList';
import AnalyticsBarChart from './AnalyticsBarChart';
import Drafts from 'ui-component/cards/Blog/Drafts';
import CreateBlogCard from 'ui-component/cards/Blog/CreateBlogCard';
import HashtagsCard from 'ui-component/cards/Blog/HashtagsCard';
import { hashTagData, draftData } from '../data';
import { gridSpacing } from 'store/constant';

// ==============================|| DASHBOARD - BLOG PAGE ||============================== //

export default function BlogDashBoard() {
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <Grid container spacing={gridSpacing} sx={{ alignItems: 'flex-start' }}>
      <Grid size={12}>
        <AnalyticsBarChart isLoading={isLoading} />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <RecentBlogList />
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <Drafts title="Drafts" avatarCount={6} draftData={draftData} />
      </Grid>
      <Grid size={{ xs: 12, md: 12, lg: 4 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, md: 6, lg: 12 }}>
            <CreateBlogCard
              title="Create New Blog"
              description="Unleash your creativity by writing a new blog post. Share your unique insights, stories, and expertise with the world."
              buttonProps={{ variant: 'outlined', children: 'Create new blog' }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6, lg: 12 }}>
            <HashtagsCard title="Writing Challenges" blogData={hashTagData} showAcceptButton />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
