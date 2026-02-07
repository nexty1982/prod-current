import Grid2 from '@/components/compat/Grid2';
import CustomSelect from '@/components/forms/theme-elements/CustomSelect';
import CustomTextField from '@/components/forms/theme-elements/CustomTextField';
import Address from '@/features/records-centralized/components/Address';
import CustomFormLabel from '@/components/forms/theme-elements/CustomFormLabel';
import { Alert, Box, Button, CircularProgress, Container, MenuItem } from '@mui/material';
import axios from 'axios';
import React, { useState } from 'react';

const enquiryTypes = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'parish_registration', label: 'Parish Registration' },
  { value: 'records', label: 'Records & Certificates' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Pricing' },
  { value: 'other', label: 'Other' },
];

const Form = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    enquiryType: 'general',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (field: string) => (e: any) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (feedback) setFeedback(null);
  };

  const validate = (): string | null => {
    if (!form.firstName.trim()) return 'First name is required.';
    if (!form.lastName.trim()) return 'Last name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Please enter a valid email address.';
    if (!form.phone.trim()) return 'Phone number is required.';
    if (!form.message.trim()) return 'Please enter a message.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFeedback({ type: 'error', text: err });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await axios.post('/api/contact', form);
      setFeedback({ type: 'success', text: 'Thank you! Your message has been sent. We will get back to you shortly.' });
      setForm({ firstName: '', lastName: '', phone: '', email: '', enquiryType: 'general', message: '' });
    } catch (error: any) {
      setFeedback({ type: 'error', text: error.response?.data?.message || 'Failed to send message. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (<>
    <Box
      sx={{
        paddingTop: {
          xs: '40px',
          lg: '60px',
        },
        paddingBottom: {
          xs: '40px',
          lg: '90px',
        },
      }}
    >
      <Container maxWidth="lg">
        <Grid2 container spacing={3} justifyContent="center">
          <Grid2
            alignItems="center"
            size={{
              xs: 12,
              lg: 8
            }}>
            <form onSubmit={handleSubmit}>
              {feedback && (
                <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
                  {feedback.text}
                </Alert>
              )}
              <Grid2 container spacing={3} justifyContent="center">
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="fname" sx={{ mt: 0 }}>
                    First Name *
                  </CustomFormLabel>
                  <CustomTextField id="fname" placeholder="Name" fullWidth value={form.firstName} onChange={handleChange('firstName')} />
                </Grid2>
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="lname" sx={{ mt: 0 }}>
                    Last Name *
                  </CustomFormLabel>
                  <CustomTextField id="lname" placeholder="Last Name" fullWidth value={form.lastName} onChange={handleChange('lastName')} />
                </Grid2>
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="phone" sx={{ mt: 0 }}>
                    Phone Number *
                  </CustomFormLabel>
                  <CustomTextField id="phone" placeholder="xxx xxx xxxx" fullWidth value={form.phone} onChange={handleChange('phone')} />
                </Grid2>
                <Grid2
                  alignItems="center"
                  size={{
                    xs: 12,
                    lg: 6
                  }}>
                  <CustomFormLabel htmlFor="txt-email" sx={{ mt: 0 }}>
                    Email *
                  </CustomFormLabel>
                  <CustomTextField id="txt-email" placeholder="Email address" fullWidth value={form.email} onChange={handleChange('email')} />
                </Grid2>
                <Grid2 alignItems="center" size={12}>
                  <CustomFormLabel htmlFor="txt-enquire" sx={{ mt: 0 }}>
                    Enquire related to *
                  </CustomFormLabel>
                  <CustomSelect
                    fullWidth
                    id="txt-enquire"
                    variant="outlined"
                    value={form.enquiryType}
                    onChange={handleChange('enquiryType')}
                  >
                    {enquiryTypes.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                </Grid2>
                <Grid2 alignItems="center" size={12}>
                  <CustomFormLabel htmlFor="txt-message" sx={{ mt: 0 }}>
                    Message *
                  </CustomFormLabel>
                  <CustomTextField
                    id="txt-message"
                    multiline
                    rows={4}
                    variant="outlined"
                    placeholder="Write your message here..."
                    fullWidth
                    value={form.message}
                    onChange={handleChange('message')}
                  />
                </Grid2>
                <Grid2 alignItems="center" size={12}>
                  <Button variant="contained" size="large" type="submit" disabled={submitting}>
                    {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit'}
                  </Button>
                </Grid2>
              </Grid2>
            </form>
          </Grid2>
          <Grid2
            alignItems="center"
            size={{
              xs: 12,
              lg: 4
            }}>
            <Address />
          </Grid2>
        </Grid2>
      </Container>
    </Box>
  </>);
};

export default Form;
