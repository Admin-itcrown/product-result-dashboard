import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import {
  Trophy,
  Maximize2,
  X,
  Package2,
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
const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#EC4899",
  "#84CC16",
  "#F97316",
];

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

export function ProductChartFormm({
  startDate,
  endDate,
}: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  const apiBase =
    (import.meta as any)?.env?.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

  useEffect(() => {
    if (!startDate || !endDate) return;
    fetchData();
  }, [startDate, endDate]);

  const formatDate = (d?: Date) =>
    d ? format(d, "yyyy-MM-dd") : "";

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
      AND [OP] = 10

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
      const records = payload?.recordset || [];

      const chartData = records
        .filter((x: any) => Number(x.Ptotal || 0) > 0)
        .map((x: any) => {
          const label = GROUP_NAME_MAP[x.GroupCode] || x.GroupCode;

          return {
            name: label,
            value: Number(x.Ptotal || 0),
            moved: Number(x.sumA || 0),
            scrap: Number(x.sumscrap || 0),
          };
        });

      setData(chartData);
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const total = data.reduce((s, i) => s + i.value, 0);
  const totalMoved = data.reduce((s, i) => s + i.moved, 0);
  const totalScrap = data.reduce((s, i) => s + i.scrap, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const item = payload[0].payload;

    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-4 min-w-[220px]">
        <div className="font-bold text-slate-800 text-base mb-3">
          {item.name}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Proc</span>
            <span className="font-semibold">
              {item.value.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-emerald-600">Moved</span>
            <span className="font-semibold">
              {item.moved.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-rose-500">Scrap</span>
            <span className="font-semibold">
              {item.scrap.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderChart = (expanded = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <defs>
          <filter id="shadow">
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="10"
              floodOpacity="0.15"
            />
          </filter>
        </defs>

        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={expanded ? 95 : 78}
          outerRadius={expanded ? 195 : 150}
          paddingAngle={3}
          cornerRadius={10}
          stroke="#fff"
          strokeWidth={3}
          isAnimationActive
          animationDuration={800}
          labelLine={false}
          label={({ name, value }) => {
            const percent = total
              ? ((value / total) * 100).toFixed(1)
              : "0";

            return `${name} ${percent}%`;
          }}
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
              style={{
                filter: "url(#shadow)",
              }}
            />
          ))}
        </Pie>

        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan
            x="50%"
            dy="-14"
            fontSize={expanded ? 16 : 13}
            fill="#64748b"
            fontWeight="600"
          >
            TOTAL PROC
          </tspan>

          <tspan
            x="50%"
            dy={expanded ? 30 : 24}
            fontSize={expanded ? 30 : 24}
            fill="#0f172a"
            fontWeight="800"
          >
            {total.toLocaleString()}
          </tspan>
        </text>

        <Tooltip content={<CustomTooltip />} />

        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{
            paddingTop: 20,
            fontSize: 13,
            fontWeight: 600,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  return (
    <>
      {/* =========================
          CARD
      ========================= */}
      <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-2xl">

        {/* BG EFFECT */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-100 rounded-full blur-3xl opacity-30" />

        <div className="relative p-6">

          {/* HEADER */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Trophy className="text-white" size={22} />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                    Formming Group Analysis
                  </h2>

                  <p className="text-sm text-slate-500">
                    Production Overview by Product Group
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* DATE */}
              <div className="px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600">
                {startDate && endDate
                  ? `${format(startDate, "dd/MM/yyyy")} - ${format(
                      endDate,
                      "dd/MM/yyyy"
                    )}`
                  : "No Date"}
              </div>

              {/* FULLSCREEN */}
              <button
                onClick={() => setOpenModal(true)}
                className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm hover:scale-105 transition"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-4 mb-5">

            <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 text-sm font-medium">
                  Total Proc
                </span>

                <Package2 className="text-blue-500" size={18} />
              </div>

              <div className="text-2xl font-black text-slate-800">
                {total.toLocaleString()}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-emerald-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-600 text-sm font-medium">
                  Total Moved
                </span>

                <TrendingUp className="text-emerald-500" size={18} />
              </div>

              <div className="text-2xl font-black text-emerald-600">
                {totalMoved.toLocaleString()}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-rose-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-rose-500 text-sm font-medium">
                  Total Scrap
                </span>

                <div className="w-3 h-3 rounded-full bg-rose-500" />
              </div>

              <div className="text-2xl font-black text-rose-500">
                {totalScrap.toLocaleString()}
              </div>
            </div>
          </div>

          {/* CHART */}
          <div className="h-[460px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-lg font-medium">
                Loading...
              </div>
            ) : (
              renderChart(false)
            )}
          </div>
        </div>
      </div>

      {/* =========================
          FULLSCREEN MODAL
      ========================= */}
      {openModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-5">

          <div className="relative bg-white w-[96vw] h-[94vh] rounded-[35px] shadow-2xl overflow-hidden">

            {/* HEADER */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Trophy className="text-white" />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-800">
                    Formming Group Analysis
                  </h2>

                  <p className="text-sm text-slate-500">
                    Expanded Dashboard View
                  </p>
                </div>
              </div>

              {/* CLOSE */}
              <button
                onClick={() => setOpenModal(false)}
                className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center"
              >
                <X />
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 h-[calc(100%-88px)]">
              {renderChart(true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}