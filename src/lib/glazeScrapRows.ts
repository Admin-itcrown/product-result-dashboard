export function normalizeGlazeScrapRows(rows: any[] = []) {
  return (rows || [])
    .map((row: any) => ({
      ...row,
      Sumpro: row.Sumpro ?? row.QtyProc ?? row.TotalQtyProc ?? 0,
      SumA: row.SumA ?? row.QtyMoved ?? row.TotalQtyMoved ?? 0,
      SumReject: row.SumReject ?? row.QtyReject ?? 0,
      Sumscrap: row.Sumscrap ?? row.QtyScrap ?? row.TotalQtyScrap ?? 0,
      Yscrap: row.Yscrap ?? 0,
      YscrapPercent: ((Number(row.Yscrap ?? 0) || 0) * 100).toFixed(2),
    }))
    .filter((row: any) => Number(row.Sumpro ?? 0) > 0 || Number(row.Sumscrap ?? 0) > 0);
}
