import React, { useEffect, useState } from 'react';

// material-ui
import { useTheme, styled, alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popper from '@mui/material/Popper';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import PerfectScrollbar from 'react-perfect-scrollbar';
import EmojiPicker, { SkinTones, EmojiClickData } from 'emoji-picker-react';

// project imports
import UserDetails from './UserDetails';
import ChatDrawer from './ChatDrawer';
import ChartHistory from './ChartHistory';
import AvatarStatus from './AvatarStatus';

import Loader from 'ui-component/Loader';
import MainCard from 'ui-component/cards/MainCard';
import Avatar from 'ui-component/extended/Avatar';

import { ThemeMode } from 'config';
import { dispatch, useSelector } from 'store';
import { getUser, getUserChats, insertChat } from 'store/slices/chat';
import { appDrawerWidth as drawerWidth, gridSpacing } from 'store/constant';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// assets
import AttachmentTwoToneIcon from '@mui/icons-material/AttachmentTwoTone';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import MoreHorizTwoToneIcon from '@mui/icons-material/MoreHorizTwoTone';
import ErrorTwoToneIcon from '@mui/icons-material/ErrorTwoTone';
import VideoCallTwoToneIcon from '@mui/icons-material/VideoCallTwoTone';
import CallTwoToneIcon from '@mui/icons-material/CallTwoTone';
import SendTwoToneIcon from '@mui/icons-material/SendTwoTone';
import MoodTwoToneIcon from '@mui/icons-material/MoodTwoTone';
import HighlightOffTwoToneIcon from '@mui/icons-material/HighlightOffTwoTone';

// types
import { UserProfile } from 'types/user-profile';
import { History as HistoryProps } from 'types/chat';

// drawer content element
const Main = styled('main', { shouldForwardProp: (prop: string) => prop !== 'open' })<{ open: boolean }>(({ theme, open }) => ({
  flexGrow: 1,
  paddingLeft: open ? theme.spacing(3) : 0,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.shorter
  }),
  marginLeft: `-${drawerWidth}px`,
  [theme.breakpoints.down('lg')]: {
    paddingLeft: 0,
    marginLeft: 0
  },
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.shorter
    }),
    marginLeft: 0
  })
}));

// ==============================|| APPLICATION CHAT ||============================== //

export default function ChatMainPage() {
  const theme = useTheme();
  const downLG = useMediaQuery(theme.breakpoints.down('lg'));

  const [loading, setLoading] = useState<boolean>(true);

  // handle right sidebar dropdown menu
  const [anchorEl, setAnchorEl] = React.useState<Element | (() => Element) | null | undefined>(null);
  const handleClickSort = (event: React.MouseEvent<HTMLButtonElement> | undefined) => {
    setAnchorEl(event?.currentTarget);
  };

  const handleCloseSort = () => {
    setAnchorEl(null);
  };

  // set chat details page open when user is selected from sidebar
  const [emailDetails, setEmailDetails] = React.useState(false);
  const handleUserChange = (event: React.SyntheticEvent) => {
    setEmailDetails((prev) => !prev);
  };

  // toggle sidebar
  const [openChatDrawer, setOpenChatDrawer] = React.useState(true);
  const handleDrawerOpen = () => {
    setOpenChatDrawer((prevState) => !prevState);
  };

  // close sidebar when widow size below 'md' breakpoint
  useEffect(() => {
    setOpenChatDrawer(!downLG);
  }, [downLG]);

  const [user, setUser] = useState<UserProfile>({});
  const [data, setData] = React.useState<HistoryProps[]>([]);
  const chatState = useSelector((state) => state.chat);

  useEffect(() => {
    setUser(chatState.user);
  }, [chatState.user]);

  useEffect(() => {
    setData(chatState.chats);
  }, [chatState.chats]);

  useEffect(() => {
    const userCall = dispatch(getUser(1));
    Promise.all([userCall]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    dispatch(getUserChats(user.name));
  }, [user]);

  // handle new message form
  const [message, setMessage] = useState('');
  const handleOnSend = () => {
    const d = new Date();
    setMessage('');
    const newMessage = {
      from: 'User1',
      to: user.name,
      text: message,
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setData((prevState) => [...prevState, newMessage]);
    dispatch(insertChat(newMessage));
  };

  const handleEnter = (event: React.KeyboardEvent<HTMLDivElement> | undefined) => {
    if (event?.key !== 'Enter') {
      return;
    }
    handleOnSend();
  };

  // handle emoji
  const onEmojiClick = (emojiObject: EmojiClickData, event: MouseEvent) => {
    setMessage(message + emojiObject.emoji);
  };

  const [anchorElEmoji, setAnchorElEmoji] = React.useState<any>(); /** No single type can cater for all elements */
  const handleOnEmojiButtonClick = (event: React.MouseEvent<HTMLButtonElement> | undefined) => {
    setAnchorElEmoji(anchorElEmoji ? null : event?.currentTarget);
  };

  const emojiOpen = Boolean(anchorElEmoji);
  const emojiId = emojiOpen ? 'simple-popper' : undefined;
  const handleCloseEmoji = () => {
    setAnchorElEmoji(null);
  };

  if (loading) return <Loader />;

  return (
    <Box sx={{ display: 'flex' }}>
      <ChatDrawer openChatDrawer={openChatDrawer} handleDrawerOpen={handleDrawerOpen} setUser={setUser} />
      <Main open={openChatDrawer}>
        <Grid container spacing={gridSpacing}>
          <Grid sx={{ display: emailDetails ? { xs: 'none', sm: 'flex' } : 'flex' }} size="grow">
            <MainCard sx={{ bgcolor: theme.palette.mode === ThemeMode.DARK ? 'dark.main' : 'grey.50' }}>
              <Grid container spacing={gridSpacing}>
                <Grid size={12}>
                  <Grid container spacing={0.5} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <IconButton onClick={handleDrawerOpen} size="large" aria-label="chat menu collapse">
                        <MenuRoundedIcon />
                      </IconButton>
                    </Grid>
                    <Grid>
                      <Grid container spacing={2} sx={{ alignItems: 'center', flexWrap: 'nowrap' }}>
                        <Grid>
                          <Avatar alt={user.name} src={user.avatar && getImageUrl(`${user.avatar}`, ImagePath.USERS)} />
                        </Grid>
                        <Grid size={{ sm: 'grow' }}>
                          <Grid container spacing={0} sx={{ alignItems: 'center' }}>
                            <Grid size={12}>
                              <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                                <Typography variant="h4">{user.name}</Typography>
                                {user.online_status && <AvatarStatus status={user.online_status} />}
                              </Stack>
                            </Grid>
                            <Grid size={12}>
                              <Typography variant="subtitle2">Last seen {user.lastMessage}</Typography>
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid size={{ sm: 'grow' }} />
                    {!emailDetails && (
                      <>
                        <Grid>
                          <IconButton size="large" aria-label="chat user call">
                            <CallTwoToneIcon />
                          </IconButton>
                        </Grid>
                        <Grid>
                          <IconButton size="large" aria-label="chat user video call">
                            <VideoCallTwoToneIcon />
                          </IconButton>
                        </Grid>
                      </>
                    )}
                    <Grid>
                      <IconButton
                        onClick={handleUserChange}
                        size="large"
                        aria-label="chat user information"
                        {...(emailDetails && { color: 'error' })}
                      >
                        <ErrorTwoToneIcon />
                      </IconButton>
                    </Grid>
                    {!emailDetails && (
                      <Grid>
                        <IconButton onClick={handleClickSort} size="large" aria-label="chat user details change">
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
                    )}
                  </Grid>
                  <Divider sx={{ mt: 2 }} />
                </Grid>
                <PerfectScrollbar style={{ width: '100%', height: 'calc(100vh - 440px)', overflowX: 'hidden', minHeight: 488 }}>
                  <Box sx={{ py: 0 }}>
                    <ChartHistory theme={theme} user={user} data={data} />
                  </Box>
                </PerfectScrollbar>
                <Grid size={12}>
                  <Grid container spacing={1} sx={{ alignItems: 'center' }}>
                    <Grid>
                      <IconButton size="large" aria-label="attachment file">
                        <AttachmentTwoToneIcon />
                      </IconButton>
                      <IconButton
                        ref={anchorElEmoji}
                        aria-describedby={emojiId}
                        onClick={handleOnEmojiButtonClick}
                        size="large"
                        aria-label="emoji"
                      >
                        <MoodTwoToneIcon />
                      </IconButton>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 'grow' }}>
                      <OutlinedInput
                        id="message-send"
                        fullWidth
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={() => handleEnter}
                        placeholder="Type a Message"
                        endAdornment={
                          <InputAdornment position="end">
                            <IconButton disableRipple color="primary" onClick={handleOnSend} aria-label="send message">
                              <SendTwoToneIcon />
                            </IconButton>
                          </InputAdornment>
                        }
                        aria-describedby="search-helper-text"
                        slotProps={{ input: { 'aria-label': 'weight' } }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Popper
                id={emojiId}
                open={emojiOpen}
                anchorEl={anchorElEmoji}
                disablePortal
                style={{ zIndex: 1200 }}
                modifiers={[
                  {
                    name: 'offset',
                    options: {
                      offset: [-20, 20]
                    }
                  }
                ]}
              >
                <ClickAwayListener onClickAway={handleCloseEmoji}>
                  <MainCard
                    elevation={8}
                    content={false}
                    sx={{
                      '& .EmojiPickerReact': {
                        backgroundColor: 'background.default',
                        ...(theme.palette.mode === ThemeMode.DARK && {
                          borderColor: alpha(theme.palette.grey[500], 0.2),
                          'div:last-child': {
                            borderColor: alpha(theme.palette.grey[500], 0.2)
                          }
                        })
                      },
                      '& .EmojiPickerReact .epr-emoji-category-label': {
                        backgroundColor: 'background.paper'
                      },
                      '& .epr-search-container input': {
                        backgroundColor: theme.palette.mode === ThemeMode.DARK ? 'background.paper' : 'grey.50',
                        ...(theme.palette.mode === ThemeMode.DARK && {
                          borderColor: alpha(theme.palette.grey[500], 0.2)
                        }),
                        '&:focus': {
                          borderColor: theme.palette.mode === ThemeMode.DARK ? 'common.white' : 'primary.main'
                        }
                      }
                    }}
                  >
                    <EmojiPicker onEmojiClick={onEmojiClick} defaultSkinTone={SkinTones.DARK} lazyLoadEmojis={true} />
                  </MainCard>
                </ClickAwayListener>
              </Popper>
            </MainCard>
          </Grid>
          {emailDetails && (
            <Grid sx={{ margin: { xs: '0 auto', md: 'initial' } }}>
              <Box sx={{ display: { xs: 'block', sm: 'none', textAlign: 'right' } }}>
                <IconButton onClick={handleUserChange} sx={{ mb: -5 }} size="large">
                  <HighlightOffTwoToneIcon />
                </IconButton>
              </Box>
              <UserDetails user={user} />
            </Grid>
          )}
        </Grid>
      </Main>
    </Box>
  );
}
