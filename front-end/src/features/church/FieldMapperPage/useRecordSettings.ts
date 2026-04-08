import { useCallback, useEffect, useState } from 'react';
import { fetchWithChurchContext } from '@/shared/lib/fetchWithChurchContext';
import { DEFAULT_RECORD_SETTINGS } from './constants';

/** Safe-spread guard: returns val only if it's a plain object (not array, not string) */
const safeObj = (val: any) => (val && typeof val === 'object' && !Array.isArray(val)) ? val : {};

export function useRecordSettings(
  churchId: number | null,
  setError: (err: string | null) => void,
  setSuccess: (msg: string | null) => void,
  setSaving: (saving: boolean) => void,
) {
  const [recordSettings, setRecordSettings] = useState({ ...DEFAULT_RECORD_SETTINGS });

  // Load record settings from server
  useEffect(() => {
    if (!churchId) return;

    const loadRecordSettings = async () => {
      try {
        const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/record-settings`, {
          churchId,
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          if (data.settings) {
            setRecordSettings(prev => ({
              ...prev,
              ...safeObj(data.settings),
              logo: {
                ...prev.logo,
                ...safeObj(data.settings.logo),
              },
              calendar: {
                ...prev.calendar,
                ...safeObj(data.settings.calendar),
              },
              omLogo: {
                ...prev.omLogo,
                ...safeObj(data.settings.omLogo),
              },
              headerText: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                color: '#4C1D95',
                x: 0,
                y: 0,
                ...safeObj(data.settings.headerText),
                column: data.settings.headerText?.column ?? 1,
              },
              recordImages: {
                column: data.settings.recordImages?.column ?? 1,
                x: data.settings.recordImages?.x ?? data.settings.recordImages?.baptism?.x ?? 0,
                y: data.settings.recordImages?.y ?? data.settings.recordImages?.baptism?.y ?? 0,
                width: data.settings.recordImages?.width ?? 60,
                height: data.settings.recordImages?.height ?? 60,
              },
              backgroundImage: {
                enabled: true,
                column: 0,
                images: [],
                currentIndex: 0,
                ...safeObj(data.settings.backgroundImage),
              },
              g1Image: {
                enabled: true,
                column: 0,
                images: [],
                currentIndex: 0,
                ...safeObj(data.settings.g1Image),
              },
              imageLibrary: {
                logo: [],
                omLogo: [],
                baptism: [],
                marriage: [],
                funeral: [],
                bg: [],
                g1: [],
                ...safeObj(data.settings.imageLibrary),
              },
              currentImageIndex: {
                logo: 0,
                omLogo: 0,
                baptism: 0,
                marriage: 0,
                funeral: 0,
                bg: 0,
                g1: 0,
                ...safeObj(data.settings.currentImageIndex),
              },
            }));
          }
        }
      } catch (err) {
        console.error('Error loading record settings:', err);
      }
    };
    loadRecordSettings();
  }, [churchId]);

  // Handle logo file upload
  const handleLogoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setRecordSettings(prev => ({
        ...prev,
        logo: { ...prev.logo, file }
      }));
    }
  }, [setError]);

  // Handle image upload from preview component
  const handleImageUpload = useCallback(async (type: string, file: File) => {
    if (!churchId) {
      throw new Error('Invalid church ID. Cannot upload image.');
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file');
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', type);

    const response = await fetch(`/api/admin/churches/${churchId}/record-images`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Failed to upload image';
      const responseText = await response.text();

      if (responseText.trim().startsWith('<html') || responseText.trim().startsWith('<!DOCTYPE')) {
        const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1] : 'Internal Server Error';
        errorMessage = `Server error (${response.status}): ${title}. The server is experiencing issues.`;
        console.error('Received HTML error page instead of JSON:', {
          status: response.status,
          statusText: response.statusText,
          htmlTitle: title,
          responsePreview: responseText.substring(0, 300),
        });
      } else {
        try {
          const errorDetails = JSON.parse(responseText);
          errorMessage = errorDetails.message || errorDetails.error || errorDetails.error?.message || errorMessage;
        } catch {
          if (responseText && responseText.trim() && responseText.length < 500) {
            errorMessage = responseText.trim();
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        }
      }

      console.error('Upload error details:', {
        status: response.status,
        statusText: response.statusText,
        responsePreview: responseText.substring(0, 500),
      });

      throw new Error(errorMessage);
    }

    const result = await response.json();
    const imageUrl = result.url || result.path || `/images/records/${churchId}-${type === 'logo' ? 'logo' : type === 'bg' ? 'bg' : type}.png`;

    setRecordSettings(prev => {
      const imageLibrary = prev.imageLibrary || {
        logo: [], omLogo: [], baptism: [], marriage: [], funeral: [], bg: [], g1: [], recordImage: [],
      };
      const currentImages = imageLibrary[type as keyof typeof imageLibrary] || [];
      const updatedImages = [...currentImages, imageUrl];
      const currentImageIndex = prev.currentImageIndex || {
        logo: 0, omLogo: 0, baptism: 0, marriage: 0, funeral: 0, bg: 0, g1: 0, recordImage: 0,
      };

      return {
        ...prev,
        imageLibrary: { ...imageLibrary, [type]: updatedImages },
        currentImageIndex: { ...currentImageIndex, [type]: updatedImages.length - 1 },
        ...(type === 'logo' ? { logo: { ...prev.logo, file } } : {}),
      };
    });

    return imageUrl;
  }, [churchId]);

  // Save record settings
  const handleSaveRecordSettings = useCallback(async () => {
    if (!churchId) {
      setError('Invalid church ID. Please check the URL and ensure you have access to this church.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('settings', JSON.stringify({
        logo: {
          enabled: recordSettings.logo.enabled,
          column: recordSettings.logo.column,
          width: recordSettings.logo.width,
          height: recordSettings.logo.height,
          objectFit: recordSettings.logo.objectFit,
          opacity: recordSettings.logo.opacity,
          order: (recordSettings.logo as any)?.order ?? 0,
          quadrant: recordSettings.logo?.quadrant || 'middle',
          horizontalPosition: recordSettings.logo?.horizontalPosition || 'center',
        },
        calendar: {
          ...recordSettings.calendar,
          order: (recordSettings.calendar as any)?.order ?? 0,
          quadrant: recordSettings.calendar?.quadrant || 'middle',
          horizontalPosition: recordSettings.calendar?.horizontalPosition || 'center',
        },
        omLogo: {
          ...recordSettings.omLogo,
          order: (recordSettings.omLogo as any)?.order ?? 0,
          quadrant: recordSettings.omLogo?.quadrant || 'middle',
          horizontalPosition: recordSettings.omLogo?.horizontalPosition || 'center',
          width: recordSettings.omLogo.width,
          height: recordSettings.omLogo.height,
        },
        headerText: {
          fontFamily: recordSettings.headerText?.fontFamily || 'Arial, sans-serif',
          fontSize: recordSettings.headerText?.fontSize || 16,
          fontWeight: recordSettings.headerText?.fontWeight || 700,
          color: recordSettings.headerText?.color || '#4C1D95',
          column: recordSettings.headerText?.column || 1,
          order: (recordSettings.headerText as any)?.order ?? 0,
          position: recordSettings.headerText?.position || 'above',
          quadrant: recordSettings.headerText?.quadrant || 'middle',
          horizontalPosition: recordSettings.headerText?.horizontalPosition || 'center',
        },
        recordImages: {
          column: recordSettings.recordImages?.column || 1,
          order: (recordSettings.recordImages as any)?.order ?? 0,
          quadrant: recordSettings.recordImages?.quadrant || 'middle',
          horizontalPosition: recordSettings.recordImages?.horizontalPosition || 'center',
          width: recordSettings.recordImages?.width || 60,
          height: recordSettings.recordImages?.height || 60,
        },
        backgroundImage: {
          enabled: recordSettings.backgroundImage?.enabled ?? true,
          column: recordSettings.backgroundImage?.column ?? 0,
          order: (recordSettings.backgroundImage as any)?.order ?? 0,
          quadrant: recordSettings.backgroundImage?.quadrant || 'middle',
        },
        g1Image: {
          enabled: recordSettings.g1Image?.enabled ?? true,
          column: recordSettings.g1Image?.column ?? 0,
          order: (recordSettings.g1Image as any)?.order ?? 0,
          quadrant: recordSettings.g1Image?.quadrant || 'middle',
        },
        imageLibrary: recordSettings.imageLibrary || {},
        currentImageIndex: recordSettings.currentImageIndex || {},
      }));

      if (recordSettings.logo.file) {
        formData.append('logo', recordSettings.logo.file);
      }

      const response = await fetchWithChurchContext(`/api/admin/churches/${churchId}/record-settings`, {
        churchId,
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json();
      setSuccess('Record settings saved successfully!');

      // Reload settings to ensure preview is updated
      try {
        const reloadRes = await fetch(`/api/admin/churches/${churchId}/record-settings`, {
          credentials: 'include',
          cache: 'no-cache',
        });
        if (reloadRes.ok) {
          const data = await reloadRes.json();
          if (data.settings) {
            setRecordSettings(prev => ({
              ...prev,
              ...safeObj(data.settings),
              logo: { ...prev.logo, ...safeObj(data.settings.logo) },
              calendar: { ...prev.calendar, ...safeObj(data.settings.calendar) },
              omLogo: { ...prev.omLogo, ...safeObj(data.settings.omLogo) },
              headerText: {
                fontFamily: 'Arial, sans-serif', fontSize: 16, fontWeight: 700, color: '#4C1D95',
                ...safeObj(data.settings.headerText),
                column: data.settings.headerText?.column ?? 1,
              },
              recordImages: {
                column: data.settings.recordImages?.column ?? 1,
                quadrant: data.settings.recordImages?.quadrant || 'middle',
                horizontalPosition: data.settings.recordImages?.horizontalPosition || 'center',
                width: data.settings.recordImages?.width ?? 160,
                height: data.settings.recordImages?.height ?? 160,
              },
              backgroundImage: {
                enabled: data.settings.backgroundImage?.enabled ?? true,
                column: data.settings.backgroundImage?.column ?? 0,
                images: data.settings.backgroundImage?.images || [],
                currentIndex: data.settings.backgroundImage?.currentIndex ?? 0,
                quadrant: data.settings.backgroundImage?.quadrant || 'middle',
              },
              g1Image: {
                enabled: data.settings.g1Image?.enabled ?? true,
                column: data.settings.g1Image?.column ?? 0,
                images: data.settings.g1Image?.images || [],
                currentIndex: data.settings.g1Image?.currentIndex ?? 0,
                quadrant: data.settings.g1Image?.quadrant || 'middle',
              },
              imageLibrary: {
                logo: data.settings.imageLibrary?.logo || [],
                omLogo: data.settings.imageLibrary?.omLogo || [],
                baptism: data.settings.imageLibrary?.baptism || [],
                marriage: data.settings.imageLibrary?.marriage || [],
                funeral: data.settings.imageLibrary?.funeral || [],
                bg: data.settings.imageLibrary?.bg || [],
                g1: data.settings.imageLibrary?.g1 || [],
                recordImage: data.settings.imageLibrary?.recordImage || [],
              },
              currentImageIndex: {
                logo: data.settings.currentImageIndex?.logo ?? 0,
                omLogo: data.settings.currentImageIndex?.omLogo ?? 0,
                baptism: data.settings.currentImageIndex?.baptism ?? 0,
                marriage: data.settings.currentImageIndex?.marriage ?? 0,
                funeral: data.settings.currentImageIndex?.funeral ?? 0,
                bg: data.settings.currentImageIndex?.bg ?? 0,
                g1: data.settings.currentImageIndex?.g1 ?? 0,
                recordImage: data.settings.currentImageIndex?.recordImage ?? 0,
              },
            }));
          }
        }
      } catch (err) {
        console.error('Error reloading record settings:', err);
      }

      // Notify other pages
      window.dispatchEvent(new CustomEvent('recordSettingsUpdated', {
        detail: { churchId, timestamp: Date.now() }
      }));

      // Clear file from state after successful save
      if (recordSettings.logo.file) {
        setRecordSettings(prev => ({
          ...prev,
          logo: { ...prev.logo, file: null }
        }));
      }
    } catch (err: any) {
      console.error('Error saving record settings:', err);
      setError(err?.message || 'Failed to save record settings');
    } finally {
      setSaving(false);
    }
  }, [churchId, recordSettings, setError, setSuccess, setSaving]);

  // Reset to defaults
  const handleResetDefaults = useCallback(() => {
    if (!window.confirm('Are you sure you want to reset the header display to default settings? This will clear all customizations.')) {
      return;
    }

    setRecordSettings({
      ...DEFAULT_RECORD_SETTINGS,
      logo: { ...DEFAULT_RECORD_SETTINGS.logo },
      calendar: { ...DEFAULT_RECORD_SETTINGS.calendar },
      omLogo: { ...DEFAULT_RECORD_SETTINGS.omLogo },
      headerText: { ...DEFAULT_RECORD_SETTINGS.headerText },
      recordImages: { ...DEFAULT_RECORD_SETTINGS.recordImages },
      backgroundImage: { ...DEFAULT_RECORD_SETTINGS.backgroundImage, images: [], currentIndex: 0 },
      g1Image: { ...DEFAULT_RECORD_SETTINGS.g1Image, images: [], currentIndex: 0 },
      imageLibrary: { ...DEFAULT_RECORD_SETTINGS.imageLibrary },
      currentImageIndex: { ...DEFAULT_RECORD_SETTINGS.currentImageIndex },
    });

    setSuccess('Header display reset to default settings. Click "Save Record Settings" to apply changes.');
    setError(null);
  }, [setError, setSuccess]);

  return {
    recordSettings,
    setRecordSettings,
    handleLogoUpload,
    handleImageUpload,
    handleSaveRecordSettings,
    handleResetDefaults,
  };
}
