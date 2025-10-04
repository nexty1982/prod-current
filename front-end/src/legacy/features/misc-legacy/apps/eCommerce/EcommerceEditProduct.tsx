import Grid2 from '@mui/material/Grid2';
import { Button, Grid, Stack } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import GeneralCard from '@/shared/ui/legacy/apps/ecommerce/productEdit/GeneralCard';
import MediaCard from '@/shared/ui/legacy/apps/ecommerce/productEdit/Media';
import VariationCard from '@/shared/ui/legacy/apps/ecommerce/productEdit/VariationCard';
import PricingCard from '@/shared/ui/legacy/apps/ecommerce/productEdit/Pricing';
import Thumbnail from '@/shared/ui/legacy/apps/ecommerce/productEdit/Thumbnail';
import StatusCard from '@/shared/ui/legacy/apps/ecommerce/productEdit/Status';
import ProductDetails from '@/shared/ui/legacy/apps/ecommerce/productEdit/ProductDetails';
import ProductTemplate from '@/shared/ui/legacy/apps/ecommerce/productEdit/ProductTemplate';
import CustomersReviews from '@/shared/ui/legacy/apps/ecommerce/productEdit/CustomersReviews';
import ProductAvgSales from '@/shared/ui/legacy/apps/ecommerce/productEdit/ProductAvgSales';
import BlankCard from '@/shared/ui/BlankCard';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Edit Product',
  },
];

const EcommerceEditProduct = () => {
  return (
    <PageContainer title="Edit Product" description="this is Edit Product">
      {/* breadcrumb */}
      <Breadcrumb title="Edit Product" items={BCrumb} />
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

              <BlankCard>
                <CustomersReviews />
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
                <ProductAvgSales />
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
    </PageContainer>
  );
};

export default EcommerceEditProduct;
