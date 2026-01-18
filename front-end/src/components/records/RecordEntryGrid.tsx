import React from 'react';
import { Grid } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledGrid = styled(Grid)(({ theme }) => ({
  '& .MuiTextField-root': {
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#ffffff',
      height: '48px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
      border: `1px solid ${theme.palette.grey[400]}`,
      borderRadius: '4px',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: '2px',
        },
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px',
          borderColor: theme.palette.primary.main,
        },
      },
      '&.Mui-disabled': {
        backgroundColor: theme.palette.action.disabledBackground,
        boxShadow: 'none',
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[400],
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
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
      border: `1px solid ${theme.palette.grey[400]}`,
      borderRadius: '4px',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: '2px',
        },
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px',
          borderColor: theme.palette.primary.main,
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[400],
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
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
      border: `1px solid ${theme.palette.grey[400]}`,
      borderRadius: '4px',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: '2px',
        },
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(25, 118, 210, 0.2)',
        '& .MuiOutlinedInput-notchedOutline': {
          borderWidth: '2px',
          borderColor: theme.palette.primary.main,
        },
      },
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.grey[400],
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

interface RecordEntryGridProps {
  children: React.ReactNode;
  spacing?: number;
}

export const RecordEntryGrid: React.FC<RecordEntryGridProps> = ({
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
