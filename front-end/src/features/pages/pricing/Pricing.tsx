// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Typography, Box, List, ListItem, ListItemText, Button, CardContent, ListItemIcon, Chip, Switch } from '@mui/material';
import Grid2 from '@/components/compat/Grid2';
import { useTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';
import Breadcrumb from '@/layouts/full/shared/breadcrumb/Breadcrumb';
import PageContainer from '@/shared/ui/PageContainer';

import { IconCheck, IconX } from '@tabler/icons-react';
import BlankCard from '@/shared/ui/BlankCard';

import pck1 from '@/assets/images/backgrounds/silver.png';
import pck2 from '@/assets/images/backgrounds/bronze.png';
import pck3 from '@/assets/images/backgrounds/gold.png';

const BCrumb = [
  {
    to: '/',
    title: 'Home',
  },
  {
    title: 'Pricing',
  },
];

interface PricingPlan {
  id: number;
  package: string;
  plan?: string;
  monthlyplan: string | number;
  avatar: string;
  badge: boolean;
  btntext: string;
  rules: {
    limit: boolean;
    title: string;
  }[];
}

const pricing: PricingPlan[] = [
  {
    id: 1,
    package: 'Silver',
    plan: 'Free',
    monthlyplan: 'Free',
    avatar: pck1,
    badge: false,
    btntext: 'Choose Silver',
    rules: [
      {
        limit: true,
        title: 'Up to 3 Parish Users',
      },
      {
        limit: true,
        title: 'Basic Record Management',
      },
      {
        limit: true,
        title: 'English Language Support',
      },
      {
        limit: false,
        title: 'Multilingual Support',
      },
      {
        limit: false,
        title: 'Advanced Analytics',
      },
      {
        limit: false,
        title: 'Automated Backups',
      },
      {
        limit: false,
        title: 'Priority Support',
      },
    ],
  },
  {
    id: 2,
    package: 'Bronze',
    monthlyplan: 49.99,
    avatar: pck2,
    badge: true,
    btntext: 'Choose Bronze',
    rules: [
      {
        limit: true,
        title: 'Up to 10 Parish Users',
      },
      {
        limit: true,
        title: 'Full Record Management',
      },
      {
        limit: true,
        title: '5 Language Support',
      },
      {
        limit: true,
        title: 'Advanced Analytics',
      },
      {
        limit: true,
        title: 'Automated Daily Backups',
      },
      {
        limit: true,
        title: 'Email Support',
      },
      {
        limit: false,
        title: 'Custom Reports',
      },
      {
        limit: false,
        title: 'API Access',
      },
    ],
  },
  {
    id: 3,
    package: 'Gold',
    monthlyplan: 99.99,
    avatar: pck3,
    badge: false,
    btntext: 'Choose Gold',
    rules: [
      {
        limit: true,
        title: 'Unlimited Parish Users',
      },
      {
        limit: true,
        title: 'Full Record Management',
      },
      {
        limit: true,
        title: 'All Language Support',
      },
      {
        limit: true,
        title: 'Advanced Analytics & Insights',
      },
      {
        limit: true,
        title: 'Automated Daily Backups',
      },
      {
        limit: true,
        title: 'Priority Support',
      },
      {
        limit: true,
        title: 'Custom Reports & Exports',
      },
      {
        limit: true,
        title: 'Full API Access',
      },
    ],
  },
];

const Pricing = () => {
  const [show, setShow] = React.useState(false);

  const yearlyPrice = (a: any, b: number) => a * b;

  const theme = useTheme();

  // Orthodox Metrics Brand Colors
  const primaryColor = '#2E0F46'; // Dark purple
  const accentColor = '#C8A24B'; // Gold/bronze
  const goldColor = '#D4AF37'; // Bright gold
  const lightBackground = theme.palette.mode === 'dark' ? theme.palette.background.paper : '#faf8f4';

  const StyledChip = styled(Chip)({
    position: 'absolute',
    top: '15px',
    right: '30px',
    backgroundColor: accentColor,
    color: '#ffffff',
    textTransform: 'uppercase',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    boxShadow: `0 2px 8px rgba(200, 162, 75, 0.3)`,
  });

  const StyledCard = styled(BlankCard)(({ theme }) => ({
    backgroundColor: lightBackground,
    border: `2px solid rgba(212, 175, 55, 0.3)`,
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: `0 8px 24px rgba(46, 15, 70, 0.15), 0 0 0 1px rgba(212, 175, 55, 0.4)`,
      borderColor: `rgba(212, 175, 55, 0.6)`,
    },
  }));

  const StyledTitle = styled(Typography)(({ theme }) => ({
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    color: theme.palette.mode === 'dark' ? '#ffffff' : primaryColor,
    fontWeight: 700,
    letterSpacing: '0.5px',
    textAlign: 'center',
    [theme.breakpoints.down('md')]: {
      fontSize: '32px',
    },
  }));

  const StyledPackageName = styled(Typography)(({ theme }) => ({
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    color: theme.palette.mode === 'dark' ? '#ffffff' : primaryColor,
    fontWeight: 600,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  }));

  const StyledPrice = styled(Typography)(({ theme }) => ({
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    color: theme.palette.mode === 'dark' ? '#ffffff' : primaryColor,
    fontWeight: 700,
  }));

  const StyledButton = styled(Button)(({ theme }) => ({
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    backgroundColor: primaryColor,
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '16px',
    letterSpacing: '0.5px',
    padding: theme.spacing(1.5, 3),
    textTransform: 'none',
    border: `2px solid ${accentColor}`,
    boxShadow: `0 4px 12px rgba(46, 15, 70, 0.2)`,
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: accentColor,
      color: primaryColor,
      transform: 'translateY(-2px)',
      boxShadow: `0 6px 16px rgba(200, 162, 75, 0.4)`,
    },
  }));

  const StyledSwitchLabel = styled(Typography)(({ theme }) => ({
    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    color: theme.palette.mode === 'dark' ? '#ffffff' : primaryColor,
    fontWeight: 500,
    fontSize: '18px',
  }));

  return (
    (<PageContainer title="Pricing" description="this is Pricing page">
      {/* breadcrumb */}
      <Breadcrumb title="Pricing" items={BCrumb} />
      {/* end breadcrumb */}
      <Box sx={{ backgroundColor: lightBackground, py: 6, px: 2 }}>
        <Grid2 container spacing={3} justifyContent="center">
          <Grid2
            textAlign="center"
            size={{
              xs: 12,
              sm: 10,
              lg: 8
            }}>
            <StyledTitle variant="h2" sx={{ mb: 2 }}>
              Flexible Plans Tailored to Fit Your Parish's Unique Needs
            </StyledTitle>
            <Typography 
              variant="body1" 
              sx={{ 
                fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                fontSize: '18px',
                mb: 4,
                fontStyle: 'italic'
              }}
            >
              Preserve your sacramental history with plans designed for Orthodox communities
            </Typography>
            <Box display="flex" alignItems="center" mt={3} justifyContent="center" gap={2}>
              <StyledSwitchLabel>Monthly</StyledSwitchLabel>
              <Switch 
                onChange={() => setShow(!show)} 
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: accentColor,
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: accentColor,
                  },
                }}
              />
              <StyledSwitchLabel>Yearly</StyledSwitchLabel>
            </Box>
          </Grid2>
        </Grid2>
      </Box>
      <Box sx={{ backgroundColor: theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff', py: 6, px: 2 }}>
        <Grid2 container spacing={4} justifyContent="center">
          {pricing.map((price, i) => (
            <Grid2
              key={i}
              size={{
                xs: 12,
                lg: 4,
                sm: 6
              }}>
              <StyledCard>
                <CardContent sx={{ p: '40px', position: 'relative' }}>
                  {price.badge ? <StyledChip label="Most Popular" size="small"></StyledChip> : null}

                  <StyledPackageName
                    variant="subtitle1"
                    fontSize="14px"
                    mb={3}
                  >
                    {price.package} Plan
                  </StyledPackageName>
                  <Box display="flex" justifyContent="center" mb={3}>
                    <img src={price.avatar} alt={price.avatar} width={100} style={{ filter: 'drop-shadow(0 4px 8px rgba(46, 15, 70, 0.2))' }} />
                  </Box>
                  <Box my={4} textAlign="center">
                    {price.plan == 'Free' ? (
                      <StyledPrice sx={{ fontSize: '48px', mt: 5 }}>
                        {price.plan}
                      </StyledPrice>
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="baseline">
                        <StyledPrice variant="h6" sx={{ mr: '8px', fontSize: '28px' }}>
                          $
                        </StyledPrice>
                        {show ? (
                          <>
                            <StyledPrice sx={{ fontSize: '56px' }}>
                              {yearlyPrice(`${price.monthlyplan}`, 12)}
                            </StyledPrice>
                            <Typography
                              sx={{
                                fontSize: '18px',
                                fontWeight: 400,
                                ml: 1,
                                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                                fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                              }}
                            >
                              /yr
                            </Typography>
                          </>
                        ) : (
                          <>
                            <StyledPrice sx={{ fontSize: '56px' }}>
                              {price.monthlyplan}
                            </StyledPrice>
                            <Typography
                              sx={{
                                fontSize: '18px',
                                fontWeight: 400,
                                ml: 1,
                                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                                fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                              }}
                            >
                              /mo
                            </Typography>
                          </>
                        )}
                      </Box>
                    )}
                  </Box>

                  <Box mt={4}>
                    <List>
                      {price.rules.map((rule, i) => (
                        <Box key={i}>
                          {rule.limit ? (
                            <>
                              <ListItem disableGutters sx={{ py: 1 }}>
                                <ListItemIcon sx={{ color: accentColor, minWidth: '36px' }}>
                                  <IconCheck width={20} stroke={2.5} />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={rule.title}
                                  primaryTypographyProps={{
                                    fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                                    fontSize: '16px',
                                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                                    fontWeight: 500,
                                  }}
                                />
                              </ListItem>
                            </>
                          ) : (
                            <ListItem disableGutters sx={{ color: 'grey.400', py: 1 }}>
                              <ListItemIcon sx={{ color: 'grey.400', minWidth: '36px' }}>
                                <IconX width={20} stroke={2} />
                              </ListItemIcon>
                              <ListItemText 
                                primary={rule.title}
                                primaryTypographyProps={{
                                  fontFamily: '"Cormorant Garamond", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                                  fontSize: '16px',
                                  color: 'grey.400',
                                }}
                              />
                            </ListItem>
                          )}
                        </Box>
                      ))}
                    </List>
                  </Box>

                  <StyledButton
                    fullWidth
                    variant="contained"
                    size="large"
                    sx={{ mt: 4 }}
                  >
                    {price.btntext}
                  </StyledButton>
                </CardContent>
              </StyledCard>
            </Grid2>
          ))}
        </Grid2>
      </Box>
    </PageContainer>)
  );
};

export default Pricing;
