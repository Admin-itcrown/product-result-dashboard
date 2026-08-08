export type InGlazeRow = {
  date: string;
  kiln: string;
  dayShift: number;
  nightShift: number;
  total: number;
};

export type InGlazeKilnSummary = {
  kiln: string;
  dayShift: number;
  nightShift: number;
  total: number;
  dayCount: number;
  avgPerDay: number;
};

export type InGlazePayload = {
  ok: boolean;
  maxDate?: string | null;
  dayCount: number;
  total: number;
  dayShift: number;
  nightShift: number;
  avgPerDay: number;
  kilnSummary: InGlazeKilnSummary[];
  rows: InGlazeRow[];
  error?: string;
};
