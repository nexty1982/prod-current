// material-ui
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';

// project imports
import SubCard from 'ui-component/cards/SubCard';

// assets
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import FacebookIcon from '@mui/icons-material/Facebook';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

// social data
const socialData = [
  {
    url: 'https://www.facebook.com/codedthemes/',
    icon: <FacebookIcon color="primary" />
  },
  {
    url: 'https://x.com/codedthemes',
    icon: <TwitterIcon color="primary" />
  },
  {
    url: 'https://in.linkedin.com/company/codedthemes',
    icon: <LinkedInIcon color="primary" />
  }
];

// ==============================|| BLOG - SOCIAL CARD ||============================== //

export default function SocialCard() {
  return (
    <SubCard
      title="Social Media Link"
      secondary={
        <Button variant="outlined" size="small" startIcon={<AddOutlinedIcon />} color="primary" sx={{ textTransform: 'none' }}>
          Add custom link
        </Button>
      }
      sx={{ '& .MuiCardHeader-action': { mr: 0 } }}
      contentSX={{ '&:last-child': { pb: 2.5 } }}
    >
      <List sx={{ py: 0 }}>
        {socialData.map((data, index) => (
          <ListItem
            sx={{ px: 0, '& .MuiListItemSecondaryAction-root': { right: 0 } }}
            key={index}
            secondaryAction={
              <IconButton size="small" aria-label="edit">
                <EditOutlinedIcon />
              </IconButton>
            }
          >
            <ListItemIcon>{data.icon}</ListItemIcon>
            <ListItemText
              sx={{ my: 0, mr: 5, wordBreak: 'break-word' }}
              primary={
                <Link href={data.url} target="_blank">
                  {data.url}
                </Link>
              }
              slotProps={{ primary: { variant: 'body2', color: 'primary.main' } }}
            />
          </ListItem>
        ))}
      </List>
    </SubCard>
  );
}
