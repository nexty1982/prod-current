import Grid2 from '@/mui/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Card, CardContent, Typography, Box, Grid, Avatar } from '@mui/material';
import { IconDroplet, IconHeart, IconCross } from '@tabler/icons-react';

const SacramentsStats = () => {
    const sacramentData = [
        {
            title: 'Baptisms',
            count: 23,
            icon: IconDroplet,
            color: '#5D87FF',
            bgColor: '#ECF2FF'
        },
        {
            title: 'Marriages',
            count: 12,
            icon: IconHeart,
            color: '#49BEFF',
            bgColor: '#E8F7FF'
        },
        {
            title: 'Funerals',
            count: 8,
            icon: IconCross,
            color: '#13DEB9',
            bgColor: '#E6FFFA'
        }
    ];

    return (
        <Card>
            <CardContent>
                <Typography variant="h5" mb={3}>
                    Sacraments This Month
                </Typography>
                <Grid2 container spacing={2}>
                    {sacramentData.map((item, index) => (
                        <Grid2 key={index} size={12}>
                            <Box
                                display="flex"
                                alignItems="center"
                                gap={2}
                                p={2}
                                borderRadius={2}
                                sx={{ backgroundColor: item.bgColor }}
                            >
                                <Avatar
                                    sx={{
                                        bgcolor: item.color,
                                        width: 44,
                                        height: 44
                                    }}
                                >
                                    <item.icon size={20} />
                                </Avatar>
                                <Box>
                                    <Typography variant="h4" color={item.color}>
                                        {item.count}
                                    </Typography>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        {item.title}
                                    </Typography>
                                </Box>
                            </Box>
                        </Grid2>
                    ))}
                </Grid2>
            </CardContent>
        </Card>
    );
};

export default SacramentsStats;
