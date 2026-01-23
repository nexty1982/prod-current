});

// GET /api/admin/churches/:id/dynamic-records-config - Get dynamic records configuration
router.get('/:id/dynamic-records-config', async (req, res) => {
  try {
    const churchId = parseInt(req.params.id, 10);
    if (!churchId) {
      return res.status(400).json({ success: false, error: 'Invalid church ID' });
    }
    
    await validateChurchAccess(churchId);
    
    // Return empty config for now - can be extended later
    res.json({ success: true, config: {} });
  } catch (error) {
    console.error('❌ Error fetching dynamic records config:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch dynamic records config'
    });
  }
});

// POST /api/admin/churches/wizard - Create church via wizard interface
router.post('/wizard', upload.single('logo'), async (req, res) => {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    const {
      church_name,
      name = church_name, // Fallback for backwards compatibility
      address,
      city,
      region,
      country,  
      phone,
      website,
      preferred_language,
      timezone,
      calendar_type,
      admin_full_name,
      admin_email,
      admin_password,
      admin_title,
      description,
      established_year,
      // Template setup options
      setup_templates = true,
      auto_setup_standard = false,
      generate_components = false,
      record_types = ['baptism', 'marriage', 'funeral'],
      template_style = 'orthodox_traditional'
    } = req.body;

    const finalChurchName = church_name || name;

    // Add debug logging
    console.info('[ChurchWizard]', { 
      requestId,
      church_name: finalChurchName, 
      email: admin_email,
      requester: req.user?.email || req.session?.user?.email
    });

    // Validate required fields
    if (!finalChurchName || !address || !city || !country || !admin_full_name || !admin_email || !admin_password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['church_name', 'address', 'city', 'country', 'admin_full_name', 'admin_email', 'admin_password']
      });
    }

    // Fixed duplicate name check - use church_name column
    const [existingChurches] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.churches WHERE church_name = ? AND is_active = 1',
      [finalChurchName]
    );
    if (existingChurches.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Church name already exists (active church)'
      });
    }

    // Fixed duplicate email check  
    const [existingEmails] = await getAppPool().query(
      'SELECT id FROM orthodoxmetrics_db.churches WHERE admin_email = ? AND is_active = 1',
      [admin_email]
    );
    if (existingEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Church admin email already exists (active church)'
      });
    }

    // Handle logo file
    let logoPath = null;
    if (req.file) {
      logoPath = `/uploads/church-logos/${req.file.filename}`;
    }

    // Prepare church data
    const churchData = {
      name: finalChurchName, 
      address, 
      city, 
      region, 
      country, 
      phone, 
      website,
      preferred_language, 
      timezone, 
      calendar_type,
      admin_full_name, 
      admin_email, 
      admin_password, 
      admin_title,
      description, 
      established_year, 
      logoPath
    };

    // Prepare template options
    const templateOptions = {
      setupTemplates: setup_templates,
      autoSetupStandard: auto_setup_standard,
      generateComponents: generate_components,
      recordTypes: record_types,
      templateStyle: template_style,
      includeGlobalTemplates: true,
      createCustomTemplates: false
    };

    // Use enhanced church setup service
    const setupResult = await churchSetupService.setupNewChurch(churchData, templateOptions);

    console.log(`✅ Church created via wizard: ${finalChurchName} (ID: ${setupResult.church.id}) by ${req.user?.email || req.session?.user?.email || 'System'}`);

    res.status(201).json({
      success: true,
      message: 'Church created successfully via wizard',
      church: {
        id: setupResult.church.id,
        church_name: setupResult.church.church_name,
        name: setupResult.church.church_name, // Backwards compatibility
        admin_email: setupResult.church.admin_email,
        database_name: setupResult.church.database_name
      },
      setup: setupResult.setup,
      templates: setupResult.templates
    });

  } catch (error) {
    console.error(`[ChurchWizard:${requestId}] Error:`, {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      message: error.message,
      requester: req.user?.email || req.session?.user?.email
    });
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create church via wizard' 
    });
  }
});
