const axios = require("axios");
const fs = require("fs");
const products = JSON.parse(fs.readFileSync("./products_updated.json", "utf-8"));

const BASE_URL = "http://localhost:7700";
const API_KEY = "sarang";

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_KEY}`,
};

async function deleteIndex() {
  try {
    await axios.delete(`${BASE_URL}/indexes/products`, { headers });
    console.log("🗑️ Index 'products' deleted.");
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("Index 'products' does not exist. Proceeding.");
    } else {
      throw error;
    }
  }
}

async function createIndex() {
  try {
    const res = await axios.post(
      `${BASE_URL}/indexes`,
      {
        uid: "products",
        primaryKey: "id", // ✅ Critical step here
      },
      { headers }
    );
    console.log("✅ Index created:", res.data);
  } catch (error) {
    console.error("❌ Error creating index:", error.response?.data || error.message);
    throw error;
  }
}

async function uploadDocuments() {
  try {
    const res = await axios.post(`${BASE_URL}/indexes/products/documents`, products, { headers });
    console.log("✅ Data indexed successfully:", res.data);
  } catch (err) {
    console.error("❌ Error indexing data:", err.response?.data || err.message);
  }
}

async function main() {
  try {
    await deleteIndex();
    await createIndex(); // Make sure this step succeeds with correct primaryKey
    await uploadDocuments();
  } catch (e) {
    console.error("🚨 Something went wrong:", e.message);
  }
}

main();
