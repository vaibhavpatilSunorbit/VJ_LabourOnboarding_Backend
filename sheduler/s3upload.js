const AWS = require("aws-sdk");
const axios = require("axios");
const sharp = require("sharp");
const { poolPromise } = require("../config/dbConfig");
require("dotenv").config();

// AWS S3 Config
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucketName = "labour-be";
const baseS3Url = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/images/`;

const imageFields = [
  "uploadAadhaarFront",
  "uploadAadhaarBack",
  "photoSrc",
  "uploadIdProof",
  "uploadInductionDoc",
];

async function migrateImages() {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .query(`
        SELECT [id],
               [uploadAadhaarFront],
               [uploadAadhaarBack],
               [photoSrc],
               [uploadIdProof],
               [uploadInductionDoc]
        FROM [LabourOnboardingForm_TEST].[dbo].[labourOnboarding]
        WHERE [uploadAadhaarFront] IS NOT NULL AND [uploadAadhaarBack] IS NOT NULL
      `);

    const rows = result.recordset;

    for (const row of rows) {
      const updates = {};

      for (const field of imageFields) {
        const imageUrl = row[field];
        if (!imageUrl) continue;

        try {
          const originalFileName = imageUrl.split("/").pop();
          const baseName = originalFileName.split(".")[0]; // without extension
          const fileName = `${baseName}.webp`;

          // Step 1: Download original image
          const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
          const inputBuffer = response.data;

          // Step 2: Convert to WebP & compress
          const webpBuffer = await sharp(inputBuffer)
            .webp({ quality: 80 }) // adjust quality as needed
            .toBuffer();

          // Step 3: Upload to S3
          const s3Key = `imagesSandbox/${fileName}`;
          await s3
            .upload({
              Bucket: bucketName,
              Key: s3Key,
              Body: webpBuffer,
              ContentType: "image/webp",
            })
            .promise();

          const newUrl = `${baseS3Url}${fileName}`;
          updates[field] = newUrl;

          console.log(`✅ Converted, uploaded & updated ${field} for ID ${row.id}`);
        } catch (fileErr) {
          console.error(`❌ Error processing field ${field} for ID ${row.id}:`, fileErr.message);
        }
      }

      // Step 4: Update DB
      if (Object.keys(updates).length > 0) {
        const updateQuery = `
          UPDATE [LabourOnboardingForm_TEST].[dbo].[labourOnboarding]
          SET ${Object.keys(updates)
            .map((field) => `[${field}] = @${field}`)
            .join(", ")}
          WHERE [id] = @id
        `;

        const request = pool.request();
        request.input("id", row.id);
        for (const [key, value] of Object.entries(updates)) {
          request.input(key, value);
        }

        await request.query(updateQuery);
        console.log(`📝 Updated DB for ID ${row.id}`);
      }
    }

    console.log("🎉 All images converted, uploaded, and database updated.");
  } catch (err) {
    console.error("❌ Migration error:", err.message || err);
  }
}
// migrateImages();

module.exports = {
  migrateImages
};
