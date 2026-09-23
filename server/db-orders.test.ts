import { describe, expect, it } from "vitest";
import { getOrderItemStatus } from "./db-orders";

describe("purchase order receiving status", () => {
  it("marks an item as pending before anything arrives", () => {
    expect(getOrderItemStatus(10, 0)).toBe("pending");
  });

  it("marks an item as shortage when received quantity is lower", () => {
    expect(getOrderItemStatus(10, 7)).toBe("shortage");
  });

  it("marks an item as matched when received quantity equals ordered quantity", () => {
    expect(getOrderItemStatus(10, 10)).toBe("matched");
  });

  it("marks an item as over when more than ordered arrives", () => {
    expect(getOrderItemStatus(10, 12)).toBe("over");
  });
});
