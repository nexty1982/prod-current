// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Button,
    TextField,
    IconButton,
    Chip
} from '@mui/material';
import { IconEdit, IconCheck, IconX } from '@tabler/icons-react';
import { useAuth } from '../../../context/AuthContext';

interface WhatsNewEditorProps {
    editable?: boolean;
}

const WhatsNewEditor: React.FC<WhatsNewEditorProps> = ({ editable }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    // Check if user can edit (priest, deacon, admin, super_admin)
    const canEdit = user && (
        user.role === 'admin' ||
        user.role === 'super_admin' ||
        editable
    );

    // Load content from localStorage or API
    useEffect(() => {
        const savedContent = localStorage.getItem('whatsNew');
        if (savedContent) {
            setContent(savedContent);
        } else {
            // Default content
            setContent(`🕊️ Welcome to Orthodox Metrics!\n\n📋 Recent updates:\n• New dashboard features added\n• Profile synchronization improved\n• OCR processing enhanced\n\n📅 Upcoming events:\n• Parish meeting this Sunday\n• Monthly records review`);
        }
    }, []);

    const handleEdit = () => {
        setEditContent(content);
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            // Save to localStorage (in production, save to database)
            localStorage.setItem('whatsNew', editContent);
            setContent(editContent);
            setIsEditing(false);
            console.log('What\'s New content saved');
        } catch (error) {
            console.error('Failed to save content:', error);
        }
    };

    const handleCancel = () => {
        setEditContent('');
        setIsEditing(false);
    };

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5" fontWeight={600}>
                        What's New
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                        {user?.role && (
                            <Chip
                                label={user.role}
                                size="small"
                                color="primary"
                                variant="outlined"
                            />
                        )}
                        {canEdit && !isEditing && (
                            <IconButton onClick={handleEdit} size="small">
                                <IconEdit size={18} />
                            </IconButton>
                        )}
                        {isEditing && (
                            <Box display="flex" gap={1}>
                                <IconButton onClick={handleSave} size="small" color="primary">
                                    <IconCheck size={18} />
                                </IconButton>
                                <IconButton onClick={handleCancel} size="small">
                                    <IconX size={18} />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                </Box>

                {isEditing ? (
                    <TextField
                        fullWidth
                        multiline
                        rows={8}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Enter bulletin content... You can use emojis and markdown-style formatting!"
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                fontFamily: 'monospace',
                                fontSize: '0.9rem'
                            }
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            whiteSpace: 'pre-line',
                            lineHeight: 1.6,
                            minHeight: '120px',
                            p: 2,
                            bgcolor: 'grey.50',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200'
                        }}
                    >
                        <Typography variant="body2" component="div">
                            {content || 'No bulletin content yet...'}
                        </Typography>
                    </Box>
                )}

                {canEdit && !isEditing && (
                    <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                            Click the edit icon to update the bulletin
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default WhatsNewEditor;
