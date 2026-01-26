import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Alert,
    Box,
    Typography,
    CircularProgress
} from '@mui/material';
import { IconKey } from '@tabler/icons-react';

interface ResetPasswordModalProps {
    open: boolean;
    onClose: () => void;
    userId: number;
    churchId: string | number;
    userEmail: string;
    userName?: string;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
    open,
    onClose,
    userId,
    churchId,
    userEmail,
    userName
}) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const generateRandomPassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(result);
    };

    const handleReset = async () => {
        if (!password.trim()) {
            setError('Password is required');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`/api/admin/church/${churchId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    userId: userId,
                    newPassword: password
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                setSuccess(`Password successfully reset for ${userName || userEmail}`);
                setPassword('');
                setTimeout(() => {
                    onClose();
                    setSuccess(null);
                }, 2000);
            } else {
                setError(result.error || result.message || 'Failed to reset password');
            }
        } catch (err) {
            console.error('Error resetting password:', err);
            setError('Network error occurred while resetting password');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPassword('');
        setError(null);
        setSuccess(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <IconKey size={24} />
                    <Typography variant="h6">
                        Reset Password
                    </Typography>
                </Box>
            </DialogTitle>
            
            <DialogContent>
                <Box sx={{ pt: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Resetting password for: <strong>{userName || userEmail}</strong>
                    </Typography>
                    
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    
                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {success}
                        </Alert>
                    )}
                    
                    <TextField
                        label="New Password"
                        type="password"
                        fullWidth
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        variant="outlined"
                        margin="normal"
                        disabled={loading || !!success}
                        helperText="Password must be at least 6 characters long"
                    />
                    
                    <Button
                        variant="outlined"
                        onClick={generateRandomPassword}
                        disabled={loading || !!success}
                        sx={{ mt: 1 }}
                    >
                        Generate Random Password
                    </Button>
                </Box>
            </DialogContent>
            
            <DialogActions>
                <Button 
                    onClick={handleClose} 
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleReset} 
                    variant="contained" 
                    disabled={loading || !password.trim() || !!success}
                    startIcon={loading ? <CircularProgress size={20} /> : <IconKey size={20} />}
                >
                    {loading ? 'Resetting...' : 'Reset Password'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ResetPasswordModal;
