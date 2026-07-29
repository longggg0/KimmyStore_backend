const router = require("express").Router();
const db = require("../../models");
const { getReqTime, buildPurchaseHash, encodeBase64,buildCheckTransactionHash } = require("../utils/payway");
const { Customer, Order, OrderDetail, Payment } = db;
const axios = require("axios");

/**
 * @swagger
 * tags:
 *   name: Payment
 */

/**
 * @swagger
 * /api/v1/payment/{orderId}:
 *   post:
 *     summary: Create a payment for an order
 *     tags: [Payment]
 */
router.post("/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        { model: Customer, as: "customers" },
        { model: OrderDetail, as: "orderDetails" },
      ],
    });

    if (!order) {
      return res.status(404).json({
        message: `Order id = ${orderId} not found.`,
      });
    }

    const paywayTranId = `${Date.now()}${Math.random().toString(36).substring(2, 5)}`.substring(0, 20);

    const payment = await Payment.create({
      orderId: order.id,
      paywayTranId: paywayTranId,
      method: "ABA PAYWAY",
      status: "PENDING",
      remark: "Pay via ABA payway",
      amount: order.total,
    });

    const req_time = getReqTime();
    console.log("req_time generated:", req_time);
    console.log("current UTC time:", new Date().toISOString());
    console.log("current PNH time:", new Date().toLocaleString("en-US", { timeZone: "Asia/Phnom_Penh" }));

    let paywayItems = JSON.stringify(
      order.orderDetails?.map((detail) => ({
        name: detail.productName,
        quantity: detail.qty,
        price: Number(detail.productPrice),
      }))
    );
    paywayItems = encodeBase64(paywayItems);

    const returnUrl = `${process.env.FRONTEND_URL}/productPage?tranId=${paywayTranId}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/productPage`;

    const paymentPayload = {
      merchant_id: process.env.ABA_PAYWAY_MERCHANT_ID,
      req_time,
      tran_id: paywayTranId,
      amount: Number(order.total).toFixed(2),
      items: paywayItems,
      shipping: "0.00",
      firstname: order.customers?.username || "NA",
      lastname: order.customers?.username || "NA",
      email: order.customers?.email || "NA@gmail.com",
      phone: String(order.customers?.phone || "000000000"),
      type: "purchase",
      view_type: "popup",
      payment_option: "abapay_khqr",
      return_url: returnUrl,
      cancel_url: cancelUrl,
      continue_success_url: returnUrl,
      currency: "USD",
      payment_gate: 0,
    };

    const hash = buildPurchaseHash(paymentPayload);
    console.log("Final payload sent to ABA:", JSON.stringify({
      req_time: paymentPayload.req_time,
      tran_id: paymentPayload.tran_id,
      return_url: paymentPayload.return_url,
      cancel_url: paymentPayload.cancel_url,
      hash: hash,
    }, null, 2));
    return res.json({
      message: "Payment created successfully",
      data: {
        payment,
        payway: {
          action: `${process.env.ABA_PAYWAY_BASE_URL}/api/payment-gateway/v1/payments/purchase`,
          method: "POST",
          target: "aba_webservice",
          id: "aba_merchant_request",
          fields: {
            ...paymentPayload,
            hash,
          },
        },
      },
    });
  } catch (error) {
    console.error("Payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:tranId/check", async (req, res) => {
  try {
    const { tranId } = req.params;

    const payment = await Payment.findOne({
      where: { paywayTranId: tranId },
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    const req_time = getReqTime();
    const merchant_id = process.env.ABA_PAYWAY_MERCHANT_ID;
    const tran_id = payment.paywayTranId;

    const hash = buildCheckTransactionHash({ req_time, merchant_id, tran_id });

    const payload = {
      req_time,
      merchant_id,
      tran_id,
      hash,
    };
    const response = await axios.post(
      `${process.env.ABA_PAYWAY_BASE_URL}/api/payment-gateway/v1/payments/check-transaction-2`,
      payload,
    );
    console.log("response from ABA", response.data);

    const abaData = response.data;
    const statusCode = abaData?.status?.code;
    const paymentStatusCode = abaData?.data?.payment_status_code;
    const paymentStatus = abaData?.data?.payment_status;

    if (statusCode == "00") {
      if (paymentStatusCode === 0 && paymentStatus === "APPROVED") {
        payment.status = "PAID";
        payment.paidAt =abaData?.data?.transaction_date;
      } else if (
        paymentStatus === "DECLINED" ||
        paymentStatus === "FAILED" ||
        paymentStatusCode !== 0
      ) {
        payment.status = "FAILED";
      } else {
        payment.status = "PENDING";
      }

      payment.remark = JSON.stringify(abaData);
      await payment.save();
    }

    return res.json({
      message: "Payment checked successfully",
      data: {
        payment: payment,
        aba: abaData
      }
    })
  } catch (error) {
    console.error("Error", error);
  }
});

module.exports = router;