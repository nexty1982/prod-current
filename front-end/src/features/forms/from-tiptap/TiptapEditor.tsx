// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';

import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ParentCard from '@/shared/ui/ParentCard';
import TiptapEdit from './TiptapEdit';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Tiptap Editor',
  },
];

const TiptapEditor = () => {
  return (
    <PageContainer title="Tiptap Editor" description="this is Tiptap Editor page">
      {/* breadcrumb */}
      <Breadcrumb title="Tiptap Editor" items={BCrumb} />
      {/* end breadcrumb */}
      <ParentCard title="Tiptap Editor">
        <TiptapEdit />
      </ParentCard>
    </PageContainer>
  );
};

export default TiptapEditor;

