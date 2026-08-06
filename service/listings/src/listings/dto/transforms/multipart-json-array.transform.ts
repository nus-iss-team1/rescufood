// A multipart form can't send a nested array, so array fields are sent as a
// JSON-encoded string (e.g. '["a","b"]') and parsed back here; a JSON body
// already sends a real array and passes through untouched. An unparseable
// string is left as-is so it fails the field's own @IsArray with a normal
// 400, rather than throwing out of the transform.
export function parseMultipartJsonArray({
  value,
}: {
  value: unknown;
}): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
