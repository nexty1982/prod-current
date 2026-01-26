// server/services/templateService.js
const fs = require('fs');
const path = require('path');
const { promisePool } = require('../config/db');

/**
 * Service for managing record templates
 */
class TemplateService {
  
  /**
   * Generate a React component file from template data
   * @param {string} templateName - Name of the template (e.g., "BaptismRecords")
   * @param {Array} fields - Array of field definitions
   * @param {Object} options - Additional options for template generation
   * @returns {Promise<string>} - Path to the generated file
   */
  static async generateTemplate(templateName, fields, options = {}) {
    try {
      // Validate inputs
      if (!templateName || !fields || !Array.isArray(fields)) {
        throw new Error('Invalid template name or fields provided');
      }

      // Generate column definitions
      const columns = fields.map(f => 
        `    { headerName: '${f.label}', field: '${f.field}', sortable: true, filter: true }`
      ).join(',\n');

      // Generate the React component content
      const content = `import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const ${templateName} = () => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = [
${columns}
  ];

  const defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    flex: 1,
    minWidth: 100
  };

  const gridOptions = {
    defaultColDef,
    enableRangeSelection: true,
    enableClipboard: true,
    suppressRowClickSelection: true,
    rowSelection: 'multiple',
    animateRows: true,
    pagination: true,
    paginationPageSize: 50
  };

  // TODO: Implement data loading from API
  useEffect(() => {
    // loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Implementation for loading data from your API
      // const response = await fetch('/api/${templateName.toLowerCase()}');
      // const data = await response.json();
      // setRowData(data);
    } catch (error) {
      console.error('Error loading ${templateName} data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="template-container" style={{ height: '100%', width: '100%' }}>
      <div className="template-header" style={{ marginBottom: '20px' }}>
        <h2>${templateName.replace(/([A-Z])/g, ' $1').trim()}</h2>
        <div className="template-actions">
          <button 
            onClick={loadData} 
            disabled={loading}
            style={{ 
              marginRight: '10px', 
              padding: '8px 16px', 
              backgroundColor: '#1976d2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
        </div>
      </div>
      
      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact 
          rowData={rowData} 
          columnDefs={columnDefs}
          gridOptions={gridOptions}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default ${templateName};
`;

      // Ensure the records directory exists
      const recordsDir = path.resolve(__dirname, '../../front-end/src/views/records');
      if (!fs.existsSync(recordsDir)) {
        fs.mkdirSync(recordsDir, { recursive: true });
      }

      // Write the file
      const filePath = path.resolve(recordsDir, `${templateName}.tsx`);
      fs.writeFileSync(filePath, content, 'utf-8');

      // Save template metadata to database
      await this.saveTemplateToDatabase(templateName, fields, filePath, options);

      return filePath;
    } catch (error) {
      console.error('Error generating template:', error);
      throw error;
    }
  }

  /**
   * Save template metadata to database
   * @param {string} name - Template name
   * @param {Array} fields - Field definitions
   * @param {string} filePath - Path to generated file (used for validation only)
   * @param {Object} options - Additional template options
   */
  static async saveTemplateToDatabase(name, fields, filePath, options = {}) {
    try {
      // Generate slug from name
      const slug = name.toLowerCase().replace(/([A-Z])/g, '-$1').replace(/^-/, '').replace(/records$/, '-records');
      
      // Determine record type from name or options
      const recordType = options.recordType || this.determineRecordType(name);
      
      const query = `
        INSERT INTO templates (
          name, slug, record_type, description, fields, 
          grid_type, theme, layout_type, language_support, 
          is_editable, created_by, church_id, is_global
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        fields = VALUES(fields), 
        description = VALUES(description),
        grid_type = VALUES(grid_type),
        theme = VALUES(theme),
        layout_type = VALUES(layout_type),
        language_support = VALUES(language_support),
        is_editable = VALUES(is_editable),
        church_id = VALUES(church_id),
        is_global = VALUES(is_global),
        updated_at = NOW()
      `;
      
      await promisePool.execute(query, [
        name,
        slug,
        recordType,
        options.description || `${name.replace(/([A-Z])/g, ' $1').trim()} template`,
        JSON.stringify(fields),
        options.gridType || 'aggrid',
        options.theme || 'liturgicalBlueGold',
        options.layoutType || 'table',
        JSON.stringify(options.languageSupport || { "en": true }),
        options.isEditable !== undefined ? options.isEditable : true,
        options.createdBy || null,
        options.churchId || null,
        options.isGlobal || false
      ]);
    } catch (error) {
      console.error('Error saving template to database:', error);
      throw error;
    }
  }

  /**
   * Get all templates from database (with optional church filtering)
   * @param {number} churchId - Optional church ID to filter by
   * @param {boolean} includeGlobal - Whether to include global templates
   * @returns {Promise<Array>} - Array of templates
   */
  static async getAllTemplates(churchId = null, includeGlobal = true) {
    try {
      let query = `
        SELECT t.id, t.name, t.slug, t.record_type, t.description, t.fields, 
               t.grid_type, t.theme, t.layout_type, t.language_support, t.is_editable,
               t.created_by, t.created_at, t.updated_at, t.church_id, t.is_global,
               c.name as church_name
        FROM templates t
        LEFT JOIN churches c ON t.church_id = c.id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (churchId) {
        if (includeGlobal) {
          query += ` AND (t.church_id = ? OR t.is_global = TRUE)`;
          params.push(churchId);
        } else {
          query += ` AND t.church_id = ?`;
          params.push(churchId);
        }
      } else if (!includeGlobal) {
        query += ` AND t.is_global = FALSE`;
      }
      
      query += ` ORDER BY t.is_global DESC, t.created_at DESC`;
      
      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        // Calculate expected file path
        const filePath = require('path').resolve(__dirname, `../../front-end/src/views/records/${row.name}.tsx`);
        
        return {
          ...row,
          fields: JSON.parse(row.fields),
          languageSupport: row.language_support ? JSON.parse(row.language_support) : { "en": true },
          filePath, // Add calculated file path
          exists: require('fs').existsSync(filePath),
          scope: row.is_global ? 'Global' : (row.church_name || 'Unknown Church')
        };
      });
    } catch (error) {
      console.error('Error getting templates:', error);
      throw error;
    }
  }

  /**
   * Get a specific template by name (with optional church filtering)
   * @param {string} name - Template name
   * @param {number} churchId - Optional church ID to filter by
   * @returns {Promise<Object>} - Template data
   */
  static async getTemplateByName(name, churchId = null) {
    try {
      let query = `
        SELECT t.id, t.name, t.slug, t.record_type, t.description, t.fields,
               t.grid_type, t.theme, t.layout_type, t.language_support, t.is_editable,
               t.created_by, t.created_at, t.updated_at, t.church_id, t.is_global,
               c.name as church_name
        FROM templates t
        LEFT JOIN churches c ON t.church_id = c.id
        WHERE (t.name = ? OR t.slug = ?)
      `;
      
      const params = [name, name];
      
      if (churchId) {
        query += ` AND (t.church_id = ? OR t.is_global = TRUE)`;
        params.push(churchId);
      }
      
      const [rows] = await promisePool.execute(query, params);
      
      if (rows.length === 0) {
        return null;
      }

      const template = rows[0];
      // Calculate expected file path
      const filePath = path.resolve(__dirname, `../../front-end/src/views/records/${template.name}.tsx`);
      
      return {
        ...template,
        fields: JSON.parse(template.fields),
        languageSupport: template.language_support ? JSON.parse(template.language_support) : { "en": true },
        filePath, // Add calculated file path
        exists: fs.existsSync(filePath),
        scope: template.is_global ? 'Global' : (template.church_name || 'Unknown Church')
      };
    } catch (error) {
      console.error('Error getting template by name:', error);
      throw error;
    }
  }

  /**
   * Delete a template (with church permission check)
   * @param {string} name - Template name
   * @param {number} churchId - Church ID (for permission check)
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteTemplate(name, churchId = null) {
    try {
      // First get the template to find the file path and check permissions
      const template = await this.getTemplateByName(name);
      
      if (!template) {
        throw new Error('Template not found');
      }

      // Check if user has permission to delete this template
      if (template.is_global) {
        throw new Error('Cannot delete global templates');
      }
      
      if (churchId && template.church_id && template.church_id !== churchId) {
        throw new Error('Permission denied: Cannot delete templates from other churches');
      }

      // Delete the file if it exists (using calculated file path)
      const filePath = path.resolve(__dirname, `../../front-end/src/views/records/${name}.tsx`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      let query = `DELETE FROM templates WHERE name = ?`;
      const params = [name];
      
      if (churchId) {
        query += ` AND (church_id = ? OR church_id IS NULL)`;
        params.push(churchId);
      }
      
      await promisePool.execute(query, params);

      return true;
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Validate field structure
   * @param {Array} fields - Array of field definitions
   * @returns {boolean} - Validation result
   */
  static validateFields(fields) {
    if (!Array.isArray(fields) || fields.length === 0) {
      return false;
    }

    return fields.every(field => 
      field && 
      typeof field.field === 'string' && 
      typeof field.label === 'string' &&
      field.field.trim() !== '' &&
      field.label.trim() !== ''
    );
  }

  /**
   * Determine record type from template name
   * @param {string} name - Template name
   * @returns {string} - Record type
   */
  static determineRecordType(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('baptism')) return 'baptism';
    if (nameLower.includes('marriage') || nameLower.includes('wedding')) return 'marriage';
    if (nameLower.includes('funeral') || nameLower.includes('burial')) return 'funeral';
    
    return 'custom';
  }

  /**
   * Get templates by record type (with optional church filtering)
   * @param {string} recordType - Type of record (baptism, marriage, funeral, custom)
   * @param {number} churchId - Optional church ID to filter by
   * @param {boolean} includeGlobal - Whether to include global templates
   * @returns {Promise<Array>} - Array of templates
   */
  static async getTemplatesByType(recordType, churchId = null, includeGlobal = true) {
    try {
      let query = `
        SELECT t.id, t.name, t.slug, t.record_type, t.description, t.fields,
               t.grid_type, t.theme, t.layout_type, t.language_support, t.is_editable,
               t.created_by, t.created_at, t.updated_at, t.church_id, t.is_global,
               c.name as church_name
        FROM templates t
        LEFT JOIN churches c ON t.church_id = c.id
        WHERE t.record_type = ?
      `;
      
      const params = [recordType];
      
      if (churchId) {
        if (includeGlobal) {
          query += ` AND (t.church_id = ? OR t.is_global = TRUE)`;
          params.push(churchId);
        } else {
          query += ` AND t.church_id = ?`;
          params.push(churchId);
        }
      } else if (!includeGlobal) {
        query += ` AND t.is_global = FALSE`;
      }
      
      query += ` ORDER BY t.is_global DESC, t.created_at DESC`;
      
      const [rows] = await promisePool.execute(query, params);
      
      return rows.map(row => {
        // Calculate expected file path
        const filePath = path.resolve(__dirname, `../../front-end/src/views/records/${row.name}.tsx`);
        
        return {
          ...row,
          fields: JSON.parse(row.fields),
          languageSupport: row.language_support ? JSON.parse(row.language_support) : { "en": true },
          filePath, // Add calculated file path
          exists: fs.existsSync(filePath),
          scope: row.is_global ? 'Global' : (row.church_name || 'Unknown Church')
        };
      });
    } catch (error) {
      console.error('Error getting templates by type:', error);
      throw error;
    }
  }

  /**
   * Extract field definitions from existing template file
   * @param {string} filePath - Path to existing .tsx file
   * @returns {Array} - Array of field definitions
   */
  static extractFieldsFromTemplate(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Template file not found: ${filePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract columnDefs array using regex
      const columnDefsMatch = content.match(/const columnDefs = \[([\s\S]*?)\];/);
      
      if (!columnDefsMatch) {
        throw new Error('Could not find columnDefs in template file');
      }

      const columnDefsString = columnDefsMatch[1];
      
      // Parse individual column definitions
      const fieldRegex = /{\s*headerName:\s*['"]([^'"]+)['"]\s*,\s*field:\s*['"]([^'"]+)['"][^}]*}/g;
      const fields = [];
      let match;

      while ((match = fieldRegex.exec(columnDefsString)) !== null) {
        fields.push({
          label: match[1],
          field: match[2],
          type: this.inferFieldType(match[2])
        });
      }

      return fields;
    } catch (error) {
      console.error('Error extracting fields from template:', error);
      throw error;
    }
  }

  /**
   * Infer field type from field name
   * @param {string} fieldName - Field name
   * @returns {string} - Inferred type
   */
  static inferFieldType(fieldName) {
    const fieldLower = fieldName.toLowerCase();
    
    if (fieldLower.includes('date') || fieldLower.includes('_date')) return 'date';
    if (fieldLower.includes('age') || fieldLower.includes('_age')) return 'number';
    if (fieldLower.includes('email')) return 'email';
    if (fieldLower.includes('phone')) return 'phone';
    if (fieldLower.includes('address')) return 'text';
    
    return 'string';
  }

  /**
   * Get predefined template definitions for the three main record types
   * @returns {Object} - Object containing template definitions
   */
  static getPredefinedTemplates() {
    return {
      baptism: {
        name: 'BaptismRecords',
        recordType: 'baptism',
        description: 'Orthodox baptism records with traditional fields',
        fields: [
          { field: 'first_name', label: 'First Name', type: 'string' },
          { field: 'last_name', label: 'Last Name', type: 'string' },
          { field: 'date_of_baptism', label: 'Date of Baptism', type: 'date' },
          { field: 'place_of_baptism', label: 'Place of Baptism', type: 'string' },
          { field: 'priest_name', label: 'Priest', type: 'string' },
          { field: 'godparents', label: 'Godparent(s)', type: 'string' },
          { field: 'date_of_birth', label: 'Date of Birth', type: 'date' },
          { field: 'place_of_birth', label: 'Place of Birth', type: 'string' },
          { field: 'father_name', label: 'Father\'s Name', type: 'string' },
          { field: 'mother_name', label: 'Mother\'s Name', type: 'string' }
        ]
      },
      marriage: {
        name: 'MarriageRecords',
        recordType: 'marriage',
        description: 'Orthodox marriage records with traditional fields',
        fields: [
          { field: 'groom_name', label: 'Groom Name', type: 'string' },
          { field: 'bride_name', label: 'Bride Name', type: 'string' },
          { field: 'marriage_date', label: 'Marriage Date', type: 'date' },
          { field: 'place_of_marriage', label: 'Place of Marriage', type: 'string' },
          { field: 'priest_name', label: 'Priest', type: 'string' },
          { field: 'best_man', label: 'Best Man', type: 'string' },
          { field: 'maid_of_honor', label: 'Maid of Honor', type: 'string' },
          { field: 'groom_father', label: 'Groom\'s Father', type: 'string' },
          { field: 'groom_mother', label: 'Groom\'s Mother', type: 'string' },
          { field: 'bride_father', label: 'Bride\'s Father', type: 'string' },
          { field: 'bride_mother', label: 'Bride\'s Mother', type: 'string' },
          { field: 'witnesses', label: 'Witnesses', type: 'string' }
        ]
      },
      funeral: {
        name: 'FuneralRecords',
        recordType: 'funeral',
        description: 'Orthodox funeral records with traditional fields',
        fields: [
          { field: 'deceased_name', label: 'Deceased Name', type: 'string' },
          { field: 'death_date', label: 'Date of Death', type: 'date' },
          { field: 'funeral_date', label: 'Date of Funeral', type: 'date' },
          { field: 'place_of_death', label: 'Place of Death', type: 'string' },
          { field: 'burial_site', label: 'Burial Location', type: 'string' },
          { field: 'priest_name', label: 'Priest', type: 'string' },
          { field: 'age_at_death', label: 'Age at Death', type: 'number' },
          { field: 'cause_of_death', label: 'Cause of Death', type: 'string' },
          { field: 'spouse_name', label: 'Spouse Name', type: 'string' },
          { field: 'father_name', label: 'Father\'s Name', type: 'string' },
          { field: 'mother_name', label: 'Mother\'s Name', type: 'string' },
          { field: 'cemetery_name', label: 'Cemetery', type: 'string' }
        ]
      }
    };
  }

  /**
   * Initialize database with predefined templates
   */
  static async initializePredefinedTemplates() {
    try {
      const templates = this.getPredefinedTemplates();
      
      for (const [key, template] of Object.entries(templates)) {
        const existingTemplate = await this.getTemplateByName(template.name);
        
        if (!existingTemplate) {
          console.log(`Creating predefined template: ${template.name}`);
          
          // Generate the template file
          const filePath = await this.generateTemplate(template.name, template.fields, {
            recordType: template.recordType,
            description: template.description,
            isEditable: false, // Mark predefined templates as non-editable
            isGlobal: true // Make predefined templates global
          });
          
          console.log(`Successfully created template: ${template.name} at ${filePath}`);
        } else {
          console.log(`Template ${template.name} already exists, skipping...`);
        }
      }
    } catch (error) {
      console.error('Error initializing predefined templates:', error);
      throw error;
    }
  }

  /**
   * Update predefined template definition (for superadmin global template editing)
   * @param {string} recordType - The record type (baptism, marriage, funeral)
   * @param {Object} templateData - New template configuration
   */
  static async updatePredefinedTemplate(recordType, templateData) {
    try {
      // This updates the in-memory predefined templates
      // In a production system, this would be stored in a configuration database
      
      const validTypes = ['baptism', 'marriage', 'funeral'];
      if (!validTypes.includes(recordType)) {
        throw new Error(`Invalid record type: ${recordType}`);
      }

      // Validate template data
      if (!templateData.fields || !Array.isArray(templateData.fields)) {
        throw new Error('Template must have a fields array');
      }

      // Update the predefined template in memory
      // Note: This is temporary - in production you'd want to store this in a database
      const predefinedTemplates = this.getPredefinedTemplates();
      predefinedTemplates[recordType] = {
        name: `${recordType.charAt(0).toUpperCase() + recordType.slice(1)}Records`,
        recordType: recordType,
        description: templateData.description || predefinedTemplates[recordType]?.description || '',
        fields: templateData.fields
      };

      // Update existing global template in database
      const templateName = predefinedTemplates[recordType].name;
      const existingTemplate = await this.getTemplateByName(templateName);
      
      if (existingTemplate && existingTemplate.is_global) {
        // Update existing global template
        await this.updateTemplate(templateName, {
          fields: templateData.fields,
          description: templateData.description,
          updated_by: 'superadmin'
        });
        console.log(`✅ Updated global template: ${templateName}`);
      } else {
        // Create new global template
        await this.generateTemplate(templateName, templateData.fields, {
          recordType: recordType,
          description: templateData.description,
          isEditable: false,
          isGlobal: true,
          createdBy: 'superadmin'
        });
        console.log(`✅ Created new global template: ${templateName}`);
      }

      return {
        success: true,
        templateName: templateName,
        recordType: recordType,
        fieldsCount: templateData.fields.length
      };

    } catch (error) {
      console.error('Error updating predefined template:', error);
      throw error;
    }
  }

  /**
   * Get current predefined template for a specific record type
   * @param {string} recordType - The record type (baptism, marriage, funeral)
   * @returns {Object} - Template configuration
   */
  static getPredefinedTemplateByType(recordType) {
    const templates = this.getPredefinedTemplates();
    return templates[recordType] || null;
  }

  /**
   * Sync existing template files with database
   */
  static async syncExistingTemplates() {
    try {
      const recordsDir = path.resolve(__dirname, '../../front-end/src/views/records');
      
      if (!fs.existsSync(recordsDir)) {
        console.log('Records directory does not exist, creating...');
        fs.mkdirSync(recordsDir, { recursive: true });
        return;
      }

      const files = fs.readdirSync(recordsDir).filter(file => file.endsWith('.tsx'));
      
      for (const file of files) {
        const filePath = path.join(recordsDir, file);
        const templateName = file.replace('.tsx', '');
        
        try {
          // Check if template exists in database
          const existingTemplate = await this.getTemplateByName(templateName);
          
          if (!existingTemplate) {
            console.log(`Syncing existing template file: ${templateName}`);
            
            // Extract fields from existing file
            const fields = this.extractFieldsFromTemplate(filePath);
            
            if (fields.length > 0) {
              // Save to database
              await this.saveTemplateToDatabase(templateName, fields, filePath, {
                description: `Existing ${templateName.replace(/([A-Z])/g, ' $1').trim()} template`,
                isEditable: true
              });
              
              console.log(`Successfully synced template: ${templateName}`);
            }
          }
        } catch (error) {
          console.error(`Error syncing template ${templateName}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing existing templates:', error);
      throw error;
    }
  }

  /**
   * Create tables if they don't exist
   */
  static async initializeDatabase() {
    try {
      // Check if table exists and has the right structure
      const checkTableQuery = `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'templates'
      `;
      
      const [checkResult] = await promisePool.execute(checkTableQuery);
      
      if (checkResult[0].count === 0) {
        // Table doesn't exist, create it
        const createTableQuery = `
          CREATE TABLE templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            record_type ENUM('baptism', 'marriage', 'funeral', 'custom') NOT NULL,
            description TEXT,
            fields JSON NOT NULL,
            grid_type ENUM('aggrid', 'mui', 'bootstrap') DEFAULT 'aggrid',
            theme VARCHAR(50) DEFAULT 'liturgicalBlueGold',
            layout_type ENUM('table', 'form', 'dual') DEFAULT 'table',
            language_support JSON DEFAULT NULL,
            is_editable BOOLEAN DEFAULT TRUE,
            created_by INT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_name (name),
            INDEX idx_slug (slug),
            INDEX idx_record_type (record_type),
            INDEX idx_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        
        await promisePool.execute(createTableQuery);
        console.log('Templates table created successfully');
      } else {
        console.log('Templates table already exists');
      }
      
      // Sync existing template files
      await this.syncExistingTemplates();
      
    } catch (error) {
      console.error('Error initializing templates table:', error);
      throw error;
    }
  }

  /**
   * Get templates for a specific church (including global templates)
   * @param {number} churchId - Church ID
   * @returns {Promise<Array>} - Array of templates accessible to the church
   */
  static async getTemplatesForChurch(churchId) {
    return this.getAllTemplates(churchId, true);
  }

  /**
   * Duplicate a global template for a specific church
   * @param {string} globalTemplateName - Name of the global template to duplicate
   * @param {number} churchId - Target church ID
   * @param {string} newName - New name for the duplicated template
   * @param {Object} options - Additional options
   * @returns {Promise<string>} - Path to the new template file
   */
  static async duplicateGlobalTemplate(globalTemplateName, churchId, newName, options = {}) {
    try {
      // Get the global template
      const globalTemplate = await this.getTemplateByName(globalTemplateName);
      
      if (!globalTemplate) {
        throw new Error('Global template not found');
      }
      
      if (!globalTemplate.is_global) {
        throw new Error('Can only duplicate global templates');
      }

      // Check if the new name already exists for this church
      const existingTemplate = await this.getTemplateByName(newName, churchId);
      if (existingTemplate) {
        throw new Error('Template with this name already exists for the church');
      }

      // Create the new template with church ID
      const newOptions = {
        ...options,
        churchId,
        recordType: globalTemplate.record_type,
        description: options.description || `${globalTemplate.description} (Church Copy)`,
        gridType: globalTemplate.grid_type,
        theme: globalTemplate.theme,
        layoutType: globalTemplate.layout_type,
        languageSupport: globalTemplate.languageSupport,
        isEditable: true, // Church copies are always editable
        isGlobal: false
      };

      return await this.generateTemplate(newName, globalTemplate.fields, newOptions);
    } catch (error) {
      console.error('Error duplicating global template:', error);
      throw error;
    }
  }

  /**
   * Get available global templates that can be duplicated
   * @returns {Promise<Array>} - Array of global templates
   */
  static async getGlobalTemplates() {
    try {
      const query = `
        SELECT id, name, slug, record_type, description, fields,
               grid_type, theme, layout_type, language_support, is_editable,
               created_by, created_at, updated_at, is_global
        FROM templates 
        WHERE is_global = TRUE
        ORDER BY record_type, name
      `;
      
      const [rows] = await promisePool.execute(query);
      
      return rows.map(row => ({
        ...row,
        fields: JSON.parse(row.fields),
        languageSupport: row.language_support ? JSON.parse(row.language_support) : { "en": true }
      }));
    } catch (error) {
      console.error('Error getting global templates:', error);
      throw error;
    }
  }

  /**
   * Update template metadata (with church permission check)
   * @param {string} name - Template name
   * @param {Object} updates - Fields to update
   * @param {number} churchId - Church ID (for permission check)
   * @returns {Promise<boolean>} - Success status
   */
  static async updateTemplate(name, updates, churchId = null) {
    try {
      // First check if template exists and user has permission
      const template = await this.getTemplateByName(name);
      
      if (!template) {
        throw new Error('Template not found');
      }

      if (template.is_global && !updates.allowGlobalUpdate) {
        throw new Error('Cannot modify global templates');
      }
      
      if (churchId && template.church_id && template.church_id !== churchId) {
        throw new Error('Permission denied: Cannot modify templates from other churches');
      }

      // Build update query dynamically
      const allowedFields = ['description', 'fields', 'grid_type', 'theme', 'layout_type', 'language_support', 'is_editable'];
      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          if (key === 'fields' || key === 'language_support') {
            params.push(JSON.stringify(value));
          } else {
            params.push(value);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = NOW()');
      
      let query = `UPDATE templates SET ${updateFields.join(', ')} WHERE name = ?`;
      params.push(name);
      
      if (churchId && !updates.allowGlobalUpdate) {
        query += ` AND (church_id = ? OR church_id IS NULL)`;
        params.push(churchId);
      }

      await promisePool.execute(query, params);

      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }
}

module.exports = TemplateService;
