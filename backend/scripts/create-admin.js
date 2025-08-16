const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models/User');

async function createAdminUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Database connected');

    // Check if admin user exists
    let admin = await User.findOne({ 
      where: { username: 'admin' } 
    });
    
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    if (admin) {
      // Update existing admin user
      await admin.update({
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      });
      console.log('Admin user updated successfully:');
    } else {
      // Create new admin user
      admin = await User.create({
        email: 'admin@portfolio.local',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      });
      console.log('Admin user created successfully:');
    }

    console.log('Email: admin@portfolio.local');
    console.log('Username: admin');
    console.log('Password: Admin123!');
    console.log('Role: admin');
    console.log('\nYou can now login at: http://localhost:3333/admin/login.html');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();