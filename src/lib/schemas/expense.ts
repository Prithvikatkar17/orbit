import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "food",
  "travel",
  "bills",
  "study",
  "fitness",
  "shopping",
  "misc",
] as const;

export const ExpenseCategorySchema = z.enum(EXPENSE_CATEGORIES);
export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;

export const EXPENSE_PAYMENT_MODES = ["upi", "cash", "card"] as const;
export const ExpensePaymentModeSchema = z.enum(EXPENSE_PAYMENT_MODES);
export type ExpensePaymentMode = z.infer<typeof ExpensePaymentModeSchema>;

export const ExpenseSchema = z.object({
  id: z.string().uuid(),
  amountPaise: z.number().int().positive(),
  category: ExpenseCategorySchema,
  paymentMode: ExpensePaymentModeSchema.default("upi"),
  note: z.string().max(160).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  deletedAt: z.number().int().nullable().optional(),
});

export type Expense = z.infer<typeof ExpenseSchema>;

/**
 * Format integer paise into Indian Rupee currency format (₹).
 * Omits .00 for whole rupee amounts, e.g. ₹40 instead of ₹40.00.
 * Includes 2 fraction digits for amounts with paise, e.g. ₹40.50.
 */
export function formatINR(amountPaise: number): string {
  const isNegative = amountPaise < 0;
  const absPaise = Math.abs(amountPaise);
  const rupees = absPaise / 100;
  const hasPaise = absPaise % 100 !== 0;

  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Parses user input (string or number like "40.50", "40", 40.5) into integer paise.
 * Returns 0 if invalid or non-numeric.
 */
export function parseINRToPaise(val: string | number): number {
  if (typeof val === "number") {
    if (isNaN(val) || !isFinite(val)) return 0;
    return Math.round(val * 100);
  }
  if (!val || typeof val !== "string") return 0;
  const clean = val.replace(/[^0-9.]/g, "");
  if (!clean) return 0;
  const num = parseFloat(clean);
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100);
}

export const CATEGORY_METADATA: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string }
> = {
  food: { label: "Food", icon: "Utensils", color: "#f97316" },
  travel: { label: "Travel", icon: "Compass", color: "#06b6d4" },
  bills: { label: "Bills", icon: "Receipt", color: "#8b5cf6" },
  study: { label: "Study", icon: "GraduationCap", color: "#3b82f6" },
  fitness: { label: "Fitness", icon: "Activity", color: "#10b981" },
  shopping: { label: "Shopping", icon: "ShoppingBag", color: "#ec4899" },
  misc: { label: "Misc", icon: "MoreHorizontal", color: "#64748b" },
};
