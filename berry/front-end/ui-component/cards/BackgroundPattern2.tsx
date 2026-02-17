import { ReactElement } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import CardMedia from '@mui/material/CardMedia';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';

// assets
import AuthPattern from 'assets/images/auth/img-a2-grid.svg';
import AuthPatternDark from 'assets/images/auth/img-a2-grid-dark.svg';

// ===========================|| BACKGROUND GRID PATTERN 2 ||=========================== //

export default function BackgroundPattern2({ children }: { children: ReactElement | ReactElement[] }) {
  const theme = useTheme();

  return (
    <Box
      component="span"
      sx={{
        display: 'flex',
        minHeight: '100%',
        height: '100vh',
        bgcolor: 'background.paper',
        position: 'absolute',
        overflow: 'hidden',
        m: '0 0 0 auto',
        p: '100px 0',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        '& > *': {
          position: 'relative',
          zIndex: 5
        },
        '&:after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1,
          bottom: 0,
          bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : 'grey.100',
          opacity: theme.palette.mode === ThemeMode.DARK ? 0.85 : 0.9
        }
      }}
    >
      {children}
      <CardMedia
        component="img"
        sx={{ zIndex: 1, position: 'absolute', bottom: 0, right: 0, width: 1 }}
        src={theme.palette.mode === ThemeMode.DARK ? AuthPatternDark : AuthPattern}
        alt="pattern2"
      />
    </Box>
  );
}
