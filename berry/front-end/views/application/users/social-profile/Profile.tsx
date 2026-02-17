import React from 'react';

// material-ui
import { alpha, useTheme } from '@mui/material/styles';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import { ThemeMode } from 'config';
import AnimateButton from 'ui-component/extended/AnimateButton';
import Posts from 'ui-component/cards/Post';
import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import { dispatch, useSelector } from 'store';
import { getPosts, editComment, addComment, addReply, likePost, likeComment, likeReply } from 'store/slices/user';

// assets
import AttachmentTwoToneIcon from '@mui/icons-material/AttachmentTwoTone';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import LayersTwoToneIcon from '@mui/icons-material/LayersTwoTone';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import PeopleAltTwoToneIcon from '@mui/icons-material/PeopleAltTwoTone';
import PublicTwoToneIcon from '@mui/icons-material/PublicTwoTone';
import RecentActorsTwoToneIcon from '@mui/icons-material/RecentActorsTwoTone';

// types
import { PostDataType, Reply } from 'types/user-profile';

// ==============================|| SOCIAL PROFILE - POST ||============================== //

export default function Profile() {
  const theme = useTheme();
  const [posts, setPosts] = React.useState<PostDataType[]>([]);
  const userState = useSelector((state) => state.user);
  const getPost = async () => {
    dispatch(getPosts());
  };

  React.useEffect(() => {
    setPosts(userState.posts);
  }, [userState]);

  React.useEffect(() => {
    getPost();
  }, []);

  const editPost = async (id: string, commentId: string) => {
    dispatch(editComment(id, commentId));
  };

  const commentAdd = async (id: string, comment: Reply) => {
    dispatch(addComment(id, comment));
  };

  const replyAdd = async (postId: string, commentId: string, reply: Reply) => {
    dispatch(addReply(postId, commentId, reply));
  };

  const handlePostLikes = async (postId: string) => {
    dispatch(likePost(postId));
  };

  const handleCommentLikes = async (postId: string, commentId: string) => {
    dispatch(likeComment(postId, commentId));
  };

  const handleReplayLikes = async (postId: string, commentId: string, replayId: string) => {
    dispatch(likeReply(postId, commentId, replayId));
  };

  const sideAvatarSX = {
    borderRadius: '8px',
    width: 48,
    height: 48,
    fontSize: '1.5rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: theme.palette.mode === ThemeMode.DARK ? '1px solid' : 'none',
    '&>svg': {
      width: 24,
      height: 24
    }
  };

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={{ xs: 12, sm: 12, md: 4 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <MainCard>
              <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
                <Grid>
                  <Box
                    sx={{
                      ...sideAvatarSX,
                      bgcolor: alpha(theme.palette.primary.dark, 0.1),
                      border: theme.palette.mode === ThemeMode.DARK ? '1px solid' : 'none',
                      borderColor: 'primary.main',
                      color: 'primary.dark'
                    }}
                  >
                    <PeopleAltTwoToneIcon />
                  </Box>
                </Grid>
                <Grid size="grow">
                  <Typography variant="h3" color="primary" sx={{ mb: 0.625 }}>
                    239k
                  </Typography>
                  <Typography variant="body2">Friends</Typography>
                </Grid>
                <Grid>
                  <IconButton size="large" aria-label="navigation icon">
                    <NavigateNextRoundedIcon />
                  </IconButton>
                </Grid>
              </Grid>
              <Divider sx={{ margin: '16px 0' }} />
              <Grid container spacing={gridSpacing} sx={{ alignItems: 'center' }}>
                <Grid>
                  <Box
                    sx={{
                      ...sideAvatarSX,
                      bgcolor: alpha(theme.palette.secondary.dark, 0.1),
                      borderColor: 'secondary.main',
                      color: 'secondary.dark'
                    }}
                  >
                    <RecentActorsTwoToneIcon />
                  </Box>
                </Grid>
                <Grid size="grow">
                  <Typography
                    variant="h3"
                    sx={{
                      mb: 0.625,
                      color: theme.palette.mode === ThemeMode.DARK ? 'text.secondary' : 'secondary.main'
                    }}
                  >
                    234k
                  </Typography>
                  <Typography variant="body2">Followers</Typography>
                </Grid>
                <Grid>
                  <IconButton size="large" aria-label="navigation icon">
                    <NavigateNextRoundedIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>
          <Grid size={12}>
            <MainCard>
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Typography variant="h4">About</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="body2">
                    It is a long established fact that a reader will be distracted by the readable content of a page when looking at its
                    layout.
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ margin: '16px 0' }} />
              <Grid
                container
                spacing={2}
                sx={{
                  '& >div': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                    width: '100%'
                  },
                  '& a': {
                    color: 'grey.700',

                    '& svg': {
                      mr: 1,
                      verticalAlign: 'bottom'
                    },
                    '&:hover': {
                      color: 'primary.main',
                      textDecoration: 'none'
                    }
                  }
                }}
              >
                <Grid size={12}>
                  <Link href="https://codedthemes.com/" target="_blank" underline="hover">
                    <PublicTwoToneIcon color="secondary" /> https://codedthemes.com/
                  </Link>
                </Grid>
                <Grid size={12}>
                  <Link href="https://www.instagram.com/codedthemes" target="_blank" underline="hover">
                    <InstagramIcon sx={{ color: 'orange.dark' }} /> https://www.instagram.com/codedthemes
                  </Link>
                </Grid>
                <Grid size={12}>
                  <Link href="https://www.facebook.com/codedthemes" target="_blank" underline="hover">
                    <FacebookIcon color="primary" /> https://www.facebook.com/codedthemes
                  </Link>
                </Grid>
                <Grid size={12}>
                  <Link href="https://in.linkedin.com/company/codedthemes" target="_blank" underline="hover">
                    <LinkedInIcon sx={{ color: 'grey.900' }} /> https://in.linkedin.com/company/codedthemes
                  </Link>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>
        </Grid>
      </Grid>
      <Grid size={{ xs: 12, sm: 12, md: 8 }}>
        <Grid container spacing={gridSpacing}>
          <Grid size={12}>
            <MainCard>
              <Grid container spacing={gridSpacing}>
                <Grid size={12}>
                  <TextField id="outlined-textarea" placeholder="What’s on your mind, Larry?" rows={4} fullWidth multiline />
                </Grid>
                <Grid size={12}>
                  <Grid container spacing={gridSpacing} sx={{ justifyContent: 'space-between' }}>
                    <Grid>
                      <Button variant="text" color="secondary" startIcon={<AttachmentTwoToneIcon />}>
                        Gallery
                      </Button>
                    </Grid>
                    <Grid>
                      <AnimateButton>
                        <Button variant="contained" color="secondary" startIcon={<LayersTwoToneIcon />}>
                          Post
                        </Button>
                      </AnimateButton>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </MainCard>
          </Grid>
          {posts &&
            posts.map((post: PostDataType, index: number) => (
              <Grid key={post.id} size={12}>
                <Posts
                  key={post.id}
                  post={post}
                  editPost={editPost}
                  renderPost={getPost}
                  setPosts={setPosts}
                  commentAdd={commentAdd}
                  replyAdd={replyAdd}
                  handlePostLikes={handlePostLikes}
                  handleCommentLikes={handleCommentLikes}
                  handleReplayLikes={handleReplayLikes}
                />
              </Grid>
            ))}
        </Grid>
      </Grid>
    </Grid>
  );
}
