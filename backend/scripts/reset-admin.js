const { sequelize, User } = require('../src/models/User');

async function resetAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Delete existing admin user
    await User.destroy({ where: { username: 'admin' } });
    console.log('Existing admin user deleted');
    
    // Create new admin user (let the model handle password hashing)
    const admin = await User.create({
      email: 'admin@portfolio.local',
      username: 'admin',
      password: 'admin123', // The model's beforeCreate hook should hash this
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      isEmailVerified: true,
    });
    
    console.log('\nAdmin user created successfully:');
    console.log('Email: admin@portfolio.local');
    console.log('Username: admin');  
    console.log('Password: admin123');
    console.log('Role: admin');
    
    // Test the login
    const testUser = await User.findByCredentials('admin', 'admin123');
    console.log('\nLogin test successful!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetAdmin();