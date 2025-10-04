import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings, Save, RefreshCw } from 'lucide-react';
import { fetchSettings, updateSettings, type OCRSettings } from '../lib/ocrApi';

interface ConfigPanelProps {
  trigger: React.ReactNode;
  churchId?: number;
  onSettingsChange?: (settings: OCRSettings) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ trigger, churchId, onSettingsChange }) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<OCRSettings>({
    engine: 'tesseract',
    language: 'eng',
    dpi: 300,
    deskew: true,
    removeNoise: true,
    preprocessImages: true,
    outputFormat: 'json',
    confidenceThreshold: 75
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSettings(churchId);
      setSettings(data);
    } catch (error) {
      console.error('Failed to load OCR settings:', error);
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open, loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings, churchId);
      onSettingsChange?.(settings);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save OCR settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      engine: 'tesseract',
      language: 'eng',
      dpi: 300,
      deskew: true,
      removeNoise: true,
      preprocessImages: true,
      outputFormat: 'json',
      confidenceThreshold: 75
    });
  };

  if (!open) {
    return <span onClick={() => setOpen(true)}>{trigger}</span>;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">OCR Settings</h3>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {/* Engine Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  OCR Engine
                </label>
                <select
                  value={settings.engine}
                  onChange={(e) => setSettings({ ...settings, engine: e.target.value as OCRSettings['engine'] })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="tesseract">Tesseract (Open Source)</option>
                  <option value="google-vision">Google Vision AI</option>
                  <option value="azure-cognitive">Azure Cognitive Services</option>
                </select>
                <p className="text-xs text-gray-500">
                  Different engines may provide varying accuracy for different document types
                </p>
              </div>

              {/* Language Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Primary Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="eng">English</option>
                  <option value="ell">Greek (Modern)</option>
                  <option value="grc">Greek (Ancient)</option>
                  <option value="rus">Russian</option>
                  <option value="ron">Romanian</option>
                  <option value="srp">Serbian</option>
                  <option value="bul">Bulgarian</option>
                  <option value="ukr">Ukrainian</option>
                </select>
                <p className="text-xs text-gray-500">
                  Choose the primary language of documents you'll be processing
                </p>
              </div>

              {/* Image Processing Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Image Processing</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      DPI (Dots Per Inch)
                    </label>
                    <input
                      type="number"
                      min="150"
                      max="600"
                      step="50"
                      value={settings.dpi}
                      onChange={(e) => setSettings({ ...settings, dpi: parseInt(e.target.value) || 300 })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Confidence Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.confidenceThreshold}
                      onChange={(e) => setSettings({ ...settings, confidenceThreshold: parseInt(e.target.value) || 75 })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.deskew}
                      onChange={(e) => setSettings({ ...settings, deskew: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Auto-deskew images</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.removeNoise}
                      onChange={(e) => setSettings({ ...settings, removeNoise: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Remove image noise</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.preprocessImages}
                      onChange={(e) => setSettings({ ...settings, preprocessImages: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Apply preprocessing filters</span>
                  </label>
                </div>
              </div>

              {/* Output Format */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Output Format
                </label>
                <select
                  value={settings.outputFormat}
                  onChange={(e) => setSettings({ ...settings, outputFormat: e.target.value as OCRSettings['outputFormat'] })}
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="json">JSON (Structured Data)</option>
                  <option value="text">Plain Text</option>
                  <option value="hocr">hOCR (HTML + Coordinates)</option>
                  <option value="pdf">Searchable PDF</option>
                </select>
              </div>

              {/* Engine-specific tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-medium text-blue-900 mb-2">Tips for {settings.engine}</h5>
                <div className="text-xs text-blue-800 space-y-1">
                  {settings.engine === 'tesseract' && (
                    <>
                      <p>• Works best with high-contrast, clean text</p>
                      <p>• Consider higher DPI (300-400) for better accuracy</p>
                      <p>• Free and works offline</p>
                    </>
                  )}
                  {settings.engine === 'google-vision' && (
                    <>
                      <p>• Excellent for handwritten text and mixed languages</p>
                      <p>• Requires internet connection</p>
                      <p>• May have usage costs</p>
                    </>
                  )}
                  {settings.engine === 'azure-cognitive' && (
                    <>
                      <p>• Great for structured documents and forms</p>
                      <p>• Supports custom models</p>
                      <p>• Requires Azure subscription</p>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between rounded-b-2xl">
          <button
            onClick={handleReset}
            className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
