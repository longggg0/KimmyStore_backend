"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Join all array values into a single comma-separated string,
    // so no data is lost during the revert.
    await queryInterface.sequelize.query(`
      ALTER TABLE "Products"
      ALTER COLUMN "skinType" TYPE VARCHAR(255)
      USING array_to_string("skinType", ', ');
    `);
  },

  async down(queryInterface, Sequelize) {
    // Reverse: split the comma-separated string back into an array
    await queryInterface.sequelize.query(`
      ALTER TABLE "Products"
      ALTER COLUMN "skinType" TYPE VARCHAR(255)[]
      USING CASE
        WHEN "skinType" IS NULL THEN NULL
        ELSE string_to_array("skinType", ', ')
      END;
    `);
  },
};