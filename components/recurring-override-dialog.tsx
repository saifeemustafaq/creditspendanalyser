"use client";

import { useEffect, useState } from "react";
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

interface Props {
  item: RecurringItem | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RecurringOverrideDialog({ item, onOpenChange, onSaved }: Props) {
  const [frequency, setFrequency] = useState<RecurringFrequency>(item?.frequency ?? "monthly");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setFrequency(item.frequency);
  }, [item]);

  async function save() {
    if (!item) return;
    setSaving(true);
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
    }
  }

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open && !saving) onOpenChange(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override frequency</DialogTitle>
          <DialogDescription>
            {item
              ? `Set how often ${item.merchant} should be treated as recurring.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Select
            value={frequency}
            onValueChange={(v) => setFrequency(v as RecurringFrequency)}
          >
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save override"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
