'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderDetail extends Model {
    static associate(models) {
      OrderDetail.belongsTo(models.Order, {
        foreignKey: "orderId",
        as: "order"
      });
      OrderDetail.belongsTo(models.Product, {
        foreignKey: "productId",
        as: "product"
      });
    }
  }

  OrderDetail.init({
    orderId:         DataTypes.INTEGER,
    productId:       DataTypes.INTEGER,
    productName:     DataTypes.STRING,
    productPrice:    DataTypes.DECIMAL,  // ← final price after discount
    originalPrice:   DataTypes.DECIMAL,  // ← original price before discount
    discountPercent: DataTypes.DECIMAL,  // ← discount percent applied
    qty:             DataTypes.INTEGER,
    amount:          DataTypes.DECIMAL,
  }, {
    sequelize,
    modelName: 'OrderDetail',
  });

  return OrderDetail;
};