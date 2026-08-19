import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";

export const SOUNDS_DIR = path.resolve(process.cwd(), "uploads", "sounds");
fs.mkdirSync(SOUNDS_DIR, { recursive: true });

export const soundUpload = multer({
  storage: multer.diskStorage({
    destination: SOUNDS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mp4"].includes(
      file.mimetype,
    );
    if (ok) cb(null, true);
    else cb(new Error("Unsupported audio format"));
  },
});
