const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Customer } = require("../../models");
const crypto = require("crypto");
const { sendOtpEmail } = require("../utils/mailer");

// GET all customers
router.get("/customers", async (req, res) => {
  try {
    const customers = await Customer.findAll({
      attributes: { exclude: ["password"] },
    });

    const customersWithToken = customers.map((customer) => {
      const customerData = customer.toJSON();
      const token = jwt.sign(
        {
          id: customerData.id,
          email: customerData.email,
          username: customerData.username,
          fullName: customerData.username,
          role: customerData.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      return { ...customerData, token };
    });

    res.json({ message: "success", data: customersWithToken });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

// REGISTER — always creates 'user' role
router.post("/register", async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    if (!username || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 👇 Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const existing = await Customer.findOne({
      where: { [Op.or]: [{ email }, { username }] },
    });

    if (existing) {
      const field = existing.email === email ? "Email" : "Username";
      return res.status(409).json({ message: `${field} is already in use` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      username,
      email,
      phone,
      password: hashedPassword,
      role: "user",
    });

    const { password: _, ...safeCustomer } = customer.toJSON();

    res.status(201).json({ message: "Register success", data: safeCustomer });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "Register failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return res.status(404).json({ message: "Email not found" });
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: customer.id,
        email: customer.email,
        username: customer.username,
        fullName: customer.username,
        role: customer.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ message: "Login success", data: token });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "Login failed" });
  }
});

// ── STEP 1: Request OTP ─────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return res.json({ message: "If that email exists, an OTP has been sent" });
    }

    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await customer.update({ otpCode, otpExpiry });
    await sendOtpEmail(email, otpCode);

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// ── STEP 2: Verify OTP ──────────────────────────────────────────
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const customer = await Customer.findOne({ where: { email } });
    if (!customer || !customer.otpCode || !customer.otpExpiry) {
      return res.status(400).json({ message: "No OTP requested for this email" });
    }

    if (new Date() > customer.otpExpiry) {
      await customer.update({ otpCode: null, otpExpiry: null });
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (customer.otpCode !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Clear OTP and issue a short-lived reset token
    await customer.update({ otpCode: null, otpExpiry: null });

    const resetToken = jwt.sign(
      { id: customer.id, purpose: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ message: "OTP verified", resetToken });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "OTP verification failed" });
  }
});

// ── STEP 3: Reset Password ──────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Reset token required" });
    }

    const resetToken = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired reset token" });
    }

    if (payload.purpose !== "password-reset") {
      return res.status(403).json({ message: "Invalid token purpose" });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const customer = await Customer.findByPk(payload.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await customer.update({ password: hashedPassword });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.log("Error", error);
    res.status(500).json({ message: "Password reset failed" });
  }
});

module.exports = router;