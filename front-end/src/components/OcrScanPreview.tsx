import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Box,
    Typography,
    Paper,
    IconButton,
    TextField,
    Button,
    Chip,
    Alert,
    CircularProgress,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Card,
    CardContent,
    Tooltip
} from '@mui/material';
import {
    IconEdit,
    IconCheck,
    IconAlertTriangle,
    IconScan,
    IconEye,
    IconCircleCheck,
    IconExclamationCircle,
    IconSparkles
} from '@tabler/icons-react';

interface OcrField {
    id: string;
    label: string;
    value: string;
    confidence: number;
    position?: { x: number; y: number; width: number; height: number };
    editable?: boolean;
}

interface OcrScanPreviewProps {
    imageSrc: string;
    ocrData: OcrField[];
    confidenceScore: number;
    onFieldEdit?: (fieldId: string, newValue: string) => void;
    onScanComplete?: () => void;
    title?: string;
}

const OcrScanPreview: React.FC<OcrScanPreviewProps> = ({
    imageSrc,
    ocrData,
    confidenceScore,
    onFieldEdit,
    onScanComplete,
    title = "OCR Analysis Results"
}) => {
    const [scanProgress, setScanProgress] = useState(0);
    const [currentLine, setCurrentLine] = useState(0);
    const [revealedFields, setRevealedFields] = useState<string[]>([]);
    const [animatedScore, setAnimatedScore] = useState(0);
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [scanComplete, setScanComplete] = useState(false);

    // Scanning animation effect
    useEffect(() => {
        const scanInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 100) {
                    clearInterval(scanInterval);
                    setScanComplete(true);
                    if (onScanComplete) onScanComplete();
                    return 100;
                }
                return prev + 2;
            });
        }, 50);

        return () => clearInterval(scanInterval);
    }, [onScanComplete]);

    // Animate confidence score
    useEffect(() => {
        if (scanComplete) {
            const scoreInterval = setInterval(() => {
                setAnimatedScore(prev => {
                    if (prev >= confidenceScore) {
                        clearInterval(scoreInterval);
                        return confidenceScore;
                    }
                    return Math.min(prev + 2, confidenceScore);
                });
            }, 30);

            return () => clearInterval(scoreInterval);
        }
    }, [scanComplete, confidenceScore]);

    // Reveal fields progressively
    useEffect(() => {
        if (scanProgress > 20) {
            const revealInterval = setInterval(() => {
                setRevealedFields(prev => {
                    if (prev.length >= ocrData.length) {
                        clearInterval(revealInterval);
                        return prev;
                    }
                    return [...prev, ocrData[prev.length].id];
                });
            }, 300);

            return () => clearInterval(revealInterval);
        }
    }, [scanProgress, ocrData]);

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'success';
        if (confidence >= 75) return 'warning';
        return 'error';
    };

    const getConfidenceIcon = (confidence: number) => {
        if (confidence >= 90) return <IconCircleCheck color="green" size={16} />;
        if (confidence >= 75) return <IconExclamationCircle color="orange" size={16} />;
        return <IconAlertTriangle color="red" size={16} />;
    };

    const handleEditClick = (field: OcrField) => {
        setEditingField(field.id);
        setEditValue(field.value);
    };

    const handleSaveEdit = () => {
        if (editingField && onFieldEdit) {
            onFieldEdit(editingField, editValue);
        }
        setEditingField(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingField(null);
        setEditValue('');
    };

    const ScanningOverlay = () => (
        <Box
            sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                overflow: 'hidden'
            }}
        >
            {/* Scanning line */}
            {!scanComplete && (
                <motion.div
                    style={{
                        position: 'absolute',
                        top: `${scanProgress}%`,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, transparent, #2196F3, transparent)',
                        boxShadow: '0 0 10px #2196F3'
                    }}
                    animate={{
                        opacity: [0.3, 1, 0.3]
                    }}
                    transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
            )}

            {/* Scan complete effect */}
            {scanComplete && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#4CAF50',
                        fontSize: '48px'
                    }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                    >
                        <IconCircleCheck size={48} />
                    </motion.div>
                </motion.div>
            )}
        </Box>
    );

    const FieldHighlight = ({ field }: { field: OcrField }) => {
        if (!field.position || !revealedFields.includes(field.id)) return null;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.8, scale: 1 }}
                style={{
                    position: 'absolute',
                    left: `${field.position.x}%`,
                    top: `${field.position.y}%`,
                    width: `${field.position.width}%`,
                    height: `${field.position.height}%`,
                    border: `2px solid ${field.confidence >= 90 ? '#4CAF50' : field.confidence >= 75 ? '#FF9800' : '#F44336'}`,
                    borderRadius: '4px',
                    backgroundColor: `${field.confidence >= 90 ? 'rgba(76, 175, 80, 0.1)' : field.confidence >= 75 ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)'}`,
                    pointerEvents: 'none'
                }}
            />
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <IconScan />
                    {title}
                </Typography>
                {!scanComplete && (
                    <Typography variant="body2" color="text.secondary">
                        Processing document with AI-powered OCR...
                    </Typography>
                )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                {/* Image Preview */}
                <Box sx={{ flex: 1 }}>
                    <Card sx={{ height: 'fit-content' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                                <IconEye />
                                Document Preview
                            </Typography>
                            
                            <Box sx={{ position: 'relative', mb: 2 }}>
                                <img
                                    src={imageSrc}
                                    alt="OCR Document"
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        maxHeight: '500px',
                                        objectFit: 'contain',
                                        borderRadius: '8px',
                                        border: '1px solid #e0e0e0'
                                    }}
                                />
                                
                                {/* Field highlights */}
                                {ocrData.map(field => (
                                    <FieldHighlight key={field.id} field={field} />
                                ))}
                                
                                <ScanningOverlay />
                            </Box>

                            {/* Scan Progress */}
                            {!scanComplete && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2" gutterBottom>
                                        Scanning Progress: {scanProgress.toFixed(0)}%
                                    </Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={scanProgress}
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Box>
                            )}

                            {/* Confidence Score */}
                            {scanComplete && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                                        <Typography variant="h4" color="primary" gutterBottom>
                                            {animatedScore.toFixed(0)}%
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Overall Confidence Score
                                        </Typography>
                                        {animatedScore >= 90 && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 1, type: "spring" }}
                                            >
                                                <IconSparkles color="#4CAF50" size={24} style={{ marginTop: 8 }} />
                                            </motion.div>
                                        )}
                                    </Box>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </Box>

                {/* Extracted Data */}
                <Box sx={{ flex: 1 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Extracted Information
                            </Typography>

                            {scanProgress < 20 && (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <CircularProgress />
                                    <Typography variant="body2" sx={{ mt: 2 }}>
                                        Analyzing document structure...
                                    </Typography>
                                </Box>
                            )}

                            <AnimatePresence>
                                {ocrData.map((field, index) => {
                                    const isRevealed = revealedFields.includes(field.id);
                                    const isEditing = editingField === field.id;

                                    if (!isRevealed) return null;

                                    return (
                                        <motion.div
                                            key={field.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            style={{ marginBottom: 16 }}
                                        >
                                            <Paper 
                                                sx={{ 
                                                    p: 2, 
                                                    border: field.confidence >= 90 ? '2px solid #4CAF50' : 
                                                           field.confidence >= 75 ? '2px solid #FF9800' : 
                                                           '2px solid #F44336',
                                                    borderRadius: 2,
                                                    position: 'relative',
                                                    background: field.confidence >= 90 ? 'linear-gradient(45deg, rgba(76, 175, 80, 0.05), transparent)' : 'inherit'
                                                }}
                                            >
                                                {/* High confidence glow */}
                                                {field.confidence >= 90 && (
                                                    <motion.div
                                                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: -2,
                                                            left: -2,
                                                            right: -2,
                                                            bottom: -2,
                                                            borderRadius: 8,
                                                            background: 'linear-gradient(45deg, #4CAF50, #81C784)',
                                                            zIndex: -1,
                                                            filter: 'blur(4px)'
                                                        }}
                                                    />
                                                )}

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        {field.label}
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip
                                                            icon={getConfidenceIcon(field.confidence)}
                                                            label={`${field.confidence}%`}
                                                            size="small"
                                                            color={getConfidenceColor(field.confidence)}
                                                        />
                                                        {field.editable !== false && (
                                                            <IconButton 
                                                                size="small"
                                                                onClick={() => handleEditClick(field)}
                                                                sx={{ ml: 1 }}
                                                            >
                                                                <IconEdit size={16} />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </Box>

                                                {isEditing ? (
                                                    <Box>
                                                        <TextField
                                                            fullWidth
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            size="small"
                                                            sx={{ mb: 1 }}
                                                        />
                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                            <Button
                                                                size="small"
                                                                variant="contained"
                                                                onClick={handleSaveEdit}
                                                                startIcon={<IconCheck />}
                                                            >
                                                                Save
                                                            </Button>
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                onClick={handleCancelEdit}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                ) : (
                                                    <Typography 
                                                        variant="body1" 
                                                        sx={{ 
                                                            fontWeight: field.confidence >= 90 ? 'bold' : 'normal',
                                                            color: field.confidence < 75 ? 'error.main' : 'inherit'
                                                        }}
                                                    >
                                                        {field.value || <em>No text detected</em>}
                                                    </Typography>
                                                )}

                                                {field.confidence < 75 && (
                                                    <Alert severity="warning" sx={{ mt: 1 }}>
                                                        Low confidence detection. Please verify this field.
                                                    </Alert>
                                                )}
                                            </Paper>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {scanComplete && revealedFields.length === ocrData.length && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Alert severity="success" sx={{ mt: 2 }}>
                                        <Typography variant="body2">
                                            OCR analysis complete! Review the extracted information and make any necessary corrections.
                                        </Typography>
                                    </Alert>
                                </motion.div>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
};

export default OcrScanPreview;
