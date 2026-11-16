import type { MemberStatus, Plan } from "./types";

export const PLANS: Plan[] = ["mensual", "trimestral", "semestral", "anual"];

export const STATUS_META: Record<
  MemberStatus,
  { label: string; color: "success" | "warning" | "error" }
> = {
  activo: { label: "Activo", color: "success" },
  por_vencer: { label: "Por vencer", color: "warning" },
  vencido: { label: "Vencido", color: "error" },
};
