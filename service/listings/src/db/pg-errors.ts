// Postgres error codes repositories let bubble up untranslated - services
// interpret them into domain-meaningful (and eventually HTTP) errors.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG_CHECK_VIOLATION = '23514';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
export const PG_UNIQUE_VIOLATION = '23505';

export interface PgError {
  code: string;
  detail?: string;
  constraint?: string;
}

// The pg driver error matching `code`, unwrapped from drizzle's
// DrizzleQueryError (which carries the driver error on `cause`).
export function pgError(err: unknown, code: string): PgError | undefined {
  let current: unknown = err;
  for (
    let depth = 0;
    depth < 5 && current !== null && typeof current === 'object';
    depth++
  ) {
    const record = current as Record<string, unknown>;
    if (record.code === code) {
      return {
        code,
        detail: typeof record.detail === 'string' ? record.detail : undefined,
        constraint:
          typeof record.constraint === 'string' ? record.constraint : undefined,
      };
    }
    current = record.cause;
  }
  return undefined;
}
