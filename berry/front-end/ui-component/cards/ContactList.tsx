// material-ui
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import ChatBubbleTwoToneIcon from '@mui/icons-material/ChatBubbleTwoTone';
import PhoneTwoToneIcon from '@mui/icons-material/PhoneTwoTone';

// types
import { UserProfile } from 'types/user-profile';

// ==============================|| USER CONTACT LIST ||============================== //

interface ContactListProps extends UserProfile {
  onActive: () => void;
}

export default function ContactList({ avatar, name, role, onActive }: ContactListProps) {
  return (
    <Box sx={{ py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
        <Grid
          size={{ xs: 12, sm: 6 }}
          onClick={() => {
            onActive && onActive();
          }}
          sx={{ cursor: 'pointer' }}
        >
          <Grid container spacing={gridSpacing} sx={{ alignItems: 'center', flexWrap: 'nowrap' }}>
            <Grid>
              <Avatar alt={name} src={avatar && getImageUrl(`${avatar}`, ImagePath.USERS)} sx={{ width: 48, height: 48 }} />
            </Grid>
            <Grid size={{ sm: 'grow' }}>
              <Grid container spacing={0}>
                <Grid size={12}>
                  <Typography variant="h4">{name}</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="caption">{role}</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
            <Tooltip placement="top" title="Message">
              <Button variant="outlined" sx={{ minWidth: 32, height: 32, p: 0 }}>
                <ChatBubbleTwoToneIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Tooltip placement="top" title="Call">
              <Button variant="outlined" color="secondary" sx={{ minWidth: 32, height: 32, p: 0 }}>
                <PhoneTwoToneIcon fontSize="small" />
              </Button>
            </Tooltip>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
