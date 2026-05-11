/** Subset of MetaAPI JSON models — see metaapi.cloud client docs. */

export type MetaAccountInformation = {
  platform?: string;
  broker?: string;
  currency?: string;
  server?: string;
  balance?: number;
  equity?: number;
  margin?: number;
  freeMargin?: number;
  leverage?: number;
  login?: number;
};

export type MetaPosition = {
  id: string;
  type: string;
  symbol: string;
  openPrice?: number;
  currentPrice?: number;
  volume: number;
  profit: number;
  swap: number;
  commission?: number;
  time?: string;
  stopLoss?: number;
  takeProfit?: number;
};

export type MetaDeal = {
  id: string;
  type: string;
  entryType?: string;
  symbol?: string;
  volume?: number;
  price?: number;
  profit: number;
  commission?: number;
  swap?: number;
  time: string;
  positionId?: string;
};
