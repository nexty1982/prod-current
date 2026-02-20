import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Stack,
    Typography,
    IconButton,
    InputAdornment,
    CircularProgress
} from '@mui/material';
import { IconCopy, IconCheck, IconSend } from '@tabler/icons-react';
import { Church } from '@/shared/lib/userService';

interface InviteUserDialogProps {
    open: boolean;
    onClose: () => void;
    churches: Church[];
    currentUserRole: string;
}

const EXPIRATION_OPTIONS = [
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 180, label: '6 months' },
    { value: 365, label: '1 year' },
];

const ROLE_OPTIONS = [
    { value: 'viewer', label: 'Viewer' },
    { value: 'user', label: 'User' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'priest', label: 'Priest' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' },
];

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ open, onClose, churches, currentUserRole }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [churchId, setChurchId] = useState<string>('');
    const [expirationDays, setExpirationDays] = useState<number>(90);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteUrl, setInviteUrl] = useState('');
    const [copied, setCopied] = useState(false);

    const availableRoles = currentUserRole === 'super_admin'
        ? ROLE_OPTIONS
        : ROLE_OPTIONS.filter(r => !['admin', 'super_admin'].includes(r.value));

    const handleSubmit = async () => {
        if (!email) {
            setError('Email is required.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/invites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    role,
                    church_id: churchId || null,
                    expiration_days: expirationDays,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setError(data.message || 'Failed to create invite.');
                return;
            }

            setInviteUrl(data.invite_url);
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = inviteUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setEmail('');
        setRole('user');
        setChurchId('');
        setExpirationDays(90);
        setError('');
        setInviteUrl('');
        setCopied(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Invite User</DialogTitle>
            <DialogContent>
                {inviteUrl ? (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Alert severity="success">
                            Invite sent to <strong>{email}</strong>! The invite link has also been emailed.
                        </Alert>
                        <Typography variant="body2" color="text.secondary">
                            Copy the link below and share it manually if needed:
                        </Typography>
                        <TextField
                            fullWidth
                            value={inviteUrl}
                            InputProps={{
                                readOnly: true,
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleCopy} size="small">
                                            {copied ? <IconCheck size={18} color="green" /> : <IconCopy size={18} />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            size="small"
                        />
                        {copied && (
                            <Typography variant="caption" color="success.main">
                                Copied to clipboard!
                            </Typography>
                        )}
                    </Stack>
                ) : (
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {error && <Alert severity="error">{error}</Alert>}

                        <TextField
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            required
                        />

                        <FormControl fullWidth required>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                label="Role"
                            >
                                {availableRoles.map((r) => (
                                    <MenuItem key={r.value} value={r.value}>
                                        {r.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Church (optional)</InputLabel>
                            <Select
                                value={churchId}
                                onChange={(e) => setChurchId(e.target.value as string)}
                                label="Church (optional)"
                            >
                                <MenuItem value="">None</MenuItem>
                                {churches.map((church) => (
                                    <MenuItem key={church.id} value={String(church.id)}>
                                        {church.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth required>
                            <InputLabel>Account Duration</InputLabel>
                            <Select
                                value={expirationDays}
                                onChange={(e) => setExpirationDays(Number(e.target.value))}
                                label="Account Duration"
                            >
                                {EXPIRATION_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Typography variant="caption" color="text.secondary">
                            The invite link will be valid for 7 days. The created account will expire after the selected duration.
                        </Typography>
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    {inviteUrl ? 'Done' : 'Cancel'}
                </Button>
                {!inviteUrl && (
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading || !email}
                        startIcon={loading ? <CircularProgress size={16} /> : <IconSend size={18} />}
                    >
                        Send Invite
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default InviteUserDialog;
