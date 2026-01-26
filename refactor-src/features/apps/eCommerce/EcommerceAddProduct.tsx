import { Button, Stack } from '@mui/material';
import Grid from '@/components/compat/Grid2';
import Grid2 from '@/components/compat/Grid2';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import GeneralCard from '@/components/apps/ecommerce/productAdd/GeneralCard';
import MediaCard from '@/components/apps/ecommerce/productAdd/Media';
import VariationCard from '@/components/apps/ecommerce/productAdd/VariationCard';
import PricingCard from '@/components/apps/ecommerce/productAdd/Pricing';
import Thumbnail from '@/components/apps/ecommerce/productAdd/Thumbnail';
import StatusCard from '@/components/apps/ecommerce/productAdd/Status';
import ProductDetails from '@/components/apps/ecommerce/productAdd/ProductDetails';
import ProductTemplate from '@/components/apps/ecommerce/productAdd/ProductTemplate';
import BlankCard from '@/shared/ui/BlankCard';


const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Add Product',
  },
];

const EcommerceAddProduct = () => {
  return (

    (<PageContainer title="Add Product" description="this is Add Product">
      {/* breadcrumb */}
      <Breadcrumb title="Add Product" items={BCrumb} />
      <form>
        <Grid2 container spacing={3}>
          <Grid2
            size={{
              lg: 8
            }}>
            <Stack spacing={3}>
              <BlankCard>
                <GeneralCard />
              </BlankCard>

              <BlankCard>
                <MediaCard />
              </BlankCard>

              <BlankCard>
                <VariationCard />
              </BlankCard>

              <BlankCard>
                <PricingCard />
              </BlankCard>
            </Stack>
          </Grid2>

          <Grid2
            size={{
              lg: 4
            }}>
            <Stack spacing={3}>
              <BlankCard>
                <Thumbnail />
              </BlankCard>

              <BlankCard>
                <StatusCard />
              </BlankCard>

              <BlankCard>
                <ProductDetails />
              </BlankCard>

              <BlankCard>
                <ProductTemplate />
              </BlankCard>
            </Stack>
          </Grid2>
        </Grid2>

        <Stack direction="row" spacing={2} mt={3}>
          <Button variant="contained" color="primary">
            Save Changes
          </Button>
          <Button variant="outlined" color="error">
            Cancel
          </Button>
        </Stack>
      </form>
    </PageContainer>)
  );
};

export default EcommerceAddProduct;
