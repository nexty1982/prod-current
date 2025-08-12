// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Grid,
    Avatar,
    Chip,
    LinearProgress
} from '@mui/material';
import {
    IconDroplet,
    IconHeart,
    IconCross,
    IconFileText,
    IconClock,
    IconTrendingUp
} from '@tabler/icons-react';

const TodaysSummary = () => {
    const todaysStats = [
        {
            title: 'Baptisms Today',
            count: 2,
            icon: IconDroplet,
            color: '#5D87FF',
            bgColor: '#ECF2FF'
        },
        {
            title: 'OCR Processing',
            count: 8,
            total: 12,
            icon: IconFileText,
            color: '#49BEFF',
            bgColor: '#E8F7FF',
            showProgress: true,
            progress: 67
        },
        {
            title: 'Active Users',
            count: 24,
            icon: IconTrendingUp,
            color: '#13DEB9',
            bgColor: '#E6FFFA'
        },
        {
            title: 'Pending Reviews',
            count: 3,
            icon: IconClock,
            color: '#FFAE1F',
            bgColor: '#FEF5E5'
        }
    ];

    const liturgicalInfo = {
        date: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        feast: 'Commemoration of Saint Mary Magdalene',
        reading: 'Luke 8:1-3',
        fast: 'Apostles Fast continues'
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" fontWeight={600} mb={3}>
                    Today's Summary
                </Typography>

                {/* Daily Stats */}
                <Grid container spacing={2} mb={4}>
                    {todaysStats.map((stat, index) => (
                        <Grid key={index} size={{ xs: 6, md: 3 }}>
                            <Box
                                sx={{
                                    p: 2,
                                    backgroundColor: stat.bgColor,
                                    borderRadius: 2,
                                    textAlign: 'center'
                                }}
                            >
                                <Avatar
                                    sx={{
                                        bgcolor: stat.color,
                                        width: 40,
                                        height: 40,
                                        mx: 'auto',
                                        mb: 1
                                    }}
                                >
                                    <stat.icon size={20} />
                                </Avatar>

                                <Typography variant="h6" color={stat.color} mb={0.5}>
                                    {stat.showProgress ? `${stat.count}/${stat.total}` : stat.count}
                                </Typography>

                                <Typography variant="caption" color="text.secondary">
                                    {stat.title}
                                </Typography>

                                {stat.showProgress && (
                                    <Box mt={1}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={stat.progress}
                                            sx={{
                                                height: 4,
                                                borderRadius: 2,
                                                backgroundColor: 'rgba(0,0,0,0.1)',
                                                '& .MuiLinearProgress-bar': {
                                                    backgroundColor: stat.color
                                                }
                                            }}
                                        />
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    ))}
                </Grid>

                {/* Liturgical Information */}
                <Box
                    sx={{
                        p: 3,
                        backgroundColor: 'primary.light',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'primary.main'
                    }}
                >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" color="primary.main">
                            Liturgical Information
                        </Typography>
                        <Chip
                            label="Today"
                            size="small"
                            color="primary"
                        />
                    </Box>

                    <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Date
                            </Typography>
                            <Typography variant="body1" fontWeight={500} mb={2}>
                                {liturgicalInfo.date}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Today's Feast
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                                {liturgicalInfo.feast}
                            </Typography>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Gospel Reading
                            </Typography>
                            <Typography variant="body1" fontWeight={500} mb={2}>
                                {liturgicalInfo.reading}
                            </Typography>

                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Fasting
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                                {liturgicalInfo.fast}
                            </Typography>
                        </Grid>
                    </Grid>
                </Box>
            </CardContent>
        </Card>
    );
};

export default TodaysSummary;
