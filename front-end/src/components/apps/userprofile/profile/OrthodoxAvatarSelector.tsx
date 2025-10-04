import React from 'react';
import { Box, Avatar, Typography } from '@mui/material';

interface OrthodoxAvatarProps {
  avatar: {
    id: number;
    name: string;
    type: 'clergy' | 'laity';
    component: React.FC<{ size?: number }>;
  };
  isSelected: boolean;
  onClick: () => void;
}

const OrthodoxAvatarSelector: React.FC<OrthodoxAvatarProps> = ({
  avatar,
  isSelected,
  onClick
}) => {
  const AvatarComponent = avatar.component;

  // Debug logging
  console.log('OrthodoxAvatarSelector rendering:', {
    avatarId: avatar.id,
    avatarName: avatar.name,
    avatarType: avatar.type,
    hasComponent: !!AvatarComponent,
    isSelected
  });

  const renderAvatar = () => {
    try {
      if (AvatarComponent) {
        return <AvatarComponent size={70} />;
      } else {
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: 'grey.300',
            color: 'grey.700',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            Missing<br/>Component
          </Box>
        );
      }
    } catch (error) {
      console.error('Error rendering avatar component:', error);
      return (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'error.light',
          color: 'error.contrastText',
          fontSize: '10px',
          textAlign: 'center'
        }}>
          Error<br/>Loading
        </Box>
      );
    }
  };

  return (
    <Box 
      sx={{ 
        textAlign: 'center',
        cursor: 'pointer',
        p: 1,
        borderRadius: 2,
        '&:hover': {
          backgroundColor: 'action.hover',
        }
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          mx: 'auto',
          mb: 1,
          border: isSelected ? '3px solid' : '2px solid transparent',
          borderColor: isSelected ? 'primary.main' : 'transparent',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: 2
          }
        }}
      >
        {renderAvatar()}
      </Box>
      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
        {avatar.name}
      </Typography>
    </Box>
  );
};

export default OrthodoxAvatarSelector;
