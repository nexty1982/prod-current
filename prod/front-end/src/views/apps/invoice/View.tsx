import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import { InvoiceProvider } from 'src/context/InvoiceContext/index';
import InvoiceView from 'src/components/apps/invoice/Invoice-view/index';
import BlankCard from 'src/components/shared/BlankCard';
import { CardContent } from '@mui/material';

const BCrumb = [
    {
        to: '/',
        title: 'Home',
    },
    {
        to: '/apps/invoice/list',
        title: 'Invoices',
    },
    {
        title: 'Invoice View',
    },
];

const InvoiceViewPage = () => {
    return (
        <InvoiceProvider>
            <PageContainer title="Invoice View" description="this is Invoice View">
                <Breadcrumb title="Invoice View" items={BCrumb} />
                <BlankCard>
                    <CardContent>
                        <InvoiceView />
                    </CardContent>
                </BlankCard>
            </PageContainer>
        </InvoiceProvider>
    );
};
export default InvoiceViewPage;
