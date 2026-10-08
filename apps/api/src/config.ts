import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnv({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});
export const config = z
  .object({
    DATABASE_URL: z.string().startsWith("mysql://"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    API_PORT: z.coerce.number().int().min(1024).max(65535).default(4000),
    WEB_ORIGIN: z.url().default("http://localhost:3000"),
    WHATSAPP_NUMBER: z
      .string()
      .regex(/^62\d{8,13}$/)
      .default("6285893802972"),
    PICKUP_ADDRESS: z.string().max(500).default(""),
    RESERVATION_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  })
  .parse(process.env);

if (
  config.NODE_ENV === "production" &&
  !config.WEB_ORIGIN.startsWith("https://")
)
  throw new Error("WEB_ORIGIN produksi wajib menggunakan HTTPS.");

export const storeSettings = () => ({
  whatsappNumber: config.WHATSAPP_NUMBER,
  pickupAddress: config.PICKUP_ADDRESS,
  reservationHours: config.RESERVATION_HOURS,
});
