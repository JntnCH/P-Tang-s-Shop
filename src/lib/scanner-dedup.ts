/**
 * Scanner Deduplication and Format Helper
 * Prevents rapid double-scans and classifies QR vs Barcode types.
 */

export type CodeType = "QR" | "Barcode";

export interface DeduplicationOptions {
  /** Cooldown in milliseconds during which identical codes are suppressed. Default: 1500 */
  cooldownMs?: number | undefined;
  /** Whether comparisons are case-sensitive. Default: false */
  caseSensitive?: boolean | undefined;
  /** Maximum cached entries to retain. Default: 100 */
  maxEntries?: number | undefined;
}

export interface ScanRecord {
  code: string;
  format?: string | undefined;
  type: CodeType;
  scannedAt: number;
}

/**
 * Classifies a format string or format number into 'QR' or 'Barcode'.
 */
export function classifyScanType(format?: string | number): CodeType {
  if (format === undefined || format === null) return "Barcode";
  const str = String(format).toUpperCase();
  if (
    str.includes("QR") ||
    str === "11" || // BarcodeFormat.QR_CODE enum value
    str === "17" || // BarcodeFormat.MICRO_QR_CODE enum value
    str.includes("AZTEC") ||
    str.includes("DATA_MATRIX")
  ) {
    return "QR";
  }
  return "Barcode";
}

/**
 * Scanner Deduplicator manages time-based duplicate suppression.
 */
export class ScannerDeduplicator {
  private records = new Map<string, ScanRecord>();
  private cooldownMs: number;
  private caseSensitive: boolean;
  private maxEntries: number;

  constructor(options: DeduplicationOptions = {}) {
    this.cooldownMs = options.cooldownMs ?? 1500;
    this.caseSensitive = options.caseSensitive ?? false;
    this.maxEntries = options.maxEntries ?? 100;
  }

  private normalize(code: string): string {
    const trimmed = code.trim();
    return this.caseSensitive ? trimmed : trimmed.toUpperCase();
  }

  /**
   * Evaluates whether a scanned code should be accepted.
   * If accepted, records the scan timestamp and returns true.
   * If rejected (duplicate within cooldown), returns false.
   */
  shouldAccept(code: string, format?: string | number, now: number = Date.now()): boolean {
    const key = this.normalize(code);
    if (!key) return false;

    const existing = this.records.get(key);
    if (existing && now - existing.scannedAt < this.cooldownMs) {
      return false;
    }

    // Evict oldest if reaching capacity
    if (this.records.size >= this.maxEntries && !this.records.has(key)) {
      const oldestKey = this.records.keys().next().value;
      if (oldestKey) this.records.delete(oldestKey);
    }

    const type = classifyScanType(format);
    this.records.set(key, {
      code: code.trim(),
      format: format !== undefined ? String(format) : undefined,
      type,
      scannedAt: now,
    });

    return true;
  }

  /**
   * Executes a callback only if the code is accepted (not a duplicate).
   * Returns the ScanRecord if accepted, null if rejected.
   */
  handleScan(
    code: string,
    format: string | number | undefined,
    onAccept: (record: ScanRecord) => void,
    now: number = Date.now(),
  ): ScanRecord | null {
    if (this.shouldAccept(code, format, now)) {
      const record = this.getRecord(code);
      if (record) {
        onAccept(record);
        return record;
      }
    }
    return null;
  }

  /**
   * Checks if a code is currently on cooldown.
   */
  isOnCooldown(code: string, now: number = Date.now()): boolean {
    const key = this.normalize(code);
    const record = this.records.get(key);
    if (!record) return false;
    return now - record.scannedAt < this.cooldownMs;
  }

  /**
   * Returns remaining cooldown time in milliseconds, or 0 if not cooling down.
   */
  getRemainingCooldown(code: string, now: number = Date.now()): number {
    const key = this.normalize(code);
    const record = this.records.get(key);
    if (!record) return 0;
    const elapsed = now - record.scannedAt;
    const remaining = this.cooldownMs - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Gets the last scan record for a given code.
   */
  getRecord(code: string): ScanRecord | undefined {
    return this.records.get(this.normalize(code));
  }

  /**
   * Resets cooldown for a specific code.
   */
  resetCode(code: string): void {
    this.records.delete(this.normalize(code));
  }

  /**
   * Clears all recorded scans.
   */
  resetAll(): void {
    this.records.clear();
  }

  /**
   * Removes all expired records based on current timestamp.
   */
  prune(now: number = Date.now()): number {
    let removed = 0;
    for (const [key, record] of this.records.entries()) {
      if (now - record.scannedAt >= this.cooldownMs) {
        this.records.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Returns count of actively tracked items.
   */
  size(): number {
    return this.records.size;
  }
}
