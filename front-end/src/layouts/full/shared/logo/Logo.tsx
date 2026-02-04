import { FC, useContext } from 'react';

import { Link } from 'react-router-dom';
import { ReactComponent as LogoDark } from '@/assets/images/logos/dark-logo.svg?react';
import { ReactComponent as LogoDarkRTL } from '@/assets/images/logos/dark-rtl-logo.svg?react';
import { ReactComponent as LogoLight } from '@/assets/images/logos/light-logo.svg?react';
import { ReactComponent as LogoLightRTL } from '@/assets/images/logos/light-logo-rtl.svg?react';
import { styled } from '@mui/material';
import config from '@/context/config';
import { CustomizerContext } from '@/context/CustomizerContext';


const Logo: FC = () => {
  const { isCollapse, isSidebarHover, activeDir, activeMode } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isCollapse == "mini-sidebar" && !isSidebarHover ? '40px' : '180px',
    overflow: 'hidden',
    display: 'block',
  }));

  if (activeDir === 'ltr') {
    return (
      <LinkStyled to="/dashboards/user" style={{
        display: 'flex',
        alignItems: 'center',
      }}>
        {activeMode === 'dark' ? (
          <LogoLight />
        ) : (
          <LogoDark />
        )}
      </LinkStyled>
    );
  }

  return (
    <LinkStyled to="/dashboards/user" style={{
      display: 'flex',
      alignItems: 'center',
    }}>
      {activeMode === 'dark' ? (
        <LogoDarkRTL />
      ) : (
        <LogoLightRTL />
      )}
    </LinkStyled>
  );
};

export default Logo;
