import * as React from 'react';
import { Button, Stack, ButtonProps, Box } from '@mui/material';
import { styled } from '@mui/system';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';

/** Brand tokens */
const brand = {
  purple: '#4C1D95',      // royal purple
  purpleDark: '#2E1065',  // deeper purple
  gold: '#F6C90E',        // gold
  goldDark: '#D4A80A',    // deeper gold
  glow: 'rgba(246, 201, 14, 0.35)',
};

/** Base pill button */
const Pill = styled(Button)<ButtonProps>(() => ({
  borderRadius: 14,
  padding: '5px 9px',
  textTransform: 'none',
  fontWeight: 600,
  letterSpacing: 0.2,
  fontSize: '0.75rem',
  boxShadow: `0 6px 16px -6px ${brand.glow}`,
  '& .MuiButton-startIcon': { marginRight: 10 },
  '&:focus-visible': { outline: `3px solid ${brand.glow}`, outlineOffset: 2 },
}));

/** Solid royal-purple */
const RoyalButton = styled(Pill)({
  color: '#fff',
  background: `linear-gradient(135deg, ${brand.purple} 0%, ${brand.purpleDark} 100%)`,
  '&:hover': { background: `linear-gradient(135deg, ${brand.purpleDark} 0%, ${brand.purple} 100%)` },
});

/** Solid gold (purple text) */
const GoldButton = styled(Pill)({
  color: brand.purpleDark,
  background: `linear-gradient(135deg, ${brand.gold} 0%, ${brand.goldDark} 100%)`,
  '&:hover': { background: `linear-gradient(135deg, ${brand.goldDark} 0%, ${brand.gold} 100%)` },
});

/** Royal → Gold gradient */
const RoyalGoldButton = styled(Pill)({
  color: '#fff',
  background: `linear-gradient(100deg, ${brand.purple} 0%, ${brand.purpleDark} 50%, ${brand.gold} 115%)`,
  backgroundSize: '140% 100%',
  transition: 'background-position .25s ease, transform .06s ease',
  '&:hover': { backgroundPosition: 'right center', transform: 'translateY(-1px)' },
});

export function AddRecordButton(props: ButtonProps & { recordType?: 'baptism' | 'marriage' | 'funeral' }) {
  const { recordType, ...buttonProps } = props;
  
  // Determine which image to use based on record type
  const getImageSrc = () => {
    switch (recordType) {
      case 'baptism':
        return '/images/buttons/EN-baptism-record-entry.png';
      case 'marriage':
        return '/images/buttons/EN-marriage-record-entry.png';
      case 'funeral':
        return '/images/buttons/EN-funeral-record-entry.png';
      default:
        return null;
    }
  };

  const imageSrc = getImageSrc();
  
  // If we have a record type and image, use the image as startIcon
  const startIcon = imageSrc ? (
    <Box
      component="img"
      src={imageSrc}
      alt="Add Record"
      sx={{
        width: '20px',
        height: '20px',
        objectFit: 'contain',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    />
  ) : <AddRoundedIcon />;

  return (
    <RoyalButton 
      startIcon={startIcon} 
      {...buttonProps}
    >
      Add Record
    </RoyalButton>
  );
}

export function ImportRecordsButton(props: ButtonProps) {
  return <GoldButton startIcon={<CloudUploadRoundedIcon />} {...props}>Import Records</GoldButton>;
}

export function AdvancedGridButton(props: ButtonProps) {
  return <RoyalGoldButton startIcon={<GridViewRoundedIcon />} {...props}>Advanced Grid</RoyalGoldButton>;
}

/** Ready-to-use group placed on the RIGHT side of the toolbar */
export function RecordsActionButtons(props: { 
  onAdd(): void; 
  onImport(): void; 
  onAdvanced(): void; 
  loading?: boolean;
  recordType?: 'baptism' | 'marriage' | 'funeral';
}) {
  const { onAdd, onImport, onAdvanced, loading = false, recordType } = props;
  return (
    <Stack direction="row" spacing={2} sx={{ ml: 'auto' }}>
      <AddRecordButton onClick={onAdd} disabled={loading} recordType={recordType} />
      <ImportRecordsButton onClick={onImport} disabled={loading} />
      <AdvancedGridButton onClick={onAdvanced} disabled={loading} />
    </Stack>
  );
}
