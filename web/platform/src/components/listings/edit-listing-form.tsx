"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import {
  Check,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import {
  listingCategories,
  type Listing,
  type ListingStatus,
} from "@rescufood/listings-sdk";

import {
  updateListingAction,
  type ListingFormState,
} from "@/app/listings/actions";
import { DateTimeField } from "@/components/listings/date-time-field";
import { Badge } from "@rescufood/ui/components/badge";
import { Button, buttonVariants } from "@rescufood/ui/components/button";
import { Input } from "@rescufood/ui/components/input";
import { Label } from "@rescufood/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rescufood/ui/components/select";
import { toast } from "@rescufood/ui/components/sonner";
import { Textarea } from "@rescufood/ui/components/textarea";
import {
  categoryLabels,
  listingStatusVariant,
} from "@/lib/listing-labels";
import { cn } from "@/lib/utils";

const LOCKED_STATUSES = new Set(["reserved", "collected", "expired", "cancelled"]);

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
    <div data-animate="field" className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EditListingForm({ listing }: { listing: Listing }) {
  const [state, action, pending] = useActionState<ListingFormState, FormData>(
    updateListingAction,
    {},
  );

  const isLocked = LOCKED_STATUSES.has(listing.status);

  // Controlled form state initialized from listing prop - a Draft can have
  // any of these unset, so each falls back to an empty/unselected state
  // rather than trusting the field to always be filled in.
  const [category, setCategory] = useState<string>(listing.category ?? "");
  const [quantity, setQuantity] = useState<string>(
    listing.quantity != null ? String(listing.quantity) : "",
  );
  const [unit, setUnit] = useState<string>(listing.unit ?? "");
  const [description, setDescription] = useState<string>(
    listing.description ?? "",
  );
  const [allergens, setAllergens] = useState<string>(
    (listing.allergens ?? []).join(", "),
  );
  const [useBy, setUseBy] = useState<string>(
    listing.useBy
      ? dayjs(listing.useBy).format("YYYY-MM-DDTHH:mm:ss")
      : dayjs().format("YYYY-MM-DDTHH:mm:ss"),
  );
  const [handlingInstructions, setHandlingInstructions] = useState<string>(
    listing.handlingInstructions ?? "",
  );
  const [pickupLocation, setPickupLocation] = useState<string>(
    listing.pickupLocation ?? "",
  );
  const [pickupWindowStart, setPickupWindowStart] = useState<string>(
    listing.pickupWindowStart
      ? dayjs(listing.pickupWindowStart).format("YYYY-MM-DDTHH:mm:ss")
      : dayjs().format("YYYY-MM-DDTHH:mm:ss"),
  );
  const [pickupWindowEnd, setPickupWindowEnd] = useState<string>(
    listing.pickupWindowEnd
      ? dayjs(listing.pickupWindowEnd).format("YYYY-MM-DDTHH:mm:ss")
      : dayjs().format("YYYY-MM-DDTHH:mm:ss"),
  );
  const [status, setStatus] = useState<ListingStatus>(listing.status);

  // Image management
  const initialImage = listing.images?.[0];
  const [listingImage, setListingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialImage?.url ?? null,
  );
  const [deleteImageIds, setDeleteImageIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setListingImage(file);
    setImagePreview(previewUrl);

    // If there was an initial image on the server, mark it for deletion on replace
    if (initialImage?.id && !deleteImageIds.includes(initialImage.id)) {
      setDeleteImageIds((prev) => [...prev, initialImage.id]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setListingImage(null);
    setImagePreview(null);

    // If there was an initial image on the server, mark it for deletion
    if (initialImage?.id && !deleteImageIds.includes(initialImage.id)) {
      setDeleteImageIds((prev) => [...prev, initialImage.id]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Memory cleanup for object URLs on unmount or preview replacement
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Toast feedback
  useEffect(() => {
    if (state.updatedId) {
      toast.success("Listing updated successfully");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const handleSubmit = (formData: FormData) => {
    formData.set("id", listing.id);
    formData.set("version", String(listing.version));
    formData.set("currentStatus", listing.status);
    formData.set("allergens", allergens);

    if (deleteImageIds.length > 0) {
      formData.set("deleteImageIds", JSON.stringify(deleteImageIds));
    }

    if (listingImage) {
      formData.set("image", listingImage);
    }

    action(formData);
  };

  // Allowed status options for editing
  const getStatusOptions = (): { value: ListingStatus; label: string }[] => {
    if (listing.status === "draft") {
      return [
        { value: "draft", label: "Draft (not visible to partners)" },
        { value: "available", label: "Available (published)" },
        { value: "cancelled", label: "Cancelled" },
      ];
    }
    if (listing.status === "available") {
      return [
        { value: "available", label: "Available (published)" },
        { value: "draft", label: "Draft (unpublish)" },
        { value: "cancelled", label: "Cancelled" },
      ];
    }
    const fallbackLabel =
      listing.status.charAt(0).toUpperCase() + listing.status.slice(1);
    return [{ value: listing.status, label: fallbackLabel }];
  };

  const statusOptions = getStatusOptions();
  const statusLabels: Record<string, string> = Object.fromEntries(
    statusOptions.map((opt) => [opt.value, opt.label]),
  );

  if (state.updatedId) {
    return (
      <div data-animate="field" className="flex flex-col gap-4 py-4">
        <div className="flex items-center gap-2 text-foreground font-medium">
          <Check className="size-5 text-primary" />
          <span>Listing updated successfully!</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your changes have been saved and are now active.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/listings" className={cn(buttonVariants())}>
            Back to your listings
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Continue editing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} noValidate className="grid gap-5 md:grid-cols-2">
      {/* State Machine Lock Banner */}
      {isLocked && (
        <div
          data-animate="field"
          className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4 text-sm md:col-span-2"
        >
          <Lock className="size-5 shrink-0 text-muted-foreground mt-0.5" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">
                Listing is locked
              </span>
              <Badge
                variant={listingStatusVariant[listing.status]}
                className="capitalize text-xs"
              >
                {listing.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              This listing has advanced to <strong>{listing.status}</strong> and
              can no longer be modified.
            </p>
          </div>
        </div>
      )}

      {/* Standardized Image Upload Slot */}
      <div data-animate="field" className="flex flex-col gap-2 md:col-span-2">
        <Label>Listing image</Label>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={isLocked || pending}
        />

        {!imagePreview ? (
          <button
            type="button"
            onClick={() => !isLocked && fileInputRef.current?.click()}
            disabled={isLocked || pending}
            className={cn(
              "border-dashed border-2 border-border rounded-xl p-8 text-center transition-colors w-full flex flex-col items-center justify-center gap-2",
              isLocked
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:bg-muted/50",
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <Upload className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                Listing Image
              </span>
              <span className="text-xs text-muted-foreground">
                PNG, JPG, or WebP up to 10MB
              </span>
            </div>
          </button>
        ) : (
          <div className="aspect-video rounded-xl overflow-hidden ring-1 ring-border group relative w-full">
            <Image
              src={imagePreview}
              alt="Listing preview"
              fill
              unoptimized
              className="object-cover"
            />
            {!isLocked && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pending}
                >
                  <RefreshCw className="size-4" />
                  Replace
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={pending}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row with Category, Status, Quantity, Unit */}
      <div
        data-animate="field"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 md:col-span-2"
      >
        <Field label="Category" htmlFor="category">
          <Select
            name="category"
            value={category}
            onValueChange={(val) => {
              if (val) setCategory(val);
            }}
            items={categoryLabels}
            disabled={isLocked || pending}
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

        <Field
          label="Status"
          htmlFor="status"
          hint={isLocked ? "Terminal state" : undefined}
        >
          <Select
            name="status"
            value={status}
            onValueChange={(val) => {
              if (val) setStatus(val as ListingStatus);
            }}
            items={statusLabels}
            disabled={isLocked || pending}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Quantity" htmlFor="quantity">
          <Input
            id="quantity"
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="24"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={isLocked || pending}
            required
          />
        </Field>

        <Field label="Unit" htmlFor="unit">
          <Input
            id="unit"
            name="unit"
            placeholder="loaves"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={isLocked || pending}
            required
          />
        </Field>
      </div>

      {/* Description */}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isLocked || pending}
          required
        />
      </Field>

      {/* Allergens single textbox */}
      <Field label="Allergens" htmlFor="allergens" hint="">
        <Input
          id="allergens"
          name="allergens"
          placeholder="Gluten, Sesame"
          value={allergens}
          onChange={(e) => setAllergens(e.target.value)}
          disabled={isLocked || pending}
        />
      </Field>

      {/* Use By DateTime */}
      <div data-animate="field">
        <DateTimeField
          id="useBy"
          name="useBy"
          label="Use by"
          value={useBy}
          onChange={setUseBy}
        />
      </div>

      {/* Handling Instructions */}
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
          value={handlingInstructions}
          onChange={(e) => setHandlingInstructions(e.target.value)}
          disabled={isLocked || pending}
        />
      </Field>

      {/* Pickup Location */}
      <Field
        label="Pickup location"
        htmlFor="pickupLocation"
        className="md:col-span-2"
      >
        <Input
          id="pickupLocation"
          name="pickupLocation"
          placeholder="12 Bakery Lane, #01-08"
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          disabled={isLocked || pending}
          required
        />
      </Field>

      {/* Pickup Window */}
      <fieldset
        data-animate="field"
        className="flex flex-col gap-2 md:col-span-2"
      >
        <legend className="text-sm font-medium">Pickup window</legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <DateTimeField
            id="pickupWindowStart"
            name="pickupWindowStart"
            label="From"
            value={pickupWindowStart}
            onChange={setPickupWindowStart}
          />
          <DateTimeField
            id="pickupWindowEnd"
            name="pickupWindowEnd"
            label="Until"
            value={pickupWindowEnd}
            onChange={setPickupWindowEnd}
          />
        </div>
      </fieldset>

      {/* Error message if any */}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive md:col-span-2">
          {state.error}
        </p>
      ) : null}

      {/* Form Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 md:col-span-2">
        <Button
          type="submit"
          size="lg"
          disabled={isLocked || pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Saving changes..." : "Save changes"}
        </Button>
        <Link
          href="/listings"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full sm:w-auto",
          )}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
