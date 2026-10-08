import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { config } from "./config.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Rejects cross-origin mutations, including login, before cookies are trusted. */
export const sameOrigin: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (
    req.get("origin") !== config.WEB_ORIGIN ||
    req.get("x-dsu-client") !== "web"
  )
    throw new HttpError(403, "Permintaan tidak diizinkan. Muat ulang halaman.");
  if (!req.is("application/json"))
    throw new HttpError(415, "Format permintaan harus JSON.");
  next();
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  if (error instanceof ZodError) {
    res.status(422).json({
      error: "Data tidak valid. Periksa kelengkapan dan format isian Anda.",
    });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res
      .status(409)
      .json({ error: "Data sudah digunakan. Periksa kembali masukan Anda." });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  ) {
    res.status(404).json({ error: "Data tidak ditemukan." });
    return;
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    res
      .status(409)
      .json({
        error: "Data masih digunakan oleh data lain dan tidak dapat dihapus.",
      });
    return;
  }
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "JSON tidak valid." });
    return;
  }
  if (
    typeof error === "object" &&
    error &&
    "status" in error &&
    error.status === 413
  ) {
    res.status(413).json({ error: "Ukuran permintaan terlalu besar." });
    return;
  }
  console.error(
    JSON.stringify({
      event: "request_failed",
      type: error instanceof Error ? error.name : "Unknown",
    }),
  );
  res
    .status(500)
    .json({ error: "Layanan belum dapat memproses permintaan. Coba lagi." });
};
