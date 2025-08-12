// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState } from 'react';
import {
    Box,
    IconButton,
    Badge,
    Tooltip,
    Popover,
    List,
    ListItem,
    ListItemText,
    Typography,
    Divider,
    Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    IconUsers,
    IconMessageCircle,
    IconBell,
    IconMail,
    IconCalendarEvent,
    IconUserPlus
} from '@tabler/icons-react';

interface SocialItem {
    icon: React.ReactNode;
    tooltip: string;
    to: string;
    badgeCount?: number;
    badgeColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
}

interface SocialToolbarProps {
    items?: SocialItem[];
    position?: 'top-right' | 'floating' | 'inline';
}

const SocialToolbar: React.FC<SocialToolbarProps> = ({
    items,
    position = 'top-right'
}) => {
    const navigate = useNavigate();
    const [notificationAnchor, setNotificationAnchor] = useState<HTMLButtonElement | null>(null);

    const defaultItems: SocialItem[] = [
        {
            icon: <IconUsers size={20} />,
            tooltip: 'Friends & Contacts',
            to: '/apps/contacts',
            badgeCount: 0
        },
        {
            icon: <IconMessageCircle size={20} />,
            tooltip: 'Messages',
            to: '/apps/chat',
            badgeCount: 3,
            badgeColor: 'primary'
        },
        {
            icon: <IconBell size={20} />,
            tooltip: 'Notifications',
            to: '/notifications',
            badgeCount: 5,
            badgeColor: 'error'
        }
    ];

    const socialItems = items || defaultItems;

    const handleClick = (to: string) => {
        navigate(to);
    };

    const handleNotificationClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setNotificationAnchor(event.currentTarget);
    };

    const handleNotificationClose = () => {
        setNotificationAnchor(null);
    };

    // Mock notifications for preview
    const mockNotifications = [
        {
            id: 1,
            title: 'New Record Added',
            message: 'Baptism record for Maria Doe has been added',
            time: '5 min ago',
            type: 'success'
        },
        {
            id: 2,
            title: 'OCR Processing Complete',
            message: '3 documents processed successfully',
            time: '1 hour ago',
            type: 'info'
        },
        {
            id: 3,
            title: 'Upcoming Event',
            message: 'Parish meeting tomorrow at 7 PM',
            time: '2 hours ago',
            type: 'warning'
        }
    ];

    const getPositionStyles = () => {
        switch (position) {
            case 'floating':
                return {
                    position: 'fixed' as const,
                    top: '50%',
                    right: 16,
                    transform: 'translateY(-50%)',
                    zIndex: 1000,
                    flexDirection: 'column' as const,
                    gap: 1,
                    p: 1,
                    backgroundColor: 'background.paper',
                    borderRadius: 2,
                    boxShadow: 3
                };
            case 'top-right':
                return {
                    position: 'absolute' as const,
                    top: 16,
                    right: 16,
                    zIndex: 100,
                    gap: 1
                };
            default:
                return {
                    display: 'flex',
                    gap: 1,
                    alignItems: 'center'
                };
        }
    };

    return (
        <>
            <Box sx={getPositionStyles()}>
                {socialItems.map((item, index) => (
                    <Tooltip key={index} title={item.tooltip} arrow>
                        <IconButton
                            onClick={item.tooltip === 'Notifications' ? handleNotificationClick : () => handleClick(item.to)}
                            sx={{
                                backgroundColor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': {
                                    backgroundColor: 'primary.light',
                                    borderColor: 'primary.main'
                                }
                            }}
                        >
                            <Badge
                                badgeContent={item.badgeCount}
                                color={item.badgeColor || 'primary'}
                                max={99}
                            >
                                {item.icon}
                            </Badge>
                        </IconButton>
                    </Tooltip>
                ))}
            </Box>

            {/* Notifications Popover */}
            <Popover
                open={Boolean(notificationAnchor)}
                anchorEl={notificationAnchor}
                onClose={handleNotificationClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: { width: 320, maxHeight: 400 }
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Notifications
                    </Typography>
                    <Divider />
                </Box>

                <List sx={{ p: 0 }}>
                    {mockNotifications.map((notification, index) => (
                        <React.Fragment key={notification.id}>
                            <ListItem>
                                <Box sx={{ mr: 2 }}>
                                    {notification.type === 'success' && <IconUserPlus size={20} color="#13DEB9" />}
                                    {notification.type === 'info' && <IconMail size={20} color="#5D87FF" />}
                                    {notification.type === 'warning' && <IconCalendarEvent size={20} color="#FFAE1F" />}
                                </Box>
                                <ListItemText
                                    primary={notification.title}
                                    secondary={
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {notification.message}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {notification.time}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                            {index < mockNotifications.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>

                <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                            handleNotificationClose();
                            navigate('/notifications');
                        }}
                    >
                        View All Notifications
                    </Button>
                </Box>
            </Popover>
        </>
    );
};

export default SocialToolbar;
