// material-ui
import { styled, useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import { IconLayoutGridAdd } from '@tabler/icons-react';

// styles
const CardWrapper = styled(MainCard)(({ theme }) => ({
  background: `linear-gradient(350deg, ${theme.palette.primary[800]} 40%, ${theme.palette.primary.main} 100%)`,
  color: theme.palette.primary.light,
  overflow: 'hidden',
  position: 'relative',
  '&:after': {
    content: '""',
    position: 'absolute',
    width: 156,
    height: 156,
    opacity: '30%',
    background: theme.palette.primary[200],
    borderRadius: '50%',
    top: -55,
    right: -60
  },
  '&:before': {
    content: '""',
    position: 'absolute',
    width: 90,
    height: 86,
    opacity: '30%',
    background: theme.palette.primary[200],
    borderRadius: '50%',
    top: 100,
    left: -30
  }
}));

// ==============================|| DISCOUNT CARD ||============================== //

interface DiscountCardProps {
  discountText: string;
  description: string;
  buttonText: string;
}

export default function DiscountCard({ discountText, description, buttonText }: DiscountCardProps) {
  const theme = useTheme();

  return (
    <CardWrapper border={false} content={false}>
      <Stack direction="row" sx={{ p: 2.5, gap: 1.5 }}>
        <Avatar
          variant="rounded"
          sx={{
            ...theme.typography.commonAvatar,
            ...theme.typography.largeAvatar,
            bgcolor: 'primary.main',
            color: 'common.white'
          }}
        >
          <IconLayoutGridAdd fontSize="inherit" />
        </Avatar>
        <Stack sx={{ gap: 3.25 }}>
          <Stack sx={{ gap: 0.25 }}>
            <Typography variant="h4" sx={{ fontWeight: 500, color: 'common.white' }}>
              {discountText}
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.light', mt: 0.25 }}>
              {description}
            </Typography>
          </Stack>
          <Button variant="outlined" sx={{ color: 'primary.light', borderColor: 'primary.200' }}>
            {buttonText}
          </Button>
        </Stack>
      </Stack>
    </CardWrapper>
  );
}
