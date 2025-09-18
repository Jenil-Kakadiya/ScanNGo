const bcrypt = require('bcryptjs');

const adminPassword = 'john@123';

async function createAdminHash() {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  console.log(hashedPassword);
}

createAdminHash();