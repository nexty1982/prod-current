import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Stack,
    CircularProgress,
    Chip
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';

interface InviteDetails {
    email: string;
    role: string;
    church_name: string | null;
    account_expires_at: string;
}

const AcceptInvite: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [invite, setInvite] = useState<InviteDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const res = await fetch(`/api/invite/${token}`);
                const data = await res.json();

                if (!res.ok || !data.success) {
                    setError(data.message || 'Invalid invite link.');
                    return;
                }

                setInvite(data);
            } catch {
                setError('Failed to load invite details.');
            } finally {
                setLoading(false);
            }
        };

        fetchInvite();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/invite/${token}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first_name: firstName, last_name: lastName, password, phone: phone || undefined }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.message || 'Registration failed.');
                return;
            }

            setSuccess(true);
            setTimeout(() => navigate('/auth/login'), 3000);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const roleLabel = invite?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || '';
    const expiresDate = invite?.account_expires_at
        ? new Date(invite.account_expires_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : '';

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error && !invite) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" px={2}>
                <Card sx={{ maxWidth: 480, width: '100%' }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            Invite Error
                        </Typography>
                        <Alert severity="error">{error}</Alert>
                        <Button
                            sx={{ mt: 2 }}
                            variant="outlined"
                            onClick={() => navigate('/auth/login')}
                        >
                            Go to Login
                        </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    if (success) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" px={2}>
                <Card sx={{ maxWidth: 480, width: '100%' }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            Account Created!
                        </Typography>
                        <Alert severity="success">
                            Your account has been created. Redirecting to login...
                        </Alert>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh" px={2}>
            <Card sx={{ maxWidth: 520, width: '100%' }}>
                <CardContent>
                    <Typography variant="h5" gutterBottom>
                        Accept Invitation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        You've been invited to join Orthodox Metrics.
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ my: 2 }}>
                        <Chip label={roleLabel} color="primary" size="small" />
                        {invite?.church_name && (
                            <Chip label={invite.church_name} variant="outlined" size="small" />
                        )}
                    </Stack>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Account valid until: {expiresDate}
                    </Typography>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                            <TextField
                                label="Email"
                                value={invite?.email || ''}
                                disabled
                                fullWidth
                            />
                            <Stack direction="row" spacing={2}>
                                <TextField
                                    label="First Name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="Last Name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    fullWidth
                                />
                            </Stack>
                            <TextField
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                fullWidth
                                helperText="Minimum 8 characters"
                            />
                            <TextField
                                label="Confirm Password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                fullWidth
                            />
                            <TextField
                                label="Phone (optional)"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                fullWidth
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                disabled={submitting || !firstName || !lastName || !password || !confirmPassword}
                                sx={{ py: 1.5 }}
                            >
                                {submitting ? <CircularProgress size={20} /> : 'Create Account'}
                            </Button>
                        </Stack>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AcceptInvite;
