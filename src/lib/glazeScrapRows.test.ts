import { describe, expect, it } from "vitest";
import { normalizeGlazeScrapRows } from "./glazeScrapRows";

describe("normalizeGlazeScrapRows", () => {
  it("keeps rows with zero scrap so export and table stay consistent", () => {
    const rows = normalizeGlazeScrapRows([
      {
        Line: "L1",
        Item: "I1",
        Description: "Desc 1",
        Date: "2024-01-01",
        Description2: "D2",
        Clay: "C1",
        GlazeDesc: "G1",
        QtyProc: 100,
        QtyMoved: 90,
        QtyScrap: 0,
        Yscrap: 0,
      },
      {
        Line: "L2",
        Item: "I2",
        Description: "Desc 2",
        Date: "2024-01-02",
        Description2: "D2",
        Clay: "C2",
        GlazeDesc: "G2",
        QtyProc: 200,
        QtyMoved: 180,
        QtyScrap: 10,
        Yscrap: 0.05,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].YscrapPercent).toBe("0.00");
    expect(rows[1].YscrapPercent).toBe("5.00");
  });

  it("supports SumQtyProc/SumQtyScrap aliases from grouped glaze queries", () => {
    const rows = normalizeGlazeScrapRows([
      {
        pt_group: "G1",
        code_cmmt1: "Desc 1",
        Clay: "S",
        Date: "2024-01-01",
        SumQtyProc: 100,
        SumQtyMoved: 90,
        SumQtyScrap: 5,
        Yscrap: 0.05,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].Sumpro).toBe(100);
    expect(rows[0].Sumscrap).toBe(5);
    expect(rows[0].YscrapPercent).toBe("5.00");
  });
});
