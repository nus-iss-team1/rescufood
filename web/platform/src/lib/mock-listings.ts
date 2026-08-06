// Placeholder data for the listings page. The listing service does not
// exist yet, so nothing here is real: swap this module for its client
// once FR2 lands.

export const listingStatuses = [
  "available",
  "reserved",
  "collected",
  "expired",
  "cancelled",
] as const;

export type ListingStatus = (typeof listingStatuses)[number];

export interface Listing {
  id: string;
  title: string;
  category: string;
  quantity: string;
  allergens: string[];
  handling: string;
  pickupFrom: string;
  pickupTo: string;
  status: ListingStatus;
  createdAt: string;
}

export const mockListings: Listing[] = [
  {
    id: "1",
    title: "Bakery close-out",
    category: "Bakery",
    quantity: "24 loaves",
    allergens: ["Gluten", "Sesame"],
    handling: "Keep dry, best eaten today",
    pickupFrom: "2026-08-06T18:00:00+08:00",
    pickupTo: "2026-08-06T20:00:00+08:00",
    status: "available",
    createdAt: "2026-08-06T09:12:00+08:00",
  },
  {
    id: "2",
    title: "Surplus vegetables",
    category: "Fresh produce",
    quantity: "15 kg",
    allergens: [],
    handling: "Chilled, use within two days",
    pickupFrom: "2026-08-06T16:00:00+08:00",
    pickupTo: "2026-08-06T19:00:00+08:00",
    status: "reserved",
    createdAt: "2026-08-06T08:40:00+08:00",
  },
  {
    id: "3",
    title: "Chilled ready meals",
    category: "Prepared food",
    quantity: "30 portions",
    allergens: ["Milk", "Soy"],
    handling: "Keep below 4°C",
    pickupFrom: "2026-08-05T17:00:00+08:00",
    pickupTo: "2026-08-05T19:30:00+08:00",
    status: "collected",
    createdAt: "2026-08-05T10:05:00+08:00",
  },
  {
    id: "4",
    title: "Yoghurt multipacks",
    category: "Dairy",
    quantity: "40 packs",
    allergens: ["Milk"],
    handling: "Chilled",
    pickupFrom: "2026-08-04T15:00:00+08:00",
    pickupTo: "2026-08-04T17:00:00+08:00",
    status: "expired",
    createdAt: "2026-08-04T09:00:00+08:00",
  },
  {
    id: "5",
    title: "Sandwich platters",
    category: "Prepared food",
    quantity: "12 platters",
    allergens: ["Gluten", "Egg", "Mustard"],
    handling: "Chilled, event cancelled",
    pickupFrom: "2026-08-03T13:00:00+08:00",
    pickupTo: "2026-08-03T15:00:00+08:00",
    status: "cancelled",
    createdAt: "2026-08-03T07:30:00+08:00",
  },
];
