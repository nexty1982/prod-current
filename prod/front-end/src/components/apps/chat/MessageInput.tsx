/**
 * Orthodox Metrics - Enhanced Message Input Component
 * Rich message input with file attachments, emoji picker, and real-time features
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Menu,
  MenuItem,
  Tooltip,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Popper,
  ClickAwayListener,
  Grow,
  Zoom,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  EmojiEmotions as EmojiIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  Mic as MicIcon,
  Stop as StopIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import EmojiPicker from 'emoji-picker-react';

interface MessageInputProps {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'file', metadata?: any) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface AttachedFile {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'file';
  uploading?: boolean;
  progress?: number;
  error?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}) => {
  const [message, setMessage] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [attachMenuAnchor, setAttachMenuAnchor] = useState<HTMLElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const textFieldRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle typing indicators
  const handleInputChange = useCallback((value: string) => {
    setMessage(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Start typing
    if (value.length > 0) {
      onTyping(true);
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    } else {
      onTyping(false);
    }
  }, [onTyping]);

  // Stop typing when component unmounts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping(false);
    };
  }, [onTyping]);

  // File drop zone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles) => {
      handleFilesSelected(acceptedFiles);
    },
    onDropRejected: (rejectedFiles) => {
      rejectedFiles.forEach(({ errors }) => {
        errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            setError('File size must be less than 10MB');
          } else if (error.code === 'file-invalid-type') {
            setError('File type not supported');
          } else {
            setError('Failed to upload file');
          }
        });
      });
    },
  });

  const handleFilesSelected = (files: File[]) => {
    const newFiles = files.map((file) => ({
      id: Date.now().toString() + Math.random().toString(36),
      file,
      type: file.type.startsWith('image/') ? 'image' as const : 'file' as const,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: false,
      progress: 0,
    }));
    
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  const uploadFile = async (file: File): Promise<{ url: string; thumbnail?: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload/chat-attachment', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload file');
    }
    
    const data = await response.json();
    return data;
  };

  const handleSend = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;
    if (disabled || uploading) return;

    try {
      setUploading(true);
      setError(null);

      // Upload files first if any
      if (attachedFiles.length > 0) {
        for (const attachedFile of attachedFiles) {
          setAttachedFiles(prev => prev.map(f => 
            f.id === attachedFile.id ? { ...f, uploading: true } : f
          ));
          
          try {
            const uploadResult = await uploadFile(attachedFile.file);
            
            // Send file message
            const metadata = {
              filename: attachedFile.file.name,
              size: attachedFile.file.size,
              mimetype: attachedFile.file.type,
              url: uploadResult.url,
              thumbnail: uploadResult.thumbnail,
            };
            
            await onSendMessage(
              attachedFile.file.name,
              attachedFile.type,
              metadata
            );
            
            setAttachedFiles(prev => prev.filter(f => f.id !== attachedFile.id));
          } catch (error) {
            setAttachedFiles(prev => prev.map(f => 
              f.id === attachedFile.id 
                ? { ...f, uploading: false, error: 'Upload failed' }
                : f
            ));
            throw error;
          }
        }
      }

      // Send text message if any
      if (message.trim()) {
        await onSendMessage(message.trim());
        setMessage('');
      }

      // Stop typing indicator
      onTyping(false);
      
      // Focus back to input
      textFieldRef.current?.focus();
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line with Shift+Enter
        return;
      } else {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    const emoji = emojiData.emoji;
    const newMessage = message + emoji;
    setMessage(newMessage);
    setEmojiPickerOpen(false);
    textFieldRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const sendRecording = async () => {
    if (!audioBlob) return;
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      
      const uploadResult = await uploadFile(audioBlob as File);
      
      const metadata = {
        filename: 'Voice Message',
        duration: recordingTime,
        url: uploadResult.url,
        type: 'voice',
      };
      
      await onSendMessage('🎤 Voice Message', 'file', metadata);
      
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error sending recording:', error);
      setError('Failed to send recording');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Drag and Drop Overlay */}
      {isDragActive && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'primary.main',
            opacity: 0.1,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" color="primary.main">
            Drop files here to attach
          </Typography>
        </Box>
      )}

      {/* Upload Progress */}
      {uploading && (
        <LinearProgress
          variant="determinate"
          value={uploadProgress}
          sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <Box sx={{ p: 1, pb: 0 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {attachedFiles.map((file) => (
              <Paper
                key={file.id}
                variant="outlined"
                sx={{
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  position: 'relative',
                  opacity: file.uploading ? 0.6 : 1,
                }}
              >
                {file.type === 'image' && file.preview ? (
                  <Box
                    component="img"
                    src={file.preview}
                    alt={file.file.name}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <FileIcon color="action" />
                )}
                
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap>
                    {file.file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(file.file.size / 1024 / 1024).toFixed(1)} MB
                  </Typography>
                </Box>

                {file.uploading ? (
                  <CircularProgress size={16} />
                ) : file.error ? (
                  <Typography variant="caption" color="error">
                    {file.error}
                  </Typography>
                ) : (
                  <IconButton
                    size="small"
                    onClick={() => removeAttachedFile(file.id)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {/* Voice Recording UI */}
      {(isRecording || audioBlob) && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            m: 1,
            mb: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backgroundColor: 'error.light',
            color: 'error.contrastText',
          }}
        >
          <MicIcon color="inherit" />
          <Typography variant="body1">
            {isRecording ? `Recording... ${formatTime(recordingTime)}` : `Voice message (${formatTime(recordingTime)})`}
          </Typography>
          
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            {isRecording ? (
              <>
                <IconButton
                  onClick={cancelRecording}
                  size="small"
                  sx={{ color: 'inherit' }}
                >
                  <CloseIcon />
                </IconButton>
                <IconButton
                  onClick={stopRecording}
                  size="small"
                  sx={{ color: 'inherit' }}
                >
                  <StopIcon />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton
                  onClick={cancelRecording}
                  size="small"
                  sx={{ color: 'inherit' }}
                >
                  <CloseIcon />
                </IconButton>
                <IconButton
                  onClick={sendRecording}
                  size="small"
                  sx={{ color: 'inherit' }}
                  disabled={uploading}
                >
                  <SendIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Paper>
      )}

      {/* Main Input */}
      <Paper
        elevation={1}
        sx={{
          p: 1,
          m: 1,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          borderRadius: 3,
          backgroundColor: 'background.default',
        }}
        {...getRootProps({ onClick: (e) => e.stopPropagation() })}
      >
        <input {...getInputProps()} />
        
        {/* Attach Button */}
        <Tooltip title="Attach Files">
          <IconButton
            onClick={(e) => setAttachMenuAnchor(e.currentTarget)}
            disabled={disabled || isRecording}
            size="small"
          >
            <AttachFileIcon />
          </IconButton>
        </Tooltip>

        {/* Text Input */}
        <TextField
          ref={textFieldRef}
          multiline
          maxRows={4}
          fullWidth
          variant="standard"
          placeholder={placeholder}
          value={message}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled || isRecording}
          InputProps={{
            disableUnderline: true,
          }}
          sx={{
            '& .MuiInputBase-root': {
              fontSize: '0.95rem',
            },
          }}
        />

        {/* Emoji Button */}
        <Tooltip title="Add Emoji">
          <IconButton
            onClick={(e) => {
              setEmojiAnchor(e.currentTarget);
              setEmojiPickerOpen(!emojiPickerOpen);
            }}
            disabled={disabled || isRecording}
            size="small"
          >
            <EmojiIcon />
          </IconButton>
        </Tooltip>

        {/* Voice/Send Button */}
        {message.trim() || attachedFiles.length > 0 ? (
          <Tooltip title="Send Message">
            <span>
              <IconButton
                onClick={handleSend}
                disabled={disabled || uploading || isRecording}
                color="primary"
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '&:disabled': {
                    backgroundColor: 'action.disabled',
                  },
                }}
              >
                {uploading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        ) : (
          <Tooltip title="Record Voice Message">
            <IconButton
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              disabled={disabled}
              color="primary"
            >
              <MicIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => {
            if (e.target.files) {
              handleFilesSelected(Array.from(e.target.files));
            }
          }}
        />
        
        <input
          ref={imageInputRef}
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={(e) => {
            if (e.target.files) {
              handleFilesSelected(Array.from(e.target.files));
            }
          }}
        />
      </Paper>

      {/* Attach Menu */}
      <Menu
        anchorEl={attachMenuAnchor}
        open={!!attachMenuAnchor}
        onClose={() => setAttachMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem
          onClick={() => {
            imageInputRef.current?.click();
            setAttachMenuAnchor(null);
          }}
        >
          <ImageIcon sx={{ mr: 1 }} />
          Images
        </MenuItem>
        
        <MenuItem
          onClick={() => {
            fileInputRef.current?.click();
            setAttachMenuAnchor(null);
          }}
        >
          <FileIcon sx={{ mr: 1 }} />
          Documents
        </MenuItem>
      </Menu>

      {/* Emoji Picker */}
      <Popper
        open={emojiPickerOpen}
        anchorEl={emojiAnchor}
        placement="top-end"
        transition
        style={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Box>
              <ClickAwayListener onClickAway={() => setEmojiPickerOpen(false)}>
                <Box>
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    autoFocusSearch={false}
                    width={320}
                    height={400}
                  />
                </Box>
              </ClickAwayListener>
            </Box>
          </Grow>
        )}
      </Popper>
    </Box>
  );
};

export default MessageInput; 