import { FC, useContext } from 'react';

import config from '@/context/config';
import { CustomizerContext } from '@/context/CustomizerContext';
import { styled, useTheme } from '@mui/material';
import { Link } from 'react-router-dom';


const Logo: FC = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;
  const theme = useTheme();
  const isMini = isCollapse == "mini-sidebar" && !isSidebarHover;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isMini ? '40px' : '220px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
  }));

  const logoSrc = theme.palette.mode === 'dark'
    ? '/images/logos/om-logo-dark.png'
    : '/images/logos/om-logo-light.png';

  return (
    <LinkStyled to="/">
      <img
        src={logoSrc}
        alt="Orthodox Metrics"
        style={{
          height: isMini ? '32px' : '48px',
          width: 'auto',
          objectFit: 'contain',
        }}
      />
    </LinkStyled>
  );
};

export default Logo;
