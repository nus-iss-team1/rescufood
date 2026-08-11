// Mirrors the response DTOs in service/listings/src. Timestamps arrive as
// ISO 8601 strings and numeric columns as decimal strings, so both are typed
// `string` here even where the service declares Date/numeric.

export const listingCategories = [
  "produce",
  "bakery",
  "dairy",
  "meat_seafood",
  "prepared_food",
  "packaged_dry_goods",
  "beverages",
  "other",
] as const;

export type ListingCategory = (typeof listingCategories)[number];

export const listingStatuses = [
  "draft",
  "available",
  "reserved",
  "collected",
  "expired",
  "cancelled",
] as const;

export type ListingStatus = (typeof listingStatuses)[number];

export const requestStatuses = [
  "pending",
  "accepted",
  "declined",
  "superseded",
  "cancelled",
  "completed",
  "no_show",
  "expired",
] as const;

export type RequestStatus = (typeof requestStatuses)[number];

/** The subset of statuses a client may set; the rest are system-driven. */
export const requestDecisions = [
  "accepted",
  "declined",
  "cancelled",
  "no_show",
] as const;

export type RequestDecision = (typeof requestDecisions)[number];

export const listingSortFields = [
  "useBy",
  "pickupWindowStart",
  "pickupWindowEnd",
  "remainingQuantity",
  "createdAt",
] as const;

export type ListingSortField = (typeof listingSortFields)[number];

export const requestSortFields = ["requestedAt", "updatedAt"] as const;

export type RequestSortField = (typeof requestSortFields)[number];

export type SortOrder = "asc" | "desc";

export interface Paginated<T> {
  items: T[];
  /** Total matching rows, ignoring limit/offset. */
  total: number;
}

export interface ListingImage {
  id: string;
  /** Display order within the listing, 0-based. */
  position: number;
  /** Time-limited signed URL; re-fetch the listing once it expires. */
  url: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  donorOrgId: string;
  createdBy: string;
  category: ListingCategory;
  description: string;
  /** Decimal string, e.g. "12.50". */
  remainingQuantity: string;
  unit: string;
  allergens: string[];
  handlingInstructions: string;
  useBy: string;
  pickupLocation: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
  status: ListingStatus;
  /** Echo back on update; the service rejects a stale value with 409. */
  version: number;
  cancelledReason: string;
  createdAt: string;
  updatedAt: string;
  /** Set once soft-deleted; deleted listings are absent from every read. */
  deletedAt: string | null;
  images: ListingImage[];
}

export interface NewListing {
  category: ListingCategory;
  description: string;
  remainingQuantity: number;
  unit: string;
  allergens?: string[];
  handlingInstructions?: string;
  useBy: string;
  pickupLocation: string;
  pickupWindowStart: string;
  pickupWindowEnd: string;
}

export interface ListingUpdate extends Partial<NewListing> {
  version: number;
  status?: ListingStatus;
  /** Only used when status is "cancelled". */
  cancelledReason?: string;
  /** Existing image ids to remove in the same request. */
  deleteImageIds?: string[];
}

export interface ListingQuery {
  status?: ListingStatus;
  category?: ListingCategory;
  /** Substring match, e.g. "123 Main" matches "123 Main St". */
  pickupLocation?: string;
  /** Donor organisation name; resolved server-side to its org id. */
  donorOrgName?: string;
  useByFrom?: string;
  useByTo?: string;
  pickupWindowStartFrom?: string;
  pickupWindowStartTo?: string;
  pickupWindowEndFrom?: string;
  pickupWindowEndTo?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
  sortBy?: ListingSortField;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

/** A rescue org's claim against a listing. The pickup code is never included. */
export interface ListingRequest {
  id: string;
  listingId: string;
  rescueOrgId: string;
  claimedBy: string;
  idempotencyKey: string;
  status: RequestStatus;
  /** Decimal string, e.g. "5.00". */
  requestedQuantity: string;
  requestedAt: string;
  respondedBy: string | null;
  respondedAt: string | null;
  declineReason: string;
  cancelledAt: string | null;
  cancellationReason: string;
  codeExpiresAt: string | null;
  codeGeneratedBy: string | null;
  verifiedBy: string | null;
  collectedQuantity: string | null;
  collectedAt: string | null;
  noShowReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewRequest {
  listingId: string;
  requestedQuantity: number;
  /** Mint once per submit; retrying replays the original result. */
  idempotencyKey: string;
}

export interface RequestDecisionInput {
  status: RequestDecision;
  /** Only used when status is "declined". */
  declineReason?: string;
  /** Only used when status is "cancelled". */
  cancellationReason?: string;
  /** Only used when status is "no_show". */
  noShowReason?: string;
}

export interface RequestQuery {
  status?: RequestStatus;
  listingId?: string;
  sortBy?: RequestSortField;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface PickupCode {
  /** 6-digit code, returned only here and never on a later read. */
  code: string;
  expiresAt: string;
}

export interface VerifyPickup {
  code: string;
  /** Defaults to the full requested quantity when omitted. */
  collectedQuantity?: number;
}
