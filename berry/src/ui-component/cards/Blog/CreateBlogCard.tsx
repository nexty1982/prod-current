import { Link } from 'react-router-dom';

// material-ui
import Stack from '@mui/material/Stack';
import Button, { ButtonProps } from '@mui/material/Button';
import Typography from '@mui/material/Typography';

// project imports
import MainCard from 'ui-component/cards/MainCard';

// assets
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';

interface CreateBlogCardProps {
  title: string;
  description: string;
  learnMoreText?: string;
  buttonProps: ButtonProps;
}

// ==============================|| CREATE NEW BLOG CARD ||============================== //

export default function CreateBlogCard({ title, description, learnMoreText, buttonProps }: CreateBlogCardProps) {
  return (
    <MainCard sx={{ bgcolor: 'secondary.main', color: 'secondary.light' }} contentSX={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
      <Stack sx={{ gap: 1 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ color: 'common.white', fontWeight: 500 }}>
            {title || 'Create New Blog'}
          </Typography>
          {learnMoreText && (
            <Button endIcon={<OpenInNewOutlinedIcon fontSize="small" />} size="small" sx={{ color: 'secondary.light' }} variant="text">
              {learnMoreText}
            </Button>
          )}
        </Stack>
        <Typography variant="caption" sx={{ color: 'secondary.light' }}>
          {description}
        </Typography>
      </Stack>
      {buttonProps && (
        <Button
          variant="contained"
          color="inherit"
          component={Link}
          to="/apps/blog/add-new"
          {...buttonProps}
          sx={{ ...buttonProps.sx, mt: 2.5, ml: 'auto', display: 'block', width: 'fit-content', textTransform: 'none' }}
        >
          {buttonProps.children}
        </Button>
      )}
    </MainCard>
  );
}
