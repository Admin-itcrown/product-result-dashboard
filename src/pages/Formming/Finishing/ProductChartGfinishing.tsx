import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Trophy, Maximize2, X } from "lucide-react";
import { format } from "date-fns";

interface Props {
  startDate?: Date;
  endDate?: Date;
}

/* COLORS */
const COLORS = {
  proc: "#3B82F6",
  moved: "#22C55E",
  scrap: "#F43F5E",
};

/* GROUP MAP */
const GROUP_NAME_MAP: Record<string, string> = {
  "101-104": "MUG",
  "105-106": "EMB/MUG",
  "201-204": "PLATE",
  "205": "EMB/PLATE",
  "301-304": "BOWL",
  "401-404": "ACC",
  "501-504": "RAM",
  "601-604": "ISO/STA",
  "701-704": "HPC",
  "801-804": "ISO/Non",
};

/* TOOLTIP */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const d = payload[0]?.payload;

  return (
    <div className="bg-white/90 backdrop-blur border shadow-xl rounded-2xl p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>

      <div className="space-y-1">
        <p className="text-blue-500">
          Proc: {d.proc?.toLocaleString?.() || 0}
        </p>
        <p className="text-green-500">
          Moved: {d.moved?.toLocaleString?.() || 0} ({d.movedPct}%)
        </p>
        <p className="text-rose-500">
          Scrap: {d.scrap?.toLocaleString?.() || 0} ({d.scrapPct}%)
        </p>
      </div>
    </div>
  );
};

export function ProductChartfinishing({ startDate, endDate }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const apiBase =
    (import.meta as any)?.env?.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

  const formatDate = (d?: Date) =>
    d ? format(d, "yyyy-MM-dd") : "";

  useEffect(() => {
    if (!startDate || !endDate) return;
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    const query = `
      SELECT 
        CASE 
          WHEN itemgroup.code_value1 IN ('101','102','103','104') THEN '101-104'
          WHEN itemgroup.code_value1 IN ('105','106') THEN '105-106'
          WHEN itemgroup.code_value1 IN ('201','202','203','204') THEN '201-204'
          WHEN itemgroup.code_value1 IN ('205') THEN '205'
          WHEN itemgroup.code_value1 IN ('301','302','303','304') THEN '301-304'
          WHEN itemgroup.code_value1 IN ('401','402','403','404') THEN '401-404'
          WHEN itemgroup.code_value1 IN ('501','502','503','504') THEN '501-504'
          WHEN itemgroup.code_value1 IN ('601','602','603','604') THEN '601-604'
          WHEN itemgroup.code_value1 IN ('701','702','703','704') THEN '701-704'
          WHEN itemgroup.code_value1 IN ('801','802','803','804') THEN '801-804'
        END AS GroupCode,

        SUM(Formm_trans.QtyProc) AS Ptotal,
        SUM(Formm_trans.QtyMoved) AS sumA,
        SUM(Formm_trans.QtyScrap) AS sumscrap

      FROM Formm_trans
      INNER JOIN pt_mstr 
        ON Formm_trans.Item = pt_mstr.pt_part
      INNER JOIN itemgroup 
        ON pt_mstr.pt_group = itemgroup.code_value1

      WHERE itemgroup.code_value1 IN (
        '101','102','103','104','105','106',
        '201','202','203','204','205',
        '301','302','303','304',
        '401','402','403','404',
        '501','502','503','504',
        '601','602','603','604',
        '701','702','703','704',
        '801','802','803','804'
      )

      AND [Date] BETWEEN '${formatDate(startDate)}'
      AND '${formatDate(endDate)}'
      AND [OP] = 20

      GROUP BY 
        CASE 
          WHEN itemgroup.code_value1 IN ('101','102','103','104') THEN '101-104'
          WHEN itemgroup.code_value1 IN ('105','106') THEN '105-106'
          WHEN itemgroup.code_value1 IN ('201','202','203','204') THEN '201-204'
          WHEN itemgroup.code_value1 IN ('205') THEN '205'
          WHEN itemgroup.code_value1 IN ('301','302','303','304') THEN '301-304'
          WHEN itemgroup.code_value1 IN ('401','402','403','404') THEN '401-404'
          WHEN itemgroup.code_value1 IN ('501','502','503','504') THEN '501-504'
          WHEN itemgroup.code_value1 IN ('601','602','603','604') THEN '601-604'
          WHEN itemgroup.code_value1 IN ('701','702','703','704') THEN '701-704'
          WHEN itemgroup.code_value1 IN ('801','802','803','804') THEN '801-804'
        END
    `;

    try {
      setLoading(true);

      const res = await fetch(`${apiBase}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, db: "formming" }),
      });

      const payload = await res.json();

      const records =
        payload?.recordset ||
        payload?.data ||
        payload?.result ||
        [];

      const chartData = records.map((x: any) => {
        const label =
          GROUP_NAME_MAP[x.GroupCode] || x.GroupCode || "UNKNOWN";

        const proc = Number(x.Ptotal ?? 0);
        const moved = Number(x.sumA ?? 0);
        const scrap = Number(x.sumscrap ?? 0);

        return {
          name: label,
          proc,
          moved,
          scrap,
          movedPct: proc ? ((moved / proc) * 100).toFixed(1) : "0",
          scrapPct: proc ? ((scrap / proc) * 100).toFixed(1) : "0",
        };
      });

      setData(chartData);
    } finally {
      setLoading(false);
    }
  };

  const totalProc = data.reduce((s, i) => s + (i.proc || 0), 0);
  const totalMoved = data.reduce((s, i) => s + (i.moved || 0), 0);
  const totalScrap = data.reduce((s, i) => s + (i.scrap || 0), 0);

  /* ✅ FIXED: show 25,000 instead of 25k */
  const YAxisConfig = {
    width: 80,
    domain: ["dataMin", "dataMax"] as const,
    tickFormatter: (v: number) => Number(v).toLocaleString(),
  };

  return (
    <>
      {/* MAIN CARD */}
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 border rounded-3xl shadow-xl p-5 h-[620px] flex flex-col">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            <h2 className="text-lg font-bold text-slate-700">
              Finishing Group Analysis
            </h2>
          </div>

          <button
            onClick={() => setOpenModal(true)}
            className="p-2 rounded-xl hover:bg-white shadow-sm transition"
          >
            <Maximize2 size={18} />
          </button>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Proc", value: totalProc, color: "blue" },
            { label: "Moved", value: totalMoved, color: "green" },
            { label: "Scrap", value: totalScrap, color: "rose" },
          ].map((k, i) => (
            <div key={i} className="bg-white border rounded-2xl p-3 shadow-sm">
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`font-bold text-${k.color}-600`}>
                {k.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* CHART */}
        <div className="flex-1 bg-white border rounded-2xl p-3">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap={20}>
                <CartesianGrid opacity={0.15} />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  height={50}
                />

                <YAxis {...YAxisConfig} />

                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Bar dataKey="proc" fill={COLORS.proc} barSize={18} />
                <Bar dataKey="moved" fill={COLORS.moved} barSize={18} />
                <Bar dataKey="scrap" fill={COLORS.scrap} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* MODAL */}
      {openModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="bg-white w-[96vw] h-[96vh] rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-5 right-5 p-2 hover:bg-slate-100 rounded-xl"
              onClick={() => setOpenModal(false)}
            >
              <X />
            </button>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap={20}>
                <CartesianGrid opacity={0.15} />
                <XAxis dataKey="name" />
                <YAxis {...YAxisConfig} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />

                <Bar dataKey="proc" fill={COLORS.proc} barSize={18} />
                <Bar dataKey="moved" fill={COLORS.moved} barSize={18} />
                <Bar dataKey="scrap" fill={COLORS.scrap} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}