import React from 'react';
import { useParams } from 'react-router';
import SimplePageEditor from './SimplePageEditor';

const SimplePageEditorTest: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  
  return (
    <SimplePageEditor 
      slug={slug || 'new-page'}
      onSave={(pageData) => {
        console.log('Page saved:', pageData);
      }}
    />
  );
};

export default SimplePageEditorTest;
