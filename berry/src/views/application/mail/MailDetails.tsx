import { useState } from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import CardContent from '@mui/material/CardContent';
import Checkbox from '@mui/material/Checkbox';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// third party
import { format } from 'date-fns';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// project imports
import { ThemeMode } from 'config';
import MainCard from 'ui-component/cards/MainCard';
import Avatar from 'ui-component/extended/Avatar';
import AttachmentCard from 'ui-component/cards/AttachmentCard';
import SubCard from 'ui-component/cards/SubCard';
import ReactQuill from 'ui-component/third-party/ReactQuill';
import { gridSpacing } from 'store/constant';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// assets
import AttachmentTwoToneIcon from '@mui/icons-material/AttachmentTwoTone';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import NewReleasesTwoToneIcon from '@mui/icons-material/NewReleasesTwoTone';
import StarBorderTwoToneIcon from '@mui/icons-material/StarBorderTwoTone';
import StarTwoToneIcon from '@mui/icons-material/StarTwoTone';
import LabelTwoToneIcon from '@mui/icons-material/LabelTwoTone';
import KeyboardArrowLeftTwoToneIcon from '@mui/icons-material/KeyboardArrowLeftTwoTone';
import MoreHorizTwoToneIcon from '@mui/icons-material/MoreHorizTwoTone';
import ReplyTwoToneIcon from '@mui/icons-material/ReplyTwoTone';
import ForwardTwoToneIcon from '@mui/icons-material/ForwardTwoTone';

// types
import { MailDetailsProps } from 'types/mail';

// ==============================|| MAIL DETAILS ||============================== //

export default function MailDetails({ handleUserDetails, data, handleStarredChange, handleImportantChange }: MailDetailsProps) {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClickSort = (event: React.MouseEvent<HTMLButtonElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };
  const handleCloseSort = () => {
    setAnchorEl(null);
  };

  const [openQuill, setOpenQuill] = useState(false);
  const handleChangeQuill = () => {
    setOpenQuill(true);
  };

  return (
    <MainCard sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50' }} content={false}>
      <CardContent>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Grid container spacing={{ xs: 1, md: 0 }} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Grid>
                <Stack direction="row" spacing={{ xs: 1, md: 2 }} sx={{ alignItems: 'center' }}>
                  <IconButton onClick={(e) => handleUserDetails(e, null)} size="small">
                    <KeyboardArrowLeftTwoToneIcon />
                  </IconButton>
                  <Avatar
                    alt={data?.profile.name}
                    src={data?.profile && data.profile.avatar && getImageUrl(`${data.profile.avatar}`, ImagePath.USERS)}
                    size={downMD ? 'xs' : 'sm'}
                  />
                  <Grid container sx={{ alignItems: 'center' }}>
                    <Grid size={12}>
                      <Stack
                        direction={{ xs: 'column', md: 'row' }}
                        spacing={{ xs: 0, md: 1 }}
                        sx={{ alignItems: { xs: 'flex-start', md: 'center' } }}
                      >
                        <Typography variant={downMD ? 'h5' : 'h4'}>{data?.profile.name}</Typography>
                        <Typography sx={{ display: { xs: 'block', sm: 'none' } }} variant="subtitle2">
                          From: &lt;{data?.profile.to}&gt;
                        </Typography>
                      </Stack>
                    </Grid>
                    <Grid sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Typography variant="subtitle2">From: &lt;{data?.profile.to}&gt;</Typography>
                    </Grid>
                  </Grid>
                </Stack>
              </Grid>
              <Grid>
                <Typography variant="subtitle2">{format(new Date(data?.time!), 'd MMM')}</Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
      <CardContent sx={{ pt: 0 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <Grid container spacing={gridSpacing}>
              <Grid size={12}>
                <Grid container spacing={0} sx={{ alignItems: 'center' }}>
                  <Grid>
                    <Typography variant={downMD ? 'h4' : 'h3'}>{data?.subject}</Typography>
                  </Grid>
                  <Grid size="grow" />
                  <Grid>
                    <Checkbox
                      checked={data?.starred}
                      icon={<StarBorderTwoToneIcon />}
                      checkedIcon={<StarTwoToneIcon />}
                      sx={{ '&.Mui-checked': { color: 'warning.dark' } }}
                      onChange={(event) => handleStarredChange(event, data)}
                    />
                  </Grid>
                  <Grid>
                    <Checkbox
                      checked={data?.important}
                      icon={<LabelTwoToneIcon />}
                      checkedIcon={<LabelTwoToneIcon />}
                      sx={{ '&.Mui-checked': { color: 'secondary.main' } }}
                      onChange={(event) => handleImportantChange(event, data)}
                    />
                  </Grid>
                  <Grid>
                    <Checkbox
                      defaultChecked={false}
                      icon={<NewReleasesTwoToneIcon />}
                      checkedIcon={<NewReleasesTwoToneIcon />}
                      sx={{ '&.Mui-checked': { color: 'error.main' } }}
                    />
                  </Grid>
                  <Grid>
                    <IconButton onClick={handleClickSort} size="large">
                      <MoreHorizTwoToneIcon />
                    </IconButton>
                    <Menu
                      id="simple-menu"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleCloseSort}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                      }}
                    >
                      <MenuItem onClick={handleCloseSort}>Name</MenuItem>
                      <MenuItem onClick={handleCloseSort}>Date</MenuItem>
                      <MenuItem onClick={handleCloseSort}>Ratting</MenuItem>
                      <MenuItem onClick={handleCloseSort}>Unread</MenuItem>
                    </Menu>
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={12}>
                <Grid container spacing={gridSpacing}>
                  <Grid size={12}>
                    <Typography variant="body2">Dear {data?.profile.name},</Typography>
                  </Grid>
                  <Grid sx={{ '& > p': { ...theme.typography.body1, marginBottom: 0 } }} size={12}>
                    <Markdown remarkPlugins={[remarkGfm]}>{data?.message!}</Markdown>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="body2">Kind Regards,</Typography>
                    <Typography variant="body2">{data?.sender.name}</Typography>
                  </Grid>
                </Grid>
              </Grid>
              {data?.attachments && (
                <Grid size={12}>
                  <Grid container spacing={gridSpacing}>
                    <Grid size={12}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <AttachmentTwoToneIcon fontSize="small" />
                        <Typography variant="h5">{data?.attachments.length} </Typography>
                        <Typography variant="h5">Attachments</Typography>
                      </Stack>
                    </Grid>
                    {data?.attachments.map((item, index) => (
                      <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <AttachmentCard image={item.image} title={item.title} />
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
              <Grid size={12}>
                <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                  <Grid>
                    <Button variant="outlined" startIcon={<ReplyTwoToneIcon />} onClick={handleChangeQuill}>
                      Reply
                    </Button>
                  </Grid>
                  <Grid>
                    <Button variant="outlined" startIcon={<ForwardTwoToneIcon />} onClick={handleChangeQuill}>
                      Forward
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
              {openQuill && (
                <Grid size={12}>
                  <SubCard sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.dark' : alpha(theme.palette.primary[200], 0.4) }}>
                    <ReactQuill />
                    <Grid container spacing={1} sx={{ alignItems: 'center', mt: 2 }}>
                      <Grid>
                        <IconButton size="large">
                          <UploadFileIcon />
                        </IconButton>
                      </Grid>
                      <Grid>
                        <IconButton size="large">
                          <AttachmentTwoToneIcon />
                        </IconButton>
                      </Grid>
                      <Grid sx={{ flexGrow: 1 }} />
                      <Grid>
                        <Button onClick={() => setOpenQuill(false)} sx={{ color: 'grey.900' }}>
                          Cancel
                        </Button>
                      </Grid>
                      <Grid>
                        <Button variant="contained">Reply</Button>
                      </Grid>
                    </Grid>
                  </SubCard>
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </MainCard>
  );
}
