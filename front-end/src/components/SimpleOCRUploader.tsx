// Simple OCR Upload Function for Production Testing
import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface OCRUploadState {
    files: File[];
    uploading: boolean;
    results: any[];
    language: string;
    churchId: string;
    recordType: string;
    submittedBy: string;
}

export const useSimpleOCR = () => {
    const [state, setState] = useState<OCRUploadState>({
        files: [],
        uploading: false,
        results: [],
        language: 'en',
        churchId: '1',
        recordType: 'baptism',
        submittedBy: ''
    });

    const addFiles = (newFiles: File[]) => {
        setState(prev => ({
            ...prev,
            files: [...prev.files, ...newFiles]
        }));
    };

    const removeFile = (index: number) => {
        setState(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    const clearFiles = () => {
        setState(prev => ({
            ...prev,
            files: [],
            results: []
        }));
    };

    const setLanguage = (language: string) => {
        setState(prev => ({ ...prev, language }));
    };

    const setChurchId = (churchId: string) => {
        setState(prev => ({ ...prev, churchId }));
    };

    const setRecordType = (recordType: string) => {
        setState(prev => ({ ...prev, recordType }));
    };

    const setSubmittedBy = (submittedBy: string) => {
        setState(prev => ({ ...prev, submittedBy }));
    };

    const startUpload = async () => {
        if (state.files.length === 0) {
            toast.error("No files selected for upload.");
            return;
        }

        setState(prev => ({ ...prev, uploading: true }));

        const newResults = [];

        for (const file of state.files) {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("church_id", state.churchId);
            formData.append("language", state.language);
            formData.append("record_type", state.recordType);
            formData.append("submitted_by", state.submittedBy);

            try {
                console.log(`Uploading ${file.name} with language ${state.language}`);

                // Use the new language-specific endpoint
                const endpoint = `/api/ocr-${state.language}`;
                const res = await fetch(endpoint, {
                    method: "POST",
                    credentials: 'include',
                    body: formData,
                });

                const result = await res.json();

                if (res.ok && result.success) {
                    toast.success(`${file.name} processed successfully.`);
                    console.log("OCR Result:", result);
                    newResults.push({
                        file: file.name,
                        jobId: result.jobId,
                        result: result.data,
                        success: true
                    });
                } else {
                    toast.error(`${file.name} failed: ${result.message || 'Unknown error'}`);
                    newResults.push({
                        file: file.name,
                        error: result.message || 'Unknown error',
                        success: false
                    });
                }

            } catch (err) {
                toast.error(`${file.name} upload error`);
                console.error("Upload error:", err);
                newResults.push({
                    file: file.name,
                    error: err.message || 'Network error',
                    success: false
                });
            }
        }

        setState(prev => ({
            ...prev,
            uploading: false,
            results: newResults
        }));

        return newResults;
    };

    return {
        ...state,
        addFiles,
        removeFile,
        clearFiles,
        setLanguage,
        setChurchId,
        setRecordType,
        setSubmittedBy,
        startUpload
    };
};

// Simple OCR Upload Component
export const SimpleOCRUploader: React.FC = () => {
    const ocr = useSimpleOCR();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            ocr.addFiles(Array.from(e.target.files));
        }
    };

    const handleUpload = async () => {
        await ocr.startUpload();
    };

    return (
        <div className="simple-ocr-uploader p-4 border rounded">
            <h3>OCR Upload (Production Testing)</h3>

            {/* Language Selection */}
            <div className="mb-3">
                <label className="form-label">Language:</label>
                <select
                    className="form-control"
                    value={ocr.language}
                    onChange={(e) => ocr.setLanguage(e.target.value)}
                >
                    <option value="en">English</option>
                    <option value="gr">Greek</option>
                    <option value="ru">Russian</option>
                    <option value="ro">Romanian</option>
                </select>
            </div>

            {/* Record Type */}
            <div className="mb-3">
                <label className="form-label">Record Type:</label>
                <select
                    className="form-control"
                    value={ocr.recordType}
                    onChange={(e) => ocr.setRecordType(e.target.value)}
                >
                    <option value="baptism">Baptism</option>
                    <option value="marriage">Marriage</option>
                    <option value="funeral">Funeral</option>
                </select>
            </div>

            {/* File Selection */}
            <div className="mb-3">
                <label className="form-label">Select Files:</label>
                <input
                    type="file"
                    className="form-control"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    disabled={ocr.uploading}
                />
            </div>

            {/* File List */}
            {ocr.files.length > 0 && (
                <div className="mb-3">
                    <h5>Files ({ocr.files.length}):</h5>
                    <ul className="list-group">
                        {ocr.files.map((file, index) => (
                            <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => ocr.removeFile(index)}
                                    disabled={ocr.uploading}
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Action Buttons */}
            <div className="mb-3">
                <button
                    className="btn btn-primary me-2"
                    onClick={handleUpload}
                    disabled={ocr.uploading || ocr.files.length === 0}
                >
                    {ocr.uploading ? 'Processing...' : 'Start OCR Processing'}
                </button>
                <button
                    className="btn btn-secondary"
                    onClick={ocr.clearFiles}
                    disabled={ocr.uploading}
                >
                    Clear All
                </button>
            </div>

            {/* Results */}
            {ocr.results.length > 0 && (
                <div className="results">
                    <h5>Results:</h5>
                    {ocr.results.map((result, index) => (
                        <div key={index} className={`alert ${result.success ? 'alert-success' : 'alert-danger'}`}>
                            <strong>{result.file}:</strong>
                            {result.success ? (
                                <div>
                                    <p>Success! Job ID: {result.jobId}</p>
                                    <p>Extracted Text Preview: {result.result?.extracted_text?.substring(0, 200)}...</p>
                                    <p>Confidence: {((result.result?.confidence || 0) * 100).toFixed(1)}%</p>
                                </div>
                            ) : (
                                <p>Error: {result.error}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
