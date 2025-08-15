const fs = require("fs");
const { MeiliSearch } = require("meilisearch");
require("dotenv").config();

async function updateProducts() {
  const indexName = "products";

  // Read updated data
  const products = JSON.parse(fs.readFileSync("products_updated.json", "utf8"));

  // Print updated products before upload
  console.log("\n--- Updated Products to Upload ---\n");
  console.log(JSON.stringify(products, null, 2));

  // Connect to Meilisearch
  const client = new MeiliSearch({
    host: process.env.MEILISEARCH_HOST,
    apiKey: process.env.MEILISEARCH_API_KEY
  });

  // Delete index if exists
  try {
    await client.index(indexName).delete();
    console.log(`Deleted existing index: ${indexName}`);
  } catch (e) {
    console.log("Index did not exist, skipping delete.");
  }

  // Create index with primary key
  await client.createIndex(indexName, { primaryKey: "id" });
  console.log(`Created index: ${indexName}`);

  // Upload products
  const task = await client.index(indexName).addDocuments(products);
  console.log("Upload task queued:", task);

  // Wait for completion
  await client.waitForTask(task.taskUid);
  console.log("✅ Products uploaded successfully!");
}

updateProducts().catch(console.error);
