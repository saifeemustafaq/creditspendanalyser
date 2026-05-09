import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSession } from "@/lib/auth";
import { deleteStatement, getStatementById } from "@/lib/models/statements";
import { deleteTransactionsForStatement } from "@/lib/models/transactions";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid statement id" }, { status: 400 });
    }

    const statement = await getStatementById(id, session.userId);
    if (!statement) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    const deletedTransactions = await deleteTransactionsForStatement(
      statement._id,
      new ObjectId(session.userId),
    );
    const removed = await deleteStatement(id, session.userId);
    if (!removed) {
      return NextResponse.json({ error: "Statement not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deletedTransactions });
  } catch (err) {
    console.error("DELETE /api/statements/[id] failed:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
