import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScanLine, Settings as SettingsIcon, RefreshCw, ArrowLeft, Church } from 'lucide-react';
import UploadZone from '../shared/ui/legacy/UploadZone';
import JobList from '../shared/ui/legacy/JobList';
import ConfigPanel from '../shared/ui/legacy/ConfigPanel';
import OutputViewer from '../shared/ui/legacy/OutputViewer';
import { fetchChurches } from '../lib/ocrApi';

const ChurchOCRPage: React.FC = () => {
  const { churchId } = useParams<{ churchId: string }>();
  const navigate = useNavigate();
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [church, setChurch] = useState<{ id: number; name: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  const numericChurchId = churchId ? parseInt(churchId, 10) : undefined;

  // Load church information
  useEffect(() => {
    const loadChurch = async () => {
      if (!numericChurchId) {
        navigate('/devel/ocr-studio');
        return;
      }

      setLoading(true);
      try {
        const churches = await fetchChurches();
        const foundChurch = churches.find(c => c.id === numericChurchId);
        
        if (foundChurch) {
          setChurch(foundChurch);
        } else {
          // Church not found or user doesn't have access
          navigate('/devel/ocr-studio');
        }
      } catch (error) {
        console.error('Failed to load church information:', error);
        navigate('/devel/ocr-studio');
      } finally {
        setLoading(false);
      }
    };

    loadChurch();
  }, [numericChurchId, navigate]);

  const handleUploadSuccess = useCallback(() => {
    setSelectedJobId(undefined);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleRefreshJobs = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleBackToStudio = useCallback(() => {
    navigate('/devel/ocr-studio');
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading church information...</p>
        </div>
      </div>
    );
  }

  if (!church) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Church not found or access denied.</p>
          <button
            onClick={handleBackToStudio}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to OCR Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <button
                onClick={handleBackToStudio}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to OCR Studio"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <ScanLine className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    OCR for {church.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Document processing for church records
                  </p>
                </div>
              </div>

              {/* Church Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                <Church className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  Church ID: {church.id}
                </span>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefreshJobs}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              <ConfigPanel
                trigger={
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors shadow-sm">
                    <SettingsIcon className="h-4 w-4" />
                    Settings
                  </button>
                }
                churchId={numericChurchId}
              />
            </div>
          </div>

          {/* Church-specific Stats Bar */}
          <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Church-specific Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Liturgical Document Recognition</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Records Management Integration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Upload & Jobs */}
          <div className="col-span-12 xl:col-span-5 space-y-6">
            {/* Church-specific Upload Zone */}
            <UploadZone
              onUploaded={handleUploadSuccess}
              churchId={numericChurchId}
            />

            {/* Church-specific Jobs List */}
            <JobList
              onSelect={setSelectedJobId}
              selectedJobId={selectedJobId}
              churchId={numericChurchId}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Right Panel - Results */}
          <div className="col-span-12 xl:col-span-7">
            <OutputViewer jobId={selectedJobId} />
          </div>
        </div>

        {/* Church-specific Footer Info */}
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Church OCR Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Document Types</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Baptism Certificates</li>
                <li>• Marriage Records</li>
                <li>• Funeral Documents</li>
                <li>• Membership Records</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Language Support</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• English</li>
                <li>• Greek (Modern & Ancient)</li>
                <li>• Church Slavonic</li>
                <li>• Romanian, Russian</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">Integration</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• Auto-populate records</li>
                <li>• Field mapping</li>
                <li>• Quality validation</li>
                <li>• Audit trails</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurchOCRPage;
