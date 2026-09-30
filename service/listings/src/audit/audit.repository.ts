import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';
import { DATABASE, type Database } from '../db/db.module';
import { auditLog } from '../db/schema';

// Set on system-driven events (the expiry sweep) - no user or org acted.
export const SYSTEM_ACTOR: AuditActor = { userId: null, orgId: null };

export const auditEntityTypes = ['listing', 'claim'] as const;
export type AuditEntityType = (typeof auditEntityTypes)[number];

export type AuditActor = { userId: string | null; orgId: string | null };

export type AuditEntry = {
  actor: AuditActor;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

export type AuditEvent = typeof auditLog.$inferSelect;

export type AuditEventPage = { items: AuditEvent[]; total: number };

export type AuditFilters = {
  userId?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  limit: number;
  offset: number;
};

export type AuditFeedQuery = AuditFilters & { entityType?: AuditEntityType };

// Append-only writer for audit_log (FR6). record() is the only write path;
// no update or delete method exists here by design.
@Injectable()
export class AuditRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record(entry: AuditEntry, executor: Database = this.db): Promise<void> {
    await executor.insert(auditLog).values({
      userId: entry.actor.userId,
      orgId: entry.actor.orgId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      reason: entry.reason ?? '',
      metadata: entry.metadata ?? {},
    });
  }

  // One entity's history, oldest first - the order a transaction is
  // reconstructed in. Served by audit_log_entity_idx.
  findByEntity(
    entityType: AuditEntityType,
    entityId: string,
    filters: AuditFilters,
  ): Promise<AuditEventPage> {
    const conditions = [
      eq(auditLog.entityType, entityType),
      eq(auditLog.entityId, entityId),
      ...filterConditions(filters),
    ];
    return this.page(and(...conditions), 'asc', filters);
  }

  // The cross-entity discovery feed, newest first, because an investigation
  // starts from "what just happened" rather than from a known entity.
  // Served by audit_log_created_at_idx, scanned backwards.
  findMany(query: AuditFeedQuery): Promise<AuditEventPage> {
    const conditions = [
      ...(query.entityType ? [eq(auditLog.entityType, query.entityType)] : []),
      ...filterConditions(query),
    ];
    return this.page(
      conditions.length ? and(...conditions) : undefined,
      'desc',
      query,
    );
  }

  // `created_at` defaults to now(), which is transaction-start time, so rows
  // written by one transaction share it - `id` breaks that tie to keep paging
  // stable. Page and total are read in one read-only snapshot so a concurrent
  // append can't shift rows between them; `total` counts the filtered set.
  private page(
    where: SQL | undefined,
    direction: 'asc' | 'desc',
    window: { limit: number; offset: number },
  ): Promise<AuditEventPage> {
    const order = direction === 'asc' ? asc : desc;

    return this.db.transaction(
      async (tx) => {
        const items = await tx
          .select()
          .from(auditLog)
          .where(where)
          .orderBy(order(auditLog.createdAt), order(auditLog.id))
          .limit(window.limit)
          .offset(window.offset);

        const [total] = await tx
          .select({ value: count() })
          .from(auditLog)
          .where(where);

        return { items, total: total.value };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }
}

function filterConditions(filters: AuditFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.userId) {
    conditions.push(eq(auditLog.userId, filters.userId));
  }
  if (filters.createdAtFrom) {
    conditions.push(gte(auditLog.createdAt, new Date(filters.createdAtFrom)));
  }
  if (filters.createdAtTo) {
    conditions.push(lte(auditLog.createdAt, new Date(filters.createdAtTo)));
  }
  return conditions;
}
