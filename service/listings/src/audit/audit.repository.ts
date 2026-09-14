import { Inject, Injectable } from '@nestjs/common';
import { DATABASE, type Database } from '../db/db.module';
import { auditLog } from '../db/schema';

// Set on system-driven events (the expiry sweep) - no user or org acted.
export const SYSTEM_ACTOR: AuditActor = { userId: null, orgId: null };

export type AuditActor = { userId: string | null; orgId: string | null };

export type AuditEntry = {
  actor: AuditActor;
  action: string;
  entityType: 'listing' | 'claim';
  entityId: string;
  reason?: string;
  metadata?: Record<string, unknown>;
};

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
}
