'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Customers', [{
      firstName: 'Super',
      lastName: 'Admin',
      username: 'admin',
      email: 'admin@example.com',
      phone: 0,
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Customers', { username: 'admin' });
  }
};