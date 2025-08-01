import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Switch,
  FormControlLabel,
  DialogActions,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

interface User {
  id?: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  phone?: string;
  landing_page?: string;
}

interface UserManagementDialogProps {
  user: User | null;
  action: 'add' | 'edit';
  churchId: string;
  onSave: (userData: any) => void;
  onCancel: () => void;
}

const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  role: Yup.string().required('Role is required'),
});

const UserManagementDialog: React.FC<UserManagementDialogProps> = ({
  user,
  action,
  churchId,
  onSave,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: user?.email || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      role: user?.role || 'user',
      is_active: user?.is_active !== false,
      phone: user?.phone || '',
      landing_page: user?.landing_page || '/dashboards/modern',
      password: '', // Only for new users
    },
    validationSchema: action === 'add' ? validationSchema.shape({
      password: Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required')
    }) : validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const userData = { ...values };
        // Remove password field for edit actions if it's empty
        if (action === 'edit' && !values.password) {
          delete userData.password;
        }
        onSave(userData);
      } catch (error) {
        console.error('Error saving user:', error);
      } finally {
        setLoading(false);
      }
    },
  });

  // Reset form when user prop changes
  useEffect(() => {
    if (user) {
      formik.setValues({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        role: user.role || 'user',
        is_active: user.is_active !== false,
        phone: user.phone || '',
        landing_page: user.landing_page || '/dashboards/modern',
        password: '',
      });
    }
  }, [user]);

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  const landingPageOptions = [
    { value: '/dashboards/modern', label: 'Dashboard' },
    { value: '/records', label: 'Records Management' },
    { value: '/apps/liturgical-calendar', label: 'Liturgical Calendar' },
    { value: '/apps/notes', label: 'Notes App' },
  ];

  return (
    <Box component="form" onSubmit={formik.handleSubmit} sx={{ mt: 2 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            {action === 'add' ? 'Add New User' : 'Edit User Information'}
          </Typography>
          {action === 'add' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              A new user will be created and assigned to this church. An email invitation will be sent.
            </Alert>
          )}
        </Grid>

        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            disabled={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone (Optional)"
            name="phone"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="First Name"
            name="first_name"
            value={formik.values.first_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.first_name && Boolean(formik.errors.first_name)}
            helperText={formik.touched.first_name && formik.errors.first_name}
            disabled={loading}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Last Name"
            name="last_name"
            value={formik.values.last_name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.last_name && Boolean(formik.errors.last_name)}
            helperText={formik.touched.last_name && formik.errors.last_name}
            disabled={loading}
          />
        </Grid>

        {/* Password (for new users only) */}
        {action === 'add' && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
              disabled={loading}
            />
          </Grid>
        )}

        {action === 'edit' && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="New Password (Leave blank to keep current)"
              name="password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              disabled={loading}
              helperText="Only enter a password if you want to change it"
            />
          </Grid>
        )}

        {/* Role and Permissions */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formik.values.role}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.role && Boolean(formik.errors.role)}
              disabled={loading}
              label="Role"
            >
              {roleOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Default Landing Page</InputLabel>
            <Select
              name="landing_page"
              value={formik.values.landing_page}
              onChange={formik.handleChange}
              disabled={loading}
              label="Default Landing Page"
            >
              {landingPageOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Account Status */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                name="is_active"
                checked={formik.values.is_active}
                onChange={(e) => formik.setFieldValue('is_active', e.target.checked)}
                disabled={loading}
              />
            }
            label="Account Active"
          />
          <Typography variant="body2" color="text.secondary">
            Inactive users cannot log in to the system
          </Typography>
        </Grid>
      </Grid>

      <DialogActions sx={{ mt: 3, px: 0 }}>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !formik.isValid}
        >
          {loading ? 'Saving...' : action === 'add' ? 'Add User' : 'Update User'}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default UserManagementDialog; 