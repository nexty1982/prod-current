import React from 'react';
import { useParams } from 'react-router-dom';
import EnhancedPageEditor from './EnhancedPageEditor';

const EnhancedPageEditorTest: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  
  return (
    <EnhancedPageEditor 
      slug={slug || 'new-page'}
      onSave={(pageData) => {
        console.log('Page saved:', pageData);
      }}
    />
  );
};

export default EnhancedPageEditorTest;
