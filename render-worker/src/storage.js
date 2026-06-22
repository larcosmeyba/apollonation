import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

// Cloudflare R2 is S3-compatible. Set:
//   R2_ENDPOINT  = https://<accountid>.r2.cloudflarestorage.com
//   R2_BUCKET    = apollo-renders
//   R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY
// The bucket must have a lifecycle rule deleting objects after 1 day.
const ENDPOINT = process.env.R2_ENDPOINT;
const BUCKET = process.env.R2_BUCKET;

const s3 = new S3Client({
  region: "auto",
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadAndPresign(filePath, key, ttlSeconds) {
  if (!ENDPOINT || !BUCKET) throw new Error("R2 not configured (R2_ENDPOINT / R2_BUCKET)");
  const { size } = await stat(filePath);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: createReadStream(filePath),
    ContentLength: size,
    ContentType: "video/mp4",
    // Hint browsers to download with a sensible filename.
    ContentDisposition: `attachment; filename="${key.split("/").pop()}"`,
  }));

  // Presigned GET. Cap at the object lifecycle so the link never outlives the file.
  const ttl = Math.min(ttlSeconds, 7 * 24 * 60 * 60); // S3 SigV4 hard cap is 7 days
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: ttl });
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  return { url, expiresAt };
}
