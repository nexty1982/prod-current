// Generate proper bcrypt hash for admin password
const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'admin123';
    const saltRounds = 12;

    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Password:', password);
        console.log('Hash:', hash);

        // Test the hash
        const match = await bcrypt.compare(password, hash);
        console.log('Hash verification:', match);

        // Generate SQL
        console.log('\nSQL to create admin user:');
        console.log(`INSERT INTO users (email, first_name, last_name, password_hash, role, is_active, landing_page, created_at, updated_at) VALUES ('admin@test.com', 'Admin', 'User', '${hash}', 'admin', TRUE, '/admin/users', NOW(), NOW());`);

    } catch (error) {
        console.error('Error generating hash:', error);
    }
}

generateHash();
