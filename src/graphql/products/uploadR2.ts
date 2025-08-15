import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

async function uploadFile(localPath: string, remoteKey: string) {
  const fileContent = fs.readFileSync(localPath);

  const upload = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_BUCKET_NAME!,
    Key: remoteKey,
    Body: fileContent,
    ContentType: "image/jpeg",
  });

  await r2.send(upload);
  console.log(`✅ Uploaded: ${remoteKey}`);
}

// Example: upload all from ./images/medicines
const folderPath = path.join(__dirname, "images", "medicines");
const files = fs.readdirSync(folderPath);

(async () => {
  for (const file of files) {
    const key = `medicines/${file}`;
    await uploadFile(path.join(folderPath, file), key);
  }
})();
