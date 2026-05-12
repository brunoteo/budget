export const SEARCH_LIMIT = 30;

export type Filters = {
  q: string;
  from: string;       // YYYY-MM-DD
  to: string;         // YYYY-MM-DD
  min: number | null;
  max: number | null;
  categoryIds: string[];
  offset: number;
};

export type SearchRow = {
  id: string;
  amount: number;
  occurredOn: string;
  note: string | null;
  categoryId: string;
  categoryName: string;
  cycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
};

export type SearchResult = {
  rows: SearchRow[];
  totalCount: number;
  totalAmount: number;
};

export type CycleGroup = {
  cycleId: string;
  cycleStartDate: string;
  cycleEndDate: string;
  total: number;
  rows: SearchRow[];
};
