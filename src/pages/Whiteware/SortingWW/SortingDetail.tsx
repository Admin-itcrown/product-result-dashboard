import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useState } from 'react';

const P1Whiteware = () => {
  const [query, setQuery] = useState('SELECT TOP 10 * FROM dbo.v_rpt_sort WHERE m_date = \'2026-01-02\'');
    // profile key for this page (matches DB_PROFILES entry)
    const dbProfile = 'sorting';
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function runQuery() {
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const envApi = (import.meta as any)?.env?.VITE_API_URL;
      const apiBase = envApi || ((typeof window !== 'undefined')
        ? `${window.location.protocol}//${window.location.hostname}:3001`
        : 'http://localhost:3001');

      const res = await fetch(`${apiBase}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, db: dbProfile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Query failed');
      setRows(data.recordset || []);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold text-foreground mb-6">P1 Whiteware</h1>

          <div className="mb-4">
            <label className="block mb-2">SQL Query</label>
            <textarea
              className="w-full p-2 border rounded h-28 bg-background"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-2">
              <button className="btn" onClick={runQuery} disabled={loading}>
                {loading ? 'Running...' : 'Run Query'}
              </button>
            </div>
          </div>

          {error && <div className="text-red-600">Error: {error}</div>}

          <div>
            <h2 className="text-lg font-semibold mb-2">Results ({rows.length})</h2>
            {rows.length === 0 ? (
              <div className="text-muted-foreground">No rows</div>
            ) : (
              <div className="overflow-auto">
                <table className="w-full table-auto border-collapse">
                  <thead>
                    <tr>
                      {Object.keys(rows[0]).map((h) => (
                        <th key={h} className="border px-2 py-1 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="odd:bg-muted">
                        {Object.keys(rows[0]).map((k) => (
                          <td key={k} className="border px-2 py-1">{String(r[k] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white/90 dark:bg-slate-800 p-6 rounded-lg shadow-lg flex flex-col items-center">
                <div className="w-12 h-12 mb-4 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <div className="text-lg font-medium">กำลังดึงข้อมูล กรุณารอสักครู่...</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default P1Whiteware;
