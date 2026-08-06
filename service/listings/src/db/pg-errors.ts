// Postgres error codes repositories let bubble up untranslated - services
// interpret them into domain-meaningful (and eventually HTTP) errors.
// https://www.postgresql.org/docs/current/errcodes-appendix.html
export const PG_CHECK_VIOLATION = '23514';
export const PG_FOREIGN_KEY_VIOLATION = '23503';
export const PG_UNIQUE_VIOLATION = '23505';

export function isPgError(
  err: unknown,
  code: string,
): err is { code: string; detail?: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === code
  );
}
