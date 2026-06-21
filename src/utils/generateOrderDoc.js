const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const dayjs = require("dayjs");

const generateOrderDoc = (order) => {
  const templatePath = path.join(__dirname, "../templates/Invoice_template.docx");
  const content = fs.readFileSync(templatePath, "binary");

  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const items = order.orderDetails.map((item) => ({
    productName: item.productName,          // ✅ lowercase p (matches template)
    productPrice: Number(item.productPrice) || 0,
    qty: Number(item.qty) || 0,
    amount: (Number(item.productPrice) || 0) * (Number(item.qty) || 0),
  }));
  console.log({
    orderNumber: order.id,
    orderDate: dayjs(order.orderDate).format("DD MMM YYYY"),
    username: order.customers?.username,
    items,
    discount: Number(order.discount) || 0,
    total: Number(order.total) || 0,
    khmerDate: dayjs(order.orderDate).format("DD MMM YYYY"),
  });
  doc.render({
    orderNumber: order.id,                  // ✅ Order model uses `id`, not `orderNumber`
    orderDate: dayjs(order.orderDate).format("DD MMM YYYY"),
    username: order.customers.username,
    items,
    discount: Number(order.discount) || 0,
    total: Number(order.total) || 0,
    khmerDate: dayjs(order.orderDate).format("DD MMM YYYY"),
  });

  return doc.getZip().generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });
};

module.exports = generateOrderDoc;