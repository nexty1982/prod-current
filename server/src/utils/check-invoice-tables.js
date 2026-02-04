const { getAppPool } = require('../config/db-compat');
// Check invoice tables
const { promisePool } = require('../config/db-compat');

async function checkInvoiceTables() {
  console.log('🔍 Checking invoice tables...');
  
  try {
    // Check if invoices table exists
    const [invoicesTable] = await getAppPool().query('DESCRIBE invoices');
    console.log('✅ invoices table exists with columns:');
    invoicesTable.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });
    
    console.log('');
    
    // Check if invoice_items_enhanced table exists
    try {
      const [itemsTable] = await getAppPool().query('DESCRIBE invoice_items_enhanced');
      console.log('✅ invoice_items_enhanced table exists with columns:');
      itemsTable.forEach(col => {
        console.log(`  ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.log('❌ invoice_items_enhanced table does not exist:', error.message);
    }
    
    console.log('');
    
    // Count existing invoices
    const [count] = await getAppPool().query('SELECT COUNT(*) as count FROM invoices');
    console.log(`📊 Total invoices: ${count[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking invoice tables:', error);
    process.exit(1);
  }
}

checkInvoiceTables();
