import { z } from "zod";

import {
  assertContract,
  assetClassRowContract,
  holdingContract,
  kpiContract,
  type AssetClassRow,
  type Holding,
} from "./salt-contracts";

/** Types are derived from the strict Zod contracts — never hand-maintained. */
export type AssetClass = AssetClassRow;
export type { Holding };

export const ASSET_CLASSES: AssetClass[] = [
  {
    id: "muni",
    name: "Municipal Bonds",
    token: "--salt-palette-categorical-1",
    allocation: 23.7,
    value: 11380000,
    ytd: 3.42,
    yield: 3.85,
    risk: "Low",
  },
  {
    id: "pe",
    name: "Private Equity",
    token: "--salt-palette-categorical-2",
    allocation: 22,
    value: 10560000,
    ytd: 11.78,
    yield: 0,
    risk: "Elevated",
  },
  {
    id: "ust",
    name: "US Treasuries",
    token: "--salt-palette-categorical-3",
    allocation: 21.3,
    value: 10220000,
    ytd: 2.16,
    yield: 4.29,
    risk: "Low",
  },
  {
    id: "eq",
    name: "Equities",
    token: "--salt-palette-categorical-4",
    allocation: 18,
    value: 8640000,
    ytd: 9.04,
    yield: 1.32,
    risk: "Moderate",
  },
  {
    id: "alt",
    name: "Alternatives",
    token: "--salt-palette-categorical-5",
    allocation: 9,
    value: 4320000,
    ytd: -1.86,
    yield: 2.1,
    risk: "Elevated",
  },
  {
    id: "cash",
    name: "Cash & Cash Equivalents",
    token: "--salt-palette-categorical-6",
    allocation: 6,
    value: 2880000,
    ytd: 1.12,
    yield: 4.95,
    risk: "Low",
  },
];

export const HOLDINGS: Holding[] = [
  {
    ticker: "NYC 5s 2039",
    name: "NYC GO Series C",
    sleeve: "Municipal Bonds",
    sleeveToken: "--salt-palette-categorical-1",
    qty: 100000,
    price: 113.8,
    marketValue: 11380000,
    dayChange: 0.18,
  },
  {
    ticker: "HARBOR IV",
    name: "Harbor Growth Fund IV LP",
    sleeve: "Private Equity",
    sleeveToken: "--salt-palette-categorical-2",
    qty: 1,
    price: 6120000,
    marketValue: 6120000,
    dayChange: 0,
  },
  {
    ticker: "T 4.25 2034",
    name: "US Treasury Note",
    sleeve: "US Treasuries",
    sleeveToken: "--salt-palette-categorical-3",
    qty: 100000,
    price: 102.2,
    marketValue: 10220000,
    dayChange: -0.07,
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corp",
    sleeve: "Equities",
    sleeveToken: "--salt-palette-categorical-4",
    qty: 9250,
    price: 412.88,
    marketValue: 3819140,
    dayChange: 1.24,
  },
  {
    ticker: "GLDM",
    name: "SPDR Gold MiniShares",
    sleeve: "Alternatives",
    sleeveToken: "--salt-palette-categorical-5",
    qty: 41000,
    price: 62.14,
    marketValue: 2547740,
    dayChange: -0.62,
  },
  {
    ticker: "GOVMM",
    name: "Government Money Market",
    sleeve: "Cash & Cash Equivalents",
    sleeveToken: "--salt-palette-categorical-6",
    qty: 2880000,
    price: 1.0,
    marketValue: 2880000,
    dayChange: 0.01,
  },
];

export const PERFORMANCE_SERIES = [
  62, 64, 63.2, 66.1, 65.4, 68.9, 70.2, 69.4, 72.8, 74.1, 73.2, 76.5, 78.9, 77.4, 80.2, 82.6,
];

export const KPIS = [
  { label: "Total AUM", value: "$48.0M", delta: 6.42, meta: "vs. prior quarter" },
  { label: "YTD Return", value: "+5.84%", delta: 1.12, meta: "net of fees" },
  { label: "Blended Yield", value: "3.11%", delta: 0.24, meta: "trailing 12M" },
  { label: "Drawdown Risk", value: "-4.20%", delta: -0.35, meta: "95% VaR, 1Y" },
];

export function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/* Dev-only strict-contract gate for the portfolio literals. */
assertContract(z.array(assetClassRowContract), ASSET_CLASSES, "ASSET_CLASSES");
assertContract(z.array(holdingContract), HOLDINGS, "HOLDINGS");
assertContract(z.array(kpiContract), KPIS, "KPIS");
