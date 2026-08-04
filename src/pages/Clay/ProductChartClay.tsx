import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  type YAxisProps,
} from "recharts";

import {
  Trophy,
  Maximize2,
  X,
  Boxes,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { format } from "date-fns";

interface Props {
  startDate?: Date;
  endDate?: Date;
}

/* =========================
   COLORS
========================= */

const COLORS = {
  proc: "#3B82F6",
  moved: "#22C55E",
  scrap: "#F43F5E",
};

/* =========================
   GROUP MAP
========================= */

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

/* =========================
   CUSTOM LEGEND
========================= */

const CustomLegend = () => {
  const items = [
    {
      label: "Proc",
      color: COLORS.proc,
      icon: <Boxes size={14} />,
    },
    {
      label: "Moved",
      color: COLORS.moved,
      icon: <CheckCircle2 size={14} />,
    },
    {
      label: "Scrap",
      color: COLORS.scrap,
      icon: <AlertTriangle size={14} />,
    },
  ];

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap mb-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border shadow-sm"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: item.color }}
          />

          <div style={{ color: item.color }}>{item.icon}</div>

          <span className="text-sm font-semibold text-slate-700">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

/* =========================
   TOOLTIP
========================= */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const d = payload[0]?.payload;

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-4 min-w-[220px]">
      <div className="mb-3">
        <p className="font-bold text-slate-800 text-sm">{label}</p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Proc</span>

          <span className="font-bold text-blue-500">
            {d.proc?.toLocaleString?.()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Moved</span>

          <span className="font-bold text-green-500">
            {d.moved?.toLocaleString?.()} ({d.movedPct}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-500">Scrap</span>

          <span className="font-bold text-rose-500">
            {d.scrap?.toLocaleString?.()} ({d.scrapPct}%)
          </span>
        </div>
      </div>
    </div>
  );
};

export function ProductChartClay({
  startDate,
  endDate,
}: Props) {
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
    const from = formatDate(startDate);
    const to = formatDate(endDate);

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

      WHERE [Date] BETWEEN '${from}' AND '${to}'
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          db: "formming",
        }),
      });

      const payload = await res.json();

      const records =
        payload?.recordset ||
        payload?.data ||
        [];

      const chartData = records.map((x: any) => {
        const proc = Number(x.Ptotal ?? 0);
        const moved = Number(x.sumA ?? 0);
        const scrap = Number(x.sumscrap ?? 0);

        return {
          name:
            GROUP_NAME_MAP[x.GroupCode] ||
            x.GroupCode,

          proc,
          moved,
          scrap,

          movedPct: proc
            ? ((moved / proc) * 100).toFixed(1)
            : "0",

          scrapPct: proc
            ? ((scrap / proc) * 100).toFixed(1)
            : "0",
        };
      });

      setData(chartData);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     KPI
  ========================= */

  const totalProc = data.reduce(
    (s, i) => s + (i.proc || 0),
    0
  );

  const totalMoved = data.reduce(
    (s, i) => s + (i.moved || 0),
    0
  );

  const totalScrap = data.reduce(
    (s, i) => s + (i.scrap || 0),
    0
  );

  /* =========================
     SMART Y AXIS
  ========================= */

  const maxValue = Math.max(
    ...data.map((d) => d.proc || 0),
    0
  );

  const niceSteps = [
    1000,
    2000,
    5000,
    10000,
    20000,
    50000,
    100000,
    200000,
    500000,
    1000000,
  ];

  const step =
    niceSteps.find((s) => maxValue / s <= 10) ||
    1000000;

  const ticks = Array.from(
    {
      length:
        Math.ceil(maxValue / step) + 1,
    },
    (_, i) => i * step
  );

  const YAxisConfig: YAxisProps = {
    width: 90,
    domain: [0, "dataMax"],
    ticks,

    tickFormatter: (v: number) =>
      Number(v).toLocaleString(),
  };

  const dateLabel =
    startDate && endDate
      ? `${format(
          startDate,
          "dd/MM/yyyy"
        )} → ${format(endDate, "dd/MM/yyyy")}`
      : "-";

  return (
    <>
      {/* MAIN CARD */}

      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 border border-white/40 rounded-[32px] shadow-2xl p-5 h-[640px] flex flex-col overflow-hidden">

        {/* HEADER */}

        <div className="flex items-start justify-between mb-5">

          <div>
            <div className="flex items-center gap-3 mb-1">

              <div className="p-2 rounded-2xl bg-yellow-100">
                <Trophy className="text-yellow-500" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  CLAY Group Analysis
                </h2>

                <p className="text-xs text-slate-500">
                  Production Summary Dashboard
                </p>
              </div>
            </div>

            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-medium">
              {dateLabel}
            </div>
          </div>

          <button
            onClick={() => setOpenModal(true)}
            className="p-3 rounded-2xl bg-white shadow-md hover:scale-105 transition-all"
          >
            <Maximize2
              size={18}
              className="text-slate-700"
            />
          </button>
        </div>

        {/* KPI */}

        <div className="grid grid-cols-3 gap-4 mb-5">

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-4 text-white shadow-xl">
            <p className="text-sm opacity-80 mb-1">
              Proc
            </p>

            <h1 className="text-3xl font-black tracking-tight">
              {totalProc.toLocaleString()}
            </h1>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-4 text-white shadow-xl">
            <p className="text-sm opacity-80 mb-1">
              Moved
            </p>

            <h1 className="text-3xl font-black tracking-tight">
              {totalMoved.toLocaleString()}
            </h1>
          </div>

          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-4 text-white shadow-xl">
            <p className="text-sm opacity-80 mb-1">
              Scrap
            </p>

            <h1 className="text-3xl font-black tracking-tight">
              {totalScrap.toLocaleString()}
            </h1>
          </div>
        </div>

        {/* LEGEND */}

        <CustomLegend />

        {/* CHART */}

        <div className="flex-1 bg-white/80 backdrop-blur rounded-[28px] border border-slate-200 shadow-inner p-4">

          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-lg font-semibold">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={data}
                barCategoryGap={18}
                margin={{
                  top: 20,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.12}
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 12,
                    fill: "#475569",
                    fontWeight: 600,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  {...YAxisConfig}
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748B",
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{
                    fill: "rgba(59,130,246,0.05)",
                  }}
                />

                {/* PROC */}

                <Bar
                  dataKey="proc"
                  radius={[10, 10, 0, 0]}
                  barSize={24}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS.proc}
                    />
                  ))}
                </Bar>

                {/* MOVED */}

                <Bar
                  dataKey="moved"
                  radius={[10, 10, 0, 0]}
                  barSize={24}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS.moved}
                    />
                  ))}
                </Bar>

                {/* SCRAP */}

                <Bar
                  dataKey="scrap"
                  radius={[10, 10, 0, 0]}
                  barSize={24}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS.scrap}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* FULLSCREEN */}

      {openModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setOpenModal(false)}
        >
          <div
            className="bg-white w-[97vw] h-[96vh] rounded-[36px] p-6 shadow-2xl relative flex flex-col"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="absolute top-5 right-5 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 transition"
              onClick={() => setOpenModal(false)}
            >
              <X />
            </button>

            <div className="mb-4">
              <h1 className="text-2xl font-black text-slate-800">
                Finishing Group Analysis
              </h1>

              <p className="text-sm text-slate-500">
                {dateLabel}
              </p>
            </div>

            <CustomLegend />

            <div className="flex-1 min-h-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={data}
                  barCategoryGap={20}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.12}
                  />

                  <XAxis dataKey="name" />

                  <YAxis {...YAxisConfig} />

                  <Tooltip
                    content={<CustomTooltip />}
                  />

                  <Bar
                    dataKey="proc"
                    fill={COLORS.proc}
                    radius={[12, 12, 0, 0]}
                  />

                  <Bar
                    dataKey="moved"
                    fill={COLORS.moved}
                    radius={[12, 12, 0, 0]}
                  />

                  <Bar
                    dataKey="scrap"
                    fill={COLORS.scrap}
                    radius={[12, 12, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}