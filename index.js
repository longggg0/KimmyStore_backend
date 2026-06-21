require('dotenv').config();
const express = require('express')
const app = express()
const cors = require('cors');
const db = require("./models")
const userRouter = require("./src/routes/user")
const authMiddleware = require("./src/middlewares/middleware")
const {Category, Product, Order, Customer, OrderDetail} = db
const authRoute = require("./src/routes/auth")
const productRoute = require("./src/routes/product")
const orderRoute = require("./src/routes/order")
const userRoute = require("./src/routes/user")
const categoryRoute = require("./src/routes/category")
const paymentRoute = require("./src/routes/payment")
const fileupload = require("express-fileupload")
const path = require("path");
const { where } = require('sequelize')
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
const brandRoute = require("./src/routes/brand")
const promotionRoute = require("./src/routes/promotion");
const { startPromotionCron } = require("./src/crons/promotionCron"); // ← ADD THIS

const {User} = db

app.use(cors());
app.use(express.json())
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(
  fileupload({
  limits:{fileSize: 5 * 1024 * 1024},
  createParentPath: true
}))
const port = 3000

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

db.sequelize
.authenticate()
.then(()=> {
  console.log("Connected database successfully");
  startPromotionCron(); // ← ADD THIS (start cron after DB is connected)
})
.catch((error)=> console.log("Failed connect to database : ",error))

app.use("/api/v3/promotion", promotionRoute);
app.use("/api/v1/auth", authRoute)
app.use("/api/v3/product", productRoute)
app.use("/api/v2/users",userRoute)
app.use("/api/v2/category",categoryRoute)
app.use("/api/v2/order",orderRoute);
app.use("/api/v3/users",userRouter)
app.use("/api/v3/brand", brandRoute)
app.use("/api/v1/payment",paymentRoute)

app.get("/test", (req, res) => {
  res.json({ message: "server is working" });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})