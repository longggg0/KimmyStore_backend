'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Products', 'size', { type: Sequelize.STRING });
    await queryInterface.addColumn('Products', 'description', { type: Sequelize.TEXT });
    await queryInterface.addColumn('Products', 'skinType', { type: Sequelize.STRING });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Products', 'size');
    await queryInterface.removeColumn('Products', 'description');
    await queryInterface.removeColumn('Products', 'skinType');
  }
};