import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LabelList,
} from "recharts";

import {
  Trophy,
  Maximize2,
  X,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
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
  moved: "#22C55E",
  scrap: "#F43F5E",
  line: "#2563EB",
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
   LEGEND
========================= */

const CustomLegend = () => {
  const items = [
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
    {
      label: "Yield %",
      color: COLORS.line,
      icon: <TrendingUp size={14} />,
    },
  ];

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap mb-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{
              background: item.color,
            }}
          />

          <div style={{ color: item.color }}>
            {item.icon}
          </div>

          <span className="text-sm font-bold text-slate-700">
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

const CustomTooltip = ({
  active,
  payload,
  label,
}: any) => {
  if (!active || !payload?.length)
    return null;

  const d = payload[0]?.payload;

  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-4 min-w-[240px]">
      <p className="font-black text-slate-800 mb-3">
        {label}
      </p>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">
            Proc
          </span>

          <span className="font-bold text-slate-800">
            {d.proc.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">
            Moved
          </span>

          <span className="font-bold text-green-500">
            {d.moved.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">
            Scrap
          </span>

          <span className="font-bold text-rose-500">
            {d.scrap.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between pt-2 border-t">
          <span className="text-slate-500">
            Yield
          </span>

          <span className="font-black text-blue-500">
            {d.yieldPct}%
          </span>
        </div>
      </div>
    </div>
  );
};

export function ProductChartBisq({
  startDate,
  endDate,
}: Props) {
  const [data, setData] = useState<any[]>(
    []
  );

  const [loading, setLoading] =
    useState(false);

  const [openModal, setOpenModal] =
    useState(false);

  const apiBase =
    (import.meta as any)?.env
      ?.VITE_API_URL ||
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
      AND [OP] = 30

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

      const res = await fetch(
        `${apiBase}/query`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            query,
            db: "formming",
          }),
        }
      );

      const payload = await res.json();

      const records =
        payload?.recordset ||
        payload?.data ||
        [];

      const chartData = records.map(
        (x: any) => {
          const proc = Number(
            x.Ptotal ?? 0
          );

          const moved = Number(
            x.sumA ?? 0
          );

          const scrap = Number(
            x.sumscrap ?? 0
          );

          const yieldPct = proc
            ? (
                (moved / proc) *
                100
              ).toFixed(1)
            : "0";

          return {
            name:
              GROUP_NAME_MAP[
                x.GroupCode
              ] || x.GroupCode,

            proc,
            moved,
            scrap,

            yieldPct:
              Number(yieldPct),
          };
        }
      );

      setData(chartData);
    } finally {
      setLoading(false);
    }
  };

  const totalProc = data.reduce(
    (s, i) => s + i.proc,
    0
  );

  const totalMoved = data.reduce(
    (s, i) => s + i.moved,
    0
  );

  const totalScrap = data.reduce(
    (s, i) => s + i.scrap,
    0
  );

  const avgYield = totalProc
    ? (
        (totalMoved / totalProc) *
        100
      ).toFixed(1)
    : "0";

  const dateLabel =
    startDate && endDate
      ? `${format(
          startDate,
          "dd/MM/yyyy"
        )} → ${format(
          endDate,
          "dd/MM/yyyy"
        )}`
      : "-";

  return (
    <>
      <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100 border border-white/40 rounded-[32px] shadow-2xl p-5 h-[650px] flex flex-col overflow-hidden">

        {/* HEADER */}

        <div className="flex items-start justify-between mb-5">

          <div>
            <div className="flex items-center gap-3 mb-1">

              <div className="p-3 rounded-2xl bg-yellow-100 shadow-inner">
                <Trophy className="text-yellow-500" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  Bisquefiring Yield Analysis
                </h2>

                <p className="text-sm text-slate-500">
                  Production Performance Dashboard
                </p>
              </div>
            </div>

            <div className="mt-3 inline-flex items-center px-4 py-1 rounded-full bg-slate-100 text-xs text-slate-600 font-semibold">
              {dateLabel}
            </div>
          </div>

          <button
            onClick={() =>
              setOpenModal(true)
            }
            className="p-3 rounded-2xl bg-white shadow-md hover:scale-105 transition"
          >
            <Maximize2
              size={18}
              className="text-slate-700"
            />
          </button>
        </div>

        {/* KPI */}

        <div className="grid grid-cols-4 gap-4 mb-5">

          <div className="rounded-3xl p-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl">
            <p className="text-sm opacity-70">
              Proc
            </p>

            <h1 className="text-3xl font-black mt-1">
              {totalProc.toLocaleString()}
            </h1>
          </div>

          <div className="rounded-3xl p-5 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl">
            <p className="text-sm opacity-80">
              Moved
            </p>

            <h1 className="text-3xl font-black mt-1">
              {totalMoved.toLocaleString()}
            </h1>
          </div>

          <div className="rounded-3xl p-5 bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-xl">
            <p className="text-sm opacity-80">
              Scrap
            </p>

            <h1 className="text-3xl font-black mt-1">
              {totalScrap.toLocaleString()}
            </h1>
          </div>

          <div className="rounded-3xl p-5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl">
            <p className="text-sm opacity-80">
              Avg Yield
            </p>

            <h1 className="text-3xl font-black mt-1">
              {avgYield}%
            </h1>
          </div>
        </div>

        <CustomLegend />

        {/* CHART */}

        <div className="flex-1 bg-white/80 backdrop-blur rounded-[28px] border border-slate-200 shadow-inner p-4">

          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 font-bold text-lg">
              Loading...
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <ComposedChart
                data={data}
                margin={{
                  top: 40,
                  right: 30,
                  left: 10,
                  bottom: 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  opacity={0.1}
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#475569",
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                />

                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#64748B",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tickFormatter={(v) =>
                    `${v}%`
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "#2563EB",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />

                <Tooltip
                  content={
                    <CustomTooltip />
                  }
                />

                {/* MOVED */}

                <Bar
                  yAxisId="left"
                  dataKey="moved"
                  stackId="a"
                  radius={[0, 0, 12, 12]}
                  barSize={46}
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
                  yAxisId="left"
                  dataKey="scrap"
                  stackId="a"
                  radius={[12, 12, 0, 0]}
                  barSize={46}
                >
                  {data.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS.scrap}
                    />
                  ))}
                </Bar>

                {/* YIELD LINE */}

                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="yieldPct"
                  stroke={COLORS.line}
                  strokeWidth={4}
                  dot={{
                    r: 6,
                    fill: COLORS.line,
                    strokeWidth: 3,
                    stroke: "#fff",
                  }}
                  activeDot={{
                    r: 8,
                  }}
                >
                  <LabelList
                    dataKey="yieldPct"
                    position="top"
                    offset={10}
                    formatter={(v: any) =>
                      `${v}%`
                    }
                    style={{
                      fill: "#2563EB",
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* FULLSCREEN */}

      {openModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
          onClick={() =>
            setOpenModal(false)
          }
        >
          <div
            className="bg-white w-[97vw] h-[96vh] rounded-[36px] p-6 shadow-2xl relative flex flex-col"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <button
              className="absolute top-5 right-5 p-3 rounded-2xl bg-slate-100 hover:bg-slate-200"
              onClick={() =>
                setOpenModal(false)
              }
            >
              <X />
            </button>

            <h1 className="text-3xl font-black text-slate-800 mb-1">
              Finishing Yield Analysis
            </h1>

            <p className="text-sm text-slate-500 mb-4">
              {dateLabel}
            </p>

            <CustomLegend />

            <div className="flex-1 min-h-0">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <ComposedChart
                  data={data}
                  margin={{
                    top: 50,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.1}
                  />

                  <XAxis dataKey="name" />

                  <YAxis yAxisId="left" />

                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                  />

                  <Tooltip
                    content={
                      <CustomTooltip />
                    }
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="moved"
                    stackId="a"
                    fill={COLORS.moved}
                    radius={[
                      0, 0, 12, 12,
                    ]}
                  />

                  <Bar
                    yAxisId="left"
                    dataKey="scrap"
                    stackId="a"
                    fill={COLORS.scrap}
                    radius={[
                      12, 12, 0, 0,
                    ]}
                  />

                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="yieldPct"
                    stroke={COLORS.line}
                    strokeWidth={4}
                    dot={{
                      r: 6,
                    }}
                  >
                    <LabelList
                      dataKey="yieldPct"
                      position="top"
                      offset={10}
                      formatter={(
                        v: any
                      ) => `${v}%`}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}