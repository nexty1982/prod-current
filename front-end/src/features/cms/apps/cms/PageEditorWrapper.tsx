import React from 'react';
import { useParams } from 'react-router-dom';
import PageEditor from './PageEditor';
import PageContainer from '@/shared/ui/PageContainer';
import DashboardCard from '@/shared/ui/DashboardCard';

const PageEditorWrapper: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <PageContainer title="Page Editor" description="Edit page content">
      <DashboardCard title="Content Management">
        <PageEditor slug={slug || 'new-page'} />
      </DashboardCard>
    </PageContainer>
  );
};

export default PageEditorWrapper;
