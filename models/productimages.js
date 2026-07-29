'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class productImages extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  productImages.init({
    productId: DataTypes.INTEGER,
    productImage: DataTypes.TEXT,
    fileName: DataTypes.STRING,
    cloudinaryId: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'productImages',
  });
  return productImages;
};