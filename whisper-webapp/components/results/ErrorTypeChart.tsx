"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ERROR_TYPES } from "@/lib/werData";

export default function ErrorTypeChart() {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={ERROR_TYPES} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
        <XAxis type="number" tick={{ fill: "#83879a", fontSize: 12 }} axisLine={false} tickLine={false} label={{ value: "avg. errors per clip", position: "insideBottom", offset: -2, fill: "#83879a", fontSize: 12 }} />
        <YAxis dataKey="group" type="category" tick={{ fill: "#f1f2f5", fontSize: 13 }} axisLine={false} tickLine={false} width={110} />
        <Tooltip contentStyle={{ background: "#12141b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 13 }} labelStyle={{ color: "#f1f2f5" }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#83879a" }} />
        <Bar dataKey="substitutions" stackId="a" fill="#ff8fae" name="Substitutions" radius={[0, 0, 0, 0]} />
        <Bar dataKey="deletions" stackId="a" fill="#f7b955" name="Deletions" />
        <Bar dataKey="insertions" stackId="a" fill="#5be3c9" name="Insertions" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
