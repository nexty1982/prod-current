import Grid2 from '@mui/material/Grid2';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  CardContent,
  IconButton,
  Typography,
  Tooltip,
  Button,
  Stack,
  Alert
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';

const Grid = Grid2;

// components
import BlankCard from '@/shared/BlankCard';
import CustomTextField from '@/features/records-centralized/shared/ui/legacy/forms/theme-elements/CustomTextField';
import CustomFormLabel from '@/features/records-centralized/shared/ui/legacy/forms/theme-elements/CustomFormLabel';
import { IconCirclePlus, IconCreditCard, IconPackage, IconPencilMinus } from '@tabler/icons-react';

// API helpers
import { getBillingSummary, BillingSummary } from '@/account';

const BillsTab = () => {
  const { user } = useAuth();
  const [billingData, setBillingData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadBillingData();
    }
  }, [user]);

  const loadBillingData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const data = await getBillingSummary(user.id);
      if (data) {
        setBillingData(data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading billing information' });
    } finally {
      setLoading(false);
    }
  };

  return (<>
    <Grid2 container spacing={3} justifyContent="center">
      {message && (
        <Grid2 size={12}>
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        </Grid2>
      )}

      {/* Billing Summary */}
      <Grid2 size={12}>
        <BlankCard>
          <CardContent>
            <Typography variant="h4" mb={2}>
              Billing Summary
            </Typography>
            {loading ? (
              <Typography>Loading billing information...</Typography>
            ) : (
              <Grid2 container spacing={3}>
                <Grid2 size={{ xs: 12, sm: 3 }}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h6" color="primary">
                      {billingData?.subscriptions?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Active Subscriptions
                    </Typography>
                  </Box>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 3 }}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h6" color="primary">
                      {billingData?.invoices?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Recent Invoices
                    </Typography>
                  </Box>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 3 }}>
                  <Box textAlign="center" p={2}>
                    <Typography variant="h6" color="primary">
                      {billingData?.paymentMethods?.length || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Payment Methods
                    </Typography>
                  </Box>
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 3 }}>
                  <Box textAlign="center" p={2}>
                    <Typography 
                      variant="h6" 
                      color={billingData?.billing_status === 'paid_in_full' ? 'success.main' : 
                            billingData?.billing_status === 'overdue' ? 'error.main' : 
                            billingData?.billing_status === 'suspended' ? 'error.main' : 'primary'}
                    >
                      {billingData?.billing_status === 'paid_in_full' ? 'Paid in Full' :
                       billingData?.billing_status === 'payment_plan' ? 'Payment Plan' :
                       billingData?.billing_status === 'overdue' ? 'Overdue' :
                       billingData?.billing_status === 'suspended' ? 'Suspended' : 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Account Status
                    </Typography>
                  </Box>
                </Grid2>
              </Grid2>
            )}

            {/* Account Status Details */}
            {billingData && !loading && (
              <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
                <Typography variant="h6" mb={2}>Account Status Details</Typography>
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="textSecondary">
                      Account Status: 
                      <Typography 
                        component="span" 
                        ml={1} 
                        fontWeight="bold"
                        color={billingData?.billing_status === 'paid_in_full' ? 'success.main' : 
                              billingData?.billing_status === 'overdue' ? 'error.main' : 
                              billingData?.billing_status === 'suspended' ? 'error.main' : 'primary'}
                      >
                        {billingData?.billing_status === 'paid_in_full' ? 'Healthy' :
                         billingData?.billing_status === 'payment_plan' ? 'Active' :
                         billingData?.billing_status === 'overdue' ? 'Overdue' :
                         billingData?.billing_status === 'suspended' ? 'Suspended' : 'Unknown'}
                      </Typography>
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="textSecondary">
                      Balance Due: 
                      <Typography 
                        component="span" 
                        ml={1} 
                        fontWeight="bold"
                        color={billingData.account_balance > 0 ? 'error.main' : 'success.main'}
                      >
                        ${billingData.account_balance?.toFixed(2) || '0.00'}
                      </Typography>
                    </Typography>
                  </Grid2>
                  {billingData.last_payment_date && (
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="textSecondary">
                        Last Payment: 
                        <Typography component="span" ml={1} fontWeight="bold">
                          {new Date(billingData.last_payment_date).toLocaleDateString()}
                        </Typography>
                      </Typography>
                    </Grid2>
                  )}
                  {billingData.next_payment_due && (
                    <Grid2 size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="textSecondary">
                        Next Payment Due: 
                        <Typography component="span" ml={1} fontWeight="bold">
                          {new Date(billingData.next_payment_due).toLocaleDateString()}
                        </Typography>
                      </Typography>
                    </Grid2>
                  )}
                </Grid2>
              </Box>
            )}
          </CardContent>
        </BlankCard>
      </Grid2>

      <Grid2
        size={{
          xs: 12,
          lg: 9
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h4" mb={2}>
              Billing Information
            </Typography>

            <Grid2 container spacing={3}>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <CustomFormLabel sx={{ mt: 0 }} htmlFor="text-bname">
                  Business Name*
                </CustomFormLabel>
                <CustomTextField
                  id="text-bname"
                  value="Visitor Analytics"
                  variant="outlined"
                  fullWidth
                />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <CustomFormLabel sx={{ mt: 0 }} htmlFor="text-bsector">
                  Business Sector*
                </CustomFormLabel>
                <CustomTextField
                  id="text-bsector"
                  value="Arts, Media & Entertainment"
                  variant="outlined"
                  fullWidth
                />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <CustomFormLabel sx={{ mt: 0 }} htmlFor="text-baddress">
                  Business Address*
                </CustomFormLabel>
                <CustomTextField id="text-baddress" value="" variant="outlined" fullWidth />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <CustomFormLabel sx={{ mt: 0 }} htmlFor="text-bcy">
                  Country*
                </CustomFormLabel>
                <CustomTextField id="text-bcy" value="Romania" variant="outlined" fullWidth />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <CustomFormLabel sx={{ mt: 0 }} htmlFor="text-fname">
                  First Name*
                </CustomFormLabel>
                <CustomTextField id="text-fname" value="" variant="outlined" fullWidth />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <CustomFormLabel sx={{ mt: 0 }} htmlFor="text-lname">
                  Last Name*
                </CustomFormLabel>
                <CustomTextField id="text-lname" value="" variant="outlined" fullWidth />
              </Grid2>
            </Grid2>
          </CardContent>
        </BlankCard>
      </Grid2>

      {/* 2 */}
      <Grid2
        size={{
          xs: 12,
          lg: 9
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h4" display="flex" mb={2}>
              Current Plan :
              <Typography variant="h4" component="div" ml="2px" color="success.main">
                Executive
              </Typography>
            </Typography>
            <Typography color="textSecondary">
              Thanks for being a premium member and supporting our development.
            </Typography>

            {/* list 1 */}
            <Stack direction="row" spacing={2} mt={4} mb={2}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconPackage size="22" />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" color="textSecondary">
                  Current Plan
                </Typography>
                <Typography variant="h6" mb={1}>
                  750.000 Monthly Visits
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <Tooltip title="Add">
                  <IconButton>
                    <IconCirclePlus size="22" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button variant="contained" color="primary">
                Change Plan
              </Button>
              <Button variant="outlined" color="error">
                Reset Plan
              </Button>
            </Stack>
          </CardContent>
        </BlankCard>
      </Grid2>

      {/* 3 */}
      <Grid2
        size={{
          xs: 12,
          lg: 9
        }}>
        <BlankCard>
          <CardContent>
            <Typography variant="h4" mb={2}>
              Payment Method
            </Typography>
            <Typography color="textSecondary">On 26 December, 2023</Typography>
            {/* list 1 */}
            <Stack direction="row" spacing={2} mt={4}>
              <Avatar
                variant="rounded"
                sx={{ bgcolor: 'grey.100', color: 'grey.500', width: 48, height: 48 }}
              >
                <IconCreditCard size="22" />
              </Avatar>
              <Box>
                <Typography variant="h6" mb={1}>
                  Visa
                </Typography>
                <Typography variant="subtitle1" fontWeight={600}>
                  *****2102
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto !important' }}>
                <Tooltip title="Edit">
                  <IconButton>
                    <IconPencilMinus size="22" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>
            <Typography color="textSecondary" my={1}>
              If you updated your payment method, it will only be dislpayed here after your next
              billing cycle.
            </Typography>
            <Button variant="outlined" color="error">
              Cancel Subscription
            </Button>
          </CardContent>
        </BlankCard>
      </Grid2>
    </Grid2>
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'end' }} mt={3}>
      <Button size="large" variant="contained" color="primary">
        Save
      </Button>
      <Button size="large" variant="text" color="error">
        Cancel
      </Button>
    </Stack>
  </>);
};

export default BillsTab;
