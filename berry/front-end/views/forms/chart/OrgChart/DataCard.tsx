// material-ui
import { useTheme } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party icons
import SkypeIcon from './SkypeIcon';
import MeetIcon from './MeetIcon';
import LinkedInIcon from './LinkedIn';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';

// types
import { DataCardMiddleware } from 'types/org-chart';

// ==============================|| DATACARD ORGANIZATION CHART ||============================== //

function DataCard({ name, role, avatar, linkedin, meet, skype, root }: DataCardMiddleware) {
  const theme = useTheme();
  const linkHandler = (link: string) => {
    window.open(link);
  };

  const subTree = theme.palette.mode === ThemeMode.DARK ? `dark.800` : `grey.100`;
  const rootTree = theme.palette.mode === ThemeMode.DARK ? `dark.900` : `secondary.light`;

  return (
    <MainCard
      sx={{
        bgcolor: root ? rootTree : subTree,
        border: '1px solid',
        borderColor: root ? 'primary.main' : 'divider',
        width: 'max-content',
        m: '0px auto',
        direction: 'ltr'
      }}
      content={false}
    >
      <List sx={{ width: '100%', border: 'transparent', p: 1.5 }}>
        <ListItem sx={{ p: 0, alignItems: 'flex-start' }}>
          <ListItemAvatar>
            <Avatar src={avatar} size="sm" alt="user images" />
          </ListItemAvatar>
          <ListItemText
            sx={{ m: 0 }}
            primary={
              <Typography variant="subtitle1" sx={{ color: root ? `primary.dark` : `secondary.dark` }}>
                {name}
              </Typography>
            }
          />
        </ListItem>
        <Stack spacing={2} sx={{ pl: 7, mt: -1.75 }}>
          <Box sx={{ display: 'flex' }}>
            {!root && (
              <Chip
                label={role}
                sx={{ fontSize: '0.625rem', height: 20, '& .MuiChip-label': { px: 0.75 } }}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            {root && (
              <Typography sx={{ color: `secondary.dark` }} variant="caption">
                {role}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <IconButton
              onClick={() => linkHandler(linkedin)}
              size="small"
              sx={{
                bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'background.paper',
                borderRadius: 1,
                p: 0.25
              }}
              aria-label="linkedin"
            >
              <LinkedInIcon />
            </IconButton>
            <IconButton
              onClick={() => linkHandler(meet)}
              size="small"
              sx={{
                bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'background.paper',
                borderRadius: 1,
                p: 0.25
              }}
              aria-label="Google Meet"
            >
              <MeetIcon />
            </IconButton>
            <IconButton
              onClick={() => linkHandler(skype)}
              size="small"
              sx={{
                bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'background.paper',
                borderRadius: 1,
                p: 0.25
              }}
              aria-label="skype"
            >
              <SkypeIcon />
            </IconButton>
          </Stack>
        </Stack>
      </List>
    </MainCard>
  );
}

export default DataCard;
