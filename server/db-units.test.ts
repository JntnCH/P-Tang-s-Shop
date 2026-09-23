import { describe, expect, it } from "vitest";
import { buildSkuPrefix, DEFAULT_UNITS, normalizeUnitName, pickNextSku } from "./db-units";

describe("unit settings rules", () => {
  it("ships with the common Thai grocery units", () => {
    expect(DEFAULT_UNITS).toContain("ชิ้น");
    expect(DEFAULT_UNITS).toContain("กล่อง");
    expect(DEFAULT_UNITS.length).toBeGreaterThan(3);
  });

  it("normalizes and validates a unit name", () => {
    expect(normalizeUnitName("  ลัง ")).toBe("ลัง");
    expect(() => normalizeUnitName(" ")).toThrow("กรุณาระบุชื่อหน่วยนับ");
    expect(() => normalizeUnitName("x".repeat(33))).toThrow("ชื่อหน่วยนับยาวเกินไป");
  });
});

describe("SKU suggestion rules", () => {
  it("builds a readable category prefix", () => {
    expect(buildSkuPrefix("น้ำดื่ม", "เครื่องดื่ม")).toBe("BEV");
    expect(buildSkuPrefix("Soap", "ของใช้ทั่วไป")).toBe("GEN-SO");
  });

  it("chooses the first unused running number", () => {
    expect(pickNextSku("BEV", ["BEV-001", "BEV-002"])).toBe("BEV-003");
    expect(pickNextSku("GEN", ["GEN-002"])).toBe("GEN-001");
  });
});
