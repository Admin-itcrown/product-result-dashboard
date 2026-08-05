export function normalizeGlazeScrapRows(rows: any[] = []) {
  return (rows || [])
    .map((row: any) => {
      const sumpro =
        row.Sumpro ??
        row.SumQtyProc ??
        row.QtyProc ??
        row.TotalQtyProc ??
        0;
      const sumA =
        row.SumA ??
        row.SumQtyMoved ??
        row.QtyMoved ??
        row.TotalQtyMoved ??
        0;
      const sumReject = row.SumReject ?? row.QtyReject ?? 0;
      const sumScrap =
        row.Sumscrap ??
        row.SumQtyScrap ??
        row.QtyScrap ??
        row.TotalQtyScrap ??
        0;
      const yscrap = row.Yscrap ?? 0;

      return {
        ...row,
        Sumpro: sumpro,
        SumQtyProc: row.SumQtyProc ?? sumpro,
        SumA: sumA,
        SumQtyMoved: row.SumQtyMoved ?? sumA,
        SumReject: sumReject,
        Sumscrap: sumScrap,
        SumQtyScrap: row.SumQtyScrap ?? sumScrap,
        Yscrap: yscrap,
        YscrapPercent: ((Number(yscrap) || 0) * 100).toFixed(2),
      };
    })
    .filter(
      (row: any) =>
        Number(row.Sumpro ?? row.SumQtyProc ?? 0) > 0 ||
        Number(row.Sumscrap ?? row.SumQtyScrap ?? 0) > 0
    );
}
