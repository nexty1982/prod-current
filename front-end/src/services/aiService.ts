// AI Services API Integration for Orthodox Metrics Admin
import { APIConfig } from '../api/config';

export interface AIContentRequest {
    content_type: 'documentation' | 'report' | 'newsletter' | 'announcement' | 'admin_guide';
    context: string;
    language?: string;
    church_context?: string;
    target_audience?: string;
}

export interface AITranslationRequest {
    text: string;
    source_language?: string;
    target_language: string;
    preserve_formatting?: boolean;
}

export interface AIOCRRequest {
    image_url?: string;
    language?: string;
    enhancement?: boolean;
    output_format?: 'text' | 'structured' | 'json';
}

export interface AIAnalyticsRequest {
    data_source: string;
    analysis_type: 'trends' | 'anomalies' | 'predictions' | 'insights';
    time_range?: string;
    metrics?: string[];
}

export interface AIContentResponse {
    content: string;
    metadata: {
        word_count: number;
        estimated_reading_time: number;
        content_type: string;
        generated_at: string;
    };
    suggestions?: string[];
}

export interface AITranslationResponse {
    translated_text: string;
    confidence_score: number;
    detected_language?: string;
    quality_assessment: {
        fluency: number;
        accuracy: number;
        cultural_appropriateness: number;
    };
}

export interface AIOCRResponse {
    extracted_text: string;
    confidence: number;
    structure?: {
        sections: Array<{
            type: string;
            content: string;
            confidence: number;
        }>;
    };
    detected_language?: string;
}

export interface AIAnalyticsResponse {
    insights: Array<{
        type: string;
        title: string;
        description: string;
        confidence: number;
        actionable: boolean;
        recommendations?: string[];
    }>;
    visualizations?: Array<{
        type: 'chart' | 'graph' | 'heatmap';
        data: any;
        config: any;
    }>;
}

class AIService {
    private baseURL: string;

    constructor() {
        this.baseURL = process.env.REACT_APP_AI_API_URL || 'http://localhost:8001';
    }

    // Content Generation
    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
        const response = await fetch(`${this.baseURL}/api/content/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`AI Content Generation failed: ${response.statusText}`);
        }

        return response.json();
    }

    // Translation
    async translateText(request: AITranslationRequest): Promise<AITranslationResponse> {
        const response = await fetch(`${this.baseURL}/api/translation/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`AI Translation failed: ${response.statusText}`);
        }

        return response.json();
    }

    // OCR Processing
    async processOCR(file: File, request: Partial<AIOCRRequest> = {}): Promise<AIOCRResponse> {
        const formData = new FormData();
        formData.append('file', file);

        // Add other parameters
        Object.entries(request).forEach(([key, value]) => {
            if (value !== undefined) {
                formData.append(key, value.toString());
            }
        });

        const response = await fetch(`${this.baseURL}/api/ocr/process`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`AI OCR Processing failed: ${response.statusText}`);
        }

        return response.json();
    }

    // Analytics & Insights
    async generateAnalytics(request: AIAnalyticsRequest): Promise<AIAnalyticsResponse> {
        const response = await fetch(`${this.baseURL}/api/analytics/insights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`AI Analytics failed: ${response.statusText}`);
        }

        return response.json();
    }

    // Admin-specific AI features
    async generateAdminReport(type: 'system_health' | 'user_activity' | 'performance' | 'security'): Promise<AIContentResponse> {
        return this.generateContent({
            content_type: 'report',
            context: `Generate a comprehensive ${type} report for Orthodox Metrics admin dashboard`,
            target_audience: 'admin',
        });
    }

    async generateUserGuide(feature: string): Promise<AIContentResponse> {
        return this.generateContent({
            content_type: 'admin_guide',
            context: `Create a user guide for the ${feature} feature in Orthodox Metrics`,
            target_audience: 'church_administrators',
        });
    }

    async analyzeSystemLogs(logData: string): Promise<AIAnalyticsResponse> {
        return this.generateAnalytics({
            data_source: 'system_logs',
            analysis_type: 'anomalies',
            metrics: ['error_rate', 'response_time', 'user_activity'],
        });
    }

    async translateAdminInterface(language: string): Promise<Record<string, string>> {
        const adminTexts = [
            'User Management',
            'System Settings',
            'Church Records',
            'Analytics Dashboard',
            'Security Settings',
            'Backup & Recovery',
            'Notifications',
            'Performance Monitoring',
        ];

        const translations: Record<string, string> = {};

        for (const text of adminTexts) {
            const result = await this.translateText({
                text,
                target_language: language,
                preserve_formatting: true,
            });
            translations[text] = result.translated_text;
        }

        return translations;
    }

    // Health check
    async healthCheck(): Promise<{ status: string; version: string; services: Record<string, boolean> }> {
        const response = await fetch(`${this.baseURL}/health`);

        if (!response.ok) {
            throw new Error('AI Service unavailable');
        }

        return response.json();
    }
}

export const aiService = new AIService();
export default aiService;
