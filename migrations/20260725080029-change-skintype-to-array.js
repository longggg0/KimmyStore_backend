"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Convert existing single-string values (e.g. "dry") into a one-element
    // array (e.g. {"dry"}) so no data is lost, then change the column type.
    await queryInterface.sequelize.query(`
      ALTER TABLE "Products"
      ALTER COLUMN "skinType" TYPE VARCHAR(255)[]
      USING CASE
        WHEN "skinType" IS NULL THEN NULL
        ELSE ARRAY["skinType"]
      END;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Reverse: take the first element of the array back into a single string
    await queryInterface.sequelize.query(`
      ALTER TABLE "Products"
      ALTER COLUMN "skinType" TYPE VARCHAR(255)
      USING "skinType"[1];
    `);
  },
};