import React, { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UploadIntake } from '../components/UploadIntake';
import { useOcrStudioChurch } from '../hooks/useOcrStudioChurch';
import { useOcrUploadQueue } from '../hooks/useOcrUploadQueue';

export default function OcrStudioUploadPage() {
  const { churchId, churchLabel } = useOcrStudioChurch();
  const upload = useOcrUploadQueue(churchId);

  return (
    <UploadIntake
      churchId={churchId}
      churchLabel={churchLabel}
      {...upload}
      onRecordTypeChange={upload.setRecordType}
      onLanguageChange={upload.setOcrLanguage}
      onAddFiles={upload.addFiles}
      onRemoveFile={upload.removeFile}
      onClearQueue={upload.clearQueue}
      onStartUpload={upload.startUpload}
      onDrag={upload.handleDrag}
      onDrop={upload.handleDrop}
    />
  );
}
