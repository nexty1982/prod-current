import { useState, SyntheticEvent } from 'react';

// material-ui
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';

// project imports
import SubCard from 'ui-component/cards/SubCard';
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';

// third party
import Lightbox from 'yet-another-react-lightbox';

// assets
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';

import Avatar1 from 'assets/images/users/avatar-1.png';
import Avatar2 from 'assets/images/users/avatar-3.png';
import Article1 from 'assets/images/blog/blog-1.png';
import Article2 from 'assets/images/blog/library-1.png';
import Article3 from 'assets/images/blog/library-2.png';
import Article4 from 'assets/images/blog/library-3.png';
import Article5 from 'assets/images/blog/blog-5.png';
import Article6 from 'assets/images/blog/blog-2.png';
import Article7 from 'assets/images/blog/blog-3.png';
import Article8 from 'assets/images/blog/blog-4.png';

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`
  };
}

const card1Images = [
  { src: Article1, title: 'Image 1' },
  { src: Article2, title: 'Image 2' },
  { src: Article3, title: 'Image 3' },
  { src: Article4, title: 'Image 4' }
];

const card2Images = [
  { src: Article5, title: 'Image 5' },
  { src: Article6, title: 'Image 6' },
  { src: Article7, title: 'Image 7' },
  { src: Article8, title: 'Image 8' }
];

const articles = [
  {
    avatar: Avatar1,
    title: 'Year Wrap-up 2022 - December Edition',
    name: 'John Doe',
    duration: '3 min read',
    images: card1Images,
    description:
      'A content management system is computer software used to manage the creation and modification of digital content. A CMS is typically used for enterprise content management.'
  },
  {
    avatar: Avatar2,
    title: 'Tech Trends 2024 - January Edition',
    name: 'Brendan Smith',
    duration: '5 min read',
    images: card2Images,
    description:
      'The Tech Trends 2024 - January Edition highlights the growing integration of generative AI in businesses, advances in spatial computing, and increasing focus on sustainability.'
  }
];

// ==============================|| BLOG - IMAGE SECTION ||============================== //

function ImageSection({ images }: { images: { src: string; title: string }[] }) {
  const [index, setIndex] = useState(-1);

  return (
    <>
      <Stack direction="row" sx={{ gap: 0.5 }}>
        {images.map((image, index) => (
          <Card
            key={index}
            onClick={() => setIndex(index)}
            sx={{ cursor: 'pointer', width: { xs: 50, sm: 100, md: 140 }, height: { xs: 50, sm: 100, md: 140 } }}
          >
            <CardMedia component="img" image={image.src} alt={image.title} sx={{ objectPosition: 'center', height: '100%' }} />
          </Card>
        ))}
      </Stack>
      <Lightbox index={index} slides={images} open={index >= 0} close={() => setIndex(-1)} />
    </>
  );
}

// ==============================|| BLOG - YOUR LIBRARY ||============================== //

export default function YourLibrary() {
  const [tabValue, setTabValue] = useState(0);

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <MainCard
      content={false}
      title="Your Library"
      secondary={
        <Box sx={{ 'MuiTabs-root a': { p: { xs: '3px 4px', sm: 'initial' } } }}>
          <Tabs
            value={tabValue}
            variant="scrollable"
            onChange={handleChange}
            sx={{
              p: 0,
              '& .MuiTab-root': {
                borderRadius: 1,
                color: 'grey.600',
                textTransform: 'none',
                '&.Mui-selected': {
                  color: 'primary.main',
                  bgcolor: 'primary.light'
                }
              },
              '& .MuiTabs-flexContainer': {
                border: 0,
                gap: 0.25
              },
              '& .MuiTabs-indicator': {
                display: 'none'
              }
            }}
          >
            <Tab label="Your lists" {...a11yProps(0)} />
            <Tab label="Save lists" {...a11yProps(1)} />
            <Tab label="Highlights" {...a11yProps(2)} />
            <Tab label="Reading history" {...a11yProps(2)} />
          </Tabs>
        </Box>
      }
      sx={{
        '& .MuiCardHeader-action': { maxWidth: { xs: '95%', sm: '70%' } },
        '& .MuiCardHeader-root': { flexWrap: 'wrap', gap: 1.5 }
      }}
    >
      <CardContent>
        <Stack sx={{ gap: 2 }}>
          {articles.map((article, index) => (
            <SubCard key={index} contentSX={{ '&:last-child': { pb: 2.5 } }}>
              <Stack sx={{ gap: 1.25 }}>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                    <Avatar size="badge" alt="User 1" src={article.avatar} />
                    <Typography variant="h6">{article.name}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
                    <FiberManualRecordTwoToneIcon sx={{ color: 'text.disabled', fontSize: 8 }} />
                    <Typography variant="caption">{article.duration}</Typography>
                  </Stack>
                </Stack>
                <Stack sx={{ gap: 0.5 }}>
                  <Typography variant="h4" sx={{ fontWeight: 500 }}>
                    {article.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'grey.500' }}>
                    {article.description}
                  </Typography>
                </Stack>
                <ImageSection images={article.images} />
              </Stack>
            </SubCard>
          ))}
        </Stack>
      </CardContent>
    </MainCard>
  );
}
