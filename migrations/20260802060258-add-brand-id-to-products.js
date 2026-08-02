'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Products', 'brandId', {
      type: Sequelize.INTEGER,
      allowNull: true, // set to false if every product must have a brand
      references: {
        model: 'Brands',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL', // or 'CASCADE' / 'RESTRICT' depending on your business rules
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Products', 'brandId');
  },
};