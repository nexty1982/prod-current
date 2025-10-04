import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import { InvoiceProvider } from '@/context/InvoiceContext/index';
import InvoiceView from '@/features/misc-legacy/apps/invoice/Invoice-view/index';
import BlankCard from '@/shared/ui/BlankCard';
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
