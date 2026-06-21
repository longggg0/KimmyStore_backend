'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Order extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Order.belongsTo(models.Customer,{
        foreignKey:"customerId",
        as:"customers"
      }),
      Order.hasMany(models.OrderDetail,{
        foreignKey:"orderId",
        as:"orderDetails"
      })
        
    }
  }
  Order.init({
    customerId: DataTypes.INTEGER,
    orderNumber: DataTypes.INTEGER,
    total: DataTypes.DECIMAL,
    discount: DataTypes.DECIMAL,
    orderDate: DataTypes.DATE,
    location: DataTypes.TEXT

  }, {
    sequelize,
    modelName: 'Order',
  });
  return Order;
};