import { describe, expect, it } from "vitest";
import { shouldAcceptScan } from "./useBarcodeScanner";

describe("camera scan de-duplication", () => {
  it("accepts a new QR or barcode value", () => {
    expect(shouldAcceptScan(null, "https://example.com/item/1", 1000)).toBe(true);
  });

  it("ignores the same value within the debounce window", () => {
    expect(shouldAcceptScan({ code: "885123", at: 1000 }, "885123", 2500)).toBe(false);
    expect(shouldAcceptScan({ code: "885123", at: 1000 }, "885123", 3001)).toBe(true);
  });

  it("ignores empty decoder results", () => {
    expect(shouldAcceptScan(null, "   ", 1000)).toBe(false);
  });
});
