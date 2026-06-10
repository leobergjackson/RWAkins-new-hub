// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Statistical Anomaly Detection Service
//
// Real Z-score (Bessel-corrected) + IQR outlier detection for transaction monitoring.
// Flags suspicious tip amounts before they are approved.

import { logger } from '../utils/logger.js';

// ── Types ────────────────────────────────────────────────────────

/** Result of anomaly detection on a single transaction amount */
export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  iqrOutlier: boolean;
  severity: 'normal' | 'warning' | 'critical';
  details: { mean: number; stdDev: number; q1: number; q3: number; iqr: number };
}

/** Descriptive statistics for a category */
export interface CategoryStatistics {
  category: string;
  mean: number;
  median: number;
  stdDev: number;
  q1: number;
  q3: number;
  iqr: number;
  sampleCount: number;
  min: number;
  max: number;
}

/** A recorded anomaly for the audit log */
export interface AnomalyRecord {
  amount: number;
  category: string;
  result: AnomalyResult;
  timestamp: string;
}

// ── Constants ────────────────────────────────────────────────────

const Z_SCORE_WARNING = 2.0;
const Z_SCORE_CRITICAL = 2.5;
const IQR_MULTIPLIER = 1.5;
const MIN_SAMPLES = 5;
const MAX_HISTORY = 5000;
const MAX_ANOMALY_LOG = 200;

// ── Service ──────────────────────────────────────────────────────

/**
 * AnomalyDetectionService — Statistical anomaly detection for transactions.
 *
 * Uses two complementary methods:
 * 1. Z-score with Bessel-corrected sample standard deviation
 * 2. IQR (Interquartile Range) outlier detection
 *
 * A transaction is flagged as anomalous if EITHER method triggers.
 */
export class AnomalyDetectionService {
  /** Transaction history per category */
  private history = new Map<string, number[]>();

  /** Recent anomaly log */
  private anomalyLog: AnomalyRecord[] = [];

  constructor() {
    logger.info('AnomalyDetectionService initialized');
  }

  // ── Core API ─────────────────────────────────────────────────

  /**
   * Record a transaction amount into the history for a given category.
   * The default category is used when none is specified.
   */
  recordTransaction(amount: number, category = 'default'): void {
    if (!this.history.has(category)) {
      this.history.set(category, []);
    }
    const cat = this.history.get(category)!;
    cat.push(amount);

    // Keep bounded
    if (cat.length > MAX_HISTORY) {
      cat.splice(0, cat.length - MAX_HISTORY);
    }
  }

  /**
   * Detect whether a proposed transaction amount is anomalous
   * relative to the recorded history for the given category.
   *
   * If fewer than MIN_SAMPLES data points exist (cold start),
   * the result is always `normal` with zScore = 0.
   */
  detectAnomaly(amount: number, category = 'default'): AnomalyResult {
    const values = this.history.get(category) ?? [];

    // Cold start — not enough data for reliable statistics
    if (values.length < MIN_SAMPLES) {
      return {
        isAnomaly: false,
        zScore: 0,
        iqrOutlier: false,
        severity: 'normal',
        details: { mean: 0, stdDev: 0, q1: 0, q3: 0, iqr: 0 },
      };
    }

    const mean = this.computeMean(values);
    const stdDev = this.computeStdDev(values, mean);
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);
    const iqr = q3 - q1;

    // Z-score (Bessel-corrected stddev already used)
    const zScore = stdDev > 0 ? Math.abs(amount - mean) / stdDev : 0;

    // IQR outlier: outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
    const lowerFence = q1 - IQR_MULTIPLIER * iqr;
    const upperFence = q3 + IQR_MULTIPLIER * iqr;
    const iqrOutlier = amount < lowerFence || amount > upperFence;

    // Determine severity
    let severity: AnomalyResult['severity'] = 'normal';
    if (zScore > Z_SCORE_CRITICAL || iqrOutlier) {
      severity = 'critical';
    } else if (zScore > Z_SCORE_WARNING) {
      severity = 'warning';
    }

    const isAnomaly = zScore > Z_SCORE_CRITICAL || iqrOutlier;

    const result: AnomalyResult = {
      isAnomaly,
      zScore: Math.round(zScore * 1000) / 1000,
      iqrOutlier,
      severity,
      details: {
        mean: Math.round(mean * 1e6) / 1e6,
        stdDev: Math.round(stdDev * 1e6) / 1e6,
        q1: Math.round(q1 * 1e6) / 1e6,
        q3: Math.round(q3 * 1e6) / 1e6,
        iqr: Math.round(iqr * 1e6) / 1e6,
      },
    };

    // Log anomalies for audit trail
    if (isAnomaly) {
      this.anomalyLog.push({
        amount,
        category,
        result,
        timestamp: new Date().toISOString(),
      });
      if (this.anomalyLog.length > MAX_ANOMALY_LOG) {
        this.anomalyLog.splice(0, this.anomalyLog.length - MAX_ANOMALY_LOG);
      }
      logger.warn('Anomaly detected in transaction', {
        amount,
        category,
        zScore: result.zScore,
        iqrOutlier,
        severity,
      });
    }

    return result;
  }

  /**
   * Get descriptive statistics for a category.
   */
  getStatistics(category = 'default'): CategoryStatistics {
    const values = this.history.get(category) ?? [];
    if (values.length === 0) {
      return {
        category,
        mean: 0,
        median: 0,
        stdDev: 0,
        q1: 0,
        q3: 0,
        iqr: 0,
        sampleCount: 0,
        min: 0,
        max: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = this.computeMean(values);
    const stdDev = values.length >= 2 ? this.computeStdDev(values, mean) : 0;
    const median = this.percentile(sorted, 50);
    const q1 = this.percentile(sorted, 25);
    const q3 = this.percentile(sorted, 75);

    return {
      category,
      mean: Math.round(mean * 1e6) / 1e6,
      median: Math.round(median * 1e6) / 1e6,
      stdDev: Math.round(stdDev * 1e6) / 1e6,
      q1: Math.round(q1 * 1e6) / 1e6,
      q3: Math.round(q3 * 1e6) / 1e6,
      iqr: Math.round((q3 - q1) * 1e6) / 1e6,
      sampleCount: values.length,
      min: Math.round(sorted[0] * 1e6) / 1e6,
      max: Math.round(sorted[sorted.length - 1] * 1e6) / 1e6,
    };
  }

  /**
   * Returns true if the service is in cold-start mode for a category
   * (fewer than MIN_SAMPLES data points, can't compute reliable stats).
   */
  needsColdStart(category = 'default'): boolean {
    const values = this.history.get(category) ?? [];
    return values.length < MIN_SAMPLES;
  }

  /** Get the list of categories with recorded data */
  getCategories(): string[] {
    return Array.from(this.history.keys());
  }

  /** Get recent anomaly records */
  getRecentAnomalies(limit = 50): AnomalyRecord[] {
    return [...this.anomalyLog].reverse().slice(0, limit);
  }

  /** Get all statistics across all categories + recent anomalies */
  getOverview(): { categories: CategoryStatistics[]; recentAnomalies: AnomalyRecord[]; coldStart: boolean } {
    const categories = this.getCategories().map((c) => this.getStatistics(c));
    // If the default category is in cold start, the whole service is cold
    const coldStart = this.needsColdStart('default');
    return {
      categories,
      recentAnomalies: this.getRecentAnomalies(20),
      coldStart,
    };
  }

  // ── Private Helpers ──────────────────────────────────────────

  /** Arithmetic mean */
  private computeMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Sample standard deviation with Bessel's correction (n-1 denominator).
   * Returns 0 if fewer than 2 values.
   */
  private computeStdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    const sumSquaredDiff = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    return Math.sqrt(sumSquaredDiff / (values.length - 1));
  }

  /**
   * Compute percentile using linear interpolation on a sorted array.
   * p is in [0, 100].
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) return sorted[0];

    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sorted[lower];

    const fraction = index - lower;
    return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
  }
}
