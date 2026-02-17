import { useEffect, useState, ReactElement, CSSProperties, cloneElement } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import useScrollTrigger from '@mui/material/useScrollTrigger';

// project imports
import { ThemeMode } from 'config';
import SubCard from 'ui-component/cards/SubCard';
import { gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import User1 from 'assets/images/users/avatar-1.png';
import HighlightOffTwoToneIcon from '@mui/icons-material/HighlightOffTwoTone';
import BusinessTwoToneIcon from '@mui/icons-material/BusinessTwoTone';
import WorkTwoToneIcon from '@mui/icons-material/WorkTwoTone';
import MailTwoToneIcon from '@mui/icons-material/MailTwoTone';
import CallTwoToneIcon from '@mui/icons-material/CallTwoTone';
import UploadTwoToneIcon from '@mui/icons-material/UploadTwoTone';
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import TodayTwoToneIcon from '@mui/icons-material/TodayTwoTone';

// types
import { UserProfile } from 'types/user-profile';

const jobTypes = [
  { label: 'Work', id: 1 },
  { label: 'Personal', id: 2 }
];

// sticky edit card
interface ElevationScrollProps {
  children: ReactElement<{ style?: CSSProperties }>;
  window?: Window | Node;
}

function ElevationScroll({ children, window }: ElevationScrollProps) {
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 230,
    target: window || undefined
  });

  return cloneElement(children, {
    style: {
      position: trigger ? 'fixed' : 'relative',
      top: trigger ? 83 : 0,
      width: trigger ? 318 : '100%'
    }
  });
}

// ==============================|| CONTACT CARD/LIST USER EDIT ||============================== //

interface UserEditProps {
  user: UserProfile;
  onCancel: (i: UserProfile) => void;
  onSave: (i: UserProfile) => void;
}

export default function UserEdit({ user, onCancel, onSave, ...others }: UserEditProps) {
  const theme = useTheme();

  // save user to local state to update details and submit letter
  const [profile, setProfile] = useState<UserProfile>(user);
  useEffect(() => {
    setProfile(user);
  }, [user]);

  return (
    <ElevationScroll {...others}>
      <SubCard
        sx={{
          bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50',
          width: '100%',
          maxWidth: 342,
          height: 'calc(100vh - 105px)',
          overflowY: 'auto'
        }}
        content={false}
      >
        <Grid container spacing={gridSpacing} sx={{ p: 3 }}>
          <Grid size={12}>
            <Grid container spacing={1} sx={{ alignItems: 'center' }}>
              <Grid>
                <Avatar
                  alt="User 3"
                  src={profile ? profile.avatar && getImageUrl(`${user.avatar}`, ImagePath.USERS) : User1}
                  sx={{ width: 64, height: 64 }}
                />
              </Grid>
              <Grid size="grow">
                <Grid container spacing={1}>
                  <Grid size={12}>
                    <label htmlFor="containedButtonFile">
                      <input
                        accept="image/*"
                        style={{
                          opacity: 0,
                          position: 'fixed',
                          zIndex: 1,
                          padding: 0.5,
                          cursor: 'pointer'
                        }}
                        id="containedButtonFile"
                        multiple
                        type="file"
                      />
                      <Button variant="outlined" size="small" startIcon={<UploadTwoToneIcon />}>
                        Upload
                      </Button>
                    </label>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="caption">Image size should be 125kb Max.</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid>
                <IconButton onClick={() => onCancel(profile)} size="large">
                  <HighlightOffTwoToneIcon />
                </IconButton>
              </Grid>
            </Grid>
          </Grid>
          <Grid size={12}>
            <Divider />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Name</InputLabel>
              <OutlinedInput
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                type="text"
                label="Name"
                startAdornment={
                  <InputAdornment position="start">
                    <BusinessTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>

          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Company</InputLabel>
              <OutlinedInput
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                type="text"
                label="Company"
                startAdornment={
                  <InputAdornment position="start">
                    <BusinessTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Job Title</InputLabel>
              <OutlinedInput
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                type="text"
                label="Job Title"
                startAdornment={
                  <InputAdornment position="start">
                    <WorkTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <Autocomplete
              multiple
              options={jobTypes}
              getOptionLabel={(option) => option.label}
              defaultValue={[jobTypes[0]]}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Email</InputLabel>
              <OutlinedInput
                value={profile.work_email}
                onChange={(e) => setProfile({ ...profile, work_email: e.target.value })}
                type="text"
                label="Email"
                startAdornment={
                  <InputAdornment position="start">
                    <MailTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <Autocomplete
              multiple
              options={jobTypes}
              getOptionLabel={(option) => option.label}
              defaultValue={[jobTypes[1]]}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Email</InputLabel>
              <OutlinedInput
                value={profile.personal_email}
                onChange={(e) => setProfile({ ...profile, personal_email: e.target.value })}
                type="text"
                label="Email"
                startAdornment={
                  <InputAdornment position="start">
                    <MailTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <Button variant="text" startIcon={<ControlPointIcon />}>
              Add New Email
            </Button>
          </Grid>
          <Grid size={12}>
            <Autocomplete
              multiple
              options={jobTypes}
              getOptionLabel={(option) => option.label}
              defaultValue={[jobTypes[0]]}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Phone Number</InputLabel>
              <OutlinedInput
                value={profile.work_phone}
                onChange={(e) => {
                  setProfile({ ...profile, work_phone: e.target.value });
                }}
                type="text"
                label="Phone Number"
                startAdornment={
                  <InputAdornment position="start">
                    <CallTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <Autocomplete
              multiple
              options={jobTypes}
              getOptionLabel={(option) => option.label}
              defaultValue={[jobTypes[1]]}
              renderInput={(params) => <TextField {...params} />}
            />
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Phone Number</InputLabel>
              <OutlinedInput
                value={profile.personal_phone}
                onChange={(e) => {
                  setProfile({ ...profile, personal_phone: e.target.value });
                }}
                type="text"
                label="Phone Number"
                startAdornment={
                  <InputAdornment position="start">
                    <CallTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <Button variant="text" startIcon={<ControlPointIcon />}>
              Add New Phone
            </Button>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Birthday</InputLabel>
              <OutlinedInput
                defaultValue="November 30, 1997"
                type="text"
                label="Birthday"
                endAdornment={
                  <InputAdornment position="end">
                    <TodayTwoToneIcon />
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <FormControl fullWidth>
              <InputLabel>Bio</InputLabel>
              <OutlinedInput
                defaultValue={profile.birthdayText}
                onChange={(e) => setProfile({ ...profile, birthdayText: e.target.value })}
                type="text"
                label="Bio"
                multiline
                rows={3}
              />
            </FormControl>
          </Grid>
          <Grid size={12}>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Button variant="contained" fullWidth onClick={() => onSave(profile)}>
                  Save
                </Button>
              </Grid>
              <Grid size={6}>
                <Button variant="outlined" fullWidth onClick={() => onCancel(profile)}>
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </SubCard>
    </ElevationScroll>
  );
}
