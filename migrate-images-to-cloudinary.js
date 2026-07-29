// migrate-images-to-cloudinary.js
//
// One-time script: finds every productImages row still pointing at a local
// "uploads/products/..." file, uploads that file to Cloudinary, and updates
// the row with the new Cloudinary URL + public ID.
//
// Run once from your Backend project root:
//   node migrate-images-to-cloudinary.js
//
// Safe to delete after it finishes successfully.

require("dotenv").config();
const path = require("path");
const fs = require("fs");
const cloudinary = require("./config/cloudinary"); // adjust if your config file lives elsewhere
const db = require("./models");
const { productImages } = db;

async function migrate() {
  // Adjust this if your local images were served from a different host/port
  const LOCAL_URL_MARKER = "/uploads/products/";

  const images = await productImages.findAll();
  const toMigrate = images.filter(
    (img) => img.productImage && img.productImage.includes(LOCAL_URL_MARKER)
  );

  console.log(`Found ${toMigrate.length} image(s) still using local storage.`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const img of toMigrate) {
    const fileName = img.productImage.split("/").pop();
    const filePath = path.join(process.cwd(), "uploads/products", fileName);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping id=${img.id} — file not found on disk: ${filePath}`);
      skipped++;
      continue;
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "products",
        resource_type: "image",
      });

      await img.update({
        productImage: result.secure_url,
        cloudinaryId: result.public_id,
      });

      console.log(`✅ Migrated id=${img.id} → ${result.secure_url}`);
      migrated++;
    } catch (error) {
      console.log(`❌ Failed id=${img.id} — ${error.message}`);
      failed++;
    }
  }

  console.log("\n--- Migration summary ---");
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (file missing): ${skipped}`);
  console.log(`Failed: ${failed}`);

  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration script crashed:", err);
  process.exit(1);
});