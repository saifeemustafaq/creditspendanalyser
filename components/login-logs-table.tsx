"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CopyTextButton } from "@/components/copy-text-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableScrollRegion } from "@/components/table-scroll-region";
import {
  mobileDialogContentClass,
  mobileDialogDescriptionClass,
} from "@/lib/mobile-dialog";
import type { LoginAttemptLogApiRow } from "@/types";

type LoginLogsTableProps = {
  logs: LoginAttemptLogApiRow[];
};

export function LoginLogsTable({ logs }: LoginLogsTableProps) {
  const [selected, setSelected] = useState<LoginAttemptLogApiRow | null>(null);

  return (
    <>
      <TableScrollRegion>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Log ID</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((row) => (
              <TableRow
                key={row._id}
                className="cursor-pointer"
                onClick={() => setSelected(row)}
              >
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(row.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>{row.attemptedUsername || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {row.stage}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{row.message}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell className="font-mono text-xs">{row.logId}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <CopyTextButton text={JSON.stringify(row, null, 2)} label="Log entry" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScrollRegion>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className={mobileDialogContentClass}>
          <DialogHeader>
            <DialogTitle>Log detail — {selected?.logId}</DialogTitle>
            <DialogDescription className={mobileDialogDescriptionClass}>
              Full diagnostic payload for this failed login attempt.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <pre className="max-h-80 overflow-auto rounded bg-muted/60 p-3 text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(selected, null, 2)}
              </pre>
              <CopyTextButton text={JSON.stringify(selected, null, 2)} label="Log detail" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
