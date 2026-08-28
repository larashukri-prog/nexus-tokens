import {
  assertContract,
  contrastPairContract,
  tokenEntryContract,
  type ContrastPair,
  type TokenEntry,
  type TokenTier,
} from "./salt-contracts";
import { z } from "zod";

export type { TokenEntry, TokenTier, ContrastPair };


export const TOKEN_DICTIONARY: TokenEntry[] = [
  { name: "--salt-palette-navy-900", tier: "primitive", group: "Palette" },
  { name: "--salt-palette-navy-700", tier: "primitive", group: "Palette" },
  { name: "--salt-palette-slate-200", tier: "primitive", group: "Palette" },
  { name: "--salt-palette-slate-300", tier: "primitive", group: "Palette" },
  { name: "--salt-palette-white", tier: "primitive", group: "Palette" },
  { name: "--salt-palette-blue-500", tier: "primitive", group: "Palette" },

  {
    name: "--salt-container-primary-background",
    tier: "semantic",
    group: "Container",
    note: "Card & panel surface",
  },
  { name: "--salt-container-secondary-background", tier: "semantic", group: "Container" },
  { name: "--salt-container-tertiary-background", tier: "semantic", group: "Container" },
  {
    name: "--salt-container-primary-border",
    tier: "semantic",
    group: "Container",
    note: "Crisp 1px hairline",
  },
  {
    name: "--salt-content-primary-foreground",
    tier: "semantic",
    group: "Content",
    note: "Body & numeric text",
  },
  { name: "--salt-content-secondary-foreground", tier: "semantic", group: "Content" },
  { name: "--salt-content-tertiary-foreground", tier: "semantic", group: "Content" },
  { name: "--salt-sentiment-accent-foreground", tier: "semantic", group: "Sentiment" },
  { name: "--salt-sentiment-positive-foreground", tier: "semantic", group: "Sentiment" },
  { name: "--salt-sentiment-negative-foreground", tier: "semantic", group: "Sentiment" },
  { name: "--salt-status-info-foreground", tier: "semantic", group: "Status" },
  { name: "--salt-status-success-foreground", tier: "semantic", group: "Status" },
  { name: "--salt-status-warning-foreground", tier: "semantic", group: "Status" },
  { name: "--salt-status-error-foreground", tier: "semantic", group: "Status" },
  { name: "--salt-actionable-primary-background", tier: "semantic", group: "Actionable" },
  { name: "--salt-actionable-primary-foreground", tier: "semantic", group: "Actionable" },
  {
    name: "--salt-palette-categorical-1",
    tier: "semantic",
    group: "Data Vis",
    note: "Municipal Bonds",
  },
  {
    name: "--salt-palette-categorical-2",
    tier: "semantic",
    group: "Data Vis",
    note: "Private Equity",
  },
  {
    name: "--salt-palette-categorical-3",
    tier: "semantic",
    group: "Data Vis",
    note: "US Treasuries",
  },
  { name: "--salt-palette-categorical-4", tier: "semantic", group: "Data Vis", note: "Equities" },
  {
    name: "--salt-palette-categorical-5",
    tier: "semantic",
    group: "Data Vis",
    note: "Alternatives",
  },
  {
    name: "--salt-palette-categorical-6",
    tier: "semantic",
    group: "Data Vis",
    note: "Cash & Equivalents",
  },

  { name: "--salt-card-borderRadius", tier: "component", group: "Card" },
  { name: "--salt-card-borderWidth", tier: "component", group: "Card" },
  { name: "--salt-control-borderRadius", tier: "component", group: "Control" },
  { name: "--salt-table-rowHeight", tier: "component", group: "Table", note: "Density driven" },
  { name: "--salt-table-headerBackground", tier: "component", group: "Table" },
  { name: "--salt-spacing-100", tier: "component", group: "Spacing", note: "4px grid unit" },
  { name: "--salt-spacing-200", tier: "component", group: "Spacing" },
  { name: "--salt-spacing-300", tier: "component", group: "Spacing" },
  { name: "--salt-size-control", tier: "component", group: "Sizing" },
  { name: "--salt-text-fontSize", tier: "component", group: "Typography" },
  { name: "--salt-text-lineHeight", tier: "component", group: "Typography" },
];

export const CONTRAST_PAIRS: { label: string; fg: string; bg: string; large?: boolean }[] = [
  {
    label: "Body text on card",
    fg: "--salt-content-primary-foreground",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Secondary text on card",
    fg: "--salt-content-secondary-foreground",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Tertiary text on app shell",
    fg: "--salt-content-tertiary-foreground",
    bg: "--salt-container-secondary-background",
  },
  {
    label: "Positive delta on card",
    fg: "--salt-sentiment-positive-foreground",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Negative delta on card",
    fg: "--salt-sentiment-negative-foreground",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Info status on card",
    fg: "--salt-status-info-foreground",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Actionable label on button",
    fg: "--salt-actionable-primary-foreground",
    bg: "--salt-actionable-primary-background",
  },
  {
    label: "Categorical 1 on card",
    fg: "--salt-palette-categorical-1",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Categorical 2 on card",
    fg: "--salt-palette-categorical-2",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Categorical 3 on card",
    fg: "--salt-palette-categorical-3",
    bg: "--salt-container-primary-background",
  },
  {
    label: "Table header text",
    fg: "--salt-content-secondary-foreground",
    bg: "--salt-table-headerBackground",
  },
];
