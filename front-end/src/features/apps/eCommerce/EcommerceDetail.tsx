import Grid from '@/components/compat/Grid2';
import ProductCarousel from '@/components/apps/ecommerce/productDetail/ProductCarousel';
import Grid2 from '@/components/compat/Grid2';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ProductDetail from '@/components/apps/ecommerce/productDetail/ProductDetail';
import ProductDesc from '@/components/apps/ecommerce/productDetail/ProductDesc';
import ProductRelated from '@/components/apps/ecommerce/productDetail/ProductRelated';
import ChildCard from '@/shared/ui/ChildCard';
import { ProductProvider } from '@/context/EcommerceContext';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Shop',
    to: '/apps/ecommerce',
  },
  {
    title: 'detail',
  },
];

const EcommerceDetail = () => {
  return (
    <ProductProvider>
      <PageContainer title="Shop List" description="this is Shop List page">
        {/* breadcrumb */}
        <Breadcrumb title="Product Detail" items={BCrumb} />
        <Grid2 container spacing={3} sx={{ maxWidth: { lg: '1055px', xl: '1200px' } }}>
          <Grid2
            size={{
              xs: 12,
              sm: 12,
              lg: 12
            }}>
            <ChildCard>
              {/* ------------------------------------------- */}
              {/* Carousel */}
              {/* ------------------------------------------- */}
              <Grid2 container spacing={3}>
                <Grid2
                  size={{
                    xs: 12,
                    sm: 12,
                    lg: 6
                  }}>
                  <ProductCarousel />
                </Grid2>
                <Grid2
                  size={{
                    xs: 12,
                    sm: 12,
                    lg: 6
                  }}>
                  <ProductDetail />
                </Grid2>
              </Grid2>
            </ChildCard>
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 12,
              lg: 12
            }}>
            <ProductDesc />
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 12,
              lg: 12
            }}>
            <ProductRelated />
          </Grid2>
        </Grid2>
      </PageContainer>
    </ProductProvider>
  );
};

export default EcommerceDetail;
