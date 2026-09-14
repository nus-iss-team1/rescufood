import { useEffect, useState } from "react";

import { Button } from "@rescufood/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rescufood/ui/components/dialog";
import { Textarea } from "@rescufood/ui/components/textarea";

export function ReasonDialog({
  title,
  open,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  open: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            A reason is required and kept on record.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason"
          autoFocus
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            disabled={!reason.trim() || busy}
            onClick={() => onConfirm(reason.trim())}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
