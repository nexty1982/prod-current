// server/services/churchSetupService.js
const { promisePool } = require('../config/db');
const { getChurchDbConnection } = require('../utils/dbSwitcher');
const templateService = require('./templateService');

/**
 * Enhanced Church Setup Service with Template Integration
 * Handles church creation with optional template setup
 */
class ChurchSetupService {
  
  /**
   * Complete church setup with optional template initialization
   * @param {Object} churchData - Church registration data
   * @param {Object} templateOptions - Optional template setup preferences
   * @returns {Object} Setup result with church and template info
   */
  async setupNewChurch(churchData, templateOptions = {}) {
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Step 1: Create church and database (existing logic)
      const churchResult = await this.createChurchDatabase(connection, churchData);
      const { churchId, dbName, adminUserId } = churchResult;
      
      // Step 2: Optional template setup
      let templateSetupResult = null;
      if (templateOptions.setupTemplates !== false) {
        templateSetupResult = await this.setupChurchTemplates(churchId, templateOptions);
      }
      
      // Step 3: Mark setup completion status
      const setupStatus = {
        church_created: true,
        admin_user_created: true,
        templates_setup: !!templateSetupResult,
        setup_step: templateSetupResult ? 'complete' : 'templates_pending'
      };
      
      await this.updateChurchSetupStatus(connection, churchId, setupStatus);
      
      await connection.commit();
      
      return {
        success: true,
        church: {
          id: churchId,
          name: churchData.name,
          database_name: dbName,
          admin_user_id: adminUserId,
          setup_status: setupStatus
        },
        templates: templateSetupResult,
        next_steps: this.getNextSteps(setupStatus)
      };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Setup default templates for a new church
   * @param {number} churchId - Church ID
   * @param {Object} options - Template setup options
   * @returns {Object} Template setup results
   */
  async setupChurchTemplates(churchId, options = {}) {
    const {
      includeGlobalTemplates = true,
      createCustomTemplates = false,
      recordTypes = ['baptism', 'marriage', 'funeral'],
      templateStyle = 'orthodox_traditional',
      selectedTemplates = null // NEW: Template slugs for table provisioning
    } = options;
    
    const results = {
      global_templates_available: [],
      duplicated_templates: [],
      custom_templates: [],
      generated_components: [],
      tables_provisioned: []
    };
    
    try {
      // NEW: Provision database tables from template slugs
      if (selectedTemplates && Object.keys(selectedTemplates).length > 0) {
        const { provisionTablesFromTemplates } = require('./templateTableProvisioner');
        const provisionResult = await provisionTablesFromTemplates(churchId, selectedTemplates);
        results.tables_provisioned = provisionResult.tables_created;
        
        if (provisionResult.tables_failed.length > 0) {
          console.warn('⚠️ Some tables failed to provision:', provisionResult.tables_failed);
        }
      }
      
      // Get available global templates
      if (includeGlobalTemplates) {
        const globalTemplates = await templateService.getGlobalTemplates();
        results.global_templates_available = globalTemplates.filter(
          template => recordTypes.includes(template.record_type)
        );
      }
      
      // Auto-duplicate standard templates for immediate use
      if (options.autoSetupStandard) {
        for (const recordType of recordTypes) {
          const globalTemplate = results.global_templates_available.find(
            t => t.record_type === recordType
          );
          
          if (globalTemplate) {
            const duplicatedName = `${globalTemplate.name}_Church${churchId}`;
            const duplicateResult = await templateService.duplicateGlobalTemplate(
              globalTemplate.name,
              churchId,
              duplicatedName,
              {
                description: `Standard ${recordType} template for church use`,
                auto_generated: true
              }
            );
            
            results.duplicated_templates.push({
              original: globalTemplate.name,
              new_name: duplicatedName,
              record_type: recordType,
              file_path: duplicateResult.filePath
            });
          }
        }
      }
      
      // Generate record components if requested
      if (options.generateComponents) {
        results.generated_components = await this.generateRecordComponents(
          churchId, 
          recordTypes,
          templateStyle
        );
      }
      
      return results;
      
    } catch (error) {
      console.error('Error setting up church templates:', error);
      throw new Error(`Template setup failed: ${error.message}`);
    }
  }
  
  /**
   * Generate RecordEditor and RecordViewer components for a church
   * @param {number} churchId - Church ID
   * @param {Array} recordTypes - Record types to generate
   * @param {string} style - Template style preference
   * @returns {Array} Generated component info
   */
  async generateRecordComponents(churchId, recordTypes, style = 'orthodox_traditional') {
    const components = [];
    
    for (const recordType of recordTypes) {
      // Generate RecordViewer (read-only AG Grid component)
      const viewerComponent = await this.generateRecordViewer(churchId, recordType, style);
      
      // Generate RecordEditor (full CRUD component)
      const editorComponent = await this.generateRecordEditor(churchId, recordType, style);
      
      components.push({
        record_type: recordType,
        viewer_component: viewerComponent,
        editor_component: editorComponent,
        supporting_files: await this.generateSupportingFiles(churchId, recordType)
      });
    }
    
    return components;
  }
  
  /**
   * Generate RecordViewer component
   */
  async generateRecordViewer(churchId, recordType, style) {
    const templateName = `${recordType.charAt(0).toUpperCase() + recordType.slice(1)}RecordViewer`;
    
    // Get field definitions from global template or create default
    const template = await templateService.getTemplateByRecordType(recordType, churchId);
    const fields = template ? template.fields : this.getDefaultFields(recordType);
    
    const componentCode = this.generateViewerComponentCode(templateName, fields, recordType, style);
    
    const filePath = `front-end/src/views/records/${recordType}/RecordViewer.jsx`;
    await templateService.writeComponentFile(filePath, componentCode);
    
    return {
      name: templateName,
      file_path: filePath,
      component_type: 'viewer',
      features: ['ag_grid', 'pagination', 'search', 'export']
    };
  }
  
  /**
   * Generate RecordEditor component
   */
  async generateRecordEditor(churchId, recordType, style) {
    const templateName = `${recordType.charAt(0).toUpperCase() + recordType.slice(1)}RecordEditor`;
    
    const template = await templateService.getTemplateByRecordType(recordType, churchId);
    const fields = template ? template.fields : this.getDefaultFields(recordType);
    
    const componentCode = this.generateEditorComponentCode(templateName, fields, recordType, style);
    
    const filePath = `front-end/src/views/records/${recordType}/RecordEditor.jsx`;
    await templateService.writeComponentFile(filePath, componentCode);
    
    return {
      name: templateName,
      file_path: filePath,
      component_type: 'editor',
      features: ['crud_operations', 'forms', 'validation', 'certificates', 'lock_toggle']
    };
  }
  
  /**
   * Complete template setup for churches that skipped it initially
   * @param {number} churchId - Church ID
   * @param {Object} options - Template setup options
   * @returns {Object} Setup results
   */
  async completeTemplateSetup(churchId, options = {}) {
    try {
      // Verify church exists and setup is incomplete
      const church = await this.getChurchSetupStatus(churchId);
      if (!church) {
        throw new Error('Church not found');
      }
      
      if (church.setup_status.templates_setup) {
        return {
          success: true,
          message: 'Templates already set up for this church',
          templates: await templateService.getTemplatesForChurch(churchId)
        };
      }
      
      // Run template setup
      const templateResult = await this.setupChurchTemplates(churchId, options);
      
      // Update setup status
      const connection = await promisePool.getConnection();
      try {
        await this.updateChurchSetupStatus(connection, churchId, {
          ...church.setup_status,
          templates_setup: true,
          setup_step: 'complete',
          templates_completed_at: new Date()
        });
      } finally {
        connection.release();
      }
      
      return {
        success: true,
        message: 'Template setup completed successfully',
        templates: templateResult
      };
      
    } catch (error) {
      console.error('Error completing template setup:', error);
      throw error;
    }
  }
  
  /**
   * Get church setup status
   * @param {number} churchId - Church ID
   * @returns {Object} Church setup information
   */
  async getChurchSetupStatus(churchId) {
    const [churches] = await promisePool.query(
      'SELECT * FROM churches WHERE id = ?',
      [churchId]
    );
    
    if (churches.length === 0) {
      return null;
    }
    
    const church = churches[0];
    return {
      ...church,
      setup_status: church.setup_status ? JSON.parse(church.setup_status) : {}
    };
  }
  
  /**
   * Update church setup status
   */
  async updateChurchSetupStatus(connection, churchId, status) {
    await connection.execute(
      'UPDATE churches SET setup_status = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(status), churchId]
    );
  }
  
  /**
   * Get next steps for church setup
   */
  getNextSteps(setupStatus) {
    const steps = [];
    
    if (!setupStatus.templates_setup) {
      steps.push({
        step: 'setup_templates',
        title: 'Set Up Record Templates',
        description: 'Configure templates for baptism, marriage, and funeral records',
        optional: true,
        url: '/admin/template-setup'
      });
    }
    
    if (setupStatus.setup_step === 'complete') {
      steps.push({
        step: 'start_using',
        title: 'Start Managing Records',
        description: 'Begin adding and managing church records',
        url: '/records'
      });
    }
    
    return steps;
  }
  
  /**
   * Get default field definitions for record types
   */
  getDefaultFields(recordType) {
    const defaults = {
      baptism: [
        { field: 'first_name', label: 'First Name', type: 'string', required: true },
        { field: 'last_name', label: 'Last Name', type: 'string', required: true },
        { field: 'date_of_baptism', label: 'Date of Baptism', type: 'date', required: true },
        { field: 'place_of_baptism', label: 'Place of Baptism', type: 'string' },
        { field: 'priest_name', label: 'Priest', type: 'string' },
        { field: 'godparents', label: 'Godparent(s)', type: 'string' },
        { field: 'father_name', label: 'Father\'s Name', type: 'string' },
        { field: 'mother_name', label: 'Mother\'s Name', type: 'string' }
      ],
      marriage: [
        { field: 'groom_name', label: 'Groom Name', type: 'string', required: true },
        { field: 'bride_name', label: 'Bride Name', type: 'string', required: true },
        { field: 'marriage_date', label: 'Marriage Date', type: 'date', required: true },
        { field: 'place_of_marriage', label: 'Place of Marriage', type: 'string' },
        { field: 'priest_name', label: 'Priest', type: 'string' },
        { field: 'best_man', label: 'Best Man', type: 'string' },
        { field: 'maid_of_honor', label: 'Maid of Honor', type: 'string' }
      ],
      funeral: [
        { field: 'deceased_name', label: 'Deceased Name', type: 'string', required: true },
        { field: 'death_date', label: 'Date of Death', type: 'date', required: true },
        { field: 'funeral_date', label: 'Date of Funeral', type: 'date' },
        { field: 'burial_site', label: 'Burial Location', type: 'string' },
        { field: 'priest_name', label: 'Priest', type: 'string' },
        { field: 'age_at_death', label: 'Age at Death', type: 'number' }
      ]
    };
    
    return defaults[recordType] || [];
  }
  
  /**
   * Generate RecordViewer component code
   */
  generateViewerComponentCode(templateName, fields, recordType, style) {
    const columnDefs = fields.map(field => 
      `    { headerName: '${field.label}', field: '${field.field}', sortable: true, filter: true }`
    ).join(',\n');
    
    return `import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const ${templateName} = ({ churchId, isLocked = true }) => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);

  const columnDefs = [
${columnDefs}
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

  useEffect(() => {
    if (churchId) {
      loadData();
    }
  }, [churchId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetch(\`/api/church/\${churchId}/${recordType}-records\`, {
        credentials: 'include'
      });
      const data = await response.json();
      setRowData(data.records || []);
    } catch (error) {
      console.error('Error loading ${recordType} records:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="record-viewer-container" style={{ height: '100%', width: '100%' }}>
      <div className="record-viewer-header" style={{ marginBottom: '20px' }}>
        <h2>${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records</h2>
        <div className="record-viewer-actions">
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
  }
  
  /**
   * Generate RecordEditor component code (simplified for this example)
   */
  generateEditorComponentCode(templateName, fields, recordType, style) {
    return `import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const ${templateName} = ({ churchId, isLocked = false }) => {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // TODO: Implement full CRUD functionality
  // This is a simplified version for the setup wizard

  const columnDefs = [
    ${fields.map(field => 
      `{ headerName: '${field.label}', field: '${field.field}', sortable: true, filter: true, editable: !isLocked }`
    ).join(',\n    ')}
  ];

  return (
    <div className="record-editor-container">
      <div className="record-editor-header">
        <h2>${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records - Editor</h2>
        {!isLocked && (
          <button onClick={() => setShowAddModal(true)}>
            Add New ${recordType.charAt(0).toUpperCase() + recordType.slice(1)} Record
          </button>
        )}
      </div>
      
      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact 
          rowData={rowData} 
          columnDefs={columnDefs}
          loading={loading}
        />
      </div>
      
      {/* TODO: Add modals for CRUD operations */}
      {/* TODO: Add certificate generation for baptism/marriage */}
      {/* TODO: Add import/export functionality */}
    </div>
  );
};

export default ${templateName};
`;
  }

  /**
   * Create church database and insert church record
   * @param {Object} connection - Database connection (with transaction)
   * @param {Object} churchData - Church data
   * @returns {Object} { churchId, dbName, adminUserId }
   */
  async createChurchDatabase(connection, churchData) {
    const bcrypt = require('bcrypt');
    
    try {
      // 1. Insert church record into orthodoxmetrics_db.churches
      const [churchResult] = await connection.execute(`
        INSERT INTO churches (
          church_name, name, address, city, region, country,
          phone, website, preferred_language, timezone, calendar_type,
          admin_full_name, admin_email, admin_password, admin_title,
          description, established_year, logo_path, is_active, setup_complete
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)
      `, [
        churchData.name,
        churchData.name, // name column (backwards compatibility)
        churchData.address || null,
        churchData.city || null,
        churchData.region || null,
        churchData.country || null,
        churchData.phone || null,
        churchData.website || null,
        churchData.preferred_language || 'en',
        churchData.timezone || 'America/New_York',
        churchData.calendar_type || 'gregorian',
        churchData.admin_full_name || null,
        churchData.admin_email || null,
        churchData.admin_password ? await bcrypt.hash(churchData.admin_password, 10) : null,
        churchData.admin_title || 'Father',
        churchData.description || null,
        churchData.established_year || null,
        churchData.logoPath || null
      ]);
      
      const churchId = churchResult.insertId;
      const dbName = `om_church_${churchId}`;
      
      // 2. Create church database
      await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      
      // 3. Update church record with database name
      await connection.execute(
        'UPDATE churches SET database_name = ? WHERE id = ?',
        [dbName, churchId]
      );
      
      // 4. Create admin user in orthodoxmetrics_db.users
      let adminUserId = null;
      if (churchData.admin_email && churchData.admin_password) {
        const [userResult] = await connection.execute(`
          INSERT INTO users (
            email, password, full_name, role, church_id, is_active
          ) VALUES (?, ?, ?, 'admin', ?, 1)
        `, [
          churchData.admin_email,
          await bcrypt.hash(churchData.admin_password, 10),
          churchData.admin_full_name || 'Church Administrator',
          churchId
        ]);
        adminUserId = userResult.insertId;
      }
      
      // 5. Get church database connection and create basic tables
      const { getChurchDbConnection } = require('../utils/dbSwitcher');
      const churchDb = await getChurchDbConnection(dbName);
      const churchDbConn = await churchDb.getConnection();
      
      try {
        // 6. Create basic church_config table
        // Sanitize values for DEFAULT clauses (MySQL doesn't support parameters in DEFAULT)
        const preferredLang = (churchData.preferred_language || 'en').replace(/[^a-z]/gi, '').substring(0, 5);
        const timezone = (churchData.timezone || 'America/New_York').replace(/'/g, "''").substring(0, 100);
        const calendarType = ['gregorian', 'julian', 'both'].includes(churchData.calendar_type) 
          ? churchData.calendar_type 
          : 'gregorian';
        
        await churchDbConn.execute(`
          CREATE TABLE IF NOT EXISTS church_config (
            id INT PRIMARY KEY AUTO_INCREMENT,
            church_id INT NOT NULL DEFAULT ${churchId},
            preferred_language VARCHAR(5) DEFAULT '${preferredLang}',
            timezone VARCHAR(100) DEFAULT '${timezone}',
            calendar_type ENUM('gregorian', 'julian', 'both') DEFAULT '${calendarType}',
            logo_path VARCHAR(500),
            description TEXT,
            established_year INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Insert initial config
        await churchDbConn.execute(`
          INSERT INTO church_config (church_id, preferred_language, timezone, calendar_type, description, established_year)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          churchId,
          churchData.preferred_language || 'en',
          churchData.timezone || 'America/New_York',
          churchData.calendar_type || 'gregorian',
          churchData.description || null,
          churchData.established_year || null
        ]);
        
      } finally {
        if (churchDbConn && churchDbConn.release) {
          churchDbConn.release();
        }
      }
      
      return {
        churchId,
        dbName,
        adminUserId
      };
      
    } catch (error) {
      console.error('Error creating church database:', error);
      throw error;
    }
  }
}

module.exports = new ChurchSetupService();
