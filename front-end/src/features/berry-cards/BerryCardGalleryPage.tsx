import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  OutlinedInput,
  Pagination,
  Typography,
} from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import PageContainer from '@/shared/ui/PageContainer';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import UserDetailsCard from './components/UserDetailsCard';

// Mock user data
const mockUsers = [
  { id: 1, name: 'Alene Santos', role: 'Senior Developer', email: 'alene@company.com', phone: '+1 (555) 111-2222', location: 'San Francisco, CA', avatar: '', about: 'Full-stack developer with 8 years of experience in React and Node.js.' },
  { id: 2, name: 'Jone Doe', role: 'UI/UX Designer', email: 'jone@company.com', phone: '+1 (555) 222-3333', location: 'New York, NY', avatar: '', about: 'Creative designer focused on user experience and interface design.' },
  { id: 3, name: 'Bella Cakes', role: 'Project Manager', email: 'bella@company.com', phone: '+1 (555) 333-4444', location: 'Austin, TX', avatar: '', about: 'Certified PMP with expertise in agile methodologies.' },
  { id: 4, name: 'Nitin Patel', role: 'Backend Engineer', email: 'nitin@company.com', phone: '+1 (555) 444-5555', location: 'Chicago, IL', avatar: '', about: 'Database architect with deep knowledge of distributed systems.' },
  { id: 5, name: 'Sarah Chen', role: 'DevOps Lead', email: 'sarah@company.com', phone: '+1 (555) 555-6666', location: 'Seattle, WA', avatar: '', about: 'Kubernetes specialist with a passion for CI/CD pipelines.' },
  { id: 6, name: 'Marcus Rivera', role: 'QA Engineer', email: 'marcus@company.com', phone: '+1 (555) 666-7777', location: 'Denver, CO', avatar: '', about: 'Automated testing expert ensuring software quality.' },
  { id: 7, name: 'Emily Johnson', role: 'Data Scientist', email: 'emily@company.com', phone: '+1 (555) 777-8888', location: 'Boston, MA', avatar: '', about: 'Machine learning engineer with a focus on NLP.' },
  { id: 8, name: 'David Kim', role: 'Mobile Developer', email: 'david@company.com', phone: '+1 (555) 888-9999', location: 'Portland, OR', avatar: '', about: 'React Native and Flutter developer for cross-platform apps.' },
  { id: 9, name: 'Ana Rodriguez', role: 'Security Engineer', email: 'ana@company.com', phone: '+1 (555) 999-0000', location: 'Miami, FL', avatar: '', about: 'Cybersecurity professional specializing in penetration testing.' },
  { id: 10, name: 'Tom Wilson', role: 'Tech Lead', email: 'tom@company.com', phone: '+1 (555) 000-1111', location: 'Atlanta, GA', avatar: '', about: 'Experienced architect leading microservices migrations.' },
  { id: 11, name: 'Lisa Park', role: 'Product Designer', email: 'lisa@company.com', phone: '+1 (555) 111-0000', location: 'San Diego, CA', avatar: '', about: 'Design system advocate with expertise in Figma and Storybook.' },
  { id: 12, name: 'James Brown', role: 'Frontend Developer', email: 'james@company.com', phone: '+1 (555) 222-0000', location: 'Philadelphia, PA', avatar: '', about: 'TypeScript enthusiast building modern web applications.' },
];

const ROWS_PER_PAGE = 8;

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'Berry Components' },
  { title: 'Card Gallery' },
];

export default function BerryCardGalleryPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filteredUsers = useMemo(() => {
    if (!search) return mockUsers;
    const lower = search.toLowerCase();
    return mockUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(lower) ||
        u.role.toLowerCase().includes(lower) ||
        u.location.toLowerCase().includes(lower)
    );
  }, [search]);

  const totalPages = Math.ceil(filteredUsers.length / ROWS_PER_PAGE);
  const pagedUsers = filteredUsers.slice(
    (page - 1) * ROWS_PER_PAGE,
    page * ROWS_PER_PAGE
  );

  return (
    <PageContainer title="Card Gallery" description="Berry Cards Style 01 - User card gallery">
      <Breadcrumb title="Card Gallery" items={BCrumb} />
      <Card>
        <CardContent>
          {/* Search */}
          <Box sx={{ mb: 3 }}>
            <OutlinedInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search users..."
              startAdornment={
                <InputAdornment position="start">
                  <IconSearch size={20} />
                </InputAdornment>
              }
              size="small"
              sx={{ width: { xs: '100%', sm: 300 } }}
            />
          </Box>

          {/* Cards Grid */}
          <Grid container spacing={3}>
            {pagedUsers.map((user) => (
              <Grid size={{ xs: 12, sm: 6, lg: 4, xl: 3 }} key={user.id}>
                <UserDetailsCard user={user} />
              </Grid>
            ))}
          </Grid>

          {/* No results */}
          {pagedUsers.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No users found matching "{search}"
              </Typography>
            </Box>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
