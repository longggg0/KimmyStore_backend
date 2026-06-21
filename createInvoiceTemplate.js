const fs = require("fs");
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
} = require("docx");

// Create a new document with sections directly
const doc = new Document({
  creator: "Your Company Name",
  title: "Invoice Template",
  description: "Invoice template for Docxtemplater",
  sections: [
    {
      children: [
        new Paragraph("COMPANY NAME"),
        new Paragraph("YOUR TAGLINE HERE"),
        new Paragraph(""),
        new Paragraph("Invoice Number: ${orderNumber}"),
        new Paragraph("Order Date: ${orderDate}"),
        new Paragraph("Customer: ${firstName} ${lastName}"),
        new Paragraph(""),

        // Items table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Table header
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("Product Name")] }),
                new TableCell({ children: [new Paragraph("Price")] }),
                new TableCell({ children: [new Paragraph("Qty")] }),
                new TableCell({ children: [new Paragraph("Amount")] }),
              ],
            }),
            // Table loop row
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("{#items}${ProductName}{/items}")] }),
                new TableCell({ children: [new Paragraph("{#items}${productPrice}{/items}")] }),
                new TableCell({ children: [new Paragraph("{#items}${qty}{/items}")] }),
                new TableCell({ children: [new Paragraph("{#items}${amount}{/items}")] }),
              ],
            }),
          ],
        }),
        new Paragraph(""),
        new Paragraph("Discount: ${discount}"),
        new Paragraph("Total: ${total}"),
        new Paragraph("${khmerDate}"),
      ],
    },
  ],
});

// Save DOCX
Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("Invoice_template.docx", buffer);
  console.log("Invoice_template.docx created successfully!");
});
