"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Promotion extends Model {
    static associate(models) {
      Promotion.belongsToMany(models.Product, {
        through: "PromotionProducts",
        as: "products",
        foreignKey: "promotionId",
        otherKey: "productId",
      });
    }
  }

  Promotion.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      discountPercent: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: { min: 1, max: 100 },
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Promotion",
    }
  );

  return Promotion;
};