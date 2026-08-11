"use client";

import * as React from "react";
import dayjs from "dayjs";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@rescufood/ui/components/button";
import { Calendar } from "@rescufood/ui/components/calendar";
import { Field, FieldGroup, FieldLabel } from "@rescufood/ui/components/field";
import { Input } from "@rescufood/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rescufood/ui/components/popover";
import { cn } from "@/lib/utils";

/**
 * Date and time pickers over one hidden input. Submits the local
 * "YYYY-MM-DDTHH:mm:ss" a datetime-local input would, so the server action
 * reads it unchanged.
 */
export function DateTimeField({
  id,
  name,
  label,
  className,
}: {
  id: string;
  name: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [time, setTime] = React.useState("");

  return (
    <FieldGroup className={cn("flex-row", className)}>
      <Field>
        <FieldLabel htmlFor={`${id}-date`}>{label}</FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                type="button"
                variant="outline"
                id={`${id}-date`}
                className="h-auto min-h-9 w-full justify-between px-2.5 py-1 font-normal"
              >
                {date ? dayjs(date).format("D MMM YYYY") : "Select date"}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <PopoverContent
            className="w-(--anchor-width) overflow-hidden p-0"
            align="start"
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              defaultMonth={date}
              onSelect={(next) => {
                setDate(next);
                setOpen(false);
              }}
              className="w-full"
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field className="w-32">
        <FieldLabel htmlFor={`${id}-time`}>Time</FieldLabel>
        <Input
          type="time"
          id={`${id}-time`}
          step="1"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </Field>
      <Input
        type="hidden"
        name={name}
        value={
          date && time ? `${dayjs(date).format("YYYY-MM-DD")}T${time}` : ""
        }
        readOnly
      />
    </FieldGroup>
  );
}
