import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import KanbanPage from '@/features/misc-legacy/kanban';
import BlankCard from '@/shared/ui/BlankCard';
import { CardContent } from '@mui/material';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Kanban',
  },
];

const Kanban = () => {
  return (
    <PageContainer title="Kanban App" description="this is Kanban App">
      <Breadcrumb title="Task Management" items={BCrumb} />
      <BlankCard>
        <CardContent>
          <KanbanPage />
        </CardContent>
      </BlankCard>
    </PageContainer>
  );
};

export default Kanban;
