"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Customers", "firstName");
    await queryInterface.removeColumn("Customers", "lastName");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Customers", "firstName", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("Customers", "lastName", {
      type: Sequelize.STRING,
    });
  },
};