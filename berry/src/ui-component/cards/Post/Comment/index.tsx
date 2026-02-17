import { useState, ReactElement } from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import * as yup from 'yup';
import uniqueId from 'lodash/uniqueId';
import { Controller, FormProvider, useForm, useFormContext } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

// project imports
import { ThemeMode } from 'config';
import Reply from './Reply';
import Avatar from 'ui-component/extended/Avatar';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { Comment as CommentProps, CommentData, PostProps, Profile } from 'types/user-profile';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MoreVertTwoToneIcon from '@mui/icons-material/MoreVertTwoTone';
import ThumbUpAltTwoToneIcon from '@mui/icons-material/ThumbUpAltTwoTone';
import ReplyTwoToneIcon from '@mui/icons-material/ReplyTwoTone';
import AttachmentRoundedIcon from '@mui/icons-material/AttachmentRounded';

// types
import { FormInputProps } from 'types';

const validationSchema = yup.object().shape({
  name: yup.string().required('Reply Field is Required')
});

// ==============================|| COMMENT TEXTFIELD ||============================== //

function FormInput({ bug, label, name, required, ...others }: FormInputProps) {
  const { control } = useFormContext();

  let isError = false;
  let errorMessage = '';
  if (bug && Object.prototype.hasOwnProperty.call(bug, name)) {
    isError = true;
    errorMessage = bug[name].message;
  }

  return (
    <>
      <Controller
        name={name}
        control={control}
        defaultValue=""
        render={({ field }) => (
          <TextField
            fullWidth
            label={label}
            error={isError}
            {...field}
            slotProps={{
              inputLabel: { className: required ? 'required-label' : '', required: required || false }
            }}
          />
        )}
        {...others}
      />
      {errorMessage && (
        <Grid size={12}>
          <FormHelperText error>{errorMessage}</FormHelperText>
        </Grid>
      )}
    </>
  );
}

interface CommentComponentProps {
  comment: CommentProps;
  postId: string;
  handleReplayLikes: PostProps['handleReplayLikes'];
  handleCommentLikes: PostProps['handleCommentLikes'];
  replyAdd: PostProps['replyAdd'];
  user: Profile;
}

// ==============================|| SOCIAL PROFILE - COMMENT ||============================== //

export default function Comment({ comment, handleCommentLikes, handleReplayLikes, postId, replyAdd, user }: CommentComponentProps) {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const [anchorEl, setAnchorEl] = useState<Element | (() => Element) | null | undefined>(null);
  const handleClick = (event: React.MouseEvent) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const [openReply, setOpenReply] = useState(false);
  const handleChangeReply = () => {
    setOpenReply((prev) => !prev);
  };

  let repliesResult: ReactElement[] | ReactElement = <></>;
  if (Object.keys(comment).length > 0 && comment.data?.replies && comment.data?.replies.length) {
    repliesResult = comment.data?.replies.map((reply, index) => (
      <Reply
        postId={postId}
        commentId={comment.id}
        key={index}
        onReply={handleChangeReply}
        reply={reply}
        handleReplayLikes={handleReplayLikes}
      />
    ));
  }

  const methods = useForm({
    resolver: yupResolver(validationSchema)
  });

  const {
    handleSubmit,
    formState: { errors },
    reset
  } = methods;
  const onSubmit = async (reply: CommentData) => {
    handleChangeReply();
    const replyId = uniqueId('#REPLY_');
    const newReply = {
      id: replyId,
      profile: user,
      data: {
        comment: reply.name,
        likes: {
          like: false,
          value: 0
        },
        replies: []
      }
    };

    replyAdd(postId, comment.id, newReply);
    reset({ name: '' });
  };

  return (
    <>
      {Object.keys(comment).length > 0 && (
        <Grid size={12}>
          <Card sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50', px: 2, pt: 2, pb: 1, mt: 1.25 }}>
            <Grid container spacing={1}>
              <Grid size={12}>
                <Grid container wrap="nowrap" spacing={1} sx={{ alignItems: 'center' }}>
                  <Grid>
                    <Avatar
                      sx={{ width: 24, height: 24 }}
                      size="sm"
                      alt="User 1"
                      src={comment.profile && comment.profile.avatar && getImageUrl(`${comment.profile.avatar}`, ImagePath.USERS)}
                    />
                  </Grid>
                  <Grid size="grow">
                    <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                      <Grid>
                        <Typography variant="h5">{comment.profile.name}</Typography>
                      </Grid>
                      <Grid>
                        <Typography variant="caption">
                          <FiberManualRecordIcon sx={{ width: '10px', height: '10px', opacity: 0.5, m: '0 5px' }} />
                          {comment.profile.time}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Grid>
                  <Grid>
                    <ButtonBase sx={{ borderRadius: '12px' }} aria-label='"more options"'>
                      <Avatar
                        variant="rounded"
                        sx={{
                          ...theme.typography.commonAvatar,
                          ...theme.typography.smallAvatar,
                          bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'secondary.light',
                          color: theme.palette.mode === ThemeMode.DARK ? 'dark.light' : 'secondary.dark',
                          zIndex: 1,
                          transition: 'all .2s ease-in-out',
                          '&[aria-controls="menu-list-grow"],&:hover': {
                            bgcolor: 'secondary.main',
                            color: 'secondary.light'
                          }
                        }}
                        aria-controls="menu-comment"
                        aria-haspopup="true"
                        onClick={handleClick}
                      >
                        <MoreVertTwoToneIcon fontSize="inherit" />
                      </Avatar>
                    </ButtonBase>
                    <Menu
                      id="menu-comment"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleClose}
                      variant="selectedMenu"
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right'
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right'
                      }}
                    >
                      <MenuItem onClick={handleClose}>Edit</MenuItem>
                      <MenuItem onClick={handleClose}>Delete</MenuItem>
                    </Menu>
                  </Grid>
                </Grid>
              </Grid>
              <Grid sx={{ '&.MuiGrid-root': { pt: 1.5 } }} size={12}>
                <Typography variant="body2">{comment.data?.comment}</Typography>
              </Grid>
              <Grid size={12}>
                <Stack direction="row" spacing={2} sx={{ color: theme.palette.mode === ThemeMode.DARK ? 'grey.700' : 'grey.800' }}>
                  <Button
                    onClick={() => handleCommentLikes(postId, comment.id)}
                    variant="text"
                    color="inherit"
                    size="small"
                    startIcon={<ThumbUpAltTwoToneIcon color={comment.data?.likes && comment.data?.likes.like ? 'secondary' : 'inherit'} />}
                  >
                    {comment.data?.likes && comment.data?.likes.value ? comment.data?.likes.value : 0} likes
                  </Button>
                  <Button
                    variant="text"
                    onClick={handleChangeReply}
                    color="inherit"
                    size="small"
                    startIcon={<ReplyTwoToneIcon color="primary" />}
                  >
                    {comment.data?.replies ? comment.data?.replies.length : 0} reply
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      )}
      {repliesResult}
      {/* comment - add new replay */}
      <Collapse in={openReply} sx={{ width: '100%' }}>
        {openReply && (
          <Grid sx={{ pl: { xs: 1, sm: 3 }, pt: 3 }} size={12}>
            <Box sx={{ ml: { xs: 0, md: 4.25 } }}>
              <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2} sx={{ alignItems: 'flex-start' }}>
                  <Grid sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <Avatar
                      sx={{ mt: 1.5 }}
                      alt="User 1"
                      src={comment.profile && comment.profile.avatar && getImageUrl(`${comment.profile.avatar}`, ImagePath.USERS)}
                    />
                  </Grid>
                  <Grid sx={{ mt: 1 }} size="grow">
                    <FormProvider {...methods}>
                      <FormInput
                        fullWidth
                        name="name"
                        label="Write a reply..."
                        size={downMD ? 'small' : 'medium'}
                        bug={errors}
                        InputProps={{
                          label: 'Write a reply...',
                          startAdornment: (
                            <InputAdornment position="start">
                              <AttachmentRoundedIcon fontSize="small" />
                            </InputAdornment>
                          )
                        }}
                      />
                    </FormProvider>
                  </Grid>
                  <Grid>
                    <AnimateButton>
                      <Button type="submit" variant="contained" color="secondary" size={downMD ? 'small' : 'large'} sx={{ mt: 1.5 }}>
                        Reply
                      </Button>
                    </AnimateButton>
                  </Grid>
                </Grid>
              </form>
            </Box>
          </Grid>
        )}
      </Collapse>
    </>
  );
}
