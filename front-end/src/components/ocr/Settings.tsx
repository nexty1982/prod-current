/**
 * OCR Settings Component
 * Configuration panel for OCR preferences and church-specific settings
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Settings, 
  Save, 
  RotateCcw,
  Eye,
  Palette,
  Globe,
  Zap,
  Shield,
  Database,
  RefreshCw
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { toast } from 'react-toastify';
import { useOcrSettings } from '../../hooks/useOcrSettings';

interface OcrSettingsProps {
  churchId: string;
  theme?: string;
}

interface OcrSettings {
  // Processing Settings
  defaultLanguage: string;
  defaultQuality: 'fast' | 'balanced' | 'accurate';
  autoSubmit: boolean;
  batchProcessing: boolean;
  confidenceThreshold: number;
  
  // Field Mapping
  enableSmartMapping: boolean;
  customFieldMappings: Record<string, string>;
  requiredFields: string[];
  
  // UI Settings
  showConfidenceBadges: boolean;
  showBoundingBoxes: boolean;
  previewMode: 'side-by-side' | 'overlay' | 'tabs';
  autoRefreshQueue: boolean;
  refreshInterval: number; // seconds
  
  // Advanced Settings
  enableEntityExtraction: boolean;
  enableTranslation: boolean;
  retentionDays: number;
  maxFileSize: number; // MB
  allowedFileTypes: string[];
  
  // Church-specific
  recordTypes: string[];
  theme: string;
  customCss: string;
}

export const OcrSettingsComponent: React.FC<OcrSettingsProps> = ({
  churchId,
  theme = 'light'
}) => {
  const {
    settings,
    loading,
    saving,
    hasChanges,
    updateSetting,
    saveSettings,
    resetSettings
  } = useOcrSettings(churchId);

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mr-3" />
          <span className="text-gray-600">Loading settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">OCR Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure OCR processing and interface preferences
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={resetSettings} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button 
            onClick={saveSettings} 
            disabled={!hasChanges || saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            You have unsaved changes. Don't forget to save your settings.
          </p>
        </div>
      )}

      {/* Processing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Processing Settings
          </CardTitle>
          <CardDescription>
            Configure how OCR processes your documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Language
              </label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => updateSetting('defaultLanguage', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="ru">Russian</option>
                <option value="gr">Greek</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Quality
              </label>
              <select
                value={settings.defaultQuality}
                onChange={(e) => updateSetting('defaultQuality', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fast">Fast (Quick processing)</option>
                <option value="balanced">Balanced (Recommended)</option>
                <option value="accurate">Accurate (Best quality)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confidence Threshold: {Math.round(settings.confidenceThreshold * 100)}%
            </label>
            <Slider
              value={[settings.confidenceThreshold]}
              onValueChange={([value]) => updateSetting('confidenceThreshold', value)}
              max={1}
              min={0}
              step={0.05}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Fields below this confidence level will be flagged for review
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-submit completed jobs</span>
                <p className="text-xs text-gray-500">Automatically process high-confidence results</p>
              </div>
              <Switch
                checked={settings.autoSubmit}
                onCheckedChange={(checked) => updateSetting('autoSubmit', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Enable batch processing</span>
                <p className="text-xs text-gray-500">Process multiple files simultaneously</p>
              </div>
              <Switch
                checked={settings.batchProcessing}
                onCheckedChange={(checked) => updateSetting('batchProcessing', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interface Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2" />
            Interface Settings
          </CardTitle>
          <CardDescription>
            Customize the OCR interface appearance and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Show confidence badges</span>
                <p className="text-xs text-gray-500">Display accuracy indicators</p>
              </div>
              <Switch
                checked={settings.showConfidenceBadges}
                onCheckedChange={(checked) => updateSetting('showConfidenceBadges', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Show bounding boxes</span>
                <p className="text-xs text-gray-500">Highlight detected text regions</p>
              </div>
              <Switch
                checked={settings.showBoundingBoxes}
                onCheckedChange={(checked) => updateSetting('showBoundingBoxes', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Auto-refresh queue</span>
                <p className="text-xs text-gray-500">Automatically update job status</p>
              </div>
              <Switch
                checked={settings.autoRefreshQueue}
                onCheckedChange={(checked) => updateSetting('autoRefreshQueue', checked)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview Mode
            </label>
            <select
              value={settings.previewMode}
              onChange={(e) => updateSetting('previewMode', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="side-by-side">Side-by-side</option>
              <option value="overlay">Overlay</option>
              <option value="tabs">Tabbed</option>
            </select>
          </div>

          {settings.autoRefreshQueue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Refresh Interval: {settings.refreshInterval} seconds
              </label>
              <Slider
                value={[settings.refreshInterval]}
                onValueChange={([value]) => updateSetting('refreshInterval', value)}
                max={30}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Advanced Settings
          </CardTitle>
          <CardDescription>
            Advanced configuration options and data management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Enable entity extraction</span>
                <p className="text-xs text-gray-500">Extract Orthodox-specific entities</p>
              </div>
              <Switch
                checked={settings.enableEntityExtraction}
                onCheckedChange={(checked) => updateSetting('enableEntityExtraction', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Enable translation</span>
                <p className="text-xs text-gray-500">Auto-translate foreign text</p>
              </div>
              <Switch
                checked={settings.enableTranslation}
                onCheckedChange={(checked) => updateSetting('enableTranslation', checked)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Retention (days)
              </label>
              <Input
                type="number"
                value={settings.retentionDays}
                onChange={(e) => updateSetting('retentionDays', parseInt(e.target.value) || 90)}
                min="1"
                max="365"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long to keep OCR jobs and results
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max File Size (MB)
              </label>
              <Input
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => updateSetting('maxFileSize', parseInt(e.target.value) || 10)}
                min="1"
                max="100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Allowed File Types
            </label>
            <div className="flex flex-wrap gap-2">
              {['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'].map(type => (
                <Badge
                  key={type}
                  variant={settings.allowedFileTypes.includes(type) ? 'default' : 'outline'}
                  className={`cursor-pointer ${
                    settings.allowedFileTypes.includes(type) 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    const newTypes = settings.allowedFileTypes.includes(type)
                      ? settings.allowedFileTypes.filter(t => t !== type)
                      : [...settings.allowedFileTypes, type];
                    updateSetting('allowedFileTypes', newTypes);
                  }}
                >
                  {type.split('/')[1].toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
