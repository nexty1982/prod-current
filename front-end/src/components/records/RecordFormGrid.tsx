import React from 'react';
import { Grid } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledGrid = styled(Grid)(({ theme }) => ({
  '& .MuiTextField-root': {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#ffffff',
      height: '48px',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: '#ffffff',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
      },
      '&.Mui-disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[300],
        borderWidth: '1px',
      },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 600,
      color: theme.palette.text.primary,
      fontSize: '0.875rem',
      '&.Mui-focused': {
        color: theme.palette.primary.main,
        fontWeight: 700,
      },
      '&.MuiInputLabel-shrink': {
        fontWeight: 600,
      },
    },
    '& .MuiInputBase-input': {
      fontWeight: 400,
      color: theme.palette.text.primary,
      '&::placeholder': {
        color: theme.palette.text.secondary,
        opacity: 0.7,
      },
    },
  },
  '& .MuiFormControl-root': {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#ffffff',
      height: '48px',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: '#ffffff',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[300],
        borderWidth: '1px',
      },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 600,
      color: theme.palette.text.primary,
      fontSize: '0.875rem',
      '&.Mui-focused': {
        color: theme.palette.primary.main,
        fontWeight: 700,
      },
      '&.MuiInputLabel-shrink': {
        fontWeight: 600,
      },
    },
    '& .MuiSelect-select': {
      fontWeight: 400,
      color: theme.palette.text.primary,
    },
  },
  '& .MuiAutocomplete-root': {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#ffffff',
      minHeight: '48px',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: '#ffffff',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[300],
        borderWidth: '1px',
      },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 600,
      color: theme.palette.text.primary,
      fontSize: '0.875rem',
      '&.Mui-focused': {
        color: theme.palette.primary.main,
        fontWeight: 700,
      },
      '&.MuiInputLabel-shrink': {
        fontWeight: 600,
      },
    },
    '& .MuiInputBase-input': {
      fontWeight: 400,
      color: theme.palette.text.primary,
    },
  },
  '& .MuiInputBase-input': {
    fontSize: '0.9375rem',
    fontWeight: 400,
  },
}));

interface RecordFormGridProps {
  children: React.ReactNode;
  spacing?: number;
}

export const RecordFormGrid: React.FC<RecordFormGridProps> = ({
  children,
  spacing = 3,
}) => {
  return (
    <StyledGrid container spacing={spacing}>
      {React.Children.map(children, (child, index) => (
        <Grid item xs={12} sm={6} key={index}>
          {child}
        </Grid>
      ))}
    </StyledGrid>
  );
};
