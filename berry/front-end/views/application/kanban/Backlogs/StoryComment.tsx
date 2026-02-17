// material-ui
import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

// types
import { KanbanComment, KanbanProfile } from 'types/kanban';

interface Props {
  comment: KanbanComment;
  profile: KanbanProfile;
}

// ==============================|| KANBAN BACKLOGS - STORY COMMENT ||============================== //

export default function StoryComment({ comment, profile }: Props) {
  const theme = useTheme();

  return (
    <Card sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50', p: 1.5, mt: 1.25 }}>
      <Grid container spacing={1}>
        <Grid size={12}>
          <Grid container wrap="nowrap" spacing={1} sx={{ alignItems: 'center' }}>
            <Grid>
              <Avatar
                sx={{ width: 24, height: 24 }}
                size="sm"
                alt="User 1"
                src={profile && profile.avatar && getImageUrl(`${profile.avatar}`, ImagePath.USERS)}
              />
            </Grid>
            <Grid size="grow">
              <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                <Grid>
                  <Typography variant="h5">{profile.name}</Typography>
                </Grid>
                <Grid>
                  <Typography variant="caption">
                    <FiberManualRecordIcon sx={{ width: 10, height: 10, opacity: 0.5, my: 0, mx: 0.625 }} />
                    {profile.time}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid sx={{ '&.MuiGrid-root': { pt: 1.5 } }} size={12}>
          <Typography variant="body2">{comment?.comment}</Typography>
        </Grid>
      </Grid>
    </Card>
  );
}
