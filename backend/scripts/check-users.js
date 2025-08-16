const { sequelize, User } = require('../src/models/User');

async function checkUsers() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');
    
    const users = await User.findAll({
      attributes: ['id', 'email', 'username', 'role', 'isActive']
    });
    
    console.log('\nUsers in database:');
    users.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - Role: ${user.role}, Active: ${user.isActive}`);
    });
    
    console.log(`\nTotal users: ${users.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();