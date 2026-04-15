import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getCat } from "../../constants/categorias";

export default function SpendingChart({ transacoesMes }) {
  const pieData = Object.entries(
    transacoesMes.filter(t => t.tipo === "saida").reduce((acc, t) => {
      const key = t.categoria || "outros";
      acc[key] = (acc[key] || 0) + t.valor;
      return acc;
    }, {})
  ).map(([key, value]) => ({ name: getCat(key).label, value, cor: getCat(key).cor }))
   .filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  if (pieData.length === 0) return null;
  const total = pieData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-section">
      <div className="section-header">
        <small>GASTOS DO MÊS</small>
        <small className="chart-total">R$ {total.toFixed(2)}</small>
      </div>
      <div className="chart-wrapper">
        <div className="chart-pie">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.cor} />)}
              </Pie>
              <Tooltip formatter={(v) => [`R$ ${v.toFixed(2)}`, ""]} contentStyle={{ background: "#15181f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pie-legend">
          {pieData.map((d, i) => (
            <div key={i} className="pie-legend-item">
              <span className="pie-dot" style={{ background: d.cor }} />
              <span className="pie-label">{d.name}</span>
              <span className="pie-value">R$ {d.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
