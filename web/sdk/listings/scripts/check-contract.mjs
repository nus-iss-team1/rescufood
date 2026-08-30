// Fails when this package drifts from service/listings, which owns the
// contract. Reads both sides straight from source, so it needs no running
// service, database or credentials.
//
// Every extractor exits 2 when it cannot find what it was asked for, so a
// declaration renamed out from under it is a loud failure, never a silent pass.

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..", "..");
const types = join(here, "..", "src", "types.ts");
const svc = (...p) => join(repo, "service", "listings", "src", ...p);

function broken(message) {
  console.error(`\n  contract check broken: ${message}`);
  console.error("  the check itself needs updating, not the types.");
  process.exit(2);
}

// Split on \r?\n so a CRLF checkout doesn't leave a trailing \r that breaks
// the bare "}" match in body() and the $ anchor in members().
const read = (path) => readFileSync(path, "utf8").split(/\r?\n/);

/** Body lines of an exported class or interface, to its closing brace. */
function body(path, name) {
  const lines = read(path);
  const start = lines.findIndex((l) =>
    new RegExp(`^export (class|interface) ${name}\\b`).test(l)
  );
  if (start === -1) broken(`${name} not found in ${relative(repo, path)}`);
  const end = lines.indexOf("}", start);
  if (end === -1) broken(`${name} in ${relative(repo, path)} is unterminated`);
  return lines.slice(start + 1, end);
}

/** Property name -> { optional, nullable }. Decorators and blank lines skip. */
function members(path, name) {
  const out = new Map();
  for (const line of body(path, name)) {
    const m = /^ {2}(\w+)([!?]?): (.+);$/.exec(line);
    if (!m) continue;
    out.set(m[1], {
      optional: m[2] === "?",
      nullable: /\bnull\b/.test(m[3]),
    });
  }
  if (out.size === 0) {
    broken(`${name} in ${relative(repo, path)} yielded no properties`);
  }
  return out;
}

/** String values of `export const NAME = [ ... ] as const`. */
function constArray(path, name) {
  const text = readFileSync(path, "utf8");
  const m = new RegExp(
    `export const ${name} = \\[([\\s\\S]*?)\\] as const`
  ).exec(text);
  if (!m) broken(`const array ${name} not found in ${relative(repo, path)}`);
  const values = [...m[1].matchAll(/['"]([\w_]+)['"]/g)].map((x) => x[1]);
  if (values.length === 0) broken(`const array ${name} is empty`);
  return values;
}

/** String values of a pgEnum declaration. */
function pgEnum(name) {
  const path = svc("db", "schema.ts");
  const text = readFileSync(path, "utf8");
  const m = new RegExp(
    `export const ${name} = pgEnum\\(\\s*'[\\w_]+',\\s*\\[([\\s\\S]*?)\\]`
  ).exec(text);
  if (!m) broken(`pgEnum ${name} not found in ${relative(repo, path)}`);
  const values = [...m[1].matchAll(/'([\w_]+)'/g)].map((x) => x[1]);
  if (values.length === 0) broken(`pgEnum ${name} is empty`);
  return values;
}

/** Literal members of `export type NAME = "a" | "b"`. */
function unionType(path, name) {
  const text = readFileSync(path, "utf8");
  const m = new RegExp(`export type ${name} = ([^;]+);`).exec(text);
  if (!m) broken(`union type ${name} not found in ${relative(repo, path)}`);
  const values = [...m[1].matchAll(/"([\w_]+)"/g)].map((x) => x[1]);
  if (values.length === 0) broken(`union type ${name} has no string members`);
  return values;
}

const drift = [];

function record(label, size, diffs) {
  if (diffs.length === 0) {
    console.log(`  ok    ${label.padEnd(48)} ${size}`);
    return;
  }
  console.log(`  DRIFT ${label}`);
  for (const d of diffs) console.log(`          ${d}`);
  drift.push(...diffs);
}

function compareShape(label, service, sdk) {
  const diffs = [];
  for (const key of [...new Set([...service.keys(), ...sdk.keys()])].sort()) {
    const a = service.get(key);
    const b = sdk.get(key);
    if (!a) diffs.push(`${key}: in the sdk, absent from the service`);
    else if (!b) diffs.push(`${key}: in the service, absent from the sdk`);
    else if (a.optional !== b.optional) {
      const s = a.optional ? "optional" : "required";
      const d = b.optional ? "optional" : "required";
      diffs.push(`${key}: ${s} in the service, ${d} in the sdk`);
    } else if (a.nullable !== b.nullable) {
      diffs.push(
        `${key}: nullable in the service=${a.nullable}, in the sdk=${b.nullable}`
      );
    }
  }
  record(label, `${service.size} properties`, diffs);
}

function compareValues(label, service, sdk) {
  const same = JSON.stringify(service) === JSON.stringify(sdk);
  record(
    label,
    `${service.length} values`,
    same ? [] : [`service ${JSON.stringify(service)}, sdk ${JSON.stringify(sdk)}`]
  );
}

console.log("service/listings owns the contract; checking the sdk against it\n");

for (const [file, svcName, sdkName] of [
  ["listings/dto/listing-response.dto.ts", "ListingResponseDto", "Listing"],
  ["listings/dto/listing-image-response.dto.ts", "ListingImageResponseDto", "ListingImage"],
  ["listings/dto/create-listing.dto.ts", "CreateListingDto", "NewListing"],
  ["listings/dto/update-listing.dto.ts", "UpdateListingDto", "ListingUpdate"],
  ["listings/dto/query-listings.dto.ts", "QueryListingsDto", "ListingQuery"],
  ["requests/dto/request-response.dto.ts", "RequestResponseDto", "ListingRequest"],
  ["requests/dto/create-request.dto.ts", "CreateRequestDto", "NewRequest"],
  ["requests/dto/update-request.dto.ts", "UpdateRequestDto", "RequestDecisionInput"],
  ["requests/dto/verify-pickup-code.dto.ts", "VerifyPickupCodeDto", "VerifyPickup"],
  ["requests/dto/query-requests.dto.ts", "QueryRequestsDto", "RequestQuery"],
  ["requests/dto/pickup-code-response.dto.ts", "PickupCodeResponseDto", "PickupCode"],
]) {
  compareShape(
    `${svcName} -> ${sdkName}`,
    members(svc(file), svcName),
    members(types, sdkName)
  );
}

compareValues("listing_category -> listingCategories", pgEnum("listingCategory"), constArray(types, "listingCategories"));
compareValues("listing_status -> listingStatuses", pgEnum("listingStatus"), constArray(types, "listingStatuses"));
compareValues("request_status -> requestStatuses", pgEnum("requestStatus"), constArray(types, "requestStatuses"));
compareValues(
  "requestDecisions -> requestDecisions",
  constArray(svc("requests/dto/update-request.dto.ts"), "requestDecisions"),
  constArray(types, "requestDecisions")
);
compareValues(
  "listingSortFields -> listingSortFields",
  constArray(svc("listings/dto/query-listings.dto.ts"), "listingSortFields"),
  constArray(types, "listingSortFields")
);
compareValues(
  "requestSortFields -> requestSortFields",
  constArray(svc("requests/dto/query-requests.dto.ts"), "requestSortFields"),
  constArray(types, "requestSortFields")
);
compareValues(
  "sortOrders -> SortOrder",
  constArray(svc("listings/dto/query-listings.dto.ts"), "sortOrders"),
  unionType(types, "SortOrder")
);

if (drift.length > 0) {
  console.error(
    `\n${drift.length} drift(s). Update web/sdk/listings/src to match service/listings.`
  );
  process.exit(1);
}
console.log("\nno drift");
