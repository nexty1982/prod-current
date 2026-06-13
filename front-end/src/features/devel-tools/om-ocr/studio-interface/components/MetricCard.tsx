import React from "react";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "default" | "blue" | "green" | "amber" | "red" | "purple" | "gold";
  onClick?: () => void;
}

const colorMap = {
  default: { icon: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200" },
  blue:    { icon: "text-blue-500",  bg: "bg-blue-50",  border: "border-blue-100" },
  green:   { icon: "text-green-500", bg: "bg-green-50", border: "border-green-100" },
  amber:   { icon: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100" },
  red:     { icon: "text-red-500",   bg: "bg-red-50",   border: "border-red-100" },
  purple:  { icon: "text-purple-500",bg: "bg-purple-50",border: "border-purple-100" },
  gold:    { icon: "text-yellow-600",bg: "bg-yellow-50",border: "border-yellow-100" },
};

export function MetricCard({ label, value, icon: Icon, trend, trendUp, color = "default", onClick }: MetricCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`bg-white rounded-lg border ${c.border} p-4 flex flex-col gap-2 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className={`w-8 h-8 rounded-md ${c.bg} flex items-center justify-center`}>
            <Icon size={16} className={c.icon} />
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-[#1a2744]">{value}</span>
        {trend && (
          <span className={`text-xs pb-0.5 font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>{trend}</span>
        )}
      </div>
    </div>
  );
}
