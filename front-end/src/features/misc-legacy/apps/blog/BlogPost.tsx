// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import BlogDetail from '@/components/apps/blog/detail/BlogDetail';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import { BlogProvider } from "@/context/BlogContext"

const BlogPost = () => {
  const BCrumb = [
    {
      to: '/',
      title: 'Home',
    },
    {
      title: 'Blog',
    },
  ];
  return (
    <BlogProvider>
      <PageContainer title="Blog" description="this is Blog page">
        <Breadcrumb title="Blog app" items={BCrumb} />
        {/* ------------------------------------------- */}
        {/* Blog Listing */}
        {/* ------------------------------------------- */}
        <BlogDetail />
      </PageContainer>
    </BlogProvider>
  );
};

export default BlogPost;