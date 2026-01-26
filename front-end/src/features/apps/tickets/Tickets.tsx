import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import TicketListing from '@/components/apps/tickets/TicketListing';
import TicketFilter from '@/components/apps/tickets/TicketFilter';
import ChildCard from '@/shared/ui/ChildCard';
import { TicketProvider } from '@/context/TicketContext';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Tickets',
  },
];

const TicketList = () => {
  return (
    <TicketProvider>
      <PageContainer title="Tickets App" description="this is Note page">
        <Breadcrumb title="Tickets app" items={BCrumb} />
        <ChildCard>
          <TicketFilter />
          <TicketListing />
        </ChildCard>
      </PageContainer>
    </TicketProvider>
  );
};

export default TicketList;
