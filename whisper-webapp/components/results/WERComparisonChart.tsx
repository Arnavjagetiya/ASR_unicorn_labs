"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ErrorBar } from "recharts";
import { GROUP_STATS } from "@/lib/werData";

export default function WERComparisonChart() {
  const data = GROUP_STATS.map((g) => ({
    name: g.label,
    mean: +(g.mean * 100).toFixed(2),
    std: +(g.std * 100).toFixed(2),
    color: g.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#83879a", fontSize: 13 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
        <YAxis
          tick={{ fill: "#83879a", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          label={{ value: "Word Error Rate (%)", angle: -90, position: "insideLeft", fill: "#83879a", fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{ background: "#12141b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13 }}
          labelStyle={{ color: "#f1f2f5" }}
          formatter={(value) => [`${value}%`, "Mean WER"]}
        />
        <Bar dataKey="mean" radius={[8, 8, 0, 0]} barSize={90}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
          <ErrorBar dataKey="std" width={6} strokeWidth={1.5} stroke="rgba(255,255,255,0.5)" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
