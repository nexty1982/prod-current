/**
 * OrthodoxMetrics Internationalization Context & Provider
 * Multi-language support for EN, GR, RU, RO
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { SupportedLanguage, TranslationKey, Translations } from '../types/orthodox-metrics.types';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
  availableLanguages: Array<{
    code: SupportedLanguage;
    name: string;
    nativeName: string;
    flag: string;
  }>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: SupportedLanguage;
}

// Available languages configuration
const AVAILABLE_LANGUAGES = [
  {
    code: 'en' as SupportedLanguage,
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
  },
  {
    code: 'gr' as SupportedLanguage,
    name: 'Greek',
    nativeName: 'Ελληνικά',
    flag: '🇬🇷',
  },
  {
    code: 'ru' as SupportedLanguage,
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
  },
  {
    code: 'ro' as SupportedLanguage,
    name: 'Romanian',
    nativeName: 'Română',
    flag: '🇷🇴',
  },
];

export const I18nProvider: React.FC<I18nProviderProps> = ({ 
  children, 
  defaultLanguage = 'en' 
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(defaultLanguage);
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    const initializeLanguage = () => {
      // Try to get language from localStorage
      const storedLanguage = localStorage.getItem('orthodox_metrics_language') as SupportedLanguage;
      
      if (storedLanguage && AVAILABLE_LANGUAGES.some(lang => lang.code === storedLanguage)) {
        setLanguageState(storedLanguage);
        return storedLanguage;
      }

      // Try to get language from browser
      const browserLanguage = navigator.language.split('-')[0] as SupportedLanguage;
      if (AVAILABLE_LANGUAGES.some(lang => lang.code === browserLanguage)) {
        setLanguageState(browserLanguage);
        return browserLanguage;
      }

      // Fallback to default
      setLanguageState(defaultLanguage);
      return defaultLanguage;
    };

    const initialLanguage = initializeLanguage();
    loadTranslations(initialLanguage);
  }, [defaultLanguage]);

  // Load translations for a specific language
  const loadTranslations = async (lang: SupportedLanguage) => {
    setIsLoading(true);
    
    try {
      // In a real implementation, you might load from an API
      // For now, we'll use static imports or embedded translations
      const translationData = await getTranslationsForLanguage(lang);
      
      setTranslations(prev => ({
        ...prev,
        [lang]: translationData,
      }));
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      
      // Fallback to English if not already English
      if (lang !== 'en') {
        const englishTranslations = await getTranslationsForLanguage('en');
        setTranslations(prev => ({
          ...prev,
          en: englishTranslations,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Set language and persist to localStorage
  const setLanguage = async (newLanguage: SupportedLanguage) => {
    if (newLanguage === language) return;
    
    setLanguageState(newLanguage);
    localStorage.setItem('orthodox_metrics_language', newLanguage);
    
    // Load translations if not already loaded
    if (!translations[newLanguage]) {
      await loadTranslations(newLanguage);
    }
  };

  // Translation function with parameter substitution
  const t = (key: string, params?: Record<string, string | number>): string => {
    const currentTranslations = translations[language] || translations.en || {};
    
    // Navigate through nested keys (e.g., "auth.login.title")
    const keys = key.split('.');
    let value: any = currentTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Key not found, return the key itself as fallback
        console.warn(`Translation key "${key}" not found for language "${language}"`);
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation key "${key}" does not resolve to a string`);
      return key;
    }
    
    // Parameter substitution
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }
    
    return value;
  };

  const contextValue: I18nContextType = {
    language,
    setLanguage,
    t,
    isLoading,
    availableLanguages: AVAILABLE_LANGUAGES,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Hook for translations (shorter alias)
export const useTranslation = () => {
  const { t, language, setLanguage } = useI18n();
  return { t, language, setLanguage };
};

// Function to get translations for a language
async function getTranslationsForLanguage(language: SupportedLanguage): Promise<TranslationKey> {
  // This would typically load from an API or import JSON files
  // For now, we'll return embedded translations
  const translations: Record<SupportedLanguage, TranslationKey> = {
    en: {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        submit: 'Submit',
        reset: 'Reset',
        clear: 'Clear',
        all: 'All',
        none: 'None',
        select: 'Select',
        upload: 'Upload',
        download: 'Download',
        export: 'Export',
        import: 'Import',
        print: 'Print',
        refresh: 'Refresh',
        filter: 'Filter',
        sort: 'Sort',
        view: 'View',
        actions: 'Actions',
        date: 'Date',
        time: 'Time',
        name: 'Name',
        email: 'Email',
        phone: 'Phone',
        address: 'Address',
        status: 'Status',
        active: 'Active',
        inactive: 'Inactive',
        enabled: 'Enabled',
        disabled: 'Disabled',
        required: 'Required',
        optional: 'Optional',
        total: 'Total',
        count: 'Count',
        page: 'Page',
        of: 'of',
        items: 'items',
        records: 'records',
      },
      auth: {
        signIn: 'Sign In',
        signOut: 'Sign Out',
        username: 'Username',
        password: 'Password',
        rememberMe: 'Remember Me',
        forgotPassword: 'Forgot Password?',
        resetPassword: 'Reset Password',
        welcome: 'Welcome',
        welcomeBack: 'Welcome Back',
        loginRequired: 'Please sign in to continue',
        invalidCredentials: 'Invalid username or password',
        sessionExpired: 'Your session has expired. Please sign in again.',
        accessDenied: 'Access Denied',
        insufficientPermissions: 'You do not have permission to access this resource',
      },
      navigation: {
        dashboard: 'Dashboard',
        calendar: 'Liturgical Calendar',
        churches: 'Churches',
        records: 'Records',
        baptism: 'Baptism',
        marriage: 'Marriage',
        funeral: 'Funeral',
        invoices: 'Invoices',
        ocr: 'OCR Upload',
        provisioning: 'Provisioning',
        admin: 'Administration',
        settings: 'Settings',
        profile: 'Profile',
        help: 'Help',
        about: 'About',
      },
      calendar: {
        title: 'Orthodox Liturgical Calendar',
        feast: 'Feast',
        saint: 'Saint',
        fasting: 'Fasting',
        today: 'Today',
        month: 'Month',
        year: 'Year',
        day: 'Day',
        tone: 'Tone',
        season: 'Season',
        readings: 'Readings',
        events: 'Events',
        calendarType: 'Calendar Type',
        julian: 'Julian',
        revisedJulian: 'Revised Julian',
        gregorian: 'Gregorian',
        liturgicalColor: 'Liturgical Color',
        fastingPeriod: 'Fasting Period',
        movableFeast: 'Movable Feast',
        fixedFeast: 'Fixed Feast',
      },
      churches: {
        title: 'Church Management',
        churchName: 'Church Name',
        contactName: 'Contact Name',
        contactEmail: 'Contact Email',
        contactPhone: 'Contact Phone',
        address: 'Address',
        diocese: 'Diocese',
        priestName: 'Priest Name',
        memberCount: 'Member Count',
        establishedDate: 'Established Date',
        website: 'Website',
        preferredLanguage: 'Preferred Language',
        uploadCapacity: 'Upload Capacity (MB)',
        siteUrl: 'Site URL',
        approve: 'Approve',
        suspend: 'Suspend',
        activate: 'Activate',
        pending: 'Pending',
        approved: 'Approved',
        suspended: 'Suspended',
        rejected: 'Rejected',
      },
      invoices: {
        title: 'Invoice Management',
        invoiceNumber: 'Invoice Number',
        amount: 'Amount',
        currency: 'Currency',
        status: 'Status',
        issueDate: 'Issue Date',
        dueDate: 'Due Date',
        paidDate: 'Paid Date',
        description: 'Description',
        items: 'Items',
        quantity: 'Quantity',
        unitPrice: 'Unit Price',
        totalPrice: 'Total Price',
        category: 'Category',
        notes: 'Notes',
        generatePDF: 'Generate PDF',
        sendEmail: 'Send Email',
        markPaid: 'Mark as Paid',
        draft: 'Draft',
        pending: 'Pending',
        paid: 'Paid',
        overdue: 'Overdue',
        cancelled: 'Cancelled',
      },
      ocr: {
        title: 'OCR Document Processing',
        upload: 'Upload Document',
        dragDrop: 'Drag and drop files here, or click to select',
        selectLanguage: 'Select Language',
        processing: 'Processing...',
        completed: 'Completed',
        failed: 'Failed',
        retry: 'Retry',
        extractedText: 'Extracted Text',
        extractedData: 'Extracted Data',
        confidence: 'Confidence',
        barcode: 'Barcode',
        generateBarcode: 'Generate Barcode',
        scanBarcode: 'Scan Barcode',
        processingTime: 'Processing Time',
        fileSize: 'File Size',
        fileType: 'File Type',
        exportResults: 'Export Results',
        sendResults: 'Email Results',
      },
      provisioning: {
        title: 'Church Provisioning',
        queue: 'Provisioning Queue',
        request: 'Provision Request',
        stage: 'Stage',
        priority: 'Priority',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        urgent: 'Urgent',
        underReview: 'Under Review',
        provisioning: 'Provisioning',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled',
        logs: 'Logs',
        review: 'Review',
        approve: 'Approve',
        reject: 'Reject',
        start: 'Start',
        cancel: 'Cancel',
        retry: 'Retry',
        estimatedMembers: 'Estimated Members',
        churchSlug: 'Church Slug',
        adminEmail: 'Admin Email',
        adminPassword: 'Admin Password',
      },
      dashboard: {
        title: 'Dashboard',
        overview: 'Overview',
        metrics: 'Metrics',
        activity: 'Recent Activity',
        statistics: 'Statistics',
        totalChurches: 'Total Churches',
        activeChurches: 'Active Churches',
        totalRecords: 'Total Records',
        recentActivity: 'Recent Activity',
        ocrStats: 'OCR Statistics',
        invoiceStats: 'Invoice Statistics',
        provisioningStats: 'Provisioning Statistics',
      },
      records: {
        baptism: {
          title: 'Baptism Records',
          childName: 'Child Name',
          childBirthDate: 'Child Birth Date',
          baptismDate: 'Baptism Date',
          fatherName: 'Father Name',
          motherName: 'Mother Name',
          godfatherName: 'Godfather Name',
          godmotherName: 'Godmother Name',
          priestName: 'Priest Name',
          location: 'Location',
        },
        marriage: {
          title: 'Marriage Records',
          groomName: 'Groom Name',
          brideName: 'Bride Name',
          marriageDate: 'Marriage Date',
          groomBirthDate: 'Groom Birth Date',
          brideBirthDate: 'Bride Birth Date',
          groomFatherName: 'Groom Father Name',
          groomMotherName: 'Groom Mother Name',
          brideFatherName: 'Bride Father Name',
          brideMotherName: 'Bride Mother Name',
          witness1Name: 'Witness 1 Name',
          witness2Name: 'Witness 2 Name',
          priestName: 'Priest Name',
          location: 'Location',
        },
        funeral: {
          title: 'Funeral Records',
          deceasedName: 'Deceased Name',
          deathDate: 'Death Date',
          funeralDate: 'Funeral Date',
          birthDate: 'Birth Date',
          fatherName: 'Father Name',
          motherName: 'Mother Name',
          spouseName: 'Spouse Name',
          priestName: 'Priest Name',
          location: 'Location',
          causeOfDeath: 'Cause of Death',
        },
      },
      errors: {
        general: 'An error occurred. Please try again.',
        network: 'Network error. Please check your connection.',
        unauthorized: 'You are not authorized to perform this action.',
        forbidden: 'Access forbidden.',
        notFound: 'Resource not found.',
        validation: 'Please check your input and try again.',
        timeout: 'Request timeout. Please try again.',
        serverError: 'Server error. Please try again later.',
      },
      validation: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a valid phone number',
        url: 'Please enter a valid URL',
        minLength: 'Must be at least {{min}} characters',
        maxLength: 'Must be no more than {{max}} characters',
        pattern: 'Invalid format',
        numeric: 'Must be a number',
        positive: 'Must be a positive number',
        dateFormat: 'Please enter a valid date',
        pastDate: 'Date must be in the past',
        futureDate: 'Date must be in the future',
      },
    },
    gr: {
      common: {
        save: 'Αποθήκευση',
        cancel: 'Ακύρωση',
        delete: 'Διαγραφή',
        edit: 'Επεξεργασία',
        create: 'Δημιουργία',
        search: 'Αναζήτηση',
        loading: 'Φόρτωση...',
        // ... Add more Greek translations
      },
      auth: {
        signIn: 'Σύνδεση',
        signOut: 'Αποσύνδεση',
        username: 'Όνομα χρήστη',
        password: 'Κωδικός',
        // ... Add more Greek translations
      },
      // ... Add more Greek sections
    },
    ru: {
      common: {
        save: 'Сохранить',
        cancel: 'Отмена',
        delete: 'Удалить',
        edit: 'Редактировать',
        create: 'Создать',
        search: 'Поиск',
        loading: 'Загрузка...',
        // ... Add more Russian translations
      },
      auth: {
        signIn: 'Войти',
        signOut: 'Выйти',
        username: 'Имя пользователя',
        password: 'Пароль',
        // ... Add more Russian translations
      },
      // ... Add more Russian sections
    },
    ro: {
      common: {
        save: 'Salvează',
        cancel: 'Anulează',
        delete: 'Șterge',
        edit: 'Editează',
        create: 'Creează',
        search: 'Caută',
        loading: 'Se încarcă...',
        // ... Add more Romanian translations
      },
      auth: {
        signIn: 'Conectare',
        signOut: 'Deconectare',
        username: 'Nume utilizator',
        password: 'Parolă',
        // ... Add more Romanian translations
      },
      // ... Add more Romanian sections
    },
  };

  return translations[language] || translations.en;
}

export default I18nProvider;
