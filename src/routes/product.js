const express = require("express");
const path = require("path");
const router = express.Router();
const fs = require("fs");
const { Op, Sequelize } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const { Product, productImages, Category, OrderDetail, Promotion } = require("../../models");

const formatCountdown = (ms) => {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0)    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours > 0)   return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const attachPromotion = (product) => {
  const now = new Date();
  const { promotions, ...rest } = product;

  const activePromotion = promotions?.find(
    (promo) =>
      promo.isActive &&
      new Date(promo.startDate) <= now &&
      new Date(promo.endDate) >= now
  );

  const price = parseFloat(product.price);

  if (activePromotion) {
    const discountPercent = activePromotion.discountPercent;
    const discountedPrice = parseFloat((price - (price * discountPercent) / 100).toFixed(2));
    const saving          = parseFloat((price - discountedPrice).toFixed(2));
    const msRemaining     = new Date(activePromotion.endDate) - now;

    return {
      ...rest,
      promotion: {
        id:             activePromotion.id,
        name:           activePromotion.name,
        discountPercent,
        startDate:      formatDate(activePromotion.startDate),
        endDate:        formatDate(activePromotion.endDate),
        msRemaining,
        countdown:      formatCountdown(msRemaining),
      },
      discountedPrice,
      saving,
    };
  }

  return {
    ...rest,
    promotion:       null,
    discountedPrice: null,
    saving:          null,
  };
};

router.get("/", async (req, res) => {
  try {
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    let whereCondition = {};

    if (req.query.search) {
      whereCondition.name = { [Op.iLike]: `%${req.query.search}%` };
    }
    if (req.query.categoryId) {
      whereCondition.categoryId = { [Op.eq]: Number(req.query.categoryId) };
    }

    const { rows: products, count: total } = await Product.findAndCountAll({
      where: whereCondition,
      order: [["id", "ASC"]],
      limit,
      offset,
      include: [
        { model: Category, as: "category" },
        { model: Promotion, as: "promotions", through: { attributes: [] } },
      ],
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      message: "get data successfully.",
      data: products.map((p) => attachPromotion(p.toJSON())),
      pagination: {
        currentPages: page,
        limit,
        total,
        nextPages:    page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
      },
    });
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

router.get("/top-selling", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;

    const topProductIds = await OrderDetail.findAll({
      attributes: [
        "productId",
        [Sequelize.fn("SUM", Sequelize.col("qty")), "totalSold"],
      ],
      group: ["productId"],
      order: [[Sequelize.literal('"totalSold"'), "DESC"]],
      limit,
    });

    const productIds = topProductIds.map((item) => item.productId);
    const totalSoldMap = {};
    topProductIds.forEach((item) => {
      totalSoldMap[item.productId] = item.getDataValue("totalSold");
    });

    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      include: [
        { model: Category, as: "category" },
        { model: Promotion, as: "promotions", through: { attributes: [] } },
      ],
    });

    const result = products
      .map((p) => ({
        ...attachPromotion(p.toJSON()),
        totalSold: Number(totalSoldMap[p.id]) || 0,
      }))
      .sort((a, b) => b.totalSold - a.totalSold);

    res.json({ message: "get top selling products successfully.", data: result });
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/new-arrivals", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const products = await Product.findAll({
      where: { isActive: true },
      order: [["createdAt", "DESC"]],
      limit,
      include: [
        { model: Category, as: "category" },
        { model: Promotion, as: "promotions", through: { attributes: [] } },
      ],
    });

    res.json({
      message: "get new arrival products successfully.",
      data: products.map((p) => attachPromotion(p.toJSON())),
    });
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, categoryId, qty, price, size, description, skinType, isActive } = req.body;
    const product = await Product.create({ name, categoryId, qty, price, size, description, skinType, isActive });
    res.json({ message: "add data successfully.", data: product });
  } catch (error) {
    console.log("Failed add data : ", error);
  }
});

router.post("/:id/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.json({ message: "No file uploaded" });
    }

    const file      = req.files.file;
    const productId = req.params.id;
    const product   = await Product.findByPk(productId);

    if (!product) return res.json({ message: "Id Not Found" });

    const fileName   = `${uuidv4()}${path.extname(file.name)}`;
    const uploadPath = path.join(process.cwd(), "uploads/products", fileName);
    await file.mv(uploadPath);

    const domain   = `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${domain}/uploads/products/${fileName}`;

    const savedImage = await productImages.create({ productId, productImage: imageUrl, fileName: file.name });

    res.json({ message: "Upload successfully.", data: savedImage });
  } catch (error) {
    console.log("Error : ", error);
    res.json({ error: error.message });
  }
});

router.get("/images/:imageId/download", async (req, res) => {
  try {
    const { imageId } = req.params;
    const image = await productImages.findOne({
      where: { productId: imageId },
      order: [["id", "DESC"]],
    });

    if (!image) return res.json({ message: "Image not found." });

    const fileName = image.productImage.split("/").pop();
    const filePath = path.join(process.cwd(), "uploads/products", fileName);

    if (!fs.existsSync(filePath)) return res.json({ message: "file not found." });

    res.download(filePath, image.fileName);
  } catch (error) {
    console.log("Error : ", error);
  }
});

router.put("/:id/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) return res.json({ message: "No file uploaded" });

    const file      = req.files.file;
    const productId = req.params.id;
    const product   = await Product.findByPk(productId);

    if (!product) return res.json({ message: "Id Not Found" });

    const existingImage = await productImages.findOne({ where: { productId }, order: [["id", "DESC"]] });

    const fileName   = `${uuidv4()}${path.extname(file.name)}`;
    const uploadPath = path.join(process.cwd(), "uploads/products", fileName);
    await file.mv(uploadPath);

    const domain   = `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${domain}/uploads/products/${fileName}`;

    if (existingImage) {
      const oldFileName = existingImage.productImage.split("/").pop();
      const oldPath     = path.join(process.cwd(), "uploads/products", oldFileName);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);

      await existingImage.update({ productImage: imageUrl, fileName: file.name });
      return res.json({ message: "Image updated successfully.", data: existingImage });
    }

    const savedImage = await productImages.create({ productId, productImage: imageUrl, fileName: file.name });
    res.json({ message: "Image uploaded successfully.", data: savedImage });
  } catch (error) {
    console.log("Error : ", error);
    res.json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.json({ message: "Id Not Found" });

    const { name, categoryId, qty, price, size, description, skinType, isActive } = req.body;
    await product.update({ name, categoryId, qty, price, size, description, skinType, isActive });

    res.json({ message: "update data successfully.", data: product });
  } catch (error) {
    console.log("Failed update data : ", error);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.json({ message: "Id Not Found" });

    await product.destroy();
    res.json({ message: "delete data successfully." });
  } catch (error) {
    console.log("Failed delete data : ", error);
  }
});

module.exports = router;