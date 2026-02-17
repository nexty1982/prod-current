import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { IconDots, IconMail, IconMapPin, IconPhone, IconBan, IconMessage } from '@tabler/icons-react';

interface User {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
  about: string;
}

interface UserDetailsCardProps {
  user: User;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const colors = ['primary', 'secondary', 'success', 'warning', 'info', 'error'] as const;

export default function UserDetailsCard({ user }: UserDetailsCardProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const colorIndex = user.id % colors.length;
  const color = colors[colorIndex];

  return (
    <Card
      variant="outlined"
      sx={{
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent>
        {/* Header with avatar and menu */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: `${color}.main`,
                fontSize: '1.1rem',
              }}
            >
              {getInitials(user.name)}
            </Avatar>
            <Box>
              <Typography variant="h6">{user.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user.role}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <IconDots size={18} />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem onClick={() => setAnchorEl(null)}>Edit</MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>Delete</MenuItem>
          </Menu>
        </Stack>

        {/* About */}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2, minHeight: 40 }}>
          {user.about}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Contact details */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconMail size={16} />
            <Typography variant="body2">{user.email}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconPhone size={16} />
            <Typography variant="body2">{user.phone}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconMapPin size={16} />
            <Typography variant="body2">{user.location}</Typography>
          </Stack>
        </Stack>

        {/* Action buttons */}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<IconMessage size={16} />}
            fullWidth
          >
            Message
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<IconBan size={16} />}
            fullWidth
          >
            Block
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
