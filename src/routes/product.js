const express = require("express");
const router = express.Router();
const { Op, Sequelize } = require("sequelize");
const { v4: uuidv4 } = require("uuid");
const cloudinary = require("../../config/cloudinary");
const { Product, productImages, Category, Brand, OrderDetail, Promotion } = require("../../models");

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

/**
 * Common include array reused across GET endpoints so Category, Brand
 * and Promotion are always attached consistently.
 */
const productIncludes = [
  { model: Category, as: "category" },
  { model: Brand, as: "brand" },
  { model: Promotion, as: "promotions", through: { attributes: [] } },
];

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
    if (req.query.brandId) {
      whereCondition.brandId = { [Op.eq]: Number(req.query.brandId) };
    }
    if (req.query.skinType && req.query.skinType !== "all") {
      whereCondition.skinType = { [Op.iLike]: req.query.skinType };
    }

    const { rows: products, count: total } = await Product.findAndCountAll({
      where: whereCondition,
      order: [["id", "ASC"]],
      limit,
      offset,
      include: productIncludes,
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

    // Step 1: rank productIds by total qty sold, excluding orders whose product was deleted
    const topProductsRaw = await OrderDetail.findAll({
      attributes: [
        "productId",
        [Sequelize.fn("SUM", Sequelize.col("OrderDetail.qty")), "totalSold"],
      ],
      include: [
        {
          model: Product,
          as: "product",
          attributes: [], // don't select Product's columns here — just use it to filter
          required: true, // inner join: drops OrderDetail rows for deleted products
        },
      ],
      group: ["OrderDetail.productId"],
      order: [[Sequelize.literal('"totalSold"'), "DESC"]],
      limit,
    });

    const productIds = topProductsRaw.map((r) => r.productId);
    const totalSoldMap = {};
    topProductsRaw.forEach((r) => {
      totalSoldMap[r.productId] = Number(r.getDataValue("totalSold"));
    });

    // Step 2: fetch full product details (with category/brand/promotion) for just those ids
    const products = await Product.findAll({
      where: { id: { [Op.in]: productIds } },
      include: productIncludes,
    });

    const result = products
      .map((p) => ({
        ...attachPromotion(p.toJSON()),
        totalSold: totalSoldMap[p.id] || 0,
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
      include: productIncludes,
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

/**
 * GET /api/v3/product/by-brand/:brandId
 * Convenience endpoint to fetch all products for a given brand.
 */
router.get("/by-brand/:brandId", async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.brandId);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    const products = await Product.findAll({
      where: { brandId: req.params.brandId },
      include: productIncludes,
    });

    res.json({
      message: "get products by brand successfully.",
      data: products.map((p) => attachPromotion(p.toJSON())),
    });
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, categoryId, brandId, qty, price, size, description, skinType, isActive } = req.body;
    const product = await Product.create({ name, categoryId, brandId, qty, price, size, description, skinType, isActive });
    res.json({ message: "add data successfully.", data: product });
  } catch (error) {
    console.log("Failed add data : ", error);
    res.status(500).json({ message: "Failed to add product", error: error.message });
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

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "products",
      public_id: uuidv4(),
      resource_type: "image",
    });

    const savedImage = await productImages.create({
      productId,
      productImage: result.secure_url,
      cloudinaryId: result.public_id,
      fileName: file.name,
    });

    res.json({ message: "Upload successfully.", data: savedImage });
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ error: error.message });
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

    const downloadUrl = cloudinary.url(image.cloudinaryId, {
      flags: "attachment",
      resource_type: "image",
    });

    res.redirect(downloadUrl);
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ error: error.message });
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

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "products",
      public_id: uuidv4(),
      resource_type: "image",
    });

    if (existingImage) {
      if (existingImage.cloudinaryId) {
        await cloudinary.uploader.destroy(existingImage.cloudinaryId).catch((err) =>
          console.log("Cloudinary cleanup failed:", err.message)
        );
      }

      await existingImage.update({
        productImage: result.secure_url,
        cloudinaryId: result.public_id,
        fileName: file.name,
      });
      return res.json({ message: "Image updated successfully.", data: existingImage });
    }

    const savedImage = await productImages.create({
      productId,
      productImage: result.secure_url,
      cloudinaryId: result.public_id,
      fileName: file.name,
    });
    res.json({ message: "Image uploaded successfully.", data: savedImage });
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.json({ message: "Id Not Found" });

    const { name, categoryId, brandId, qty, price, size, description, skinType, isActive } = req.body;
    await product.update({ name, categoryId, brandId, qty, price, size, description, skinType, isActive });

    res.json({ message: "update data successfully.", data: product });
  } catch (error) {
    console.log("Failed update data : ", error);
    res.status(500).json({ message: "Failed to update product", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.json({ message: "Id Not Found" });

    const images = await productImages.findAll({ where: { productId: product.id } });
    for (const img of images) {
      if (img.cloudinaryId) {
        await cloudinary.uploader.destroy(img.cloudinaryId).catch((err) =>
          console.log("Cloudinary cleanup failed:", err.message)
        );
      }
    }

    await product.destroy();
    res.json({ message: "delete data successfully." });
  } catch (error) {
    console.log("Failed delete data : ", error);
    res.status(500).json({ message: "Failed to delete product", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: productIncludes,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "get data successfully.",
      data: attachPromotion(product.toJSON()),
    });
  } catch (error) {
    console.log("Error : ", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;