// material-ui
import { useTheme, styled } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CardMedia from '@mui/material/CardMedia';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// third party
import Slider, { Settings } from 'react-slick';

// project imports
import { ThemeMode } from 'config';
import Avatar from 'ui-component/extended/Avatar';
import MainCard from 'ui-component/cards/MainCard';

// assets
import LinkIcon from '@mui/icons-material/Link';
import FiberManualRecordTwoToneIcon from '@mui/icons-material/FiberManualRecordTwoTone';
import { IconBrandX, IconBrandDiscordFilled } from '@tabler/icons-react';

import Blog1 from 'assets/images/blog/blog-2.png';
import Blog2 from 'assets/images/blog/library-1.png';
import Blog3 from 'assets/images/blog/blog-1.png';
import Blog4 from 'assets/images/blog/library-3.png';
import Blog5 from 'assets/images/blog/library-2.png';
import Avatar2 from 'assets/images/users/avatar-2.png';
import Banner from 'assets/images/blog/post-banner.png';
import LinkedinIcon from 'assets/images/icons/linkedin.svg';
import FacebookIcon from 'assets/images/icons/facebook.svg';

// ==============================||  BLOG DETAILS CARD ||============================== //

export default function BlogDetailsCard() {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));

  const cardMediaStyle = {
    borderRadius: 2
  };

  const blogImages = [Blog1, Blog2, Blog3, Blog4, Blog5];

  const StyledSlider = styled(Slider)`
    .slick-next {
      display: none;
    }
    .slick-dots {
      position: relative;
      margin-bottom: 20px;
      margin-inline: -5px;
    }
    ,
    .slick-dots.slick-thumb li {
      width: 189px;
      height: 140px;
    }

    @media (max-width: 1440px) {
      .slick-dots.slick-thumb li {
        width: 128px; /* Adjust width for smaller screens */
        height: 135px; /* Adjust height for smaller screens */
      }
    }

    @media (max-width: 1024px) {
      .slick-dots.slick-thumb li {
        width: 121px; /* Adjust width for even smaller screens */
        height: 135px; /* Adjust height for even smaller screens */
      }
    }

    @media (max-width: 768px) {
      .slick-dots.slick-thumb li {
        width: 119px; /* Further adjust width for mobile screens */
        height: 130px; /* Further adjust height for mobile screens */
      }
    }
    @media (max-width: 425px) {
      .slick-dots.slick-thumb li {
        width: 55px; /* Further adjust width for mobile screens */
        height: 80px; /* Further adjust height for mobile screens */
      }
    }
  `;

  const settings: Settings = {
    customPaging: function (i) {
      return <CardMedia component="img" sx={{ height: { xs: 80, sm: 135 }, ...cardMediaStyle }} width={180} image={blogImages[i]} />;
    },
    dots: true,
    dotsClass: 'slick-dots slick-thumb',
    rows: 1,
    arrows: false,
    swipeToSlide: true,
    focusOnSelect: true,
    autoplay: true,
    slidesToShow: 1,
    responsive: [
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          centerMode: true,
          centerPadding: '20px'
        }
      }
    ]
  };

  return (
    <MainCard>
      <Stack sx={{ py: 2, gap: 2 }}>
        <Stack sx={{ gap: 3, alignItems: 'center' }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <Chip label="React" size="small" color="secondary" />
            <FiberManualRecordTwoToneIcon color="disabled" sx={{ fontSize: 8 }} />
            <Typography variant="caption">3 min read</Typography>
          </Stack>
          <Stack sx={{ alignItems: 'center' }}>
            <Typography variant="h2" sx={{ fontWeight: 900 }}>
              What's New in React 19: Action Hooks
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              One reason React remains the top framework is its ability to stay updated, add...
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ gap: 1, alignItems: { xs: 'flex-start', sm: 'center' } }}>
            <Avatar size="sm" alt="User 1" src={Avatar2} />
            <Stack sx={{ gap: 0.25 }}>
              <Stack direction="row" sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1, justifyContent: 'flex-start' }}>
                <Typography variant="h4" sx={{ fontWeight: 500 }}>
                  Richard Westmoreland
                </Typography>
                <Avatar color="success" variant="square" sx={{ height: 'auto', width: 'auto', borderRadius: 0.75 }}>
                  <Typography variant="h6" sx={{ color: 'common.white', px: 0.5, py: 0.25 }}>
                    PRO
                  </Typography>
                </Avatar>
              </Stack>
              <Typography variant="caption">Feb 22, 2022</Typography>
            </Stack>
          </Stack>
        </Stack>
        <StyledSlider {...settings} className="blog-slider">
          {blogImages.map((image, index) => (
            <CardMedia
              key={index}
              component="img"
              sx={{ height: { xs: 318, md: 518 }, ...cardMediaStyle }}
              image={image}
              title={`image${index + 1}`}
            />
          ))}
        </StyledSlider>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            React 19 introduces Action Hooks, a powerful feature that simplifies state management by providing reusable logic. These hooks
            streamline event handling, making it easier to manage side effects and enhance application performance.
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Action Hooks in React 19 allow developers to encapsulate complex logic within custom hooks, promoting cleaner and more
            maintainable code. They support asynchronous operations, making it easier to handle data fetching, form submissions, and other
            actions within components.
          </Typography>
        </Stack>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="h3" sx={{ color: 'text.primary', fontWeight: 700 }}>
            Who are you and where are you based?
            <Link href="#" sx={{ textDecoration: 'none', ml: 1 }}>
              <LinkIcon color="primary" sx={{ verticalAlign: 'text-bottom' }} />
            </Link>
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            One reason React remains the top framework is its ability to stay updated, address current challenges developers encounter, and
            act on them. Let's delve into the core features that are stirring excitement among developers. For each hook, I will explain
          </Typography>
        </Stack>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 500 }}>
            When and why did you first get started into photography?
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            I first got into photography during college, drawn by the desire to capture moments and express creativity. It became a passion
            as I discovered how photos could tell stories and evoke emotions.
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            My work was getting traction and it helped me carve out my “minimalist” reputation, which is now something I have clients seek
            me out for.
          </Typography>
        </Stack>
        <CardMedia component="img" sx={cardMediaStyle} image={Banner} title="banner" />
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 500 }}>
            What inspired you to start learning programming?
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            I was inspired to start learning programming when I realized the power it holds in solving real-world problems. The idea of
            creating something impactful from scratch fueled my passion for coding.
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            he creativity and problem-solving aspects of web development motivated me. Building interactive, user-friendly websites that
            people rely on daily is incredibly fulfilling.
          </Typography>
        </Stack>
      </Stack>
      <Stack direction="row" sx={{ gap: 2, width: 1 }}>
        <Avatar size="sm" alt="User 1" src={Avatar2} />
        <Stack sx={{ gap: 2, width: 1 }}>
          <TextField id="input-with-icon-textfield" fullWidth placeholder="Comment here.." variant="outlined" rows={4} multiline />
          <Box sx={{ textAlign: 'right' }}>
            <Button variant="contained" color="secondary" size={downMD ? 'small' : 'large'} sx={{ py: 1.5, px: 3 }}>
              Comment
            </Button>
          </Box>
        </Stack>
      </Stack>
      <Stack sx={{ gap: 2, py: 2, alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 500, color: 'text.primary' }}>
          Share article
        </Typography>
        <Stack direction="row" sx={{ gap: 1.5, justifyContent: 'center' }}>
          <Link href="https://twitter.com/codedthemes" target="_blank">
            <IconBrandX
              style={{
                color: theme.palette.mode === ThemeMode.DARK ? theme.palette.common.white : theme.palette.common.black
              }}
              size="20px"
            />
          </Link>
          <Link href="https://www.linkedin.com/company/codedthemes" target="_blank">
            <CardMedia component="img" src={LinkedinIcon} alt="Linkedin" />
          </Link>
          <Link href="https://www.facebook.com/codedthemes" target="_blank">
            <CardMedia component="img" src={FacebookIcon} alt="Linkedin" />
          </Link>
          <Link href="https://discord.com/invite/p2E2WhCb6s" target="_blank">
            <IconBrandDiscordFilled style={{ color: '#5D6AF2' }} size="20px" />
          </Link>
        </Stack>
      </Stack>
    </MainCard>
  );
}
