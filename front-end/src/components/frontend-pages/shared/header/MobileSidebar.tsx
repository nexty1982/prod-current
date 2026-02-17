import { CustomizerContext } from '@/context/CustomizerContext';
import { Chip, Divider, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { useContext } from 'react';
import { NavLinks } from './Navigations';

const MobileSidebar = () => {
  const { activeMode, setActiveMode } = useContext(CustomizerContext);
  const toggleMode = () => setActiveMode(activeMode === 'light' ? 'dark' : 'light');

  return (
    <>
      <Box px={3} py={2}>
        <Box
          component="img"
          src="/images/logos/om-logo.png"
          alt="Orthodox Metrics"
          sx={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
        />
      </Box>
      <Box p={3}>
        <Stack direction="column" spacing={2}>
          {NavLinks.map((navlink, i) => (
            <Button
              color="inherit"
              key={i}
              href={navlink.to}
              sx={{ justifyContent: 'start' }}
            >
              {navlink.title}
              {navlink.new ? (
                <Chip
                  label="New"
                  size="small"
                  sx={{
                    ml: '6px',
                    borderRadius: '8px',
                    color: 'primary.main',
                    backgroundColor: 'rgba(200, 162, 75, 0.12)',
                  }}
                />
              ) : null}
            </Button>
          ))}
          <Button color="primary" variant="contained" href="/auth/login">
            Church Login
          </Button>
          <Divider />
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton onClick={toggleMode} size="small" sx={{ color: 'text.primary' }}>
              {activeMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {activeMode === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </>
  );
};

export default MobileSidebar;
