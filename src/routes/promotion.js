const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Promotion, Product, Category } = require("../../models");

/**
 * @swagger
 * tags:
 *   name: Promotion
 */

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

/**
 * @swagger
 * /api/v3/promotion:
 *   get:
 *     summary: Get all promotions with pagination, search and status filter
 *     tags: [Promotion]
 */
router.get("/", async (req, res) => {
  try {
    const page   = Number(req.query.page)  || 1;
    const limit  = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const now    = new Date();
    const where  = {};

    if (req.query.search) {
      where.name = { [Op.iLike]: `%${req.query.search}%` };
    }

    if (req.query.status) {
      switch (req.query.status) {
        case "active":
          where.startDate = { [Op.lte]: now };
          where.endDate   = { [Op.gte]: now };
          where.isActive  = true;
          break;
        case "upcoming":
          where.startDate = { [Op.gt]: now };
          where.isActive  = true;
          break;
        case "expired":
          where.endDate = { [Op.lt]: now };
          break;
      }
    }

    const { rows: promotions, count: total } = await Promotion.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        {
          model: Product,
          as: "products",
          through: { attributes: [] },
          include: [{ model: Category, as: "category" }],
        },
      ],
    });

    const totalPages = Math.ceil(total / limit);

    const data = promotions.map((p) => {
      const msRemaining = new Date(p.endDate) - now;
      return {
        ...p.toJSON(),
        startDate: formatDate(p.startDate),
        endDate:   formatDate(p.endDate),
        msRemaining,
        countdown: formatCountdown(msRemaining),
      };
    });

    res.json({
      message: "Get promotions successfully.",
      data,
      pagination: {
        currentPages: page,
        limit,
        total,
        nextPages:    page < totalPages ? page + 1 : null,
        previousPage: page > 1          ? page - 1 : null,
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

/**
 * @swagger
 * /api/v3/promotion/active:
 *   get:
 *     summary: Get currently active promotions
 *     tags: [Promotion]
 */
router.get("/active", async (req, res) => {
  try {
    const now = new Date();

    const promotions = await Promotion.findAll({
      where: {
        isActive:  true,
        startDate: { [Op.lte]: now },
        endDate:   { [Op.gte]: now },
      },
      order: [["endDate", "ASC"]],
      include: [
        {
          model: Product,
          as: "products",
          through: { attributes: [] },
          include: [{ model: Category, as: "category" }],
        },
      ],
    });

    const data = promotions.map((p) => {
      const msRemaining = new Date(p.endDate) - now;
      return {
        ...p.toJSON(),
        startDate: formatDate(p.startDate),
        endDate:   formatDate(p.endDate),
        msRemaining,
        countdown: formatCountdown(msRemaining),
      };
    });

    res.json({ message: "Get active promotions successfully.", data });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

/**
 * @swagger
 * /api/v3/promotion/{id}:
 *   get:
 *     summary: Get a single promotion by id
 *     tags: [Promotion]
 */
router.get("/:id", async (req, res) => {
  try {
    const now = new Date();
    const promotion = await Promotion.findByPk(req.params.id, {
      include: [
        {
          model: Product,
          as: "products",
          through: { attributes: [] },
          include: [{ model: Category, as: "category" }],
        },
      ],
    });

    if (!promotion) return res.status(404).json({ message: "Promotion not found." });

    const msRemaining = new Date(promotion.endDate) - now;

    res.json({
      message: "Get promotion successfully.",
      data: {
        ...promotion.toJSON(),
        startDate: formatDate(promotion.startDate),
        endDate:   formatDate(promotion.endDate),
        msRemaining,
        countdown: formatCountdown(msRemaining),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

/**
 * @swagger
 * /api/v3/promotion:
 *   post:
 *     summary: Create a new promotion
 *     tags: [Promotion]
 */
// ── POST /api/v3/promotion ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      name,
      discountPercent,
      startDate,
      endDate,
      isActive = true,
      productIds = [],
    } = req.body;

    if (!name || !discountPercent || !endDate) {
      return res.status(400).json({
        message: "name, discountPercent, and endDate are required.",
      });
    }
    if (discountPercent <= 0 || discountPercent > 100) {
      return res.status(400).json({
        message: "discountPercent must be between 1 and 100.",
      });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end   = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({
        message: "endDate must be after startDate.",
      });
    }

    const promotion = await Promotion.create({
      name,
      discountPercent,
      startDate: start,
      endDate:   end,
      isActive,
    });

    if (productIds.length > 0) {
      await promotion.setProducts(productIds);
    }

    const result = await Promotion.findByPk(promotion.id, {
      include: [{ model: Product, as: "products", through: { attributes: [] } }],
    });

    const now         = new Date();
    const msRemaining = end - now;

    res.json({
      message: "Promotion created successfully.",
      data: {
        ...result.toJSON(),
        startDate: formatDate(start),
        endDate:   formatDate(end),
        msRemaining,
        countdown: formatCountdown(msRemaining),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

/**
 * @swagger
 * /api/v3/promotion/{id}:
 *   put:
 *     summary: Update a promotion
 *     tags: [Promotion]
 */
// ── PUT /api/v3/promotion/:id ─────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) return res.status(404).json({ message: "Promotion not found." });

    const { name, discountPercent, startDate, endDate, isActive, productIds } = req.body;

    const updatedStart = startDate ? new Date(startDate) : new Date(promotion.startDate);
    const updatedEnd   = endDate   ? new Date(endDate)   : new Date(promotion.endDate);

    if (updatedStart >= updatedEnd) {
      return res.status(400).json({ message: "endDate must be after startDate." });
    }
    if (discountPercent && (discountPercent <= 0 || discountPercent > 100)) {
      return res.status(400).json({ message: "discountPercent must be between 1 and 100." });
    }

    await promotion.update({
      name,
      discountPercent,
      startDate: updatedStart,
      endDate:   updatedEnd,
      isActive,
    });

    if (Array.isArray(productIds)) {
      await promotion.setProducts(productIds);
    }

    const result = await Promotion.findByPk(promotion.id, {
      include: [{ model: Product, as: "products", through: { attributes: [] } }],
    });

    const now         = new Date();
    const msRemaining = updatedEnd - now;

    res.json({
      message: "Promotion updated successfully.",
      data: {
        ...result.toJSON(),
        startDate: formatDate(updatedStart),
        endDate:   formatDate(updatedEnd),
        msRemaining,
        countdown: formatCountdown(msRemaining),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

/**
 * @swagger
 * /api/v3/promotion/{id}:
 *   delete:
 *     summary: Delete a promotion
 *     tags: [Promotion]
 */
router.delete("/:id", async (req, res) => {
  try {
    const promotion = await Promotion.findByPk(req.params.id);
    if (!promotion) return res.status(404).json({ message: "Promotion not found." });

    await promotion.setProducts([]);
    await promotion.destroy();

    res.json({ message: "Promotion deleted successfully." });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;