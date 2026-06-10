// Copyright 2026 Danish A. Licensed under Apache-2.0.
// AeroFyta — Economics module barrel export

export { ProfitLossEngine } from './profit-loss-engine.js';
export type {
  LedgerEntry,
  LedgerCategory,
  LedgerType,
  PnLReport,
  IncomeReport,
  ExpenseReport,
} from './profit-loss-engine.js';

export { FeeModel } from './fee-model.js';
export type {
  GasCostEstimate,
  ProtocolFeeSchedule,
  LLMCostEstimate,
  OperationType,
  CostBreakdown,
} from './fee-model.js';

export { SustainabilityAnalyzer } from './sustainability-analyzer.js';
export type {
  SustainabilityReport,
  ChainEfficiency,
  RunwayReport,
} from './sustainability-analyzer.js';
