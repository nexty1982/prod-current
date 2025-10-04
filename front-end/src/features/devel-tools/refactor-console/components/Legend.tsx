import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  XCircle,
  GitBranch,
  Zap,
  Calendar,
  FileText
} from 'lucide-react';
import { Classification, RefactorScan, FilterState } from '@/types/refactorConsole';

interface LegendProps {
  scanData: RefactorScan | null;
  filterState: FilterState;
  onFilterChange: (updates: Partial<FilterState>) => void;
  className?: string;
}

const Legend: React.FC<LegendProps> = ({ 
  scanData, 
  filterState, 
  onFilterChange,
  className = '' 
}) => {
  if (!scanData) return null;

  const classificationConfigs = [
    {
      key: 'green' as Classification,
      label: 'Production Ready',
      icon: CheckCircle,
      description: 'Likely in production and actively used',
      color: 'green',
      count: scanData.summary.likelyInProd
    },
    {
      key: 'orange' as Classification,
      label: 'High Risk',
      icon: AlertTriangle,
      description: 'May be used by multiple feature areas',
      color: 'orange',
      count: scanData.summary.highRisk
    },
    {
      key: 'yellow' as Classification,
      label: 'In Development',
      icon: Clock,
      description: 'Development files or low usage, recent edits',
      color: 'yellow',
      count: scanData.summary.inDevelopment
    },
    {
      key: 'red' as Classification,
      label: 'Legacy/Duplicate',
      icon: XCircle,
      description: 'Duplicates, legacy patterns, or old files',
      color: 'red',
      count: scanData.summary.legacyOrDupes
    }
  ];

  const handleClassificationToggle = (classification: Classification) => {
    const newClassifications = filterState.classifications.includes(classification)
      ? filterState.classifications.filter(c => c !== classification)
      : [...filterState.classifications, classification];
    
    onFilterChange({ classifications: newClassifications });
  };

  const handleSelectAllClassifications = () => {
    onFilterChange({ classifications: ['green', 'orange', 'yellow', 'red'] });
  };

  const handleDeselectAllClassifications = () => {
    onFilterChange({ classifications: [] });
  };

  const getColorClasses = (color: string) => ({
    bg: color === 'green' ? 'bg-green-100' : 
        color === 'orange' ? 'bg-orange-100' : 
        color === 'yellow' ? 'bg-yellow-100' : 'bg-red-100',
    text: color === 'green' ? 'text-green-800' : 
          color === 'orange' ? 'text-orange-800' : 
          color === 'yellow' ? 'text-yellow-800' : 'text-red-800',
    border: color === 'green' ? 'border-green-300' : 
            color === 'orange' ? 'border-orange-300' : 
            color === 'yellow' ? 'border-yellow-300' : 'border-red-300',
    icon: color === 'green' ? 'text-green-600' : 
          color === 'orange' ? 'text-orange-600' : 
          color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
  });

  const IconComponent = ({
    icon: IconComponent,
    classification,
    colors
  }: {
    icon: any;
    classification: Classification;
    colors: any;
  }) => {
    switch (classification) {
      case 'green':
        return <CheckCircle className={`w-4 h-4 ${colors.icon}`} />;
      case 'orange':
        return <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />;
      case 'yellow':
        return <Clock className={`w-4 h-4 ${colors.icon}`} />;
      case 'red':
        return <XCircle className={`w-4 h-4 ${colors.icon}`} />;
      default:
        return <FileText className={`w-4 h-4 ${colors.icon}`} />;
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Classification Legend</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAllClassifications}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              All
            </button>
            <button
              onClick={handleDeselectAllClassifications}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              None
            </button>
          </div>
        </div>
      </div>

      {/* Classification Items */}
      <div className="p-4 space-y-3">
        {classificationConfigs.map((config) => {
          const colors = getColorClasses(config.color);
          const Icon = config.icon;
          const isSelected = filterState.classifications.includes(config.key);

          return (
            <div
              key={config.key}
              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? `${colors.bg} ${colors.border} border-opacity-100`
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => handleClassificationToggle(config.key)}
            >
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-6 h-6 rounded ${
                  isSelected ? colors.bg : 'bg-gray-200'
                }`}>
                  <IconComponent
                    icon={Icon}
                    classification={config.key}
                    colors={{ icon: isSelected ? colors.icon : 'text-gray-400' }}
                  />
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium text-sm ${
                    isSelected ? colors.text : 'text-gray-700'
                  }`}>
                    {config.label}
                  </div>
                  <div className={`text-xs ${
                    isSelected ? colors.text : 'text-gray-500'
                  } text-opacity-75`}>
                    {config.description}
                  </div>
                </div>
                
                <div className={`text-sm font-medium ${
                  isSelected ? colors.text : 'text-gray-500'
                }`}>
                  {config.count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Statistics */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {scanData.summary.totalFiles}
            </div>
            <div className="text-sm text-gray-600">Total Files</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {scanData.summary.totalDirs}
            </div>
            <div className="text-sm text-gray-600">Directories</div>
          </div>
          <div className="col-span-2 mt-2">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                <span>{scanData.summary.duplicates} duplicates</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Last scan: {new Date(scanData.generatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legend;
