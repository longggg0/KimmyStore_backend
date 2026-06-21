// routes/brand.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

const { Brand } = require("../../models");

/**
 * @swagger
 * /api/v3/brand:
 *   post:
 *     summary: Create a new brand with image
 *     tags: [Brands]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - file
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Nike"
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Brand created successfully
 *       400:
 *         description: No file uploaded
 */
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.files.file;
    const fileName = `${uuidv4()}${path.extname(file.name)}`;
    const uploadPath = path.join(process.cwd(), "uploads/brands", fileName);

    await file.mv(uploadPath);

    const domain = `${req.protocol}://${req.get("host")}`;
    const imageUrl = `${domain}/uploads/brands/${fileName}`;

    const brand = await Brand.create({ name, image: imageUrl });

    res.json({ message: "add data successfully.", data: brand });
  } catch (error) {
    console.error("Failed to add brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v3/brand:
 *   get:
 *     summary: Get all brands
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: List of all brands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Brand'
 */
router.get("/", async (req, res) => {
  try {
    const brands = await Brand.findAll({
      order: [["id", "ASC"]],
    });
    res.json({ message: "get data successfully.", data: brands });
  } catch (error) {
    console.error("Failed to get brands:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v3/brand/{id}:
 *   get:
 *     summary: Get a brand by ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Brand found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Brand not found
 */
router.get("/:id", async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json({ message: "get data successfully.", data: brand });
  } catch (error) {
    console.error("Failed to get brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v3/brand/{id}:
 *   put:
 *     summary: Update a brand (name and/or image)
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Adidas"
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Brand updated successfully
 *       404:
 *         description: Brand not found
 */
router.put("/:id", async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    const { name } = req.body;
    const updates = {};

    if (name) updates.name = name;

    // Handle new image upload
    if (req.files && req.files.file) {
      const file = req.files.file;
      const fileName = `${uuidv4()}${path.extname(file.name)}`;
      const uploadPath = path.join(process.cwd(), "uploads/brands", fileName);

      await file.mv(uploadPath);

      // Delete old image from disk
      if (brand.image) {
        const oldFileName = path.basename(brand.image);
        const oldFilePath = path.join(
          process.cwd(),
          "uploads/brands",
          oldFileName,
        );
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const domain = `${req.protocol}://${req.get("host")}`;
      updates.image = `${domain}/uploads/brands/${fileName}`;
    }

    await brand.update(updates);

    res.json({ message: "update data successfully.", data: brand });
  } catch (error) {
    console.error("Failed to update brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v3/brand/{id}:
 *   delete:
 *     summary: Delete a brand
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Brand deleted successfully
 *       404:
 *         description: Brand not found
 */
router.delete("/:id", async (req, res) => {
  try {
    const brand = await Brand.findByPk(req.params.id);

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    // Delete image from disk
    if (brand.image) {
      const oldFileName = path.basename(brand.image);
      const oldFilePath = path.join(
        process.cwd(),
        "uploads/brands",
        oldFileName,
      );
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    await brand.destroy();

    res.json({ message: "delete data successfully." });
  } catch (error) {
    console.error("Failed to delete brand:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
