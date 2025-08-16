const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../src/models/User');

async function testLogin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    // Find admin user
    const user = await User.findOne({ where: { username: 'admin' } });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('User found:', user.username);
    console.log('Stored password hash:', user.password);
    
    // Test password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, user.password);
    console.log(`Password "${testPassword}" is valid:`, isValid);
    
    // Create a new hash for comparison
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log('New hash would be:', newHash);
    
    // Update the user with a new password if needed
    if (!isValid) {
      user.password = newHash;
      await user.save();
      console.log('Password updated!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testLogin();