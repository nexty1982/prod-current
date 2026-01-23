import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

interface RecordSectionCardProps {
  title: string;
  helperText?: string;
  children: React.ReactNode;
}

const StyledCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02)',
  border: `1px solid ${theme.palette.grey[200]}`,
  backgroundColor: theme.palette.background.paper,
  marginBottom: theme.spacing(3),
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  fontSize: '1.125rem',
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
}));

const SectionHelper = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(2),
}));

const SectionContent = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: theme.spacing(3),
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
  },
}));

export const RecordSectionCard: React.FC<RecordSectionCardProps> = ({
  title,
  helperText,
  children,
}) => {
  return (
    <StyledCard>
      <SectionTitle variant="h6">{title}</SectionTitle>
      {helperText && <SectionHelper variant="body2">{helperText}</SectionHelper>}
      <SectionContent>{children}</SectionContent>
    </StyledCard>
  );
};
