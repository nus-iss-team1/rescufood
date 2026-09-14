// Sample payloads for rendering the ui without a running service. Typed
// against the interfaces above, so they cannot drift from the real shape.
// Covers every category and status, listings with and without photos,
// allergens and handling notes, and a request in each state.

import type { Listing, ListingImage, ListingRequest } from "./types";

const org = "3f1b2c4d-0000-4000-8000-000000000001";
const donor = "3f1b2c4d-0000-4000-8000-000000000002";
const rescue = "3f1b2c4d-0000-4000-8000-000000000003";

// Inline so the cards render photos with no network and no bucket.
const bakeryPhoto =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2U4ZGNjOCIvPjx0ZXh0IHg9IjE2MCIgeT0iOTgiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzZiNTMzNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QmFrZXJ5PC90ZXh0Pjwvc3ZnPg==";
const producePhoto =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Q4ZThkMCIvPjx0ZXh0IHg9IjE2MCIgeT0iOTgiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMCIgZmlsbD0iIzNjNWEzNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UHJvZHVjZTwvdGV4dD48L3N2Zz4=";

function photo(id: string, url: string): ListingImage {
  return {
    id: `img-${id}`,
    position: 0,
    url,
    createdAt: "2026-08-11T02:00:00.000Z",
  };
}

function listing(over: Partial<Listing> & Pick<Listing, "id">): Listing {
  return {
    donorOrgId: org,
    createdBy: donor,
    category: "other",
    description: "Surplus food",
    quantity: "10.00",
    unit: "kg",
    allergens: [],
    handlingInstructions: "",
    useBy: "2026-08-14T12:00:00.000Z",
    pickupLocation: "12 Bakery Lane, #01-08",
    pickupWindowStart: "2026-08-12T10:00:00.000Z",
    pickupWindowEnd: "2026-08-12T12:00:00.000Z",
    status: "available",
    version: 1,
    cancelledReason: "",
    createdAt: "2026-08-11T02:00:00.000Z",
    updatedAt: "2026-08-11T02:00:00.000Z",
    deletedAt: null,
    images: [],
    ...over,
  };
}

export const sampleListings: Listing[] = [
  listing({
    id: "aaaa1111-0000-4000-8000-000000000001",
    category: "bakery",
    description: "Sourdough loaves from today's bake",
    quantity: "24.00",
    unit: "loaves",
    allergens: ["Gluten", "Sesame"],
    handlingInstructions: "Keep dry, best eaten today",
    useBy: "2026-08-12T20:00:00.000Z",
    pickupWindowStart: "2026-08-11T18:00:00.000Z",
    pickupWindowEnd: "2026-08-11T20:00:00.000Z",
    images: [photo("1", bakeryPhoto)],
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000002",
    category: "produce",
    description: "Mixed vegetables, slightly bruised",
    quantity: "15.50",
    unit: "kg",
    pickupLocation: "8 Market Street, loading bay",
    useBy: "2026-08-13T12:00:00.000Z",
    pickupWindowStart: "2026-08-12T09:00:00.000Z",
    pickupWindowEnd: "2026-08-12T11:30:00.000Z",
    images: [photo("2", producePhoto)],
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000003",
    category: "prepared_food",
    description: "Chilled ready meals from a cancelled event",
    quantity: "30.00",
    unit: "portions",
    allergens: ["Milk", "Soy", "Celery"],
    handlingInstructions: "Keep below 4°C, transport in a cool box",
    pickupLocation: "1 Convention Way, service entrance",
    useBy: "2026-08-12T18:00:00.000Z",
    pickupWindowStart: "2026-08-11T16:00:00.000Z",
    pickupWindowEnd: "2026-08-11T19:00:00.000Z",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000004",
    category: "beverages",
    description: "Bottled juice, short-dated",
    quantity: "120.00",
    unit: "bottles",
    handlingInstructions: "Pallet of six cases, bring a trolley",
    pickupLocation: "40 Depot Road, bay 3",
    useBy: "2026-08-20T00:00:00.000Z",
    pickupWindowStart: "2026-08-13T08:00:00.000Z",
    pickupWindowEnd: "2026-08-13T17:00:00.000Z",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000005",
    category: "meat_seafood",
    description: "Frozen chicken portions",
    quantity: "18.00",
    unit: "kg",
    handlingInstructions: "Frozen, must stay below -18°C",
    pickupLocation: "22 Cold Store Avenue",
    useBy: "2026-09-30T00:00:00.000Z",
    pickupWindowStart: "2026-08-12T14:00:00.000Z",
    pickupWindowEnd: "2026-08-12T16:00:00.000Z",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000006",
    category: "packaged_dry_goods",
    description: "Rice and pasta, unopened cases",
    quantity: "60.00",
    unit: "kg",
    allergens: ["Gluten"],
    pickupLocation: "5 Warehouse Crescent",
    useBy: "2027-02-01T00:00:00.000Z",
    pickupWindowStart: "2026-08-14T10:00:00.000Z",
    pickupWindowEnd: "2026-08-14T15:00:00.000Z",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000007",
    category: "dairy",
    description: "Yoghurt multipacks near their date",
    quantity: "40.00",
    unit: "packs",
    allergens: ["Milk"],
    status: "reserved",
    useBy: "2026-08-13T00:00:00.000Z",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000008",
    category: "prepared_food",
    description: "Sandwich platters from a corporate lunch",
    quantity: "12.00",
    unit: "platters",
    allergens: ["Gluten", "Egg", "Mustard"],
    status: "collected",
    useBy: "2026-08-10T15:00:00.000Z",
    pickupWindowStart: "2026-08-10T13:00:00.000Z",
    pickupWindowEnd: "2026-08-10T15:00:00.000Z",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-000000000009",
    category: "produce",
    description: "Salad bags, past their display date",
    quantity: "9.00",
    unit: "kg",
    status: "expired",
    useBy: "2026-08-09T00:00:00.000Z",
    pickupWindowStart: "2026-08-08T09:00:00.000Z",
    pickupWindowEnd: "2026-08-08T11:00:00.000Z",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-00000000000a",
    category: "other",
    description: "Assorted store cupboard items",
    quantity: "25.00",
    unit: "items",
    status: "cancelled",
    cancelledReason: "Collected by a different charity",
  }),
  listing({
    id: "aaaa1111-0000-4000-8000-00000000000b",
    category: "bakery",
    description: "Pastries for tomorrow, not published yet",
    quantity: "36.00",
    unit: "pieces",
    allergens: ["Gluten", "Egg", "Milk"],
    status: "draft",
    useBy: "2026-08-15T12:00:00.000Z",
    pickupWindowStart: "2026-08-15T07:00:00.000Z",
    pickupWindowEnd: "2026-08-15T09:00:00.000Z",
  }),
];

function request(
  over: Partial<ListingRequest> & Pick<ListingRequest, "id">,
): ListingRequest {
  return {
    listingId: sampleListings[0].id,
    rescueOrgId: org,
    claimedBy: rescue,
    status: "active",
    requestedQuantity: "6.00",
    requestedAt: "2026-08-11T03:00:00.000Z",
    cancelledAt: null,
    cancellationReason: "",
    codeExpiresAt: null,
    codeGeneratedBy: null,
    verifiedBy: null,
    collectedQuantity: null,
    collectedAt: null,
    noShowReason: "",
    createdAt: "2026-08-11T03:00:00.000Z",
    updatedAt: "2026-08-11T03:00:00.000Z",
    ...over,
  };
}

export const sampleRequests: ListingRequest[] = [
  request({
    id: "bbbb2222-0000-4000-8000-000000000001",
    updatedAt: "2026-08-11T03:00:00.000Z",
    listingId: sampleListings[6].id,
    requestedQuantity: "40.00",
    codeExpiresAt: "2026-08-12T11:30:00.000Z",
    codeGeneratedBy: rescue,
  }),
  request({
    id: "bbbb2222-0000-4000-8000-000000000002",
    updatedAt: "2026-08-11T04:00:00.000Z",
    listingId: sampleListings[1].id,
    status: "active",
    requestedQuantity: "15.50",
    codeExpiresAt: "2026-08-12T11:30:00.000Z",
    codeGeneratedBy: rescue,
  }),
  request({
    id: "bbbb2222-0000-4000-8000-000000000003",
    updatedAt: "2026-08-10T09:00:00.000Z",
    listingId: sampleListings[2].id,
    status: "cancelled",
    cancelledAt: "2026-08-10T09:00:00.000Z",
    cancellationReason: "No longer needed, sourced elsewhere",
    requestedAt: "2026-08-10T08:30:00.000Z",
  }),
  request({
    id: "bbbb2222-0000-4000-8000-000000000004",
    updatedAt: "2026-08-10T14:15:00.000Z",
    listingId: sampleListings[7].id,
    status: "completed",
    requestedQuantity: "12.00",
    collectedQuantity: "11.00",
    collectedAt: "2026-08-10T14:15:00.000Z",
    verifiedBy: rescue,
    requestedAt: "2026-08-09T17:20:00.000Z",
  }),
  request({
    id: "bbbb2222-0000-4000-8000-000000000005",
    updatedAt: "2026-08-10T12:00:00.000Z",
    listingId: sampleListings[6].id,
    status: "cancelled",
    requestedQuantity: "20.00",
    cancelledAt: "2026-08-10T12:00:00.000Z",
    cancellationReason: "No van available in the pickup window",
    requestedAt: "2026-08-10T07:00:00.000Z",
  }),
  request({
    id: "bbbb2222-0000-4000-8000-000000000006",
    updatedAt: "2026-08-09T00:00:00.000Z",
    listingId: sampleListings[8].id,
    status: "expired",
    requestedQuantity: "9.00",
    requestedAt: "2026-08-08T06:00:00.000Z",
  }),
  request({
    id: "bbbb2222-0000-4000-8000-000000000007",
    updatedAt: "2026-08-10T11:00:00.000Z",
    listingId: sampleListings[9].id,
    status: "cancelled",
    requestedQuantity: "25.00",
    cancelledAt: "2026-08-10T11:00:00.000Z",
    cancellationReason: "Donor withdrew the listing before pickup",
    requestedAt: "2026-08-10T10:00:00.000Z",
  }),
  request({
    id: "bbbb2222-0000-4000-8000-000000000008",
    updatedAt: "2026-08-09T12:30:00.000Z",
    listingId: sampleListings[4].id,
    status: "no_show",
    requestedQuantity: "18.00",
    noShowReason: "Partner did not arrive in the pickup window",
    requestedAt: "2026-08-09T11:00:00.000Z",
  }),
];
