const { sequelize, User } = require('../src/models/User');
const bcrypt = require('bcryptjs');

async function fixAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Delete existing admin user completely
    await User.destroy({ where: { username: 'admin' } });
    console.log('Existing admin user deleted');
    
    // Create fresh password hash
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hash created');
    
    // Create new admin user with raw SQL to avoid model hooks
    await sequelize.query(`
      INSERT INTO users (
        email, username, password, first_name, last_name, 
        role, is_active, is_email_verified, created_at, updated_at
      ) VALUES (
        'admin@portfolio.local', 'admin', '${hashedPassword}', 'Admin', 'User',
        'admin', 1, 1, datetime('now'), datetime('now')
      )
    `);
    
    console.log('New admin user created');
    
    // Test the login
    const testUser = await User.findOne({ where: { username: 'admin' } });
    const isValid = await bcrypt.compare(password, testUser.password);
    
    console.log('Password test result:', isValid);
    console.log('');
    console.log('✅ Admin login credentials:');
    console.log('URL: http://localhost:64422/admin');
    console.log('Username: admin');
    console.log('Password: password123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixAdmin();