import json
import urllib.parse

# Change these according to your R2 public domain and folder
R2_BASE_URL = "https://pub-1492a42fd1cc4d0eb64e5763a8c92133.r2.dev/medicines"

# Load the JSON file
with open("products.json", "r", encoding="utf-8") as f:
    products = json.load(f)

for product in products:
    # Extract filename from title or use existing image filename
    if product.get("title"):
        filename = product["title"].split()[0]  # e.g., 'Paracetamol'
        # If you want exact match with extension from old path:
        ext = product["image"].split('.')[-1] if '.' in product["image"] else "png"
        # Encode filename for URLs
        encoded_filename = urllib.parse.quote(f"{filename}.{ext}")
        # Update image URL
        product["image"] = f"{R2_BASE_URL}/{encoded_filename}"

# Save updated JSON
with open("products_updated.json", "w", encoding="utf-8") as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

print("Updated product JSON saved to products_updated.json")
