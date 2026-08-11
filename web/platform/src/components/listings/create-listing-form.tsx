"use client";

import { useActionState } from "react";
import Link from "next/link";
import { listingCategories } from "@rescufood/listings-sdk";

import {
  createListingAction,
  type ListingFormState,
} from "@/app/listings/actions";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { DateTimeField } from "@/components/listings/date-time-field";
import { Label } from "@rescufood/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";
import { Textarea } from "@rescufood/ui/components/textarea";
import { cn } from "@/lib/utils";

const categoryLabels: Record<(typeof listingCategories)[number], string> = {
  produce: "Fresh produce",
  bakery: "Bakery",
  dairy: "Dairy",
  meat_seafood: "Meat & seafood",
  prepared_food: "Prepared food",
  packaged_dry_goods: "Packaged & dry goods",
  beverages: "Beverages",
  other: "Other",
};

function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CreateListingForm() {
  const [state, action, pending] = useActionState<ListingFormState, FormData>(
    createListingAction,
    {},
  );

  if (state.publishedId) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Your listing is live. Rescue partners can request it until the pickup
          window closes.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/listings" className={cn(buttonVariants())}>
            Your listings
          </Link>
          <Link
            href="/listings/new"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Post another
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5 md:grid-cols-2">
      <Field label="Category" htmlFor="category">
        <Select
          name="category"
          items={categoryLabels}
          defaultValue="produce"
          required
        >
          <SelectTrigger id="category" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {listingCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {categoryLabels[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-4 grid-cols-[2fr_1fr]">
        <Field label="Quantity" htmlFor="remainingQuantity">
          <Input
            id="remainingQuantity"
            name="remainingQuantity"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="24"
            required
          />
        </Field>
        <Field label="Unit" htmlFor="unit">
          <Input id="unit" name="unit" placeholder="loaves" required />
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor="description"
        hint=""
        className="md:col-span-2"
      >
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="24 loaves of sourdough from today's bake"
          required
        />
      </Field>

      <Field label="Allergens" htmlFor="allergens" hint="">
        <Input id="allergens" name="allergens" placeholder="Gluten, Sesame" />
      </Field>

      <DateTimeField id="useBy" name="useBy" label="Use by" />

      <Field
        label="Handling info"
        htmlFor="handlingInstructions"
        hint=""
        className="md:col-span-2"
      >
        <Textarea
          id="handlingInstructions"
          name="handlingInstructions"
          rows={2}
          placeholder="Keep dry, best eaten today"
        />
      </Field>

      <Field
        label="Pickup location"
        htmlFor="pickupLocation"
        className="md:col-span-2"
      >
        <Input
          id="pickupLocation"
          name="pickupLocation"
          placeholder="12 Bakery Lane, #01-08"
          required
        />
      </Field>

      <fieldset className="flex flex-col gap-2 md:col-span-2">
        <legend className="text-sm font-medium">Pickup window</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <DateTimeField
            id="pickupWindowStart"
            name="pickupWindowStart"
            label="From"
          />
          <DateTimeField
            id="pickupWindowEnd"
            name="pickupWindowEnd"
            label="Until"
          />
        </div>
      </fieldset>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive md:col-span-2">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="w-full md:col-span-2"
      >
        {pending ? "Publishing..." : "Publish listing"}
      </Button>
    </form>
  );
}
