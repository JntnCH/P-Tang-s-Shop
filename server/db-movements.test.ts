import { describe, expect, it } from "vitest";
import { calculateMovement } from "./db-movements";

describe("stock movement calculations", () => {
  it("calculates issue before/after values", () => {
    expect(calculateMovement(12, -5)).toEqual({ quantityBefore: 12, quantityAfter: 7, quantity: 5 });
  });

  it("calculates receive before/after values", () => {
    expect(calculateMovement(3, 8)).toEqual({ quantityBefore: 3, quantityAfter: 11, quantity: 8 });
  });

  it("rejects a movement that would make stock negative", () => {
    expect(() => calculateMovement(2, -3)).toThrow("จำนวนคงเหลือไม่พอ");
  });

  it("keeps a neutral calculation unchanged", () => {
    expect(calculateMovement(4, 0)).toEqual({ quantityBefore: 4, quantityAfter: 4, quantity: 0 });
  });
});
