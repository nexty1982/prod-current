import React from 'react';
import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import InvoiceList from 'src/components/apps/invoice/Invoice-list/index';
import { InvoiceProvider } from 'src/context/InvoiceContext/index';
import BlankCard from 'src/components/shared/BlankCard';
import { CardContent } from '@mui/material';
import { logger } from 'src/utils/logger';

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
