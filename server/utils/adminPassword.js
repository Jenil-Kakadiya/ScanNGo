const bcrypt = require('bcryptjs');

const adminPassword = 'Admi@123';

async function createAdminHash() {
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  console.log(hashedPassword);
}

createAdminHash();