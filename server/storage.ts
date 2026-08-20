import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "node:crypto";

function storageConfig() {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Storage não configurado: defina AWS_S3_BUCKET, AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY.");
  }
  return { bucket, region, accessKeyId, secretAccessKey };
}

function client() {
  const config = storageConfig();
  return {
    config,
    s3: new S3Client({
      region: config.region,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === "true",
    }),
  };
}

function normalizeKey(relKey: string) {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, contentType = "application/octet-stream") {
  const { config, s3 } = client();
  const key = appendHashSuffix(normalizeKey(relKey));
  await s3.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: contentType, ServerSideEncryption: "AES256" }));
  return { key, url: key };
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  return { key, url: key };
}

export async function storageGetSignedUrl(relKey: string) {
  const { config, s3 } = client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }), { expiresIn: 300 });
}

export async function storageDelete(relKey: string) {
  const { config, s3 } = client();
  await s3.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: normalizeKey(relKey) }));
}
