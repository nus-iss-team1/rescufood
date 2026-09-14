import { ListingsClient, type ListingsClientOptions } from "./client";
import { MockListingsClient } from "./mock";
import type { ListingsApi } from "./types";

/** Returns the in-memory stand-in when no service url is configured. */
export function createListingsClient(
  opts: ListingsClientOptions & { mock?: boolean }
): ListingsApi {
  return opts.mock ? new MockListingsClient() : new ListingsClient(opts);
}
