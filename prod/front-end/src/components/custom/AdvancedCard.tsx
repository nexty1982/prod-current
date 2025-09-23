import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box
} from '@mui/material';
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles';

interface AdvancedCardProps {
  title: string;
  description?: string;
  tags?: string[];
  onAction?: () => void;
}

const AdvancedCard: React.FC<AdvancedCardProps> = ({
  title,
  description,
  tags = [],
  onAction
}) => {
  const [lastClicked, setLastClicked] = useState<Date | null>(null);
  const theme = useTheme();

  const handleAction = () => {
    setLastClicked(new Date());
    onAction?.();
  };

  return (
    <Card sx={{ maxWidth: 345, m: 2 }}>
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
        {tags.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {tags.map((tag, index) => (
              <Chip key={index} label={tag} size="small" sx={{ mr: 1, mb: 1 }} />
            ))}
          </Box>
        )}
        {lastClicked && (
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Last clicked: {format(lastClicked, 'PPpp')}
          </Typography>
        )}
      </CardContent>
      <CardActions>
        <Button size="small" onClick={handleAction}>
          Action
        </Button>
      </CardActions>
    </Card>
  );
};

export default AdvancedCard;
