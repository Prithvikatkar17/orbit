import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ExpenseSchema } from "@/lib/schemas/expense";

export async function GET() {
  try {
    const allExpenses = await db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.date), desc(expenses.createdAt));

    return NextResponse.json({ success: true, expenses: allExpenses });
  } catch (error) {
    console.error("Failed to fetch expenses from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = body.id || crypto.randomUUID();
    const now = Date.now();

    const validated = ExpenseSchema.parse({
      id,
      amountPaise: Number(body.amountPaise),
      category: body.category,
      paymentMode: body.paymentMode || "upi",
      note: body.note !== undefined && body.note !== null ? String(body.note).trim() : null,
      date: body.date,
      createdAt: typeof body.createdAt === "number" ? body.createdAt : now,
      updatedAt: typeof body.updatedAt === "number" ? body.updatedAt : now,
      deletedAt: typeof body.deletedAt === "number" ? body.deletedAt : null,
    });

    const newExpense = {
      id: validated.id,
      amountPaise: validated.amountPaise,
      category: validated.category,
      paymentMode: validated.paymentMode,
      note: validated.note || null,
      date: validated.date,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
      deletedAt: validated.deletedAt ?? null,
    };

    await db.insert(expenses).values(newExpense).onConflictDoUpdate({
      target: expenses.id,
      set: newExpense,
    });

    return NextResponse.json({ success: true, expense: newExpense }, { status: 201 });
  } catch (error) {
    console.error("Failed to insert expense into SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create expense",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const expenseUpdates: Record<string, unknown> = {
      updatedAt: typeof updates.updatedAt === "number" ? updates.updatedAt : Date.now(),
    };

    if ("amountPaise" in updates && typeof updates.amountPaise === "number") {
      if (updates.amountPaise <= 0) {
        return NextResponse.json(
          { success: false, error: "Amount must be positive" },
          { status: 400 }
        );
      }
      expenseUpdates.amountPaise = updates.amountPaise;
    }
    if ("category" in updates && typeof updates.category === "string") {
      expenseUpdates.category = updates.category;
    }
    if ("paymentMode" in updates && typeof updates.paymentMode === "string") {
      expenseUpdates.paymentMode = updates.paymentMode;
    }
    if ("note" in updates) {
      expenseUpdates.note = updates.note ? String(updates.note).trim() : null;
    }
    if ("date" in updates && typeof updates.date === "string") {
      expenseUpdates.date = updates.date;
    }

    const [updated] = await db
      .update(expenses)
      .set(expenseUpdates)
      .where(eq(expenses.id, id))
      .returning();

    return NextResponse.json({ success: true, expense: updated });
  } catch (error) {
    console.error("Failed to update expense in SQLite:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update expense",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Expense ID is required" },
        { status: 400 }
      );
    }

    const now = Date.now();
    await db
      .update(expenses)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(expenses.id, id));

    return NextResponse.json({
      success: true,
      message: "Expense soft-deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete expense from SQLite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete expense" },
      { status: 500 }
    );
  }
}
