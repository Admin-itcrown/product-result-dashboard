import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Trophy } from "lucide-react";
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
   GROUP MAP NAME
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

export function ProductChartFormming({
  startDate,
  endDate,
}: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const apiBase =
    (import.meta as any)?.env?.VITE_API_URL ||
    `${window.location.protocol}//${window.location.hostname}:3001`;

  useEffect(() => {
    if (!startDate || !endDate) return;
    fetchData();
  }, [startDate, endDate]);

  const formatDate = (d?: Date) =>
    d ? format(d, "yyyy-MM-dd") : "";

  /* =========================
     FETCH DATA
  ========================= */
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
          const label =
            GROUP_NAME_MAP[x.GroupCode] || x.GroupCode;

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

  /* =========================
     UI
  ========================= */
  return (
    <div className="relative bg-white rounded-3xl border shadow-xl p-6 h-[620px]">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy className="text-yellow-500" />
          <h2 className="text-xl font-bold text-slate-800">
            Formming Group Analysis
          </h2>
        </div>

        {/* DATE BADGE */}
        <div className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 border">
          {startDate && endDate
            ? `${format(startDate, "dd/MM/yyyy")} - ${format(
                endDate,
                "dd/MM/yyyy"
              )}`
            : "No Date"}
        </div>
      </div>

      {/* CHART */}
      {loading ? (
        <div className="h-full flex items-center justify-center text-slate-500">
          Loading...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={140}
              paddingAngle={3}
              label={({ name, value }) => {
                const percent = total
                  ? ((value / total) * 100).toFixed(1)
                  : "0";

                return `${name} : ${Number(value).toLocaleString()} | ${percent}%`;
              }}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </Pie>

            {/* CENTER */}
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              <tspan x="50%" dy="-8" fontSize="13" fill="#64748b">
                TOTAL
              </tspan>
              <tspan x="50%" dy="20" fontSize="18" fontWeight="bold">
                {total.toLocaleString()}
              </tspan>
            </text>

            <Tooltip
              formatter={(value: any, _name: any, props: any) => {
                const item = props.payload;
                return [
                  `${item.name} : ${Number(value).toLocaleString()}`,
                  `Moved: ${item.moved.toLocaleString()} | Scrap: ${item.scrap.toLocaleString()}`,
                ];
              }}
            />

            <Legend />

          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}