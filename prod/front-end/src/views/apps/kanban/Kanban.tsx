import Breadcrumb from 'src/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from 'src/components/container/PageContainer';
import KanbanPage from 'src/pages/kanban';
import BlankCard from 'src/components/shared/BlankCard';
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
