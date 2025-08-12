// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Grid,
    Button,
    Avatar,
    Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
    IconFilePlus,
    IconUpload,
    IconUsers,
    IconFileText,
    IconCalendar,
    IconChartLine
} from '@tabler/icons-react';

interface ControlCard {
    label: string;
    description: string;
    icon: React.ReactNode;
    to: string;
    color: string;
    bgColor: string;
    permission?: string;
}

interface MiniControlPanelProps {
    cards?: ControlCard[];
}

const MiniControlPanel: React.FC<MiniControlPanelProps> = ({ cards }) => {
    const navigate = useNavigate();

    const defaultCards: ControlCard[] = [
        {
            label: 'Add New Record',
            description: 'Create baptism, marriage, or funeral record',
            icon: <IconFilePlus size={24} />,
            to: '/records/add',
            color: '#5D87FF',
            bgColor: '#ECF2FF'
        },
        {
            label: 'Upload Records',
            description: 'OCR-ready document upload',
            icon: <IconUpload size={24} />,
            to: '/ocr/upload',
            color: '#49BEFF',
            bgColor: '#E8F7FF'
        },
        {
            label: 'Manage Users',
            description: 'Church staff and volunteers',
            icon: <IconUsers size={24} />,
            to: '/users',
            color: '#13DEB9',
            bgColor: '#E6FFFA'
        },
        {
            label: 'View Reports',
            description: 'Analytics and summaries',
            icon: <IconChartLine size={24} />,
            to: '/reports',
            color: '#FFAE1F',
            bgColor: '#FEF5E5'
        },
        {
            label: 'Orthodox Calendar',
            description: 'Saints, feasts, readings & fasting',
            icon: <IconCalendar size={24} />,
            to: '/apps/liturgical-calendar',
            color: '#9C27B0',
            bgColor: '#F3E5F5'
        },
        {
            label: 'Documents',
            description: 'Forms and templates',
            icon: <IconFileText size={24} />,
            to: '/documents',
            color: '#FF6B35',
            bgColor: '#FFF4F1'
        }
    ];

    const cardsToShow = cards || defaultCards;

    const handleCardClick = (to: string) => {
        navigate(to);
    };

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <Typography variant="h5" fontWeight={600}>
                        Quick Actions
                    </Typography>
                    <Chip
                        label={`${cardsToShow.length} Actions`}
                        size="small"
                        color="primary"
                        variant="outlined"
                    />
                </Box>

                <Grid container spacing={2}>
                    {cardsToShow.map((card, index) => (
                        <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Button
                                fullWidth
                                onClick={() => handleCardClick(card.to)}
                                sx={{
                                    p: 0,
                                    height: 'auto',
                                    textTransform: 'none',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: 2
                                    },
                                    transition: 'all 0.2s ease-in-out'
                                }}
                            >
                                <Box
                                    sx={{
                                        p: 2.5,
                                        width: '100%',
                                        height: '120px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: card.bgColor,
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'transparent',
                                        '&:hover': {
                                            borderColor: card.color,
                                            backgroundColor: card.bgColor
                                        }
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            bgcolor: card.color,
                                            width: 48,
                                            height: 48,
                                            mb: 1.5
                                        }}
                                    >
                                        {card.icon}
                                    </Avatar>

                                    <Typography
                                        variant="subtitle1"
                                        fontWeight={600}
                                        color="text.primary"
                                        textAlign="center"
                                        mb={0.5}
                                    >
                                        {card.label}
                                    </Typography>

                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        textAlign="center"
                                        sx={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {card.description}
                                    </Typography>
                                </Box>
                            </Button>
                        </Grid>
                    ))}
                </Grid>
            </CardContent>
        </Card>
    );
};

export default MiniControlPanel;
