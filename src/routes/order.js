const express = require("express");
const router = express.Router();
const generateOrderDoc = require("../utils/generateOrderDoc");
const { Order, Customer, OrderDetail, Product, Promotion } = require("../../models"); // ← add Promotion

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OrderDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         orderId:
 *           type: integer
 *         productId:
 *           type: integer
 *         productName:
 *           type: string
 *         productPrice:
 *           type: number
 *         originalPrice:
 *           type: number
 *         discountPercent:
 *           type: number
 *         qty:
 *           type: integer
 *         amount:
 *           type: number
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         customerId:
 *           type: integer
 *         total:
 *           type: number
 *         discount:
 *           type: number
 *         orderDate:
 *           type: string
 *           format: date-time
 *         location:
 *           type: string
 *         orderDetails:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderDetail'
 */

/**
 * @swagger
 * /api/v2/order:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Orders fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       500:
 *         description: Internal server error
 */
router.get("/", async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: Customer, as: "customers" },
        { model: OrderDetail, as: "orderDetails" },
      ],
      order: [["id", "ASC"]],
    });

    return res.json({
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.log("Get orders error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v2/order/{orderId}/generate-docx:
 *   get:
 *     summary: Generate and download a DOCX file for an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: DOCX file downloaded successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Order not found
 */
router.get("/:orderId/generate-docx", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Customer, as: "customers" },
        { model: OrderDetail, as: "orderDetails" },
      ],
    });

    if (!order) return res.status(404).json({ message: "Order not found" });

    console.log("customers:", order.customers);
    console.log("orderDetails:", order.orderDetails?.length);

    const docBuffer = generateOrderDoc(order);
    res.setHeader("Content-Disposition", `attachment; filename=order-${order.id}.docx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.send(docBuffer);
  } catch (error) {
    console.error("Generate docx error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/v2/order/{orderId}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *       404:
 *         description: Order not found
 */
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Customer, as: "customers" },
        { model: OrderDetail, as: "orderDetails" },
      ],
    });

    if (!order) {
      return res.status(404).json({ message: `Order id=${orderId} not found` });
    }

    return res.json({ message: "Order fetched successfully", data: order });
  } catch (error) {
    console.log("Get order by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v2/order:
 *   post:
 *     summary: Create a new order with order details
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - items
 *             properties:
 *               customerId:
 *                 type: integer
 *                 example: 1
 *               discount:
 *                 type: number
 *                 example: 5.00
 *               location:
 *                 type: string
 *                 example: "Phnom Penh"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - qty
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       example: 2
 *                     qty:
 *                       type: integer
 *                       example: 3
 *     responses:
 *       200:
 *         description: Order created successfully
 *       404:
 *         description: Customer or product not found
 */
router.post("/", async (req, res) => {
  try {
    const { customerId, items, discount, location } = req.body;

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const orderDetailsData = [];
    let total = 0;

    for (const item of items) {
      const { productId, qty } = item;

      // Fetch product with active promotions
      const product = await Product.findByPk(productId, {
        include: [
          {
            model: Promotion,
            as: "promotions",
            through: { attributes: [] },
          },
        ],
      });

      if (!product) {
        return res.status(404).json({ message: `Product id=${productId} not found` });
      }

      if (product.qty < qty) {
        return res.status(400).json({
          message: `Insufficient stock for product "${product.name}". Available: ${product.qty}, requested: ${qty}`,
        });
      }

      // Check active promotion
      const now = new Date();
      const activePromotion = product.promotions?.find(
        (promo) =>
          promo.isActive &&
          new Date(promo.startDate) <= now &&
          new Date(promo.endDate) >= now
      );

      const originalPrice   = parseFloat(product.price);
      const discountPercent = activePromotion ? activePromotion.discountPercent : 0;
      const finalPrice      = activePromotion
        ? parseFloat((originalPrice - (originalPrice * discountPercent) / 100).toFixed(2))
        : originalPrice;

      const amount = parseFloat((finalPrice * qty).toFixed(2));
      total += amount;

      orderDetailsData.push({
        productId,
        productName:     product.name,
        productPrice:    finalPrice,      // ← discounted price
        originalPrice:   originalPrice,   // ← original price
        discountPercent: discountPercent, // ← discount percent applied
        qty,
        amount,
      });
    }

    total = parseFloat(total.toFixed(2));

    const lastOrder = await Order.findOne({
  order: [["orderNumber", "DESC"]],
});

const nextOrderNumber = lastOrder
  ? lastOrder.orderNumber + 1
  : 1000;

const createdOrder = await Order.create({
  customerId,
  orderNumber: nextOrderNumber,
  total,
  discount,
  orderDate: new Date(),
  location,
});

    const orderDetails = orderDetailsData.map((item) => ({
      ...item,
      orderId: createdOrder.id,
    }));
    await OrderDetail.bulkCreate(orderDetails);

    // Reduce stock for each product
    for (const item of items) {
      await Product.decrement("qty", {
        by: item.qty,
        where: { id: item.productId },
      });
    }

    const completedOrder = await Order.findByPk(createdOrder.id, {
      include: [
        {
          model: OrderDetail,
          as: "orderDetails",
          include: [{ model: Product, as: "product" }],
        },
      ],
    });

    return res.json({
      message: "Order created successfully.",
      data: completedOrder,
    });
  } catch (error) {
    console.log("Error : ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/v2/order/{orderId}:
 *   delete:
 *     summary: Delete an order and its order details
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       404:
 *         description: Order not found
 */
router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await OrderDetail.destroy({ where: { orderId } });
    await order.destroy();

    return res.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.log("Error : ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;