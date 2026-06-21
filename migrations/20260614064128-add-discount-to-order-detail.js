'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('OrderDetails', 'originalPrice', {
      type: Sequelize.DECIMAL,
      allowNull: true,
    });
    await queryInterface.addColumn('OrderDetails', 'discountPercent', {
      type: Sequelize.DECIMAL,
      allowNull: true,
      defaultValue: 0,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('OrderDetails', 'originalPrice');
    await queryInterface.removeColumn('OrderDetails', 'discountPercent');
  },
};