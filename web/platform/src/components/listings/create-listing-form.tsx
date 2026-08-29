"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import { RefreshCw, Trash2, Upload } from "lucide-react";
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
    <div data-animate="field" className={cn("flex flex-col gap-2", className)}>
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

  // Dynamic datetime to prevent stale
  const defaultWindowStart = dayjs()
    .add(1, "hour")
    .format("YYYY-MM-DDTHH:mm:ss");
  const defaultWindowEnd = dayjs().add(4, "hour").format("YYYY-MM-DDTHH:mm:ss");
  const defaultUseBy = dayjs().add(6, "hour").format("YYYY-MM-DDTHH:mm:ss");

  // Controlled form state with sensible defaults
  const [category, setCategory] = useState("produce");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [description, setDescription] = useState("");
  const [allergens, setAllergens] = useState("");
  const [useBy, setUseBy] = useState(defaultUseBy);
  const [handlingInstructions, setHandlingInstructions] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [pickupWindowStart, setPickupWindowStart] =
    useState(defaultWindowStart);
  const [pickupWindowEnd, setPickupWindowEnd] = useState(defaultWindowEnd);

  // Standardized image state
  const [listingImage, setListingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitIntent, setSubmitIntent] = useState<"available" | "draft">(
    "available",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setListingImage(file);
    setImagePreview(previewUrl);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setListingImage(null);
    setImagePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleSubmit = (formData: FormData) => {
    if (listingImage) {
      formData.set("image", listingImage);
    }
    if (!formData.get("intent")) {
      formData.set("intent", submitIntent);
    }
    action(formData);
  };

  const canSubmit = !pending;

  if (state.publishedId) {
    const isDraft = state.status === "draft";
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {isDraft
            ? "Your listing has been saved as a draft. You can edit or publish it anytime from your listings."
            : "Your listing is live. Rescue partners can request it until the pickup window closes."}
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
    <form
      action={handleSubmit}
      noValidate
      className="grid gap-5 md:grid-cols-2"
    >
      {/* Standardized Image Upload Slot */}
      <div data-animate="field" className="flex flex-col gap-2 md:col-span-2">
        <Label>Listing image</Label>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {!imagePreview ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-dashed border-2 border-border rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer w-full flex flex-col items-center justify-center gap-2"
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
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw className="size-4" />
                Replace
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <Field label="Category" htmlFor="category">
        <Select
          name="category"
          value={category}
          onValueChange={(val) => {
            if (val) setCategory(val);
          }}
          items={categoryLabels}
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

      <div data-animate="field" className="grid gap-4 grid-cols-[2fr_1fr]">
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
            required
          />
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </Field>

      <Field label="Allergens" htmlFor="allergens" hint="">
        <Input
          id="allergens"
          name="allergens"
          placeholder="Gluten, Sesame"
          value={allergens}
          onChange={(e) => setAllergens(e.target.value)}
        />
      </Field>

      <div data-animate="field">
        <DateTimeField
          id="useBy"
          name="useBy"
          label="Use by"
          value={useBy}
          onChange={setUseBy}
        />
      </div>

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
          value={pickupLocation}
          onChange={(e) => setPickupLocation(e.target.value)}
          required
        />
      </Field>

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

      {state.error ? (
        <p role="alert" className="text-sm text-destructive md:col-span-2">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 md:col-span-2">
        <Button
          type="submit"
          name="intent"
          value="available"
          size="lg"
          disabled={pending || !canSubmit}
          onClick={() => setSubmitIntent("available")}
          className="w-full sm:w-auto"
        >
          {pending && submitIntent === "available"
            ? "Publishing..."
            : "Publish listing"}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="draft"
          variant="outline"
          size="lg"
          formNoValidate
          disabled={pending || !canSubmit}
          onClick={() => setSubmitIntent("draft")}
          className="w-full sm:w-auto"
        >
          {pending && submitIntent === "draft"
            ? "Saving draft..."
            : "Save as draft"}
        </Button>
      </div>
    </form>
  );
}
