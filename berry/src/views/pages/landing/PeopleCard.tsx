// material-ui
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

// project imports
import Avatar from 'ui-component/extended/Avatar';
import SubCard from 'ui-component/cards/SubCard';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';

// ==============================|| PEOPLE CARD ||============================== //

interface Props {
  id: number;
  name: string;
  image: string;
  tag: string;
  content: string;
  view: number;
}

export default function PeopleCard({ id, name, image, tag, content, view }: Props) {
  const color = ['primary', 'secondary', 'success', 'info', 'error', 'warning'];

  return (
    <SubCard
      key={id}
      sx={{
        bgcolor: 'background.default',
        cursor: 'pointer',
        '&:hover': {
          transform: 'scale3d(1.02, 1.02, 1)',
          transition: 'all .4s ease-in-out'
        },
        opacity: view
      }}
    >
      <Stack spacing={2.5}>
        <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
          {image !== '' && (
            <Avatar src={image && getImageUrl(image, ImagePath.TESTAMENTS)} alt={name} sx={{ height: 40, width: 40, bgcolor: 'grey.100' }}>
              {name.slice(0, 1)}
            </Avatar>
          )}
          {image == '' && (
            <Avatar color={color[Math.floor(Math.random() * (5 - 0 + 1) + 0)]} sx={{ height: 40, width: 40 }}>
              {name.slice(0, 1)}
            </Avatar>
          )}
          <Stack spacing={0}>
            <Typography variant="h4" sx={{ fontWeight: 500 }}>
              {name}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'primary.main' }}>
              {tag}
            </Typography>
          </Stack>
        </Stack>
        <Typography variant="body1">{content}</Typography>
      </Stack>
    </SubCard>
  );
}
