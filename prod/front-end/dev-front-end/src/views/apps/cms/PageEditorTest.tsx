import React from 'react';
import { useParams } from 'react-router-dom';
import PageEditor from './PageEditor';
import PageContainer from 'src/components/container/PageContainer';

const PageEditorTest: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  
  return (
    <PageContainer title="Page Editor" description="Edit page content">
      <PageEditor slug={slug || 'test-page'} />
    </PageContainer>
  );
};

export default PageEditorTest;
