import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Stack, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { styled } from '@mui/material/styles';

interface RecordFormShellProps {
  title?: string;
  subtitle?: string;
  headerIcons?: Array<{ src: string; alt: string }>;
  backgroundImageSrc?: string;
  showTitle?: boolean;
  children: React.ReactNode;
  footerActions?: {
    onCancel?: () => void;
    onSave?: () => void;
    onSaveAndAddAnother?: () => void;
    saveLabel?: string;
    cancelLabel?: string;
    saveAndAddLabel?: string;
    loading?: boolean;
    hasUnsavedChanges?: boolean;
  };
}

const PageContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  position: 'relative',
  padding: theme.spacing(4, 2),
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  backgroundColor: theme.palette.background.default,
}));

const FormCard = styled(Paper)(({ theme }) => ({
  position: 'relative',
  zIndex: 2,
  maxWidth: '1100px',
  width: '100%',
  borderRadius: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100vh - 64px)',
  backgroundColor: '#ffffff',
  border: `1px solid ${theme.palette.grey[200]}`,
}));

const HeaderRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3, 4),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const HeaderIcon = styled('img')(({ theme }) => ({
  width: '72px',
  height: '72px',
  objectFit: 'contain',
  borderRadius: '8px',
  border: `2px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(0.5),
}));

const TitleSection = styled(Box)(({ theme }) => ({
  textAlign: 'center',
  padding: theme.spacing(3, 4, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  letterSpacing: '0.05em',
  color: theme.palette.text.primary,
  marginBottom: theme.spacing(0.5),
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

const FormContent = styled(Box)(({ theme }) => ({
  flex: 1,
  overflowY: 'auto',
  padding: theme.spacing(4),
  backgroundColor: '#ffffff',
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: theme.palette.grey[100],
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.grey[400],
    borderRadius: '4px',
    '&:hover': {
      background: theme.palette.grey[500],
    },
  },
}));

const FooterBar = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2.5, 4),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  position: 'sticky',
  bottom: 0,
  zIndex: 10,
  boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04)',
}));

export const RecordFormShell: React.FC<RecordFormShellProps> = ({
  title,
  subtitle,
  headerIcons = [],
  backgroundImageSrc,
  showTitle = true,
  children,
  footerActions,
}) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<(() => void) | null>(null);

  const handleCancelClick = () => {
    if (footerActions?.hasUnsavedChanges) {
      setPendingCancel(() => footerActions.onCancel || (() => {}));
      setShowCancelDialog(true);
    } else {
      footerActions?.onCancel?.();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelDialog(false);
    pendingCancel?.();
    setPendingCancel(null);
  };

  const handleCancelDialogClose = () => {
    setShowCancelDialog(false);
    setPendingCancel(null);
  };

  return (
    <>
      <PageContainer>
        <FormCard>
          {headerIcons.length > 0 && (
            <HeaderRow>
              {headerIcons.map((icon, index) => (
                <HeaderIcon
                  key={index}
                  src={icon.src}
                  alt={icon.alt}
                />
              ))}
            </HeaderRow>
          )}

          {showTitle && title && (
            <TitleSection>
              <StyledTitle variant="h4">{title}</StyledTitle>
              {subtitle && (
                <StyledSubtitle variant="body2">{subtitle}</StyledSubtitle>
              )}
            </TitleSection>
          )}

          <FormContent>
            {children}
          </FormContent>

          {footerActions && (
            <FooterBar>
              <Stack direction="row" spacing={2} sx={{ width: '100%', justifyContent: 'space-between' }}>
                <Box>
                  {footerActions.onCancel && (
                    <Button
                      variant="outlined"
                      onClick={handleCancelClick}
                      disabled={footerActions.loading}
                    >
                      {footerActions.cancelLabel || 'Cancel'}
                    </Button>
                  )}
                </Box>
                <Stack direction="row" spacing={2}>
                  {footerActions.onSave && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={footerActions.onSave}
                      disabled={footerActions.loading}
                    >
                      {footerActions.loading ? 'Saving...' : (footerActions.saveLabel || 'Save Record')}
                    </Button>
                  )}
                  {footerActions.onSaveAndAddAnother && (
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={footerActions.onSaveAndAddAnother}
                      disabled={footerActions.loading}
                    >
                      {footerActions.loading ? 'Saving...' : (footerActions.saveAndAddLabel || 'Save & Add Another')}
                    </Button>
                  )}
                </Stack>
              </Stack>
            </FooterBar>
          )}
        </FormCard>
      </PageContainer>

      <Dialog
        open={showCancelDialog}
        onClose={handleCancelDialogClose}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            You have unsaved changes. Are you sure you want to cancel? All changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialogClose} color="primary">
            Keep Editing
          </Button>
          <Button onClick={handleConfirmCancel} color="error" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
