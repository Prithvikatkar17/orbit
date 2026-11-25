import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  calculateExpenseBreakdown,
  calculateDailyBurnRate,
} from "../src/lib/services/analytics-service.ts";

const ROOT_DIR = process.cwd();

test("Phase 17C: Spending Breakdown & Daily Burn-Rate in /insights", async (t) => {
  await t.test("1. calculateExpenseBreakdown: category sorting, percentages, payment mode split & tombstone exclusion", () => {
    const sampleExpenses = [
      {
        id: "1",
        amountPaise: 5000, // ₹50
        category: "food",
        paymentMode: "upi",
        note: "Lunch",
        date: "2026-11-20",
        createdAt: 100,
        updatedAt: 100,
        deletedAt: null,
      },
      {
        id: "2",
        amountPaise: 15000, // ₹150
        category: "travel",
        paymentMode: "card",
        note: "Cab",
        date: "2026-11-21",
        createdAt: 200,
        updatedAt: 200,
        deletedAt: null,
      },
      {
        id: "3",
        amountPaise: 10000, // ₹100
        category: "food",
        paymentMode: "cash",
        note: "Groceries",
        date: "2026-11-22",
        createdAt: 300,
        updatedAt: 300,
        deletedAt: null,
      },
      {
        id: "4-tombstone",
        amountPaise: 99900,
        category: "shopping",
        paymentMode: "upi",
        note: "Deleted spend",
        date: "2026-11-21",
        createdAt: 400,
        updatedAt: 400,
        deletedAt: 1732200000000,
      },
      {
        id: "5-outside-range",
        amountPaise: 8000,
        category: "bills",
        paymentMode: "upi",
        note: "Old bill",
        date: "2026-10-31",
        createdAt: 500,
        updatedAt: 500,
        deletedAt: null,
      },
    ];

    const breakdown = calculateExpenseBreakdown(
      sampleExpenses,
      "2026-11-20",
      "2026-11-25"
    );

    // Total = 5000 + 15000 + 10000 = 30000 paise (excludes tombstone & Oct 31)
    assert.equal(breakdown.totalPaise, 30000);
    assert.equal(breakdown.count, 3);

    // Sorted descending: travel (15000, 50%) === food (15000, 50%)
    assert.equal(breakdown.byCategory[0].totalPaise, 15000);
    assert.equal(breakdown.byCategory[0].percentage, 50);
    assert.equal(breakdown.byCategory[1].totalPaise, 15000);
    assert.equal(breakdown.byCategory[1].percentage, 50);

    const shoppingCat = breakdown.byCategory.find((c) => c.category === "shopping");
    assert.equal(shoppingCat.totalPaise, 0, "Deleted tombstone must be excluded");
    assert.equal(shoppingCat.percentage, 0);

    // Payment mode split: upi=5000 (16.7%), cash=10000 (33.3%), card=15000 (50%)
    const upi = breakdown.byPaymentMode.find((m) => m.paymentMode === "upi");
    const cash = breakdown.byPaymentMode.find((m) => m.paymentMode === "cash");
    const card = breakdown.byPaymentMode.find((m) => m.paymentMode === "card");
    assert.equal(upi.totalPaise, 5000);
    assert.equal(upi.percentage, 16.7);
    assert.equal(cash.totalPaise, 10000);
    assert.equal(cash.percentage, 33.3);
    assert.equal(card.totalPaise, 15000);
    assert.equal(card.percentage, 50);
  });

  await t.test("2. calculateDailyBurnRate: contiguous series, elapsed days, projection & budget pacing", () => {
    const sampleExpenses = [
      {
        id: "1",
        amountPaise: 4000,
        category: "food",
        paymentMode: "upi",
        date: "2026-11-01",
        createdAt: 100,
        updatedAt: 100,
        deletedAt: null,
      },
      {
        id: "2",
        amountPaise: 2000,
        category: "travel",
        paymentMode: "cash",
        date: "2026-11-03",
        createdAt: 200,
        updatedAt: 200,
        deletedAt: null,
      },
    ];

    // Window: Nov 1 to Nov 5 (5 days), todayStr = Nov 3 (3 days elapsed)
    const burnRate = calculateDailyBurnRate(
      sampleExpenses,
      "2026-11-01",
      "2026-11-05",
      10000, // ₹100 budget
      "2026-11-03"
    );

    assert.equal(burnRate.series.length, 5);
    assert.deepEqual(
      burnRate.series.map((p) => p.date),
      ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]
    );
    assert.equal(burnRate.series[0].totalPaise, 4000);
    assert.equal(burnRate.series[0].cumulativePaise, 4000);
    assert.equal(burnRate.series[1].totalPaise, 0);
    assert.equal(burnRate.series[1].cumulativePaise, 4000);
    assert.equal(burnRate.series[2].totalPaise, 2000);
    assert.equal(burnRate.series[2].cumulativePaise, 6000);

    assert.equal(burnRate.totalPaise, 6000);
    assert.equal(burnRate.elapsedDays, 3);
    assert.equal(burnRate.totalDaysInWindow, 5);
    assert.equal(burnRate.avgDailyPaise, 2000); // 6000 / 3
    assert.equal(burnRate.projectedTotalPaise, 10000); // 2000 * 5
    assert.equal(burnRate.budgetUsedPercent, 60); // 6000 / 10000 = 60%
  });

  await t.test("3. Zero-expense edge case produces 0 percentages and 0 burn rate cleanly", () => {
    const emptyBreakdown = calculateExpenseBreakdown([], "2026-11-01", "2026-11-07");
    assert.equal(emptyBreakdown.totalPaise, 0);
    assert.equal(emptyBreakdown.count, 0);
    assert.ok(emptyBreakdown.byCategory.every((c) => c.percentage === 0 && c.totalPaise === 0));
    assert.ok(emptyBreakdown.byPaymentMode.every((m) => m.percentage === 0 && m.totalPaise === 0));

    const emptyBurn = calculateDailyBurnRate([], "2026-11-01", "2026-11-07", null, "2026-11-04");
    assert.equal(emptyBurn.series.length, 7);
    assert.equal(emptyBurn.totalPaise, 0);
    assert.equal(emptyBurn.avgDailyPaise, 0);
    assert.equal(emptyBurn.projectedTotalPaise, 0);
    assert.equal(emptyBurn.budgetUsedPercent, null);
  });

  await t.test("4. Insights page wires Flush-Before-Hydrate & Zero GPU Blur expense cards", () => {
    const insightsPagePath = path.join(ROOT_DIR, "src", "app", "insights", "page.tsx");
    const insightsContent = fs.readFileSync(insightsPagePath, "utf-8");

    assert.match(insightsContent, /await flushSyncQueue\(\)/);
    assert.match(insightsContent, /fetch\("\/api\/expenses"\)/);
    assert.match(insightsContent, /<SpendingBreakdownCard/);
    assert.match(insightsContent, /<DailyBurnRateCard/);

    const cardsPath = path.join(ROOT_DIR, "src", "components", "insights", "expense-insights.tsx");
    assert.ok(fs.existsSync(cardsPath), "expense-insights.tsx must exist");
    const cardsContent = fs.readFileSync(cardsPath, "utf-8");

    assert.match(cardsContent, /backdropFilter:\s*"none"/);
    assert.match(cardsContent, /formatINR\(/);
  });
});
