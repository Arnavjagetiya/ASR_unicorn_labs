"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { PHRASE_SENSITIVITY } from "@/lib/werData";

export default function PhraseSensitivityChart() {
  const data = PHRASE_SENSITIVITY.map((d) => ({
    phrase: d.phrase,
    "US English": d.usErrors,
    "Indian English": d.indiaErrors,
  }));

  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#83879a", fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "errors out of 30 clips", position: "insideBottom", offset: -2, fill: "#83879a", fontSize: 12 }} />
        <YAxis dataKey="phrase" type="category" tick={{ fill: "#f1f2f5", fontSize: 13 }} axisLine={false} tickLine={false} width={110} />
        <Tooltip contentStyle={{ background: "#12141b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13 }} labelStyle={{ color: "#f1f2f5" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#83879a" }} />
        <Bar dataKey="US English" fill="#5be3c9" radius={[0, 4, 4, 0]} barSize={14} />
        <Bar dataKey="Indian English" fill="#ff8fae" radius={[0, 4, 4, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
