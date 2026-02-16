import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Terminal, Bot, Shield, CheckCircle, AlertCircle, X, BookOpen } from 'lucide-react';

const OMBigBook = () => {
  const [activeTab, setActiveTab] = useState('imports');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef(null);

  const tabs = [
    { id: 'imports', label: 'Imports & Scripts', icon: '📥', component: Upload },
    { id: 'fileconsole', label: 'File Console', icon: '📂', component: FileText },
    { id: 'console', label: 'Console', icon: '🖥️', component: Terminal },
    { id: 'discovery', label: 'OMAI Discovery', icon: '🤖', component: Bot },
    { id: 'encrypted', label: 'Encrypted Storage', icon: '🔐', component: Shield }
  ];

  const supportedFileTypes = [
    '.md', '.js', '.sh', '.py', '.sql', '.html', '.css', 
    '.json', '.zip', '.png', '.jpg', '.pdf'
  ];

  const handleTabChange = (tabId) => {
    if (tabId !== activeTab) {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveTab(tabId);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const simulateUpload = (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          const newFile = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: file.size,
            type: file.type,
            extension: file.name.split('.').pop(),
            status: 'success',
            isParishMap: file.name.toLowerCase().includes('parish') && file.name.endsWith('.zip'),
            uploadedAt: new Date()
          };
          
          setUploadedFiles(prev => [newFile, ...prev]);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 100);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => simulateUpload(file));
  }, []);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => simulateUpload(file));
    e.target.value = '';
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (extension) => {
    const iconMap = {
      'zip': '📦',
      'js': '🟨',
      'py': '🐍',
      'md': '📝',
      'sql': '🗄️',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'png': '🖼️',
      'jpg': '🖼️',
      'pdf': '📄',
      'sh': '⚡'
    };
    return iconMap[extension] || '📄';
  };

  const renderImportsContent = () => (
    <div className="space-y-6 h-full">
      {/* Upload Form Section */}
      <div className="relative">
        <div
          className={`
            relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
            bg-gradient-to-br from-white to-purple-50
            ${isDragOver 
              ? 'border-purple-400 bg-purple-100 shadow-inner scale-[0.98]' 
              : 'border-purple-200 hover:border-purple-300 hover:shadow-sm'
            }
            ${isUploading ? 'pointer-events-none' : ''}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e0e7ff' fill-opacity='0.1'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept={supportedFileTypes.join(',')}
          />
          
          <div className="space-y-4">
            {/* Upload Icon styled as a scroll */}
            <div className={`transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
              <div className="mx-auto w-16 h-16 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-100 to-amber-200 rounded-lg shadow-md border border-amber-300 transform rotate-3"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-amber-50 to-amber-100 rounded-lg shadow-sm border border-amber-200 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-amber-700" />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-serif font-semibold text-gray-800 mb-2">
                Drop files here or click to upload
              </h3>
              <p className="text-gray-600 text-sm font-mono mb-4">
                Supports: {supportedFileTypes.join(', ')}
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="absolute inset-0 bg-white bg-opacity-95 rounded-xl flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto"></div>
                <div className="w-48">
                  <div className="bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-purple-400 to-pink-400 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 font-serif">Uploading... {Math.round(uploadProgress)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Note for Parish Maps */}
        <div className="absolute -top-2 -right-2 bg-yellow-200 border border-yellow-300 rounded-lg p-3 shadow-md transform rotate-3 max-w-xs">
          <div className="flex items-start space-x-2">
            <span className="text-lg">⭐</span>
            <div>
              <p className="text-xs font-medium text-yellow-800 leading-tight">
                Special: Drop Parish Map .zip files for auto-installation!
              </p>
            </div>
          </div>
          {/* Pin */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-red-400 rounded-full shadow-sm"></div>
        </div>
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-serif font-semibold text-gray-700 border-b border-gray-200 pb-1">
            📋 Uploaded Files ({uploadedFiles.length})
          </h4>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-lg">{getFileIcon(file.extension)}</div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-medium text-gray-900 truncate font-serif">
                          {file.name}
                        </h5>
                        {file.isParishMap && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Auto-Install
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {formatFileSize(file.size)} • {file.extension.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.status === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
                    >
                      <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'imports':
        return renderImportsContent();
      case 'fileconsole':
        return (
          <div className="text-center p-8 h-full flex flex-col items-center justify-center">
            <FileText className="h-16 w-16 text-purple-300 mb-4" />
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-2">File Console</h3>
            <p className="text-gray-600">Manage and browse your uploaded files here.</p>
          </div>
        );
      case 'console':
        return (
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-green-400 h-80 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="ml-4 text-gray-400 text-sm">OM Terminal</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>$ orthodox-metrics --version</div>
                <div className="text-gray-400">OM Big Book v2.1.0</div>
                <div>$ _</div>
              </div>
            </div>
          </div>
        );
      case 'discovery':
        return (
          <div className="text-center p-8 h-full flex flex-col items-center justify-center">
            <Bot className="h-16 w-16 text-blue-300 mb-4" />
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-2">OMAI Discovery</h3>
            <p className="text-gray-600">AI-powered content discovery and analysis tools.</p>
          </div>
        );
      case 'encrypted':
        return (
          <div className="text-center p-8 h-full flex flex-col items-center justify-center">
            <Shield className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-serif font-semibold text-gray-800 mb-2">Encrypted Storage</h3>
            <p className="text-gray-600">Secure, encrypted file storage and management.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Logo */}
        <div className="text-center mb-8 relative">
          {/* Orthodox Metrics Logo */}
          <div className="w-[300px] h-[300px] mx-auto mb-6 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg border-2 border-purple-200 p-8">
            {/* Orthodox Cross */}
            <div className="mb-6">
              <svg width="100" height="120" viewBox="0 0 100 120" className="text-yellow-500">
                <g fill="currentColor" stroke="currentColor" strokeWidth="1">
                  {/* Main vertical bar */}
                  <rect x="46" y="15" width="8" height="90" rx="2" />
                  {/* Top horizontal bar */}
                  <rect x="30" y="25" width="40" height="6" rx="1" />
                  {/* Main horizontal bar */}
                  <rect x="25" y="50" width="50" height="8" rx="2" />
                  {/* Bottom angled bar */}
                  <rect x="35" y="85" width="25" height="6" rx="1" transform="rotate(-20 47.5 88)" />
                </g>
              </svg>
            </div>
            
            {/* Text */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-purple-600 mb-2 tracking-wide">
                Orthodox Metrics
              </h1>
              <p className="text-lg text-yellow-600 font-medium italic">
                Recording the Saints Among Us
              </p>
            </div>
          </div>
          
          {/* Book Title */}
          <div className="flex items-center justify-center space-x-3 mb-4">
            <BookOpen className="h-8 w-8 text-purple-600" />
            <h2 className="text-4xl font-serif font-bold text-gray-900">
              OM Big Book
            </h2>
          </div>
          <p className="text-gray-600 text-lg font-serif italic">
            Import, manage, and execute all types of files and documents
          </p>
        </div>

        {/* Book Container */}
        <div className="relative perspective-1000">
          <div className="book-container relative mx-auto max-w-6xl">
            {/* Book Shadow */}
            <div className="absolute inset-0 bg-black opacity-20 blur-xl transform translate-y-8 scale-95 rounded-2xl"></div>
            
            {/* Book Cover */}
            <div className="relative bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-2xl overflow-hidden">
              {/* Book Binding */}
              <div className="absolute left-1/2 top-0 bottom-0 w-8 bg-gradient-to-b from-purple-200 via-purple-300 to-purple-200 transform -translate-x-1/2 shadow-inner z-10">
                <div className="absolute inset-y-4 left-1/2 w-0.5 bg-purple-400 transform -translate-x-1/2"></div>
                <div className="absolute inset-y-8 left-1/2 w-px bg-purple-500 transform -translate-x-1/2"></div>
              </div>

              <div className="flex min-h-[600px]">
                {/* Left Page - Navigation */}
                <div className="w-1/2 p-8 relative">
                  {/* Paper texture */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 opacity-80"></div>
                  
                  <div className="relative z-10 h-full">
                    <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6 text-center border-b-2 border-purple-200 pb-3">
                      Table of Contents
                    </h2>
                    
                    <nav className="space-y-3">
                      {tabs.map((tab, index) => {
                        const IconComponent = tab.component;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`
                              w-full text-left p-4 rounded-lg transition-all duration-200 group relative
                              ${activeTab === tab.id
                                ? 'bg-gradient-to-r from-purple-100 to-blue-100 shadow-md border-l-4 border-purple-400'
                                : 'hover:bg-gray-50 hover:shadow-sm'
                              }
                            `}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-xl">{tab.icon}</span>
                              <div>
                                <span className={`font-serif font-medium ${
                                  activeTab === tab.id ? 'text-purple-800' : 'text-gray-700'
                                }`}>
                                  {tab.label}
                                </span>
                                <div className="text-sm text-gray-500 font-mono">
                                  Chapter {index + 1}
                                </div>
                              </div>
                            </div>
                            
                            {/* Page corner fold effect for active tab */}
                            {activeTab === tab.id && (
                              <div className="absolute top-0 right-0 w-4 h-4 bg-gradient-to-br from-white to-purple-50 transform rotate-45 translate-x-2 -translate-y-2 shadow-sm"></div>
                            )}
                          </button>
                        );
                      })}
                    </nav>

                    {/* Decorative bookmark */}
                    <div className="absolute -right-4 top-16 w-6 h-20 bg-gradient-to-b from-red-400 to-red-500 rounded-r-md shadow-md z-20">
                      <div className="w-full h-full bg-gradient-to-b from-red-300 to-red-400 rounded-r-sm"></div>
                    </div>
                  </div>
                  
                  {/* Page corner curl */}
                  <div className="absolute bottom-4 right-4 w-8 h-8 bg-gradient-to-tl from-gray-200 to-white transform rotate-45 translate-x-4 translate-y-4 opacity-80 shadow-sm"></div>
                </div>

                {/* Right Page - Content */}
                <div className="w-1/2 p-8 relative">
                  {/* Paper texture */}
                  <div className="absolute inset-0 bg-gradient-to-bl from-white to-gray-50 opacity-80"></div>
                  
                  <div className={`relative z-10 h-full transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                    <div className="h-full flex flex-col">
                      <h2 className="text-2xl font-serif font-bold text-gray-800 mb-6 text-center border-b-2 border-purple-200 pb-3">
                        {tabs.find(tab => tab.id === activeTab)?.label || 'Content'}
                      </h2>
                      
                      <div className="flex-1 overflow-auto">
                        {renderTabContent()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Page corner curl */}
                  <div className="absolute bottom-4 left-4 w-8 h-8 bg-gradient-to-tr from-gray-200 to-white transform -rotate-45 -translate-x-4 translate-y-4 opacity-80 shadow-sm"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OMBigBook;
