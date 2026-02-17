import { useEffect, useState } from 'react';

// material-ui
import { Theme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CardMedia from '@mui/material/CardMedia';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';

// project imports
import useConfig from 'hooks/useConfig';
import MainCard from 'ui-component/cards/MainCard';
import Avatar from 'ui-component/extended/Avatar';
import { Products } from 'types/e-commerce';
import { gridSpacing } from 'store/constant';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// third party
import Slider, { Settings } from 'react-slick';
import Lightbox from 'yet-another-react-lightbox';

// assets
import prod1 from 'assets/images/e-commerce/prod-1.png';
import prod2 from 'assets/images/e-commerce/prod-2.png';
import prod3 from 'assets/images/e-commerce/prod-3.png';
import prod4 from 'assets/images/e-commerce/prod-4.png';
import prod5 from 'assets/images/e-commerce/prod-5.png';
import prod6 from 'assets/images/e-commerce/prod-6.png';
import prod7 from 'assets/images/e-commerce/prod-7.png';
import prod8 from 'assets/images/e-commerce/prod-8.png';
import prod9 from 'assets/images/e-commerce/prod-9.png';

// data
const products = [prod1, prod2, prod3, prod4, prod5, prod6, prod7, prod8, prod9];

// ==============================|| PRODUCT DETAILS - IMAGES ||============================== //

export default function ProductImages({ product }: { product: Products }) {
  const { container, borderRadius } = useConfig();
  const downLG = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));

  const [selected, setSelected] = useState<string>('');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [index, setIndex] = useState(-1);

  const lgNo = downLG && !container ? 4 : 3;

  const settings: Settings = {
    rows: 1,
    dots: false,
    centerMode: true,
    swipeToSlide: true,
    focusOnSelect: true,
    initialSlide: Number(product.id) + 1,
    centerPadding: '0px',
    slidesToShow: products.length > 3 ? lgNo : products.length
  };

  useEffect(() => {
    const ProductImg = product && product?.image ? getImageUrl(`${product.image}`, ImagePath.ECOMMERCE) : '';
    const ImgIndex = products.findIndex((path) => ProductImg.includes(path));
    setSelected(product && product?.image ? getImageUrl(`${product.image}`, ImagePath.ECOMMERCE) : '');
    setPhotoIndex(ImgIndex);
  }, [product]);

  // Map over images to create an array for the lightbox
  const lightBox = products.map((image) => {
    return { src: image };
  });

  return (
    <>
      <Grid container spacing={gridSpacing} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <Grid size={12}>
          <MainCard content={false} sx={{ m: '0 auto' }}>
            <CardMedia
              onClick={() => setIndex(photoIndex)}
              component="img"
              image={selected}
              sx={{ borderRadius: `${borderRadius}px`, overflow: 'hidden', cursor: 'zoom-in' }}
              alt="product images"
            />
          </MainCard>
        </Grid>
        <Grid size={{ xs: 11, sm: 7, md: 9, lg: 10, xl: 8 }}>
          <Slider {...settings}>
            {products.map((item, index) => (
              <Box
                key={index}
                onClick={() => {
                  setSelected(item);
                  setPhotoIndex(index);
                }}
                sx={{ p: 1 }}
              >
                <Avatar
                  outline={selected === item}
                  size={downLG ? 'lg' : 'md'}
                  color="primary"
                  src={item}
                  variant="rounded"
                  sx={{ m: '0 auto', cursor: 'pointer' }}
                  alt="product images"
                />
              </Box>
            ))}
          </Slider>
        </Grid>
      </Grid>
      <Lightbox index={index} slides={lightBox} open={index >= 0} close={() => setIndex(-1)} />
    </>
  );
}
