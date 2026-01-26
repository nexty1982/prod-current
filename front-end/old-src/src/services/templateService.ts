// Template Service for API calls
class TemplateService {
  private baseURL = '/api/templates';

  async getAllTemplates(churchId?: number, includeGlobal: boolean = true) {
    const params = new URLSearchParams({ includeFields: 'true' });
    if (churchId) {
      params.append('churchId', churchId.toString());
    }
    params.append('includeGlobal', includeGlobal.toString());

    const response = await fetch(`${this.baseURL}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async getTemplatesByType(recordType: string, churchId?: number, includeGlobal: boolean = true) {
    const params = new URLSearchParams({ includeFields: 'true' });
    if (churchId) {
      params.append('churchId', churchId.toString());
    }
    params.append('includeGlobal', includeGlobal.toString());

    const response = await fetch(`${this.baseURL}/type/${recordType}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch templates by type: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async getTemplateByName(name: string, churchId?: number) {
    const params = new URLSearchParams();
    if (churchId) {
      params.append('churchId', churchId.toString());
    }

    const url = `${this.baseURL}/${name}${params.toString() ? '?' + params : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async getTemplatesForChurch(churchId: number) {
    const response = await fetch(`${this.baseURL}/church/${churchId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch church templates: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async getGlobalTemplates() {
    const response = await fetch(`${this.baseURL}/global/available`);
    if (!response.ok) {
      throw new Error(`Failed to fetch global templates: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async duplicateGlobalTemplate(globalTemplateName: string, churchId: number, newName: string, options?: object) {
    const response = await fetch(`${this.baseURL}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        globalTemplateName,
        churchId,
        newName,
        options: options || {}
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to duplicate template: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async createTemplate(templateData: {
    templateName: string;
    fields: Array<{ field: string; label: string; type: string }>;
    churchId?: number;
    options?: {
      recordType?: string;
      description?: string;
      gridType?: string;
      theme?: string;
      layoutType?: string;
      languageSupport?: object;
      isEditable?: boolean;
      isGlobal?: boolean;
    };
  }) {
    const requestData = {
      ...templateData,
      ...(templateData.churchId && { churchId: templateData.churchId })
    };

    const response = await fetch(`${this.baseURL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to create template: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async updateTemplate(
    templateName: string,
    updates: {
      fields?: Array<{ field: string; label: string; type: string }>;
      description?: string;
      gridType?: string;
      theme?: string;
      layoutType?: string;
      languageSupport?: object;
      isEditable?: boolean;
    },
    churchId?: number
  ) {
    const requestData = {
      ...updates,
      ...(churchId && { churchId })
    };

    const response = await fetch(`${this.baseURL}/${templateName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update template: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async deleteTemplate(templateName: string, churchId?: number) {
    const response = await fetch(`${this.baseURL}/${templateName}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        ...(churchId && { churchId })
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to delete template: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  async syncTemplates() {
    const response = await fetch(`${this.baseURL}/sync`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to sync templates: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  async analyzeTemplate(filename: string) {
    const response = await fetch(`${this.baseURL}/analyze/${filename}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to analyze template: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getPredefinedTemplates() {
    const response = await fetch(`${this.baseURL}/predefined/definitions`);
    if (!response.ok) {
      throw new Error(`Failed to fetch predefined templates: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async initializePredefinedTemplates() {
    const response = await fetch(`${this.baseURL}/predefined/initialize`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to initialize predefined templates: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  async validateTemplate(templateData: {
    templateName: string;
    fields: Array<{ field: string; label: string; type: string }>;
  }) {
    const response = await fetch(`${this.baseURL}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate template: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to upload file: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getRecordTypes() {
    const response = await fetch(`${this.baseURL}/types/record-types`);
    if (!response.ok) {
      throw new Error(`Failed to fetch record types: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  async initializeDatabase() {
    const response = await fetch(`${this.baseURL}/initialize-db`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to initialize database: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }
}

export const templateService = new TemplateService();
