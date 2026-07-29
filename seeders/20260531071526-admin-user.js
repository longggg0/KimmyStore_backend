'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Customers', [{
      username: 'admin',
      email: 'kimmystore01@gmail.com',
      phone: 0,
      password: await bcrypt.hash('KimmyStore2026', 10),
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Customers', { username: 'admin' });
  }
};