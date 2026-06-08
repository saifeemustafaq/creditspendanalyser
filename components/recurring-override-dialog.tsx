"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RECURRING_FREQUENCIES } from "@/lib/constants";
import type { RecurringFrequency, RecurringItem } from "@/types";
import {
  mobileDialogContentClass,
  mobileDialogDescriptionClass,
  mobileDialogFooterClass,
} from "@/lib/mobile-dialog";
import { cn } from "@/lib/utils";

interface Props {
  item: RecurringItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function RecurringOverrideDialogBody({
  item,
  onOpenChange,
  onSaved,
  onSavingChange,
}: {
  item: RecurringItem;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  onSavingChange: (saving: boolean) => void;
}) {
  const [frequency, setFrequency] = useState<RecurringFrequency>(item.frequency);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    onSavingChange(true);
    try {
      const res = await fetch("/api/recurring/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: item.merchant,
          type: item.type,
          action: "frequency_override",
          frequency,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to save override");
        return;
      }
      toast.success(`Frequency overridden to ${frequency}`);
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  return (
    <DialogContent className={cn(mobileDialogContentClass, "sm:max-w-lg")}>
      <DialogHeader>
        <DialogTitle>Override frequency</DialogTitle>
        <DialogDescription className={mobileDialogDescriptionClass}>
          Set how often{" "}
          <span className="font-medium text-foreground">{item.merchant}</span> should be treated as
          recurring.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURRING_FREQUENCIES.map((f) => (
              <SelectItem key={f} value={f} className="capitalize">
                {f.replace("-", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className={mobileDialogFooterClass}>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save override"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function RecurringOverrideDialog({ item, onOpenChange, onSaved }: Props) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onOpenChange(false);
      }}
    >
      {item ? (
        <RecurringOverrideDialogBody
          key={`${item.merchant}|${item.type}`}
          item={item}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
          onSavingChange={setSaving}
        />
      ) : null}
    </Dialog>
  );
}
