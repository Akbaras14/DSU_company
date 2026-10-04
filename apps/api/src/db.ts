import "./config.js";
import { PrismaClient, Prisma } from "@prisma/client";

export const db = new PrismaClient();
export type Transaction = Prisma.TransactionClient;

/** Retries MySQL serialization conflicts; a failed attempt rolls back completely. */
export async function transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt >= 3)
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 30 * (attempt + 1)));
    }
  }
}

/** Serializes changes to one customer's cart and checkout across all API instances. */
export async function lockCustomer(tx: Transaction, id: string) {
  await tx.$queryRaw`SELECT id FROM User WHERE id = ${id} FOR UPDATE`;
}
