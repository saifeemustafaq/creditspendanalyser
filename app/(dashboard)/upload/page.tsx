"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CARD_LABELS } from "@/types";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { FileUp, Loader2 } from "lucide-react";
import { UploadReviewTable } from "@/components/upload-review-table";
import { useRouter } from "next/navigation";
import { useUploadWizard } from "@/hooks/use-upload-wizard";

const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

export default function UploadPage() {
  const router = useRouter();
  const {
    step,
    busy,
    aiBusy,
    saving,
    dragOver,
    preview,
    result,
    aiSummary,
    uncategorizedCount,
    inputRef,
    setDragOver,
    handleFiles,
    changeCategory,
    runAICategorization,
    saveTransactions,
    startOver,
  } = useUploadWizard();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Upload statement</h2>
        <p className="text-sm text-muted-foreground">
          PDF, CSV, XLS/XLSX, or image. Review categories before saving — your edits become rules
          for next time.
        </p>
      </div>

      {/* Step 1: File Selection */}
      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Drop a file</CardTitle>
            <CardDescription>
              Max {MAX_UPLOAD_MB} MB. CSV/XLS files parse instantly. PDFs and images take
              10-30 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (busy) return;
                void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => !busy && inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-muted",
                busy && "pointer-events-none opacity-60",
              )}
            >
              {busy ? (
                <>
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                  <p className="text-sm">Parsing statement...</p>
                </>
              ) : (
                <>
                  <FileUp className="size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click or drop file here</p>
                  <p className="text-xs text-muted-foreground">PDF · CSV · XLS · JPG · PNG</p>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.csv,.xls,.xlsx,image/*"
                hidden
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review */}
      {step === "review" && preview && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Review transactions
                <Badge variant="secondary">{CARD_LABELS[preview.cardType]}</Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                {preview.duplicateSummary.newCount} new of {preview.transactions.length} parsed from{" "}
                {preview.originalFilename}. Edit categories for new rows before saving — manual
                changes are remembered for future uploads.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={startOver} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveTransactions} disabled={saving || uncategorizedCount > 0}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save to database
              </Button>
            </div>
          </div>

          <UploadReviewTable
            rows={preview.transactions}
            onChangeCategory={changeCategory}
            onAICategorize={runAICategorization}
            aiLoading={aiBusy}
            aiSummary={aiSummary}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            {uncategorizedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Resolve {uncategorizedCount} uncategorized{" "}
                {uncategorizedCount === 1 ? "transaction" : "transactions"} to enable save
              </p>
            )}
            <Button onClick={saveTransactions} disabled={saving || uncategorizedCount > 0}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Save to database
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.allDuplicates ? "Nothing new to import" : "Statement imported"}
              <Badge variant="secondary">{CARD_LABELS[result.cardType]}</Badge>
            </CardTitle>
            <CardDescription>
              {result.allDuplicates ? (
                <>
                  Every transaction in this file is already in your database.
                  {result.rowsSkippedDuplicate + result.rowsSkippedInFile > 0 && (
                    <>
                      {" "}Skipped{" "}
                      {result.rowsSkippedDuplicate + result.rowsSkippedInFile} duplicate
                      {result.rowsSkippedDuplicate + result.rowsSkippedInFile === 1 ? "" : "s"}.
                    </>
                  )}
                </>
              ) : (
                <>
                  Saved {result.transactionCount} transactions ·{" "}
                  {fmtCurrency(result.totalAmount)} total spend
                  {result.rowsSkippedDuplicate + result.rowsSkippedInFile > 0 && (
                    <> · skipped {result.rowsSkippedDuplicate + result.rowsSkippedInFile} duplicates</>
                  )}
                  {result.statementDate
                    ? ` · statement dated ${new Date(result.statementDate).toLocaleDateString()}`
                    : ""}
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            {!result.allDuplicates && (
              <Button onClick={() => router.push("/transactions")}>View transactions</Button>
            )}
            <Button variant="outline" onClick={startOver}>
              Upload another
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
