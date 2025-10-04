import { useState } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/features/misc-legacy/container/PageContainer';
import NoteSidebar from '@/features/misc-legacy/apps/notes/NoteSidebar';
import NoteContent from '@/features/misc-legacy/apps/notes/NoteContent';
import AppCard from '@/shared/ui/AppCard';
import { NotesProvider } from '@/context/NotesContext';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Notes',
  },
];

const Notes = () => {
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));


  return (
    <NotesProvider>
      <PageContainer title="Note App" description="this is Note App">
        <Breadcrumb title="Note app" items={BCrumb} />
        <AppCard>
          {lgDown ?
            <NoteSidebar
              isMobileSidebarOpen={isMobileSidebarOpen}
              onSidebarClose={() => setMobileSidebarOpen(false)}
            />
            : <NoteSidebar
              isMobileSidebarOpen={true}
              onSidebarClose={() => setMobileSidebarOpen(false)}
            />}

          <Box flexGrow={1}>
            <NoteContent toggleNoteSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)} />
          </Box>
        </AppCard>
      </PageContainer>
    </NotesProvider>
  );
};

export default Notes;
