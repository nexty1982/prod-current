import { createContext, useState, useContext, useEffect } from 'react';
import React from "react";
import { useAuth } from '../AuthContext';

// OCR Types
export interface OCRFile {
    id: string;
    file: File;
    preview?: string;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
    progress: number;
    error?: string;
    results?: OCRResult;
    estimatedTime?: number;
}

export interface OCRResult {
    id: string;
    text: string;
    confidence: number;
    language: string;
    pages: number;
    downloadUrl?: string;
    xlsxUrl?: string;
    pdfUrl?: string;
}

export interface OCRSession {
    id: string;
    qrCode: string;
    verified: boolean;
    expiresAt: string;
    remainingTime: number;
}

export interface OCRDisclaimer {
    id: string;
    language: string;
    title: string;
    content: string;
    acceptanceRequired: boolean;
}

export interface OCRLanguage {
    code: string;
    name: string;
    flag: string;
    supported: boolean;
}

export interface OCRUploadConfig {
    maxFiles: number;
    maxFileSize: number;
    allowedTypes: string[];
    processingTiers: {
        standard: { name: string; estimatedTime: number; price: number };
        express: { name: string; estimatedTime: number; price: number };
    };
}

// Context Type
interface OCRContextType {
    // State
    session: OCRSession | null;
    files: OCRFile[];
    config: OCRUploadConfig | null;
    languages: OCRLanguage[];
    disclaimers: OCRDisclaimer[];
    loading: boolean;
    error: string | null;

    // Session Management
    createSession: () => Promise<OCRSession>;
    verifySession: (sessionId: string) => Promise<boolean>;
    clearSession: () => void;

    // Disclaimer Management
    acceptDisclaimer: (language: string, email?: string, processingTier?: string) => Promise<void>;

    // File Management
    addFiles: (files: File[]) => Promise<void>;
    removeFile: (fileId: string) => void;
    clearFiles: () => void;

    // Upload & Processing
    startUpload: () => Promise<void>;
    getResults: (fileId: string) => Promise<OCRResult | null>;
    downloadResults: (fileId: string, format: 'pdf' | 'xlsx') => Promise<void>;

    // Utility
    estimateProcessingTime: (files: OCRFile[]) => number;
    validateFile: (file: File) => { valid: boolean; error?: string };

    // Data fetching
    fetchLanguages: () => Promise<void>;
    fetchDisclaimers: () => Promise<void>;
    fetchConfig: () => Promise<void>;
}

// Initial values
const initialContext: OCRContextType = {
    session: null,
    files: [],
    config: null,
    languages: [],
    disclaimers: [],
    loading: false,
    error: null,

    createSession: async () => ({ id: '', qrCode: '', verified: false, expiresAt: '', remainingTime: 0 }),
    verifySession: async () => false,
    clearSession: () => { },
    acceptDisclaimer: async () => { },
    addFiles: async () => { },
    removeFile: () => { },
    clearFiles: () => { },
    startUpload: async () => { },
    getResults: async () => null,
    downloadResults: async () => { },
    estimateProcessingTime: () => 0,
    validateFile: () => ({ valid: true }),
    fetchLanguages: async () => { },
    fetchDisclaimers: async () => { },
    fetchConfig: async () => { },
};

// Create context
export const OCRContext = createContext<OCRContextType>(initialContext);

// Custom hook
export const useOCR = () => {
    const context = useContext(OCRContext);
    if (!context) {
        throw new Error('useOCR must be used within an OCRProvider');
    }
    return context;
};

// Provider component
export const OCRProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<OCRSession | null>(null);
    const [files, setFiles] = useState<OCRFile[]>([]);
    const [config, setConfig] = useState<OCRUploadConfig | null>(null);
    const [languages, setLanguages] = useState<OCRLanguage[]>([]);
    const [disclaimers, setDisclaimers] = useState<OCRDisclaimer[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const { authenticated } = useAuth();

    // Initialize data on mount
    useEffect(() => {
        if (authenticated) {
            fetchConfig();
            fetchLanguages();
            fetchDisclaimers();
        }
    }, [authenticated]);

    // Session countdown timer
    useEffect(() => {
        if (session && session.verified) {
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const expiresAt = new Date(session.expiresAt).getTime();
                const remainingTime = Math.max(0, expiresAt - now);

                if (remainingTime <= 0) {
                    clearSession();
                } else {
                    setSession(prev => prev ? { ...prev, remainingTime } : null);
                }
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [session]);

    // Create new OCR session
    const createSession = async (): Promise<OCRSession> => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/ocr/secure/session', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to create session: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                const newSession = {
                    id: data.session.id,
                    qrCode: data.session.qrCode,
                    verified: false,
                    expiresAt: data.session.expiresAt,
                    remainingTime: new Date(data.session.expiresAt).getTime() - new Date().getTime()
                };
                setSession(newSession);
                return newSession;
            } else {
                throw new Error(data.message || 'Failed to create session');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create session');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Verify session status
    const verifySession = async (sessionId: string): Promise<boolean> => {
        try {
            const response = await fetch(`/api/ocr/secure/verify/${sessionId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to verify session: ${response.status}`);
            }

            const data = await response.json();

            if (data.success && data.verified) {
                setSession(prev => prev ? { ...prev, verified: true } : null);
                return true;
            }

            return false;
        } catch (err: any) {
            setError(err.message || 'Failed to verify session');
            return false;
        }
    };

    // Clear session
    const clearSession = () => {
        setSession(null);
        setFiles([]);
        setError(null);
    };

    // Accept disclaimer
    const acceptDisclaimer = async (language: string, email?: string, processingTier?: string): Promise<void> => {
        try {
            if (!session) throw new Error('No active session');

            const response = await fetch('/api/ocr/secure/disclaimer', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: session.id,
                    language,
                    email,
                    processingTier: processingTier || 'standard'
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to accept disclaimer: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to accept disclaimer');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to accept disclaimer');
            throw err;
        }
    };

    // Add files for processing
    const addFiles = async (newFiles: File[]): Promise<void> => {
        try {
            const validatedFiles: OCRFile[] = [];

            for (const file of newFiles) {
                const validation = validateFile(file);
                if (validation.valid) {
                    const ocrFile: OCRFile = {
                        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        file,
                        status: 'pending',
                        progress: 0,
                        estimatedTime: estimateProcessingTime([{ file } as OCRFile])
                    };

                    // Generate preview for images
                    if (file.type.startsWith('image/')) {
                        ocrFile.preview = URL.createObjectURL(file);
                    }

                    validatedFiles.push(ocrFile);
                } else {
                    setError(validation.error || 'Invalid file');
                }
            }

            setFiles(prev => [...prev, ...validatedFiles]);
        } catch (err: any) {
            setError(err.message || 'Failed to add files');
        }
    };

    // Remove file
    const removeFile = (fileId: string) => {
        setFiles(prev => {
            const updated = prev.filter(f => f.id !== fileId);
            // Clean up preview URLs
            const removedFile = prev.find(f => f.id === fileId);
            if (removedFile?.preview) {
                URL.revokeObjectURL(removedFile.preview);
            }
            return updated;
        });
    };

    // Clear all files
    const clearFiles = () => {
        // Clean up preview URLs
        files.forEach(file => {
            if (file.preview) {
                URL.revokeObjectURL(file.preview);
            }
        });
        setFiles([]);
    };    // Start upload and processing (Updated for Production Testing)
    const startUpload = async (): Promise<void> => {
        try {
            console.log('=== OCR Upload Debug ===');
            console.log('Session:', session);
            console.log('Files to upload:', files.length);

            // For production testing, we'll use the new direct OCR endpoints
            // instead of the complex session-based approach
            if (files.length === 0) {
                console.log('ERROR: No files to upload');
                throw new Error('No files to upload');
            }

            setLoading(true);
            setError(null);

            for (const file of files) {
                if (file.status === 'completed') continue;

                console.log('Processing file:', file.file.name);

                // Update status to uploading
                setFiles(prev => prev.map(f =>
                    f.id === file.id ? { ...f, status: 'uploading' as const } : f
                ));

                const formData = new FormData();
                formData.append('file', file.file);
                formData.append('church_id', '1'); // Default church ID
                formData.append('language', 'en'); // Default language
                formData.append('record_type', 'baptism'); // Default record type
                formData.append('submitted_by', '1'); // Default user ID

                console.log('Making upload request to /api/ocr-en');

                const response = await fetch('/api/ocr-en', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                });

                console.log('Upload response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.log('Upload error response:', errorText);
                    throw new Error(`Failed to upload file: ${response.status} - ${errorText}`);
                }

                const data = await response.json();
                console.log('Upload response data:', data);

                if (data.success) {
                    console.log('Upload successful, jobId:', data.jobId);
                    // Update status to completed with results
                    setFiles(prev => prev.map(f =>
                        f.id === file.id ? {
                            ...f,
                            status: 'completed' as const,
                            progress: 100,
                            results: {
                                id: data.jobId,
                                text: data.data.extracted_text,
                                confidence: data.data.confidence,
                                language: data.data.language,
                                pages: 1
                            }
                        } : f
                    ));
                } else {
                    console.log('Upload failed:', data.message);
                    setFiles(prev => prev.map(f =>
                        f.id === file.id ? {
                            ...f,
                            status: 'error' as const,
                            error: data.message || 'Upload failed'
                        } : f
                    ));
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to start upload');
        } finally {
            setLoading(false);
        }
    };

    // Poll for OCR results
    const pollForResults = async (fileId: string, jobId: string) => {
        const maxAttempts = 30; // 5 minutes max
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`/api/ocr/secure/results/${jobId}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to get results: ${response.status}`);
                }

                const data = await response.json();

                if (data.success && data.completed) {
                    setFiles(prev => prev.map(f =>
                        f.id === fileId ? {
                            ...f,
                            status: 'completed' as const,
                            results: data.result
                        } : f
                    ));
                } else if (data.error) {
                    setFiles(prev => prev.map(f =>
                        f.id === fileId ? {
                            ...f,
                            status: 'error' as const,
                            error: data.error
                        } : f
                    ));
                } else {
                    // Still processing, poll again
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(poll, 10000); // Poll every 10 seconds
                    } else {
                        setFiles(prev => prev.map(f =>
                            f.id === fileId ? {
                                ...f,
                                status: 'error' as const,
                                error: 'Processing timeout'
                            } : f
                        ));
                    }
                }
            } catch (err: any) {
                setFiles(prev => prev.map(f =>
                    f.id === fileId ? {
                        ...f,
                        status: 'error' as const,
                        error: err.message || 'Failed to get results'
                    } : f
                ));
            }
        };

        poll();
    };

    // Get results for a specific file
    const getResults = async (fileId: string): Promise<OCRResult | null> => {
        const file = files.find(f => f.id === fileId);
        return file?.results || null;
    };

    // Download results
    const downloadResults = async (fileId: string, format: 'pdf' | 'xlsx'): Promise<void> => {
        try {
            const file = files.find(f => f.id === fileId);
            if (!file?.results) {
                throw new Error('No results available for download');
            }

            const response = await fetch(`/api/ocr/secure/download/${file.results.id}?format=${format}`, {
                method: 'GET',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error(`Failed to download results: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ocr-results-${fileId}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || 'Failed to download results');
        }
    };

    // Estimate processing time
    const estimateProcessingTime = (files: OCRFile[]): number => {
        const baseTime = 30; // 30 seconds per file
        const totalSize = files.reduce((sum, file) => sum + file.file.size, 0);
        const sizeMultiplier = Math.max(1, totalSize / (1024 * 1024)); // Size in MB
        return Math.round(baseTime * files.length * sizeMultiplier);
    };

    // Validate file
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        if (!config) return { valid: false, error: 'Configuration not loaded' };

        if (!config.allowedTypes.includes(file.type)) {
            return { valid: false, error: `File type ${file.type} not supported` };
        }

        if (file.size > config.maxFileSize) {
            return { valid: false, error: `File size exceeds maximum of ${config.maxFileSize / (1024 * 1024)}MB` };
        }

        return { valid: true };
    };

    // Fetch configuration
    const fetchConfig = async (): Promise<void> => {
        try {
            const response = await fetch('/api/ocr/secure/config', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setConfig(data.config);
                }
            }
        } catch (err) {
            console.error('Error fetching OCR config:', err);
        }
    };

    // Fetch languages
    const fetchLanguages = async (): Promise<void> => {
        try {
            const response = await fetch('/api/ocr/secure/languages', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setLanguages(data.languages);
                }
            }
        } catch (err) {
            console.error('Error fetching languages:', err);
        }
    };

    // Fetch disclaimers
    const fetchDisclaimers = async (): Promise<void> => {
        try {
            const response = await fetch('/api/ocr/secure/disclaimers', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setDisclaimers(data.disclaimers);
                }
            }
        } catch (err) {
            console.error('Error fetching disclaimers:', err);
        }
    };

    return (
        <OCRContext.Provider
            value={{
                session,
                files,
                config,
                languages,
                disclaimers,
                loading,
                error,
                createSession,
                verifySession,
                clearSession,
                acceptDisclaimer,
                addFiles,
                removeFile,
                clearFiles,
                startUpload,
                getResults,
                downloadResults,
                estimateProcessingTime,
                validateFile,
                fetchLanguages,
                fetchDisclaimers,
                fetchConfig,
            }}
        >
            {children}
        </OCRContext.Provider>
    );
};
