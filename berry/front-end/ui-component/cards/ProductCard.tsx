import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// material-ui
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from './MainCard';
import SkeletonProductPlaceholder from 'ui-component/cards/Skeleton/ProductPlaceholder';
import { useDispatch, useSelector } from 'store';
import { addProduct } from 'store/slices/cart';
import { openSnackbar } from 'store/slices/snackbar';
import { ProductCardProps } from 'types/cart';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import ShoppingCartTwoToneIcon from '@mui/icons-material/ShoppingCartTwoTone';

// ==============================|| PRODUCT CARD ||============================== //

export default function ProductCard({ id, color, name, image, description, offerPrice, salePrice, rating }: ProductCardProps) {
  const dispatch = useDispatch();

  const [productRating] = useState<number | undefined>(rating);
  const cart = useSelector((state) => state.cart);

  const addCart = () => {
    dispatch(addProduct({ id, name, image, salePrice, offerPrice, color, size: 8, quantity: 1 }, cart.checkout.products));
    dispatch(
      openSnackbar({
        open: true,
        message: 'Add To Cart Success',
        variant: 'alert',
        alert: {
          color: 'success'
        },
        close: false
      })
    );
  };

  const [isLoading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <>
      {isLoading ? (
        <SkeletonProductPlaceholder />
      ) : (
        <MainCard
          content={false}
          boxShadow
          sx={{
            '&:hover': {
              transform: 'scale3d(1.02, 1.02, 1)',
              transition: 'all .4s ease-in-out'
            }
          }}
        >
          <CardMedia
            sx={{ height: 220 }}
            image={image && getImageUrl(`${image}`, ImagePath.ECOMMERCE)}
            title="Contemplative Reptile"
            component={Link}
            to={`/apps/e-commerce/product-details/${id}`}
          />
          <CardContent sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid size={12}>
                <Typography
                  component={Link}
                  to={`/apps/e-commerce/product-details/${id}`}
                  variant="subtitle1"
                  noWrap
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', textDecoration: 'none' }}
                >
                  {name}
                </Typography>
              </Grid>
              {description && (
                <Grid size={12}>
                  <Typography variant="body2" sx={{ overflow: 'hidden', height: 45 }}>
                    {description}
                  </Typography>
                </Grid>
              )}
              <Grid sx={{ pt: '8px !important' }} size={12}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Rating precision={0.5} name="size-small" value={productRating} size="small" readOnly />
                  <Typography variant="caption">({Math.round(Number(offerPrice))}+)</Typography>
                </Stack>
              </Grid>
              <Grid size={12}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Grid container spacing={1}>
                    <Grid>
                      <Typography variant="h4">${offerPrice}</Typography>
                    </Grid>
                    {salePrice && (
                      <Grid>
                        <Typography variant="h6" sx={{ color: 'grey.500', textDecoration: 'line-through' }}>
                          ${salePrice}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  <Button variant="contained" sx={{ minWidth: 0 }} onClick={addCart} aria-label="product add to cart">
                    <ShoppingCartTwoToneIcon fontSize="small" />
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </MainCard>
      )}
    </>
  );
}
