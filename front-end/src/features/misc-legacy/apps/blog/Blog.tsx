// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import BlogListing from '@/components/apps/blog/BlogListing';
import { BlogProvider } from "@/context/BlogContext"

const Blog = () => {
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
        <BlogListing />
      </PageContainer>
    </BlogProvider>

  );
};

export default Blog;
