// material-ui
import Grid from '@mui/material/Grid';

// project imports
import BlogCommonCard from './BlogCommonCard';
import Drafts from 'ui-component/cards/Blog/Drafts';
import TopLikes from 'ui-component/cards/Blog/TopLikes';
import HeadingTab from 'ui-component/cards/Blog/HeadingTab';
import CreateBlogCard from 'ui-component/cards/Blog/CreateBlogCard';
import DiscountCard from 'ui-component/cards/Blog/DiscountCard';
import TrendingArticles from 'ui-component/cards/Blog/TrendingArticles';
import TrendingHashtags from 'ui-component/cards/Blog/HashtagsCard';
import { hashTagData, draftData, articles, users } from '../data';
import { gridSpacing } from 'store/constant';

// assets
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';

// tab data
const tabData = [
  { label: 'All Post', icon: <ArticleOutlinedIcon /> },
  { label: 'React', icon: <MilitaryTechOutlinedIcon /> },
  { label: 'Angular', icon: <AssignmentOutlinedIcon /> },
  { label: 'Tips', icon: <ListAltOutlinedIcon /> }
];

// ==============================|| BLOG LIST ||============================== //

export default function BlogList() {
  return (
    <Grid container spacing={gridSpacing} sx={{ alignItems: 'flex-start' }}>
      <Grid size={{ xs: 12, lg: 8 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <HeadingTab tabs={tabData} />
          </Grid>
          <Grid size={12}>
            <BlogCommonCard />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, lg: 4 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={{ xs: 12, sm: 6, lg: 12 }}>
            <CreateBlogCard
              title="Create New Blog"
              learnMoreText="Learn more"
              description="Unleash your creativity by writing a new blog post. Share your unique insights, stories, and expertise with the world."
              buttonProps={{
                variant: 'contained',
                children: 'Create new blog',
                sx: { bgcolor: 'common.white', color: 'secondary.main' }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 12 }}>
            <DiscountCard discountText="Get Now 20% OFF" description="2D Games in JavaScript" buttonText="Download now" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 12 }}>
            <TrendingArticles articles={articles} title="Trending Articles" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 12 }}>
            <Drafts title="Drafts" avatarCount={6} draftData={draftData.slice(0, 2)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 12 }}>
            <TopLikes users={users} title="Top Likes this week" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 12 }}>
            <TrendingHashtags title="Trending Hashtag" blogData={hashTagData} showAcceptButton={false} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
