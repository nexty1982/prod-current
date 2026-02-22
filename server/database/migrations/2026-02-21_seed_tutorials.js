/**
 * Seed Tutorials Migration
 * Run: node server/database/migrations/2026-02-21_seed_tutorials.js
 *
 * Seeds 15 audience-targeted tutorials covering every major platform feature.
 * Safe to re-run — skips tutorials that already exist (matched by title).
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const CREATED_BY = 1; // system / super_admin user ID

const tutorials = [
  {
    title: 'Getting Started with Your Dashboard',
    description: 'Learn how to navigate your personalized dashboard and make the most of Orthodox Metrics.',
    audience: 'all',
    is_welcome: 0,
    sort_order: 1,
    steps: [
      {
        title: 'Dashboard Overview',
        content: 'Your dashboard is the first thing you see when you log in. It provides a snapshot of your church\'s key metrics, recent activity, and quick access to common tasks. The layout adapts based on your role — administrators see management widgets while clergy see sacramental summaries.'
      },
      {
        title: 'Understanding Widgets',
        content: 'Dashboard widgets display real-time data including recent baptism, marriage, and funeral records, upcoming calendar events, and notification alerts. Each widget can be explored by clicking on it to navigate to the full feature.'
      },
      {
        title: 'Navigation Basics',
        content: 'Use the left sidebar to access all platform features organized by category: Records, Administration, Social, and Tools. The top header provides Quick Links, notifications, and your profile menu. You can collapse the sidebar for more screen space.'
      }
    ]
  },
  {
    title: 'Managing Baptism Records',
    description: 'Create, browse, edit, and search baptism records for your parish.',
    audience: 'existing_clients',
    is_welcome: 0,
    sort_order: 2,
    steps: [
      {
        title: 'Browsing Baptism Records',
        content: 'Navigate to Records > Baptism to view all baptism records for your church. The records grid supports sorting by any column, filtering by date range, and full-text search across names, sponsors, and officiating clergy.'
      },
      {
        title: 'Creating a New Record',
        content: 'Click the "Add Record" button to open the baptism entry form. Required fields include the baptized person\'s name, date of baptism, and officiating priest. Optional fields cover sponsors (godparents), place of baptism, and additional notes. All entries are automatically saved to your church\'s secure database.'
      },
      {
        title: 'Editing and Searching',
        content: 'Click any record row to view its full details. Use the edit button to modify information — all changes are tracked in the audit log. The search bar at the top supports partial name matching, and you can export filtered results for reporting.'
      }
    ]
  },
  {
    title: 'Managing Marriage Records',
    description: 'Record and manage marriage sacraments performed at your parish.',
    audience: 'existing_clients',
    is_welcome: 0,
    sort_order: 3,
    steps: [
      {
        title: 'Browsing Marriage Records',
        content: 'Navigate to Records > Marriage to view all marriage records. The grid displays both spouses\' names, date of marriage, witnesses (koumbaroi), and the officiating priest. Use column sorting and search to find specific records quickly.'
      },
      {
        title: 'Creating a Marriage Record',
        content: 'Click "Add Record" to enter a new marriage. The form captures both spouses\' full names, date of ceremony, witnesses, officiating clergy, and any special notes. Marriage license numbers and civil registration details can also be recorded.'
      },
      {
        title: 'Editing and Record History',
        content: 'Open any marriage record to view or edit its details. The audit trail tracks all modifications with timestamps and the user who made each change, ensuring complete accountability for sacramental records.'
      }
    ]
  },
  {
    title: 'Managing Funeral Records',
    description: 'Maintain accurate records of funeral services and memorial information.',
    audience: 'existing_clients',
    is_welcome: 0,
    sort_order: 4,
    steps: [
      {
        title: 'Browsing Funeral Records',
        content: 'Navigate to Records > Funeral to view all funeral and burial records. Records include the deceased\'s name, dates of death and funeral service, place of burial, and the officiating priest.'
      },
      {
        title: 'Creating a Funeral Record',
        content: 'Click "Add Record" to enter a new funeral record. Capture the deceased\'s full name, date of death, funeral service date, cemetery/burial location, officiating clergy, and memorial information. Next-of-kin details can be included for future reference.'
      },
      {
        title: 'Memorial Tracking',
        content: 'Funeral records can include memorial service dates and notes. Use the search and filter features to find records by name, date range, or burial location. All records are preserved securely in your church\'s database.'
      }
    ]
  },
  {
    title: 'Generating Sacramental Certificates',
    description: 'Create official baptism, marriage, and funeral certificates from your records.',
    audience: 'existing_clients',
    is_welcome: 0,
    sort_order: 5,
    steps: [
      {
        title: 'Selecting a Record',
        content: 'Navigate to Certificates from the sidebar. Select the type of certificate you need (Baptism, Marriage, or Funeral), then choose the specific record. You can search by name or date to find the right record quickly.'
      },
      {
        title: 'Generating and Downloading',
        content: 'Once you\'ve selected a record, click "Generate Certificate" to create a professional, formatted document. The certificate pulls all relevant data from the record automatically. You can preview the certificate on screen, then download it as a PDF for printing or digital distribution.'
      }
    ]
  },
  {
    title: 'Using the OCR Document Scanner',
    description: 'Digitize historical church ledgers and paper records using our OCR system.',
    audience: 'existing_clients',
    is_welcome: 0,
    sort_order: 6,
    steps: [
      {
        title: 'Uploading Documents',
        content: 'Navigate to OCR Upload from the sidebar or Quick Links. Upload scanned images of your historical church ledgers — supported formats include JPG, PNG, and PDF. For best results, use high-resolution scans (300+ DPI) with good lighting and minimal skew.'
      },
      {
        title: 'Reviewing OCR Results',
        content: 'After processing, the system presents extracted text alongside the original image. Review each detected field to verify accuracy. The OCR engine handles handwritten and typed text in English and Greek, though handwritten entries may need manual correction.'
      },
      {
        title: 'Column Mapping',
        content: 'The column mapper lets you align detected table columns with your database fields (e.g., "Name," "Date of Baptism," "Sponsor"). Drag column boundaries to adjust detection areas. Save your layout as a template for future pages from the same ledger format.'
      },
      {
        title: 'Approving and Importing',
        content: 'Once you\'ve verified the extracted data and mapped columns correctly, approve the job to import records into your church database. Imported records appear alongside manually entered ones and can be edited as needed. The original scan is preserved for reference.'
      }
    ]
  },
  {
    title: 'Calendar & Church Events',
    description: 'View and manage your church calendar and upcoming events.',
    audience: 'existing_clients',
    is_welcome: 0,
    sort_order: 7,
    steps: [
      {
        title: 'Viewing the Calendar',
        content: 'Access the Calendar from the sidebar to see upcoming church events, feast days, and scheduled services. The calendar supports month, week, and day views. Orthodox feast days and fasting periods are highlighted automatically.'
      },
      {
        title: 'Adding Events',
        content: 'Click on any date to create a new event. Enter the event title, time, description, and category (liturgy, meeting, community event, etc.). Events can be set as recurring for regular services. All church members with access can see shared calendar events.'
      }
    ]
  },
  {
    title: 'Social Features: Chat & Notifications',
    description: 'Connect with your parish community through chat, friends, and notifications.',
    audience: 'all',
    is_welcome: 0,
    sort_order: 8,
    steps: [
      {
        title: 'Using Chat',
        content: 'Access Social Chat from the sidebar to send messages to other platform users. You can start one-on-one conversations or participate in group chats. Messages support text and are delivered in real-time with read receipts.'
      },
      {
        title: 'Friends & Connections',
        content: 'Visit the Friends section to see other users on the platform. You can send friend requests to connect with colleagues across parishes. Your friends list makes it easy to start chats and stay connected with your church community.'
      },
      {
        title: 'Notification Center',
        content: 'The bell icon in the top header shows your unread notifications. Click it to open the Notification Center where you can see alerts for new messages, record updates, system announcements, and more. Mark notifications as read or clear them in bulk.'
      }
    ]
  },
  {
    title: 'Managing Your Profile',
    description: 'Update your personal information, avatar, and account settings.',
    audience: 'all',
    is_welcome: 0,
    sort_order: 9,
    steps: [
      {
        title: 'Editing Your Profile',
        content: 'Click your avatar in the top-right corner and select "My Profile" to view and edit your information. You can update your display name, email, phone number, and bio. Your profile photo is automatically assigned based on your role.'
      },
      {
        title: 'Account Settings',
        content: 'Access account settings to change your password, update notification preferences, and manage your session. For security, password changes require your current password. If you\'ve forgotten your password, use the "Forgot Password" link on the login page.'
      }
    ]
  },
  {
    title: 'Church Administration Guide',
    description: 'Comprehensive guide for church administrators managing their parish on the platform.',
    audience: 'administrators',
    is_welcome: 0,
    sort_order: 10,
    steps: [
      {
        title: 'Church Setup & Configuration',
        content: 'As a church administrator, your first task is ensuring your church profile is complete. Navigate to Admin > Churches to update your church\'s name, address, diocese, and contact information. This data appears on certificates and official documents.'
      },
      {
        title: 'User Management',
        content: 'Go to Admin > Users to manage who has access to your church\'s data. You can invite new users, assign roles (priest, deacon, editor), and deactivate accounts. Each role has specific permissions — editors can enter records while priests can also generate certificates.'
      },
      {
        title: 'Field Mapping & Customization',
        content: 'The Field Mapper tool (Admin > Field Mapping) lets you customize how record fields are labeled and displayed for your church. Map database fields to your preferred labels, set which fields are required, and configure the display order for data entry forms.'
      },
      {
        title: 'Settings & Preferences',
        content: 'Admin Settings provides control over platform behavior for your church. Configure default date formats, language preferences, and certificate templates. Review audit logs to track all changes made to your church\'s records and settings.'
      }
    ]
  },
  {
    title: 'Invoice & Billing Management',
    description: 'View, create, and manage invoices and billing for your church account.',
    audience: 'administrators',
    is_welcome: 0,
    sort_order: 11,
    steps: [
      {
        title: 'Viewing Invoices',
        content: 'Navigate to Apps > Invoice to see all invoices associated with your church. The invoice list shows invoice number, date, amount, status (paid, pending, overdue), and client details. Use filters to narrow by status or date range.'
      },
      {
        title: 'Creating an Invoice',
        content: 'Click "Create Invoice" to generate a new invoice. Fill in the client details, line items with descriptions and amounts, tax information, and payment terms. The system automatically calculates totals and applies tax rates.'
      },
      {
        title: 'Managing Billing',
        content: 'Track payment status by updating invoices as payments are received. You can download invoices as PDFs for sharing, duplicate invoices for recurring charges, and view billing history in the invoice detail view.'
      }
    ]
  },
  {
    title: 'Admin Control Panel Overview',
    description: 'Navigate the administration panel and understand available management tools.',
    audience: 'administrators',
    is_welcome: 0,
    sort_order: 12,
    steps: [
      {
        title: 'Admin Panel Categories',
        content: 'The Admin section in the sidebar organizes management tools into categories: Church Management, User Management, Settings, Logs, and Sessions. Each category provides specific administrative functions for running your parish efficiently on the platform.'
      },
      {
        title: 'Navigating Admin Tools',
        content: 'From the Admin panel you can access: Church profiles and setup, User accounts and role assignments, System settings and preferences, Activity logs showing all platform actions, and Active session management for security monitoring.'
      },
      {
        title: 'Key Administrative Tasks',
        content: 'Common admin tasks include: onboarding new staff with appropriate roles, reviewing audit logs for compliance, updating church information for certificates, managing field mappings for record entry, and monitoring system health through the admin dashboard.'
      }
    ]
  },
  {
    title: 'Getting Started for New Churches',
    description: 'Your first steps after joining Orthodox Metrics as a new parish.',
    audience: 'new_clients',
    is_welcome: 0,
    sort_order: 13,
    steps: [
      {
        title: 'Welcome & First Login',
        content: 'Welcome to Orthodox Metrics! After your first login, take a moment to explore the dashboard. Your church account has been set up with basic configuration. You\'ll want to verify your church details and familiarize yourself with the sidebar navigation.'
      },
      {
        title: 'Explore Your Dashboard',
        content: 'Your dashboard shows key metrics and quick links to common tasks. Start by navigating through the sidebar: check out Records to see the sacramental record system, visit your Profile to update your information, and explore the Calendar for upcoming events.'
      },
      {
        title: 'Getting Help & Support',
        content: 'If you need assistance, access the User Guide from Quick Links in the top header for comprehensive documentation. For direct support, contact your account administrator or reach out to the Orthodox Metrics support team. Tutorials like this one will guide you through each feature as you explore.'
      }
    ]
  },
  {
    title: 'For Clergy: Priest & Deacon Guide',
    description: 'A focused guide for priests and deacons using Orthodox Metrics for sacramental records.',
    audience: 'priests',
    is_welcome: 0,
    sort_order: 14,
    steps: [
      {
        title: 'Your Clergy Dashboard',
        content: 'As a priest or deacon, your dashboard highlights the tools most relevant to your ministry: recent sacramental records, upcoming services on the calendar, and quick access to record entry. Your role provides access to view, create, and edit records for your parish.'
      },
      {
        title: 'Working with Records',
        content: 'Access Records from the sidebar to view baptism, marriage, and funeral entries. You can create new records after performing sacraments — the system captures all required details including dates, participants, sponsors, and your name as the officiating clergyman. Records are organized chronologically and searchable.'
      },
      {
        title: 'Certificates & Documentation',
        content: 'Generate official certificates for any sacrament you\'ve performed. Navigate to Certificates, select the record type and specific entry, and the system produces a professional document ready for printing. Certificates include your church\'s official information and can be downloaded as PDFs.'
      }
    ]
  },
  {
    title: 'OCR Studio: Advanced Features',
    description: 'Advanced OCR tools for table extraction, layout templates, and batch processing.',
    audience: 'administrators',
    is_welcome: 0,
    sort_order: 15,
    steps: [
      {
        title: 'Table Extractor',
        content: 'The OCR Studio Table Extractor provides advanced control over how tabular data is detected in scanned ledger pages. Use the visual overlay to define table boundaries, adjust column separators, and fine-tune row detection. This is essential for historical ledgers with non-standard layouts.'
      },
      {
        title: 'Layout Templates',
        content: 'Save successful column configurations as layout templates. When processing multiple pages from the same ledger book, apply a saved template to skip manual column mapping. Templates store column positions, field mappings, and extraction settings for consistent batch processing.'
      },
      {
        title: 'Job Monitor & Batch Processing',
        content: 'The Job Monitor shows the status of all OCR processing jobs — queued, in progress, completed, and failed. Monitor batch uploads, retry failed pages, and review extraction quality metrics. Use the job detail view to see per-page results and address any extraction issues.'
      }
    ]
  }
];

async function seed() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'orthodoxapps',
      password: process.env.DB_PASSWORD,
      database: 'orthodoxmetrics_db',
      charset: 'utf8mb4'
    });

    console.log('Connected to database. Seeding tutorials...\n');

    let inserted = 0;
    let skipped = 0;

    for (const tutorial of tutorials) {
      // Check if tutorial already exists by title
      const [existing] = await connection.query(
        'SELECT id FROM tutorials WHERE title = ?',
        [tutorial.title]
      );

      if (existing.length > 0) {
        console.log(`  SKIP: "${tutorial.title}" (already exists, id=${existing[0].id})`);
        skipped++;
        continue;
      }

      // Insert tutorial
      const [result] = await connection.query(
        'INSERT INTO tutorials (title, description, audience, is_welcome, is_active, sort_order, created_by) VALUES (?, ?, ?, ?, 1, ?, ?)',
        [tutorial.title, tutorial.description, tutorial.audience, tutorial.is_welcome, tutorial.sort_order, CREATED_BY]
      );

      const tutorialId = result.insertId;

      // Insert steps
      for (let i = 0; i < tutorial.steps.length; i++) {
        const step = tutorial.steps[i];
        await connection.query(
          'INSERT INTO tutorial_steps (tutorial_id, step_order, title, content) VALUES (?, ?, ?, ?)',
          [tutorialId, i, step.title, step.content]
        );
      }

      console.log(`  OK:   "${tutorial.title}" (id=${tutorialId}, ${tutorial.steps.length} steps, audience=${tutorial.audience})`);
      inserted++;
    }

    console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}, Total: ${tutorials.length}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

seed();
