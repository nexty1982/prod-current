import React from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Typography,
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Church as ChurchIcon,
  Event as EventIcon
} from '@mui/icons-material';

// Types for component props
interface ComponentProps {
  [key: string]: any;
}

interface DynamicComponentRendererProps {
  shortcode: string;
  props?: ComponentProps;
}

// Parse shortcode to extract component type and props
const parseShortcode = (shortcode: string): { component: string; props: ComponentProps } => {
  // Match patterns like {{component:mui-alert:severity=info:title=Hello}}
  const match = shortcode.match(/\{\{component:([^:}]+)(?::([^}]+))?\}\}/);
  
  if (!match) {
    return { component: '', props: {} };
  }
  
  const component = match[1];
  const propsString = match[2] || '';
  
  // Parse props from key=value pairs
  const props: ComponentProps = {};
  if (propsString) {
    const propPairs = propsString.split(':');
    propPairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        props[key] = value;
      }
    });
  }
  
  return { component, props };
};

// Component registry
const componentRegistry = {
  'mui-alert': ({ severity = 'info', title, children, ...props }: ComponentProps) => (
    <Alert severity={severity} sx={{ mb: 2 }} {...props}>
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </Alert>
  ),
  
  'mui-card': ({ title, subtitle, children, elevation = 2, ...props }: ComponentProps) => (
    <Card elevation={elevation} sx={{ mb: 2 }} {...props}>
      {title && (
        <CardHeader
          title={title}
          subheader={subtitle}
        />
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  ),
  
  'contact-info': ({ phone, email, address, hours, ...props }: ComponentProps) => (
    <Paper elevation={1} sx={{ p: 3, mb: 2 }} {...props}>
      <Typography variant="h6" gutterBottom>
        Contact Information
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {phone && (
          <Box display="flex" alignItems="center" gap={1}>
            <PhoneIcon color="primary" />
            <Typography>{phone}</Typography>
          </Box>
        )}
        {email && (
          <Box display="flex" alignItems="center" gap={1}>
            <EmailIcon color="primary" />
            <Typography>{email}</Typography>
          </Box>
        )}
        {address && (
          <Box display="flex" alignItems="center" gap={1}>
            <LocationIcon color="primary" />
            <Typography>{address}</Typography>
          </Box>
        )}
        {hours && (
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon color="primary" />
            <Typography>{hours}</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  ),
  
  'service-times': ({ sunday, weekday, special, ...props }: ComponentProps) => (
    <Card elevation={2} sx={{ mb: 2 }} {...props}>
      <CardHeader 
        title="Service Times" 
        avatar={<Avatar><ChurchIcon /></Avatar>}
      />
      <CardContent>
        <List>
          {sunday && (
            <ListItem>
              <ListItemIcon>
                <EventIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Sunday Services" 
                secondary={sunday}
              />
            </ListItem>
          )}
          {weekday && (
            <ListItem>
              <ListItemIcon>
                <ScheduleIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Weekday Services" 
                secondary={weekday}
              />
            </ListItem>
          )}
          {special && (
            <ListItem>
              <ListItemIcon>
                <StarIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Special Services" 
                secondary={special}
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  ),
  
  'staff-member': ({ name, title, photo, bio, email, ...props }: ComponentProps) => (
    <Card elevation={2} sx={{ mb: 2 }} {...props}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <Avatar 
            src={photo} 
            sx={{ width: 60, height: 60 }}
          >
            <PersonIcon />
          </Avatar>
          <Box>
            <Typography variant="h6">{name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Box>
        {bio && (
          <Typography variant="body2" paragraph>
            {bio}
          </Typography>
        )}
        {email && (
          <Box display="flex" alignItems="center" gap={1}>
            <EmailIcon color="primary" fontSize="small" />
            <Typography variant="body2">{email}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  ),
  
  'callout-box': ({ type = 'info', title, children, ...props }: ComponentProps) => {
    const getIcon = () => {
      switch (type) {
        case 'warning': return <WarningIcon />;
        case 'error': return <ErrorIcon />;
        case 'success': return <CheckCircleIcon />;
        default: return <InfoIcon />;
      }
    };
    
    const getColor = () => {
      switch (type) {
        case 'warning': return 'warning.main';
        case 'error': return 'error.main';
        case 'success': return 'success.main';
        default: return 'info.main';
      }
    };
    
    return (
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          mb: 2, 
          border: `2px solid`,
          borderColor: getColor(),
          borderRadius: 2
        }} 
        {...props}
      >
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          {React.cloneElement(getIcon(), { 
            color: type as any,
            fontSize: 'small' 
          })}
          {title && (
            <Typography variant="h6" color={getColor()}>
              {title}
            </Typography>
          )}
        </Box>
        <Typography variant="body2">
          {children}
        </Typography>
      </Paper>
    );
  },
  
  'feature-grid': ({ features, columns = 3, ...props }: ComponentProps) => {
    const featureList = features ? features.split(',').map((f: string) => f.trim()) : [];
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }} {...props}>
        {featureList.map((feature: string, index: number) => (
          <Box key={index} sx={{ flex: `1 1 ${100/columns}%`, minWidth: '200px' }}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <CheckCircleIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="body2">{feature}</Typography>
            </Paper>
          </Box>
        ))}
      </Box>
    );
  },
  
  'divider': ({ text, ...props }: ComponentProps) => (
    <Box sx={{ my: 3 }} {...props}>
      {text ? (
        <Divider>
          <Chip label={text} />
        </Divider>
      ) : (
        <Divider />
      )}
    </Box>
  ),
  
  'button-group': ({ buttons, ...props }: ComponentProps) => {
    const buttonList = buttons ? buttons.split(',').map((b: string) => {
      const [text, url] = b.split('|');
      return { text: text.trim(), url: url ? url.trim() : '#' };
    }) : [];
    
    return (
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }} {...props}>
        {buttonList.map((button: any, index: number) => (
          <Button
            key={index}
            variant="contained"
            href={button.url}
            target={button.url.startsWith('http') ? '_blank' : '_self'}
          >
            {button.text}
          </Button>
        ))}
      </Box>
    );
  }
};

// Main component renderer
const DynamicComponentRenderer: React.FC<DynamicComponentRendererProps> = ({ 
  shortcode, 
  props: additionalProps = {} 
}) => {
  const { component, props } = parseShortcode(shortcode);
  
  if (!component || !componentRegistry[component as keyof typeof componentRegistry]) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        Unknown component: {component}
      </Alert>
    );
  }
  
  const ComponentToRender = componentRegistry[component as keyof typeof componentRegistry];
  const combinedProps = { ...props, ...additionalProps };
  
  return <ComponentToRender {...combinedProps} />;
};

// Export component registry for use in editor
export const getAvailableComponents = () => {
  return Object.keys(componentRegistry).map(key => ({
    id: key,
    name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    shortcode: `{{component:${key}}}`,
    description: getComponentDescription(key)
  }));
};

const getComponentDescription = (key: string): string => {
  const descriptions: { [key: string]: string } = {
    'mui-alert': 'Display an alert message with different severity levels',
    'mui-card': 'Create a card container with optional title and subtitle',
    'contact-info': 'Display contact information (phone, email, address, hours)',
    'service-times': 'Show church service times in a formatted layout',
    'staff-member': 'Display staff member information with photo and bio',
    'callout-box': 'Create a highlighted callout box with icon',
    'feature-grid': 'Display features in a responsive grid layout',
    'divider': 'Add a divider line with optional text',
    'button-group': 'Create a group of action buttons'
  };
  
  return descriptions[key] || 'Custom component';
};

export default DynamicComponentRenderer;
