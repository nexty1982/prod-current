import React from 'react';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import InvoiceList from '@/features/misc-legacy/apps/invoice/Invoice-list/index';
import { InvoiceProvider } from '@/context/InvoiceContext/index';
import BlankCard from '@/shared/ui/BlankCard';
import { CardContent } from '@mui/material';
import { logger } from '@/utils/logger';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Invoice List',
  },
];

const InvoiceListing = () => {
  // Component lifecycle logging
  React.useEffect(() => {
    logger.componentMount('Invoice List');
    logger.pageView('Invoice List', '/apps/invoice/list');

    return () => {
      logger.componentUnmount('Invoice List');
    };
  }, []);

  return (
    <InvoiceProvider>
      <PageContainer title="Invoice List" description="Modern invoice management system">
        <Breadcrumb title="Invoice List" items={BCrumb} />
        <BlankCard>
          <CardContent>
            <InvoiceList />
          </CardContent>
        </BlankCard>
      </PageContainer>
    </InvoiceProvider>
  );
};

export default InvoiceListing;
