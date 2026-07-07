import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getCat } from "../../../../constants/categorias";

const money = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];

  return (
    <div
      style={{
        background: "#15181f",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "8px 12px",
        fontSize: 13,
      }}
    >
      <strong style={{ color: item.payload.cor }}>{item.name}</strong>
      <div style={{ color: "#fff", marginTop: 2 }}>{money(item.value)}</div>
    </div>
  );
};

export default function SpendingChart({ transacoesMes = [] }) {
  const pieData = useMemo(() => {
    const agrupado = transacoesMes
      .filter((t) => t.tipo === "saida")
      .reduce((acc, t) => {
        const key = t.categoria || "outros";
        acc[key] = (acc[key] || 0) + Number(t.valor || 0);
        return acc;
      }, {});

    return Object.entries(agrupado)
      .map(([key, value]) => {
        const categoria = getCat(key);

        return {
          name: categoria.label,
          value,
          cor: categoria.cor,
        };
      })
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transacoesMes]);

  if (pieData.length === 0) return null;

  const total = pieData.reduce((soma, item) => soma + item.value, 0);
  const maiorGasto = pieData[0];

  return (
    <section className="chart-section">
      <div className="section-header">
        <h3>Gastos do mês</h3>
        <small style={{ color: "#ffb0b0", fontWeight: 700 }}>{money(total)}</small>
      </div>

      <div className="chart-highlight">
        <span style={{ color: maiorGasto.cor }}>▲ Maior gasto: </span>
        <strong>{maiorGasto.name}</strong>
        <span style={{ color: "#9aa3b8", marginLeft: 4 }}>
          ({((maiorGasto.value / total) * 100).toFixed(0)}%)
        </span>
      </div>

      <div className="chart-wrapper">
        <div className="chart-pie">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="pie-legend">
          {pieData.map((item, index) => (
            <div key={index} className="pie-legend-item">
              <span className="pie-dot" style={{ background: item.cor }} />
              <span className="pie-label">{item.name}</span>
              <span className="pie-value">{money(item.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
