const router = require("express").Router();
const db = require("../../models");
const { Category, Product, Sequelize } = db;
const { Op } = db.Sequelize;

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Category management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         isActive:
 *           type: boolean
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               qty:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 */

/**
 * @swagger
 * /api/v2/category:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Electronics"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Create data successfully.
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       500:
 *         description: Failed to create category
 */
router.post("/", async (req, res) => {
  try {
    const { name, isActive } = req.body;
    const category = await Category.create({ name, isActive });
    res.json({
      message: "Create data successfully.",
      data: category,
    });
  } catch (error) {
    console.log("Failed add data : ", error);
    res.status(500).json({ message: "Failed to create category", error });
  }
});

/**
 * @swagger
 * /api/v2/category:
 *   get:
 *     summary: Get all categories with their products
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search categories by name (case-insensitive)
 *     responses:
 *       200:
 *         description: List of categories with products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Get data successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *       500:
 *         description: Failed to get categories
 */
router.get("/", async (req, res) => {
  try {
    const { search } = req.query;

    const allCategory = await Category.findAll({
      where: search
        ? Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("Category.name")),
            "LIKE",
            `%${search.toLowerCase()}%`
          )
        : {},
      include: {
        model: Product,
        as: "products",
      },
      order: [["id", "ASC"]],
    });

    res.json({
      message: "Get data successfully",
      data: allCategory,
    });
  } catch (error) {
    console.log("Failed get data : ", error);
    res.status(500).json({ message: "Failed to get categories", error });
  }
});

/**
 * @swagger
 * /api/v2/category/{id}:
 *   put:
 *     summary: Update a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Electronics"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Update data successfully.
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to update category
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.update({ name, isActive });

    res.json({
      message: "Update data successfully.",
      data: category,
    });
  } catch (error) {
    console.log("Failed update data : ", error);
    res.status(500).json({ message: "Failed to update category", error });
  }
});

/**
 * @swagger
 * /api/v2/category/{id}:
 *   delete:
 *     summary: Delete a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Delete data successfully.
 *       404:
 *         description: Category not found
 *       500:
 *         description: Failed to delete category
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.destroy();

    res.json({ message: "Delete data successfully." });
  } catch (error) {
    console.log("Failed delete data : ", error);
    res.status(500).json({ message: "Failed to delete category", error });
  }
});

module.exports = router;