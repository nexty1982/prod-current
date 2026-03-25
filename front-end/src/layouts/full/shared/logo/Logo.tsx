import { FC, useContext } from 'react';

import { Link } from 'react-router-dom';
import { Box, styled } from '@mui/material';
import config from '@/context/config';
import { CustomizerContext } from '@/context/CustomizerContext';


const Logo: FC = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isCollapse == "mini-sidebar" && !isSidebarHover ? '40px' : '180px',
    overflow: 'hidden',
    display: 'block',
  }));

  return (
    <LinkStyled to="/" style={{
      display: 'flex',
      alignItems: 'center',
    }}>
      <Box
        component="img"
        src="/images/logos/om-logo.png"
        alt="Orthodox Metrics"
        sx={{
          height: '40px',
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
        }}
      />
    </LinkStyled>
  );
};

export default Logo;
