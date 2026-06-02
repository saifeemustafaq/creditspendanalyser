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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionType } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function RecurringAddDialog({ open, onOpenChange, onSaved }: Props) {
  const [merchant, setMerchant] = useState("");
  const [type, setType] = useState<TransactionType>("debit");
  const [saving, setSaving] = useState(false);

  function reset() {
    setMerchant("");
    setType("debit");
  }

  async function save() {
    const trimmed = merchant.trim();
    if (!trimmed) {
      toast.error("Enter a merchant name");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/recurring/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant: trimmed, type, action: "include" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Failed to add recurring item");
        return;
      }
      toast.success(`${trimmed} marked as recurring`);
      reset();
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add recurring item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !saving) {
          reset();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add recurring item</DialogTitle>
          <DialogDescription>
            Mark a merchant as recurring even if it hasn&apos;t shown a clear pattern yet.
            The detector will start tracking it once ≥2 occurrences are present.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="add-recurring-merchant">Merchant</Label>
            <Input
              id="add-recurring-merchant"
              placeholder="Exact merchant name as it appears in transactions"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <Label>Transaction type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="debit">Debit</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Add recurring"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
