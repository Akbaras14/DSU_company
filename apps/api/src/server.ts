import { app } from "./app.js";
import { config } from "./config.js";
import { db } from "./db.js";
import { expireOrders } from "./orders.js";

await db.$connect();
const server = app.listen(config.API_PORT, "127.0.0.1", () =>
  console.info(`DSU API: http://127.0.0.1:${config.API_PORT}`),
);
let expiring = false;
const timer = setInterval(async () => {
  if (expiring) return;
  expiring = true;
  try {
    await expireOrders();
  } catch {
    console.error(JSON.stringify({ event: "reservation_expiry_failed" }));
  } finally {
    expiring = false;
  }
}, 30000);
timer.unref();
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    clearInterval(timer);
    server.close(() => {
      void db.$disconnect().then(() => process.exit(0));
    });
  });
