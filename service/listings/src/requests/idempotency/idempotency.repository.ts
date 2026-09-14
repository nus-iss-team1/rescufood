import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/db.module';
import { requestIdempotencyKeys } from '../../db/schema';

export type IdempotencyRecord = typeof requestIdempotencyKeys.$inferSelect;

// A 'pending' slot left behind by an attempt that crashed before completing
// is reclaimed this long after it was created.
export const STALE_PENDING_MS = 15 * 60 * 1000;

@Injectable()
export class IdempotencyRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // Claims the (org, key) slot as 'pending'. Returns the new row, or
  // undefined if the slot already exists - the caller then loads it to
  // decide between replay and conflict.
  async claimSlot(
    values: {
      rescueOrgId: string;
      idempotencyKey: string;
      requestFingerprint: string;
      expiresAt: Date;
    },
    executor: Database = this.db,
  ): Promise<IdempotencyRecord | undefined> {
    const [row] = await executor
      .insert(requestIdempotencyKeys)
      .values(values)
      .onConflictDoNothing({
        target: [
          requestIdempotencyKeys.rescueOrgId,
          requestIdempotencyKeys.idempotencyKey,
        ],
      })
      .returning();
    return row;
  }

  async find(
    rescueOrgId: string,
    idempotencyKey: string,
  ): Promise<IdempotencyRecord | undefined> {
    const [row] = await this.db
      .select()
      .from(requestIdempotencyKeys)
      .where(
        and(
          eq(requestIdempotencyKeys.rescueOrgId, rescueOrgId),
          eq(requestIdempotencyKeys.idempotencyKey, idempotencyKey),
        ),
      );
    return row;
  }

  // Flips the slot to 'completed' and pins the outcome. Runs in the claim's
  // transaction so the record and the claim commit together.
  async complete(
    id: string,
    claimId: string,
    responseSnapshot: unknown,
    expiresAt: Date,
    executor: Database = this.db,
  ): Promise<void> {
    await executor
      .update(requestIdempotencyKeys)
      .set({ status: 'completed', claimId, responseSnapshot, expiresAt })
      .where(eq(requestIdempotencyKeys.id, id));
  }

  // Frees a slot whose claim never committed so a genuine retry can proceed.
  async release(id: string): Promise<void> {
    await this.db
      .delete(requestIdempotencyKeys)
      .where(eq(requestIdempotencyKeys.id, id));
  }

  // Retention sweep: drops every record past its expiry (completed records
  // past the configured window, abandoned 'pending' slots past STALE_PENDING_MS).
  async deleteExpired(now: Date): Promise<number> {
    const rows = await this.db
      .delete(requestIdempotencyKeys)
      .where(lt(requestIdempotencyKeys.expiresAt, now))
      .returning({ id: requestIdempotencyKeys.id });
    return rows.length;
  }
}
