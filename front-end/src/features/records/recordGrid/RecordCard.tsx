import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Add as AddIcon,
  FileDownload as ExportIcon,
  Preview as PreviewIcon,
  MoreVert as MoreIcon,
  TrendingUp as TrendingIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useRecords, RecordType } from '@/context/RecordsContext';
import BlankCard from '@/shared/BlankCard';

interface RecordCardProps {
  record: RecordType;
}

const RecordCard: React.FC<RecordCardProps> = ({ record }) => {
  const { navigateToRecord } = useRecords();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sacramental':
        return 'primary';
      case 'administrative':
        return 'secondary';
      case 'membership':
        return 'success';
      default:
        return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'sacramental':
        return 'Sacramental';
      case 'administrative':
        return 'Administrative';
      case 'membership':
        return 'Membership';
      default:
        return category;
    }
  };

  const handleActionClick = (action: string) => {
    handleMenuClose();
    switch (action) {
      case 'view':
        navigateToRecord(record.id);
        break;
      case 'add':
        window.location.href = `/apps/../features/records/records/${record.id}/add`;
        break;
      case 'export':
        window.location.href = `/api/../features/records/records/${record.id}/export`;
        break;
      case 'preview':
        window.open(`/apps/../features/records/records/${record.id}/preview`, '_blank');
        break;
      default:
        console.log(`Action ${action} not implemented`);
    }
  };

  return (
    <BlankCard className="hoverCard">
      <Box sx={{ position: 'relative', p: 3 }}>
        {/* Record Icon and Category */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center">
            <Box
              sx={{
                fontSize: '3rem',
                backgroundColor: 'primary.light',
                borderRadius: 2,
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2
              }}
            >
              {record.icon}
            </Box>
            <Box>
              <Typography variant="h6" component="h3" gutterBottom>
                {record.name}
              </Typography>
              <Chip
                label={getCategoryLabel(record.category)}
                size="small"
                color={getCategoryColor(record.category) as any}
                sx={{ mb: 1 }}
              />
            </Box>
          </Box>

          {/* More Actions Menu */}
          <IconButton onClick={handleMenuClick} size="small">
            <MoreIcon />
          </IconButton>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2, minHeight: 40 }}
        >
          {record.description}
        </Typography>

        {/* Record Count and Last Updated */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <Badge badgeContent={record.count} color="primary" max={999}>
              <TrendingIcon color="action" />
            </Badge>
            <Typography variant="body2" sx={{ ml: 1 }}>
              {record.count} records
            </Typography>
          </Box>
          
          {record.lastUpdated && (
            <Box display="flex" alignItems="center">
              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
              <Typography variant="caption" color="text.secondary">
                {new Date(record.lastUpdated).toLocaleDateString()}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons */}
        <Stack direction="row" spacing={1} justifyContent="space-between">
          <Button
            variant="contained"
            startIcon={<ViewIcon />}
            onClick={() => handleActionClick('view')}
            size="small"
            sx={{ flex: 1 }}
          >
            View
          </Button>
          
          <Tooltip title="Add New Record">
            <IconButton
              color="primary"
              onClick={() => handleActionClick('add')}
              sx={{
                backgroundColor: 'primary.light',
                '&:hover': { backgroundColor: 'primary.main', color: 'white' }
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export Records">
            <IconButton
              color="secondary"
              onClick={() => handleActionClick('export')}
              sx={{
                backgroundColor: 'secondary.light',
                '&:hover': { backgroundColor: 'secondary.main', color: 'white' }
              }}
            >
              <ExportIcon />
            </IconButton>
          </Tooltip>

          {record.actions.includes('preview') && (
            <Tooltip title="Preview Records">
              <IconButton
                color="info"
                onClick={() => handleActionClick('preview')}
                sx={{
                  backgroundColor: 'info.light',
                  '&:hover': { backgroundColor: 'info.main', color: 'white' }
                }}
              >
                <PreviewIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* More Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {record.actions.map((action) => (
            <MenuItem
              key={action}
              onClick={() => handleActionClick(action)}
              sx={{ textTransform: 'capitalize' }}
            >
              {action === 'view' && <ViewIcon sx={{ mr: 1 }} />}
              {action === 'add' && <AddIcon sx={{ mr: 1 }} />}
              {action === 'export' && <ExportIcon sx={{ mr: 1 }} />}
              {action === 'preview' && <PreviewIcon sx={{ mr: 1 }} />}
              {action}
            </MenuItem>
          ))}
          <Divider />
          <MenuItem
            component={Link}
            to={`/apps/../features/records/records/${record.id}/settings`}
            onClick={handleMenuClose}
          >
            Settings
          </MenuItem>
        </Menu>
      </Box>
    </BlankCard>
  );
};

export default RecordCard; 