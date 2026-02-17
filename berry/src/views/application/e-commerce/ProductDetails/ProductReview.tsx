import { useEffect, useState, ReactElement } from 'react';

// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Rating from '@mui/material/Rating';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import ProductReview from 'ui-component/cards/ProductReview';
import { Products, Reviews } from 'types/e-commerce';
import { gridSpacing } from 'store/constant';
import { getProductReviews } from 'api/products';

// assets
import StarTwoToneIcon from '@mui/icons-material/StarTwoTone';
import StarBorderTwoToneIcon from '@mui/icons-material/StarBorderTwoTone';
import RateReviewTwoToneIcon from '@mui/icons-material/RateReviewTwoTone';

interface ProgressProps {
  like: number;
  star: number;
  value: number;
  color?: 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | undefined;
}

// progress
function LinearProgressWithLabel({ like, star, color, value, ...others }: ProgressProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ minWidth: 50 }}>
        <Typography variant="body2" color="textSecondary">{`${Math.round(star)} Stars`}</Typography>
      </Box>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress value={value} variant="determinate" color={color} {...others} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="subtitle1">{`(${Math.round(like)})`}</Typography>
      </Box>
    </Box>
  );
}

// ==============================|| PRODUCT DETAILS - REVIEWS ||============================== //

export default function ProductReviews({ product }: { product: Products }) {
  const [reviews, setReviews] = useState<Reviews[]>([]);
  const [loader, setLoader] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      await getProductReviews().then((response) => {
        setReviews(response.data.productReviews);
        setLoader(false);
      });
    })();
  }, []);

  let productReview: ReactElement | ReactElement[] = (
    <Grid size={12}>
      <List>
        {[1, 2, 3].map((index: number) => (
          <ListItem alignItems="flex-start" key={index} sx={{ mb: 2.5 }}>
            <ListItemAvatar sx={{ minWidth: 72 }}>
              <Skeleton variant="rectangular" width={62} height={62} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton animation="wave" height={22} />}
              secondary={
                <>
                  <Skeleton animation="wave" height={14} width="60%" />
                  <Skeleton animation="wave" height={18} width="20%" />
                  <Skeleton animation="wave" height={14} width="35%" sx={{ mt: 1.25 }} />
                  <Skeleton animation="wave" height={14} width="100%" />
                  <Skeleton animation="wave" height={14} width="55%" />
                </>
              }
            />
          </ListItem>
        ))}
      </List>
    </Grid>
  );

  if (reviews && !loader) {
    productReview = reviews.map((review, index) => (
      <Grid key={index} size={12}>
        <ProductReview
          avatar={review.profile.avatar}
          date={review.date}
          status={review.profile.status}
          name={review.profile.name}
          rating={review.rating}
          review={review.review}
        />
      </Grid>
    ));
  }

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, lg: 4 }}>
        <MainCard content={false} sx={{ height: '100%' }}>
          <CardContent sx={{ height: '100%' }}>
            {product && (
              <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="subtitle1">Average Rating</Typography>
                <Typography variant="h1" color="primary">
                  {Number((product.rating! < 4 ? product.rating! + 1 : product.rating!).toFixed(1))}/5
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Rating
                    name="simple-controlled"
                    value={product.rating! < 4 ? product.rating! + 1 : product.rating}
                    icon={<StarTwoToneIcon fontSize="inherit" />}
                    emptyIcon={<StarBorderTwoToneIcon fontSize="inherit" />}
                    readOnly
                    precision={0.1}
                  />
                  <Typography variant="caption">({product.salePrice! + product.offerPrice!})</Typography>
                </Stack>
              </Stack>
            )}
          </CardContent>
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <MainCard content={false} sx={{ height: '100%' }}>
          <CardContent>
            <Grid container spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid size={12}>
                <LinearProgressWithLabel color="secondary" star={1} value={15} like={125} />
              </Grid>
              <Grid size={12}>
                <LinearProgressWithLabel color="secondary" star={2} value={15} like={125} />
              </Grid>
              <Grid size={12}>
                <LinearProgressWithLabel color="secondary" star={3} value={20} like={160} />
              </Grid>
              <Grid size={12}>
                <LinearProgressWithLabel color="secondary" star={4} value={40} like={320} />
              </Grid>
              <Grid size={12}>
                <LinearProgressWithLabel color="secondary" star={5} value={10} like={80} />
              </Grid>
            </Grid>
          </CardContent>
        </MainCard>
      </Grid>
      <Grid size={{ xs: 12, md: 6, lg: 4 }}>
        <MainCard content={false} sx={{ height: '100%' }}>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={2} sx={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Button variant="outlined" size="large" startIcon={<RateReviewTwoToneIcon fontSize="inherit" />}>
                Write an Review
              </Button>
            </Stack>
          </CardContent>
        </MainCard>
      </Grid>
      {productReview}
      <Grid size={12}>
        <Stack direction="row" sx={{ justifyContent: 'center' }}>
          <Button variant="text"> Load more Comments </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}
