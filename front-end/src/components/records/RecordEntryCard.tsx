import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

interface RecordEntryCardProps {
  title?: string;
  subtitle?: string;
  headerImageSrc?: string;
  frameImageSrc?: string;
  showTitle?: boolean;
  children: React.ReactNode;
}

const ParchmentCard = styled(Paper)(({ theme }) => ({
  maxWidth: '1100px',
  margin: '0 auto',
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  borderRadius: '8px',
  padding: '32px',
  boxShadow: theme.shadows[2],
  border: `1px solid ${theme.palette.divider}`,
}));

const TitleContainer = styled(Box)(({ theme }) => ({
  textAlign: 'left',
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(1),
  fontSize: '1.75rem',
  [theme.breakpoints.down('sm')]: {
    fontSize: '1.5rem',
  },
}));

const StyledSubtitle = styled(Typography)(({ theme }) => ({
  fontWeight: 400,
  color: theme.palette.text.secondary,
  fontSize: '0.95rem',
}));

const ContentContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 1,
}));

export const RecordEntryCard: React.FC<RecordEntryCardProps> = ({
  title,
  subtitle,
  headerImageSrc,
  frameImageSrc,
  showTitle = true,
  children,
}) => {
  return (
    <ParchmentCard elevation={0}>
      {showTitle && title && (
        <TitleContainer>
          <StyledTitle variant="h4">{title}</StyledTitle>
          {subtitle && (
            <StyledSubtitle variant="body1">{subtitle}</StyledSubtitle>
          )}
        </TitleContainer>
      )}

      <ContentContainer>
        {children}
      </ContentContainer>
    </ParchmentCard>
  );
};
