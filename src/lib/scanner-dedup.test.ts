import { describe, expect, it } from "vitest";
import { classifyScanType, ScannerDeduplicator } from "./scanner-dedup";

describe("ScannerDeduplicator", () => {
  it("test 1: should allow a new scan code on first encounter", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    const accepted = dedup.shouldAccept("8850123456789", "EAN_13", 1000);
    expect(accepted).toBe(true);
  });

  it("test 2: should block duplicate scan within cooldown window", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    dedup.shouldAccept("8850123456789", "EAN_13", 1000);
    const repeat = dedup.shouldAccept("8850123456789", "EAN_13", 1500);
    expect(repeat).toBe(false);
  });

  it("test 3: should allow the same scan code after cooldown has elapsed", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    dedup.shouldAccept("8850123456789", "EAN_13", 1000);
    const later = dedup.shouldAccept("8850123456789", "EAN_13", 2600);
    expect(later).toBe(true);
  });

  it("test 4: should allow different scan codes immediately without blocking", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    const first = dedup.shouldAccept("8850123456789", "EAN_13", 1000);
    const second = dedup.shouldAccept("8859876543210", "EAN_13", 1050);
    expect(first).toBe(true);
    expect(second).toBe(true);
  });

  it("test 5: should support custom cooldown duration", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 3000 });
    dedup.shouldAccept("CODE-100", "CODE_128", 1000);
    expect(dedup.shouldAccept("CODE-100", "CODE_128", 3500)).toBe(false);
    expect(dedup.shouldAccept("CODE-100", "CODE_128", 4100)).toBe(true);
  });

  it("test 6: should normalize whitespace from scan input", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    dedup.shouldAccept("  8850123456789  ", "EAN_13", 1000);
    expect(dedup.shouldAccept("8850123456789", "EAN_13", 1200)).toBe(false);
  });

  it("test 7: should ignore case by default (case-insensitive deduplication)", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    dedup.shouldAccept("product-sku-abc", "CODE_128", 1000);
    expect(dedup.shouldAccept("PRODUCT-SKU-ABC", "CODE_128", 1200)).toBe(false);
  });

  it("test 8: should support strict case-sensitive mode when configured", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500, caseSensitive: true });
    dedup.shouldAccept("Product-A", "CODE_128", 1000);
    expect(dedup.shouldAccept("product-a", "CODE_128", 1100)).toBe(true);
  });

  it("test 9: should correctly identify QR code format types", () => {
    expect(classifyScanType("QR_CODE")).toBe("QR");
    expect(classifyScanType("qr_code")).toBe("QR");
    expect(classifyScanType("MICRO_QR_CODE")).toBe("QR");
    expect(classifyScanType(11)).toBe("QR");
    expect(classifyScanType("DATA_MATRIX")).toBe("QR");
  });

  it("test 10: should correctly identify Barcode 1D format types (EAN, UPC, CODE_128)", () => {
    expect(classifyScanType("EAN_13")).toBe("Barcode");
    expect(classifyScanType("CODE_128")).toBe("Barcode");
    expect(classifyScanType("UPC_A")).toBe("Barcode");
    expect(classifyScanType("CODE_39")).toBe("Barcode");
    expect(classifyScanType(undefined)).toBe("Barcode");
  });

  it("test 11: should reset deduplication history for a specific code", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    dedup.shouldAccept("8850123456789", "EAN_13", 1000);
    expect(dedup.shouldAccept("8850123456789", "EAN_13", 1200)).toBe(false);
    dedup.resetCode("8850123456789");
    expect(dedup.shouldAccept("8850123456789", "EAN_13", 1300)).toBe(true);
  });

  it("test 12: should clear all deduplication history with resetAll()", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    dedup.shouldAccept("A1", "CODE_128", 1000);
    dedup.shouldAccept("B2", "CODE_128", 1000);
    expect(dedup.size()).toBe(2);
    dedup.resetAll();
    expect(dedup.size()).toBe(0);
    expect(dedup.shouldAccept("A1", "CODE_128", 1200)).toBe(true);
  });

  it("test 13: should check if a code is currently on cooldown with isOnCooldown()", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 2000 });
    dedup.shouldAccept("ITEM-X", "QR_CODE", 1000);
    expect(dedup.isOnCooldown("ITEM-X", 1500)).toBe(true);
    expect(dedup.isOnCooldown("ITEM-X", 3100)).toBe(false);
    expect(dedup.isOnCooldown("UNKNOWN", 1500)).toBe(false);
  });

  it("test 14: should return remaining cooldown time in milliseconds with getRemainingCooldown()", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 2000 });
    dedup.shouldAccept("ITEM-Y", "QR_CODE", 1000);
    expect(dedup.getRemainingCooldown("ITEM-Y", 1400)).toBe(1600);
    expect(dedup.getRemainingCooldown("ITEM-Y", 3000)).toBe(0);
  });

  it("test 15: should return 0 remaining cooldown for code that was never scanned", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 2000 });
    expect(dedup.getRemainingCooldown("NON_EXISTENT")).toBe(0);
  });

  it("test 16: should purge expired entries when prune() is called", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1000 });
    dedup.shouldAccept("EXPIRED-1", "EAN_13", 500);
    dedup.shouldAccept("EXPIRED-2", "EAN_13", 800);
    dedup.shouldAccept("ACTIVE-1", "EAN_13", 1800);
    const removed = dedup.prune(2000);
    expect(removed).toBe(2);
    expect(dedup.size()).toBe(1);
    expect(dedup.getRecord("ACTIVE-1")).toBeDefined();
  });

  it("test 17: should respect maxEntries limit and drop oldest entries", () => {
    const dedup = new ScannerDeduplicator({ maxEntries: 2, cooldownMs: 5000 });
    dedup.shouldAccept("CODE-1", "EAN_13", 1000);
    dedup.shouldAccept("CODE-2", "EAN_13", 1100);
    dedup.shouldAccept("CODE-3", "EAN_13", 1200);
    expect(dedup.size()).toBe(2);
    expect(dedup.getRecord("CODE-1")).toBeUndefined();
    expect(dedup.getRecord("CODE-2")).toBeDefined();
    expect(dedup.getRecord("CODE-3")).toBeDefined();
  });

  it("test 18: should retrieve the last scan record for a given code", () => {
    const dedup = new ScannerDeduplicator();
    dedup.shouldAccept("MY-QR", "QR_CODE", 1500);
    const record = dedup.getRecord("MY-QR");
    expect(record).toEqual({
      code: "MY-QR",
      format: "QR_CODE",
      type: "QR",
      scannedAt: 1500,
    });
  });

  it("test 19: should execute an onScan callback only when code is not duplicated", () => {
    const dedup = new ScannerDeduplicator({ cooldownMs: 1500 });
    const calls: string[] = [];
    const callback = (rec: { code: string }) => calls.push(rec.code);

    const first = dedup.handleScan("CODE-AAA", "EAN_13", callback, 1000);
    const dup = dedup.handleScan("CODE-AAA", "EAN_13", callback, 1200);
    const next = dedup.handleScan("CODE-BBB", "QR_CODE", callback, 1300);

    expect(first).not.toBeNull();
    expect(dup).toBeNull();
    expect(next).not.toBeNull();
    expect(calls).toEqual(["CODE-AAA", "CODE-BBB"]);
  });
});
