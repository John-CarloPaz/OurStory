import { describe, expect, it } from "vitest";
import { addDays, isValidDate, monthGrid, parseMonth, shiftMonth, yearlyOccurrences } from "@/lib/calendar";

describe("calendar helpers", () => {
  it("builds a six-week, Sunday-first grid covering the month", () => {
    const grid = monthGrid("2026-09");
    expect(grid).toHaveLength(42);
    expect(grid[0].date).toBe("2026-08-30"); // Sept 1, 2026 is a Tuesday
    expect(grid[2]).toEqual({ date: "2026-09-01", day: 1, inMonth: true });
    expect(grid.filter((d) => d.inMonth)).toHaveLength(30);
    expect(grid[41].date).toBe("2026-10-10");
  });

  it("navigates months across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("validates query values", () => {
    expect(parseMonth("2026-09", "2026-01-15")).toBe("2026-09");
    expect(parseMonth("2026-13", "2026-01-15")).toBe("2026-01");
    expect(parseMonth("drop table", "2026-01-15")).toBe("2026-01");
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-09-14")).toBe(true);
  });

  it("repeats yearly dates, never before the original, with Feb 29 on Feb 28 in other years", () => {
    expect(yearlyOccurrences("2026-09-14", "2026-08-30", "2026-10-10")).toEqual([{ date: "2026-09-14", years: 0 }]);
    expect(yearlyOccurrences("2026-09-14", "2027-08-29", "2027-10-09")).toEqual([{ date: "2027-09-14", years: 1 }]);
    expect(yearlyOccurrences("2026-09-14", "2025-08-31", "2025-10-11")).toEqual([]);
    expect(yearlyOccurrences("1996-02-29", "2027-02-01", "2027-03-01")).toEqual([{ date: "2027-02-28", years: 31 }]);
    expect(yearlyOccurrences("1995-12-31", "2026-11-29", "2027-01-09")).toEqual([{ date: "2026-12-31", years: 31 }]);
  });
});
