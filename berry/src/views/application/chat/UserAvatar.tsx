// material-ui
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';

// project imports
import AvatarStatus from './AvatarStatus';
import { UserProfile } from 'types/user-profile';
import { getImageUrl, ImagePath } from 'utils/getImageUrl';

// ==============================|| CHAT USER AVATAR WITH STATUS ICON ||============================== //

interface UserAvatarProps {
  user: UserProfile;
}

export default function UserAvatar({ user }: UserAvatarProps) {
  return (
    <Badge
      overlap="circular"
      badgeContent={<AvatarStatus status={user.online_status!} />}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right'
      }}
    >
      <Avatar alt={user.name} src={user.avatar && getImageUrl(`${user.avatar}`, ImagePath.USERS)} />
    </Badge>
  );
}
