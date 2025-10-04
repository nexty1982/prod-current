// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import { Divider, Box } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';
import ChatSidebar from '@/features/misc-legacy/apps/chats/ChatSidebar';
import ChatContent from '@/features/misc-legacy/apps/chats/ChatContent';
import ChatMsgSent from '@/features/misc-legacy/apps/chats/ChatMsgSent';
import AppCard from '@/shared/ui/AppCard';
import { ChatProvider } from '@/context/ChatContext';

const Chats = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const BCrumb = [
    {
      to: '/',
      title: 'Home',
    },
    {
      title: 'Chat',
    },
  ];
  return (
    <ChatProvider>
      <PageContainer title="Chat ui" description="this is Chat page">
        <Breadcrumb title="Chat app" items={BCrumb} />
        <AppCard>
          {/* ------------------------------------------- */}
          {/* Left part */}
          {/* ------------------------------------------- */}

          <ChatSidebar
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
          {/* ------------------------------------------- */}
          {/* Right part */}
          {/* ------------------------------------------- */}

          <Box flexGrow={1}>
            <ChatContent toggleChatSidebar={() => setMobileSidebarOpen(true)} />
            <Divider />
            <ChatMsgSent />
          </Box>
        </AppCard>
      </PageContainer>
    </ChatProvider>
  );
};

export default Chats;
