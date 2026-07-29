"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    
    static associate(models) {
      Product.belongsTo(models.Category, {
        foreignKey: "categoryId",
        as: "category",
      });

      Product.hasMany(models.OrderDetail, {
        foreignKey: "productId",
        as: "orderDetails",
      });

      Product.belongsToMany(models.Promotion, {
    through: "PromotionProducts",
    as: "promotions",
    foreignKey: "productId",
    otherKey: "promotionId",
  });
    }
  }

  Product.init(
    {
      name: DataTypes.STRING,
      categoryId: DataTypes.INTEGER,
      price: DataTypes.DECIMAL,
      qty: DataTypes.INTEGER,
      isActive: DataTypes.BOOLEAN,
      size: DataTypes.STRING,
      description: DataTypes.TEXT,
      skinType: DataTypes.STRING
    },
    {
      sequelize,
      modelName: "Product",
    },
  );
  return Product;
};
