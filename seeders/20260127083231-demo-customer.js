'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */

    await queryInterface.bulkInsert('Customers',[
      {
        firstName: "Bunlong",
        lastName: "Horn",
        username: "Bunlong",
        email: "long@gmail.com",
        phone: "0924743343",
        password: "hassd",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        firstName: "kyle",
        lastName: "babe",
        username: "kylee",
        email: "kyle@gmail.com",
        phone: "09247343",
        password: "hassddd",
        createdAt: new Date(),
        updatedAt: new Date(),
    },
  ])

  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    await queryInterface.dropTable('Customers', null, {})
  }
};
