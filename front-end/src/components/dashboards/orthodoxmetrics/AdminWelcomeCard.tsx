// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Avatar, Typography, Card, CardContent, Grid, Divider, Stack } from '@mui/material';
import { IconShield, IconTrendingUp } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext.tsx';

import welcomeImg from '@/assets/images/backgrounds/welcome-bg2.png';

const AdminWelcomeCard = () => {
    const { user } = useAuth();

    return (
        <Card elevation={0} sx={{ backgroundColor: (theme) => theme.palette.primary.light, py: 0 }}>
            <CardContent sx={{ py: 4, px: 2 }}>
                <Grid container justifyContent="space-between">
                    <Grid
                        display="flex"
                        alignItems="center"
                        size={{
                            sm: 6
                        }}>
                        <Box>
                            <Box
                                gap="16px" mb={5}
                                sx={{
                                    display: {
                                        xs: 'block',
                                        sm: 'flex',
                                    },
                                    alignItems: 'center',
                                }}
                            >
                                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                                    <IconShield size={24} />
                                </Avatar>
                                <Typography variant="h5" whiteSpace="nowrap">
                                    Welcome back, {user?.first_name || 'Administrator'}!
                                </Typography>
                            </Box>

                            <Stack spacing={2} direction="row" divider={<Divider orientation="vertical" flexItem />}>
                                <Box>
                                    <Typography variant="h2" whiteSpace="nowrap">
                                        147 <span><IconTrendingUp width={18} color="#39B69A" /></span>
                                    </Typography>
                                    <Typography variant="subtitle1" whiteSpace="nowrap">Active Churches</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="h2" whiteSpace="nowrap">
                                        2,340 <span><IconTrendingUp width={18} color="#39B69A" /></span>
                                    </Typography>
                                    <Typography variant="subtitle1" whiteSpace="nowrap">Total Records</Typography>
                                </Box>
                            </Stack>
                        </Box>
                    </Grid>
                    <Grid
                        size={{
                            xs: 12,
                            sm: 5
                        }}>
                        <Box mb="-90px">
                            <img src={welcomeImg} alt="Welcome" width={'340px'} />
                        </Box>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default AdminWelcomeCard;
