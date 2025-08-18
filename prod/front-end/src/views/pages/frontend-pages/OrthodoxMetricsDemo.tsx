import React, { useState, useEffect, useRef } from 'react';
import {
  IconUpload,
  IconBrain,
  IconEye,
  IconShield,
  IconLogin,
  IconArrowRight,
  IconArrowLeft,
  IconX,
  IconLoader2,
  IconUser,
  IconMail,
  IconLock,
  IconFileDescription,
  IconHeart,
  IconCross,
} from '@tabler/icons-react';

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}

interface BaptismRecord {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  baptismDate: string;
  baptismPlace: string;
  clergy: string;
  approved: boolean;
}

interface MarriageRecord {
  id: string;
  groomFirst: string;
  groomLast: string;
  brideFirst: string;
  brideLast: string;
  marriageDate: string;
  clergy: string;
  approved: boolean;
}

interface FuneralRecord {
  id: string;
  firstName: string;
  lastName: string;
  dateOfDeath: string;
  funeralDate: string;
  age: string;
  burialLocation: string;
  clergy: string;
  approved: boolean;
}

const baptismRecords: BaptismRecord[] = [
  { id: '1', firstName: 'Maria', lastName: 'Petrov', birthDate: '1995-03-15', baptismDate: '1995-04-20', baptismPlace: 'St. Nicholas Cathedral', clergy: 'Fr. Dimitri Volkov', approved: false },
  { id: '2', firstName: 'Alexander', lastName: 'Kozlov', birthDate: '1998-07-22', baptismDate: '1998-08-30', baptismPlace: 'Holy Trinity Church', clergy: 'Fr. Pavel Smirnov', approved: false },
  { id: '3', firstName: 'Elena', lastName: 'Vasiliev', birthDate: '2001-11-08', baptismDate: '2001-12-15', baptismPlace: 'St. Sergius Chapel', clergy: 'Fr. Mikhail Orlov', approved: false },
  { id: '4', firstName: 'Nikolai', lastName: 'Fedorov', birthDate: '1992-05-12', baptismDate: '1992-06-25', baptismPlace: 'Cathedral of Christ', clergy: 'Fr. Dimitri Volkov', approved: false },
  { id: '5', firstName: 'Anastasia', lastName: 'Romanova', birthDate: '1999-09-03', baptismDate: '1999-10-10', baptismPlace: 'St. Mary Church', clergy: 'Fr. Pavel Smirnov', approved: false },
  { id: '6', firstName: 'Viktor', lastName: 'Antonov', birthDate: '1996-12-18', baptismDate: '1997-01-28', baptismPlace: 'Holy Spirit Cathedral', clergy: 'Fr. Mikhail Orlov', approved: false },
  { id: '7', firstName: 'Svetlana', lastName: 'Kuznetsov', birthDate: '2000-02-29', baptismDate: '2000-04-05', baptismPlace: 'St. Nicholas Cathedral', clergy: 'Fr. Dimitri Volkov', approved: false }
];

const marriageRecords: MarriageRecord[] = [
  { id: '1', groomFirst: 'Ivan', groomLast: 'Petrov', brideFirst: 'Anna', brideLast: 'Sidorova', marriageDate: '2020-06-15', clergy: 'Fr. Dimitri Volkov', approved: false },
  { id: '2', groomFirst: 'Sergei', groomLast: 'Kozlov', brideFirst: 'Olga', brideLast: 'Volkova', marriageDate: '2019-08-22', clergy: 'Fr. Pavel Smirnov', approved: false },
  { id: '3', groomFirst: 'Alexei', groomLast: 'Vasiliev', brideFirst: 'Tatiana', brideLast: 'Morozova', marriageDate: '2021-05-08', clergy: 'Fr. Mikhail Orlov', approved: false },
  { id: '4', groomFirst: 'Dmitri', groomLast: 'Fedorov', brideFirst: 'Marina', brideLast: 'Lebedeva', marriageDate: '2018-09-12', clergy: 'Fr. Dimitri Volkov', approved: false },
  { id: '5', groomFirst: 'Roman', groomLast: 'Romanov', brideFirst: 'Ekaterina', brideLast: 'Sokolova', marriageDate: '2022-07-03', clergy: 'Fr. Pavel Smirnov', approved: false },
  { id: '6', groomFirst: 'Andrei', groomLast: 'Antonov', brideFirst: 'Yulia', brideLast: 'Novikova', marriageDate: '2020-10-18', clergy: 'Fr. Mikhail Orlov', approved: false },
  { id: '7', groomFirst: 'Maxim', groomLast: 'Kuznetsov', brideFirst: 'Irina', brideLast: 'Pavlova', marriageDate: '2019-04-29', clergy: 'Fr. Dimitri Volkov', approved: false }
];

const funeralRecords: FuneralRecord[] = [
  { id: '1', firstName: 'Boris', lastName: 'Petrov', dateOfDeath: '2023-01-15', funeralDate: '2023-01-18', age: '78', burialLocation: 'Holy Cross Cemetery', clergy: 'Fr. Dimitri Volkov', approved: false },
  { id: '2', firstName: 'Galina', lastName: 'Kozlova', dateOfDeath: '2022-11-22', funeralDate: '2022-11-25', age: '82', burialLocation: 'St. Nicholas Cemetery', clergy: 'Fr. Pavel Smirnov', approved: false },
  { id: '3', firstName: 'Mikhail', lastName: 'Vasiliev', dateOfDeath: '2023-03-08', funeralDate: '2023-03-11', age: '65', burialLocation: 'Trinity Cemetery', clergy: 'Fr. Mikhail Orlov', approved: false },
  { id: '4', firstName: 'Vera', lastName: 'Fedorova', dateOfDeath: '2022-09-12', funeralDate: '2022-09-15', age: '89', burialLocation: 'St. Sergius Cemetery', clergy: 'Fr. Dimitri Volkov', approved: false },
  { id: '5', firstName: 'Pavel', lastName: 'Romanov', dateOfDeath: '2023-05-03', funeralDate: '2023-05-06', age: '71', burialLocation: 'Cathedral Cemetery', clergy: 'Fr. Pavel Smirnov', approved: false },
  { id: '6', firstName: 'Lyudmila', lastName: 'Antonova', dateOfDeath: '2022-12-18', funeralDate: '2022-12-21', age: '76', burialLocation: 'Holy Spirit Cemetery', clergy: 'Fr. Mikhail Orlov', approved: false },
  { id: '7', firstName: 'Konstantin', lastName: 'Kuznetsov', dateOfDeath: '2023-02-29', funeralDate: '2023-03-04', age: '84', burialLocation: 'St. Mary Cemetery', clergy: 'Fr. Dimitri Volkov', approved: false }
];

export default function OrthodoxMetricsLiveDemo() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'baptism' | 'marriage' | 'funeral'>('baptism');
  const [baptismData, setBaptismData] = useState(baptismRecords);
  const [marriageData, setMarriageData] = useState(marriageRecords);
  const [funeralData, setFuneralData] = useState(funeralRecords);
  const [allApproved, setAllApproved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isTypingEmail, setIsTypingEmail] = useState(false);
  const [isTypingPassword, setIsTypingPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newFiles: UploadedFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file)
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const startProcessing = () => {
    setIsProcessing(true);
    setProcessingComplete(false);
    setTimeout(() => {
      setProcessingComplete(true);
    }, 5000);
  };

  const getRecordData = () => {
    switch (activeTab) {
      case 'baptism': return baptismData;
      case 'marriage': return marriageData;
      case 'funeral': return funeralData;
      default: return baptismData;
    }
  };

  const getTableHeaders = () => {
    switch (activeTab) {
      case 'baptism':
        return ['Name', 'Birth Date', 'Baptism Date', 'Location', 'Clergy', 'Status'];
      case 'marriage':
        return ['Groom', 'Bride', 'Marriage Date', 'Clergy', 'Status'];
      case 'funeral':
        return ['Name', 'Death Date', 'Funeral Date', 'Age', 'Burial Location', 'Clergy', 'Status'];
      default:
        return [];
    }
  };

  const getTableTitle = () => {
    switch (activeTab) {
      case 'baptism': return 'Baptism Records';
      case 'marriage': return 'Marriage Records';  
      case 'funeral': return 'Funeral Records';
      default: return 'Records';
    }
  };

  const getTotalRecords = () => {
    switch (activeTab) {
      case 'baptism': return '1,247';
      case 'marriage': return '542';
      case 'funeral': return '318';
      default: return '0';
    }
  };

  const approveRecord = (type: 'baptism' | 'marriage' | 'funeral', id: string) => {
    if (type === 'baptism') {
      setBaptismData(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r));
    } else if (type === 'marriage') {
      setMarriageData(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r));
    } else {
      setFuneralData(prev => prev.map(r => r.id === id ? { ...r, approved: true } : r));
    }
  };

  const checkAllApproved = () => {
    const allBaptismApproved = baptismData.every(r => r.approved);
    const allMarriageApproved = marriageData.every(r => r.approved);
    const allFuneralApproved = funeralData.every(r => r.approved);
    setAllApproved(allBaptismApproved && allMarriageApproved && allFuneralApproved);
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const simulateLogin = () => {
    setIsTypingEmail(true);
    let emailText = 'user@orthodoxmetrics.com';
    let currentEmail = '';
    
    const typeEmail = () => {
      if (currentEmail.length < emailText.length) {
        currentEmail += emailText[currentEmail.length];
        setEmail(currentEmail);
        setTimeout(typeEmail, 100);
      } else {
        setIsTypingEmail(false);
        setIsTypingPassword(true);
        typePassword();
      }
    };
    
    const typePassword = () => {
      let passwordText = '•••••••••••';
      let currentPassword = '';
      
      const addChar = () => {
        if (currentPassword.length < passwordText.length) {
          currentPassword += passwordText[currentPassword.length];
          setPassword(currentPassword);
          setTimeout(addChar, 100);
        } else {
          setIsTypingPassword(false);
          setTimeout(() => {
            setIsSigningIn(true);
            setTimeout(() => {
              setIsSigningIn(false);
              setIsSignedIn(true);
            }, 2000);
          }, 1000);
        }
      };
      addChar();
    };
    
    typeEmail();
  };

  useEffect(() => {
    checkAllApproved();
  }, [baptismData, marriageData, funeralData]);

  useEffect(() => {
    if (allApproved && currentStep === 4) {
      triggerConfetti();
    }
  }, [allApproved, currentStep]);

  useEffect(() => {
    if (currentStep === 5) {
      setTimeout(() => {
        simulateLogin();
      }, 1000);
    }
  }, [currentStep]);

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div 
      className="min-h-screen py-8 px-4 transition-all duration-500 flex flex-col items-center justify-start"
      style={{ 
        backgroundColor: '#F3EFFA',
        fontFamily: '"Noto Sans", sans-serif'
      }}
    >
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: Math.random() > 0.5 ? '#FFD700' : '#6B46C1' }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-8 w-full">
          <h1 
            className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-yellow-500 bg-clip-text text-transparent"
            style={{ fontFamily: '"Noto Serif", serif' }}
          >
            OrthodoxMetrics Sneak Peek
          </h1>
          <p className="text-gray-600 text-lg md:text-xl">Experience real parish record digitization</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-4 px-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  step <= currentStep
                    ? 'border-purple-600 text-white shadow-lg'
                    : 'border-gray-300 text-gray-400'
                }`}
                style={{
                  backgroundColor: step <= currentStep ? '#6B46C1' : 'transparent'
                }}
              >
                <span className="font-semibold">{step}</span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-purple-600 to-yellow-500"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 min-h-[600px] w-full flex flex-col items-center justify-center">
          {/* Step 1: Upload Records */}
          {currentStep === 1 && (
            <div className="text-center w-full max-w-4xl">
              <div className="mb-6">
                <div className="flex justify-center mb-6">
                  <IconUpload size={64} style={{ color: '#FFD700' }} />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#6B46C1', fontFamily: '"Noto Serif", serif' }}>
                  Upload Records
                </h2>
                <p className="text-gray-600 text-base md:text-lg mb-8 max-w-2xl mx-auto">
                  Simply scan or photograph existing records using any device.
                </p>
              </div>

              <div 
                className="border-2 border-dashed rounded-xl p-8 md:p-12 mb-6 cursor-pointer transition-all duration-300 hover:border-purple-400 hover:bg-purple-50 mx-auto max-w-2xl"
                style={{ borderColor: '#6B46C1' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex justify-center mb-4">
                  <IconUpload size={48} style={{ color: '#6B46C1' }} />
                </div>
                <p className="text-lg font-semibold" style={{ color: '#6B46C1' }}>
                  Click to upload images or drag and drop
                </p>
                <p className="text-gray-500 mt-2">PNG, JPG files up to 10MB each</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* File Previews */}
              {uploadedFiles.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Uploaded Files ({uploadedFiles.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {uploadedFiles.map((file) => (
                      <div key={file.id} className="relative group">
                        <img
                          src={file.preview}
                          alt={file.file.name}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <button
                          onClick={() => removeFile(file.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <IconX size={16} />
                        </button>
                        <p className="text-sm text-gray-600 mt-2 truncate">{file.file.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={nextStep}
                  disabled={uploadedFiles.length === 0}
                  className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                  style={{ backgroundColor: '#6B46C1' }}
                >
                  Process Records
                  <IconArrowRight size={20} style={{ marginLeft: '8px' }} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: AI Processing */}
          {currentStep === 2 && (
            <div className="w-full max-w-4xl">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <IconBrain size={64} style={{ color: '#FFD700' }} />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#6B46C1', fontFamily: '"Noto Serif", serif' }}>
                  AI Processing
                </h2>
                <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
                  Our advanced OCR technology reads and digitizes text in multiple languages.
                </p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 mb-8 font-mono text-sm">
                <div className="flex items-center mb-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="ml-4 text-gray-400">OrthodoxMetrics OCR Engine</span>
                </div>
                
                <div ref={terminalRef} className="text-green-400 space-y-2">
                  <div className="flex items-center">
                    <span className="text-blue-400">$</span>
                    <span className="ml-2">Starting OCR analysis...</span>
                    {isProcessing && <span className="ml-2 animate-pulse">|</span>}
                  </div>
                  
                  {isProcessing && (
                    <>
                      <div>📄 Analyzing document structure...</div>
                      <div>🔍 Detecting text regions...</div>
                      <div>🌐 Language detection: Church Slavonic, Russian, English</div>
                      <div>📊 Processing {uploadedFiles.length} images...</div>
                      <div className="animate-pulse">⚡ Extracting records data...</div>
                      
                      <div className="mt-4 space-y-1">
                        <div>✅ Baptism records: 7 found</div>
                        <div>✅ Marriage records: 7 found</div>
                        <div>✅ Funeral records: 7 found</div>
                      </div>
                    </>
                  )}
                  
                  {processingComplete && (
                    <>
                      <div className="text-green-400">✅ OCR processing complete!</div>
                      <div className="text-yellow-400">📋 21 records extracted successfully</div>
                      <div className="text-blue-400">🎯 Accuracy: 98.7%</div>
                    </>
                  )}
                </div>
              </div>

              <div className="text-center">
                {!isProcessing && !processingComplete && (
                  <button
                    onClick={startProcessing}
                    className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg"
                    style={{ backgroundColor: '#6B46C1' }}
                  >
                    Start Analysis
                  </button>
                )}
                
                {processingComplete && (
                  <button
                    onClick={nextStep}
                    className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg"
                    style={{ backgroundColor: '#6B46C1' }}
                  >
                    Review Results
                    <IconArrowRight size={20} style={{ marginLeft: '8px' }} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Review & Approve */}
          {currentStep === 3 && (
            <div className="w-full">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-6">
                  <IconEye size={64} style={{ color: '#FFD700' }} />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#6B46C1', fontFamily: '"Noto Serif", serif' }}>
                  Review & Approve
                </h2>
                <p className="text-gray-600 text-base md:text-lg mb-6 max-w-2xl mx-auto">
                  Verify the digitized content and make any necessary corrections.
                </p>
              </div>

              {/* Tabs */}
              <div className="flex justify-center border-b border-gray-200 mb-6">
                {[
                  { key: 'baptism', label: 'Baptism Records', icon: IconCross, count: baptismData.length },
                  { key: 'marriage', label: 'Marriage Records', icon: IconHeart, count: marriageData.length },
                  { key: 'funeral', label: 'Funeral Records', icon: IconFileDescription, count: funeralData.length }
                ].map(({ key, label, icon: Icon, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center px-6 py-3 font-semibold transition-all duration-200 ${
                      activeTab === key
                        ? 'border-b-2 text-purple-600'
                        : 'text-gray-600 hover:text-purple-600'
                    }`}
                    style={{ borderColor: activeTab === key ? '#6B46C1' : 'transparent' }}
                  >
                    <Icon size={20} style={{ marginRight: '8px' }} />
                    {label} ({count})
                  </button>
                ))}
              </div>

              {/* Tables */}
              <div className="overflow-x-auto flex justify-center">
                <div className="w-full max-w-6xl">
                {activeTab === 'baptism' && (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {getTableHeaders().map((header) => (
                          <th key={header} className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                            {header}
                          </th>
                        ))}
                        <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {baptismData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-3">{record.firstName} {record.lastName}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.birthDate}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.baptismDate}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.baptismPlace}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.clergy}</td>
                          <td className="border border-gray-200 px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              record.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.approved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-center">
                            {!record.approved && (
                              <button
                                onClick={() => approveRecord('baptism', record.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'marriage' && (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {getTableHeaders().map((header) => (
                          <th key={header} className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                            {header}
                          </th>
                        ))}
                        <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marriageData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-3">{record.groomFirst} {record.groomLast}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.brideFirst} {record.brideLast}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.marriageDate}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.clergy}</td>
                          <td className="border border-gray-200 px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              record.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.approved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-center">
                            {!record.approved && (
                              <button
                                onClick={() => approveRecord('marriage', record.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'funeral' && (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        {getTableHeaders().map((header) => (
                          <th key={header} className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                            {header}
                          </th>
                        ))}
                        <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funeralData.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-3">{record.firstName} {record.lastName}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.dateOfDeath}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.funeralDate}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.age}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.burialLocation}</td>
                          <td className="border border-gray-200 px-4 py-3">{record.clergy}</td>
                          <td className="border border-gray-200 px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              record.approved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.approved ? 'Approved' : 'Pending'}
                            </span>
                          </td>
                          <td className="border border-gray-200 px-4 py-3 text-center">
                            {!record.approved && (
                              <button
                                onClick={() => approveRecord('funeral', record.id)}
                                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex justify-center items-center gap-8 mt-8">
                <button
                  onClick={prevStep}
                  className="flex items-center px-6 py-3 border-2 rounded-lg font-semibold transition-all duration-200 hover:bg-gray-50"
                  style={{ borderColor: '#6B46C1', color: '#6B46C1' }}
                >
                  <IconArrowLeft size={20} style={{ marginRight: '8px' }} />
                  Back
                </button>

                <button
                  onClick={nextStep}
                  disabled={!allApproved}
                  className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                  style={{ backgroundColor: '#6B46C1' }}
                >
                  Validate & Store
                  <IconArrowRight size={20} style={{ marginLeft: '8px' }} />
                </button>
              </div>
              </div>
            </div>
          )}

          {/* Step 4: Validate & Store */}
          {currentStep === 4 && (
            <div className="text-center w-full max-w-4xl">
              <div className="flex justify-center mb-4">
                <IconShield size={64} style={{ color: '#FFD700' }} />
              </div>
              <h2 className="text-3xl font-bold mb-4" style={{ color: '#6B46C1', fontFamily: '"Noto Serif", serif' }}>
                Validate & Store
              </h2>
              
              {allApproved ? (
                <div className="space-y-6">
                  <div className="text-6xl animate-bounce">🎉</div>
                  <h3 className="text-2xl font-bold text-green-600">Records Successfully Stored!</h3>
                  <p className="text-gray-600 text-lg">
                    All records have been validated and securely stored in your parish database.
                  </p>
                  
                  <div className="bg-gradient-to-r from-purple-100 to-yellow-100 rounded-xl p-6 inline-block">
                    <h4 className="font-bold mb-2" style={{ color: '#6B46C1' }}>Record Summary</h4>
                    <div className="flex space-x-6 text-center">
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{baptismData.length}</div>
                        <div className="text-sm text-gray-600">Baptisms</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{marriageData.length}</div>
                        <div className="text-sm text-gray-600">Marriages</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">{funeralData.length}</div>
                        <div className="text-sm text-gray-600">Funerals</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={nextStep}
                    className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg"
                    style={{ backgroundColor: '#6B46C1' }}
                  >
                    Access System
                    <IconArrowRight size={20} style={{ marginLeft: '8px' }} />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 text-lg mb-6">
                    Please review and approve all records before proceeding.
                  </p>
                  <button
                    onClick={prevStep}
                    className="flex items-center px-6 py-3 border-2 rounded-lg font-semibold transition-all duration-200 hover:bg-gray-50 mx-auto"
                    style={{ borderColor: '#6B46C1', color: '#6B46C1' }}
                  >
                    <IconArrowLeft size={20} style={{ marginRight: '8px' }} />
                    Back to Review
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Login Simulation */}
          {currentStep === 5 && (
            <div className="w-full max-w-md mx-auto flex flex-col items-center">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  <IconLogin size={64} style={{ color: '#FFD700' }} />
                </div>
                <h2 className="text-3xl font-bold mb-4" style={{ color: '#6B46C1', fontFamily: '"Noto Serif", serif' }}>
                  Access Your System
                </h2>
              </div>

              {!isSignedIn ? (
                <div className="space-y-6 w-full">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <IconMail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                      {isTypingEmail && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1 h-5 bg-purple-500 animate-pulse"></div>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <IconLock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        value={password}
                        readOnly
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter your password"
                      />
                      {isTypingPassword && <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-1 h-5 bg-purple-500 animate-pulse"></div>}
                    </div>
                  </div>

                  <button
                    disabled={isSigningIn || !email || !password}
                    className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg flex items-center justify-center"
                    style={{ backgroundColor: '#6B46C1' }}
                  >
                    {isSigningIn ? (
                      <>
                        <IconLoader2 size={20} style={{ marginRight: '8px' }} className="animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="text-6xl">✅</div>
                  <h3 className="text-2xl font-bold text-green-600">Welcome, Fr. George!</h3>
                  <p className="text-gray-600">
                    You have successfully accessed your OrthodoxMetrics dashboard. 
                    Your digitized records are now searchable and accessible from anywhere.
                  </p>
                  <div className="bg-gradient-to-r from-purple-100 to-yellow-100 rounded-xl p-6">
                    <div className="flex items-center justify-center space-x-4">
                      <IconUser size={32} style={{ color: '#6B46C1' }} />
                      <div>
                        <div className="font-semibold text-purple-600">Fr. George Apostol</div>
                        <div className="text-sm text-gray-600">St. Nicholas Parish</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
