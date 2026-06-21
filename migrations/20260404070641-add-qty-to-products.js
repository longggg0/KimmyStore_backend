'use strict';

module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.addColumn('Products', 'qty', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface, DataTypes) {
    await queryInterface.removeColumn('Products', 'qty');
  }
};