const { sequelize, User } = require('../src/models/User');
const bcrypt = require('bcryptjs');

async function unlockAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Find admin user
    const admin = await User.findOne({ where: { username: 'admin' } });
    
    if (!admin) {
      console.log('Admin user not found');
      return;
    }
    
    // Reset login attempts and unlock
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await admin.update({
      password: hashedPassword,
      loginAttempts: 0,
      lockoutUntil: null,
      isActive: true,
      isEmailVerified: true
    });
    
    console.log('Admin user unlocked successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('URL: http://localhost:64422/admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

unlockAdmin();