import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    Button,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
    useTheme,
    useMediaQuery,
} from '@mui/material';
import {
    Close,
    QrCode,
    PhoneAndroid,
    Timer,
    CheckCircle,
    Refresh,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useOCR, OCRSession } from '../../context/OCRContext';

interface BarcodeScannerModalProps {
    open: boolean;
    onClose: () => void;
    onComplete: () => void;
    session: OCRSession | null;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
    open,
    onClose,
    onComplete,
    session,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isVerifying, setIsVerifying] = useState(false);
    const [remainingTime, setRemainingTime] = useState(0);
    const { verifySession } = useOCR();

    // Update remaining time
    useEffect(() => {
        if (session && open) {
            const interval = setInterval(() => {
                const now = new Date().getTime();
                const expiresAt = new Date(session.expiresAt).getTime();
                const remaining = Math.max(0, expiresAt - now);
                setRemainingTime(remaining);

                if (remaining <= 0) {
                    onClose();
                }
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [session, open, onClose]);

    // Auto-verify session periodically
    useEffect(() => {
        if (session && open && !session.verified) {
            const interval = setInterval(async () => {
                setIsVerifying(true);
                const isVerified = await verifySession(session.id);
                setIsVerifying(false);

                if (isVerified) {
                    onComplete();
                }
            }, 3000); // Check every 3 seconds

            return () => clearInterval(interval);
        }
    }, [session, open, verifySession, onComplete]);

    // Format time
    const formatTime = (ms: number): string => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Handle manual verification
    const handleVerify = async () => {
        if (!session) return;

        setIsVerifying(true);
        const isVerified = await verifySession(session.id);
        setIsVerifying(false);

        if (isVerified) {
            onComplete();
        }
    };

    if (!session) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            fullScreen={isMobile}
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <QrCode sx={{ mr: 1 }} />
                        Verify Your Session
                    </Box>
                    <IconButton onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    {/* Time remaining */}
                    <Box sx={{ mb: 3 }}>
                        <Chip
                            icon={<Timer />}
                            label={`Expires in ${formatTime(remainingTime)}`}
                            color={remainingTime < 60000 ? 'error' : 'primary'}
                            size="small"
                        />
                    </Box>

                    {/* QR Code */}
                    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
                        <Box
                            sx={{
                                p: 2,
                                backgroundColor: 'white',
                                borderRadius: 2,
                                boxShadow: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <QRCodeSVG
                                value={session.qrCode}
                                size={isMobile ? 200 : 256}
                                level="M"
                                includeMargin={true}
                            />
                        </Box>
                    </Box>

                    {/* Instructions */}
                    <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
                        <Typography variant="h6" gutterBottom>
                            <PhoneAndroid sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Scan to Verify
                        </Typography>
                        <Typography variant="body2" component="div">
                            <strong>Steps:</strong>
                            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                                <li>Open your phone's camera app</li>
                                <li>Point the camera at the QR code above</li>
                                <li>Tap the notification that appears</li>
                                <li>Follow the link to verify your session</li>
                            </ol>
                        </Typography>
                    </Alert>

                    {/* Verification Status */}
                    {isVerifying && (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            <Typography variant="body2">
                                Checking verification status...
                            </Typography>
                        </Box>
                    )}

                    {session.verified && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            <CheckCircle sx={{ mr: 1 }} />
                            Session verified successfully!
                        </Alert>
                    )}

                    {/* Alternative Methods */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Don't have a QR code reader? You can also visit this link manually:
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{
                            wordBreak: 'break-all',
                            backgroundColor: 'grey.100',
                            p: 1,
                            borderRadius: 1,
                            fontFamily: 'monospace',
                        }}
                    >
                        {session.qrCode}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    startIcon={isVerifying ? <CircularProgress size={16} /> : <Refresh />}
                >
                    Check Status
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BarcodeScannerModal;
