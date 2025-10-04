import React, { useEffect, useState, useCallback } from 'react';
import { ScanLine, Settings as SettingsIcon, RefreshCw, Church, ChevronDown } from 'lucide-react';
import UploadZone from '../shared/ui/legacy/UploadZone';
import JobList from '../shared/ui/legacy/JobList';
import ConfigPanel from '../shared/ui/legacy/ConfigPanel';
import OutputViewer from '../shared/ui/legacy/OutputViewer';
import { fetchChurches } from '../lib/ocrApi';

const OCRStudioPage: React.FC = () => {
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [selectedChurchId, setSelectedChurchId] = useState<number | undefined>();
  const [churches, setChurches] = useState<Array<{ id: number; name: string }>>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showChurchSelector, setShowChurchSelector] = useState(false);

  // Load available churches
  useEffect(() => {
    const loadChurches = async () => {
      try {
        const churchList = await fetchChurches();
        setChurches(churchList);
        if (churchList.length > 0 && !selectedChurchId) {
          setSelectedChurchId(churchList[0].id);
        }
      } catch (error) {
        console.error('Failed to load churches:', error);
      }
    };

    loadChurches();
  }, [selectedChurchId]);

  const handleUploadSuccess = useCallback(() => {
    setSelectedJobId(undefined);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleRefreshJobs = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const selectedChurch = churches.find(c => c.id === selectedChurchId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <ScanLine className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">OCR Studio</h1>
                  <p className="text-sm text-gray-500">
                    Optical Character Recognition for Church Documents
                  </p>
                </div>
              </div>

              {/* Church Selector */}
              {churches.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowChurchSelector(!showChurchSelector)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Church className="h-4 w-4 text-gray-600" />
                    <span className="text-gray-700">
                      {selectedChurch?.name || 'Select Church'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>

                  {showChurchSelector && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-500 px-3 py-2">
                          Select Church Context
                        </div>
                        <button
                          onClick={() => {
                            setSelectedChurchId(undefined);
                            setShowChurchSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 ${
                            !selectedChurchId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          All Churches
                        </button>
                        {churches.map((church) => (
                          <button
                            key={church.id}
                            onClick={() => {
                              setSelectedChurchId(church.id);
                              setShowChurchSelector(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-50 ${
                              selectedChurchId === church.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            {church.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                churchId={selectedChurchId}
              />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Ready for Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Multi-language Support</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Field Extraction</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Upload & Jobs */}
          <div className="col-span-12 xl:col-span-5 space-y-6">
            {/* Upload Zone */}
            <UploadZone
              onUploaded={handleUploadSuccess}
              churchId={selectedChurchId}
            />

            {/* Recent Jobs */}
            <JobList
              onSelect={setSelectedJobId}
              selectedJobId={selectedJobId}
              churchId={selectedChurchId}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Right Panel - Results */}
          <div className="col-span-12 xl:col-span-7">
            <OutputViewer jobId={selectedJobId} />
          </div>
        </div>
      </div>

      {/* Background click handler for church selector */}
      {showChurchSelector && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowChurchSelector(false)}
        />
      )}
    </div>
  );
};

export default OCRStudioPage;
