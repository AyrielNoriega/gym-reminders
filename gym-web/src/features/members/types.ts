export type MemberStatus = "activo" | "por_vencer" | "vencido";
export type Plan = "mensual" | "trimestral" | "semestral" | "anual";

export interface Member {
  name: string;
  email: string;
  plan: Plan;
  lastPaymentAt: string;
  expiresAt: string;
  lastNotice: string | null;
  status: MemberStatus;
  daysLeft: number;
}

export interface MembersResponse {
  today: string;
  total: number;
  counts: Record<MemberStatus, number>;
  members: Member[];
}

export interface RegisterMemberInput {
  name: string;
  email: string;
  plan: Plan;
  paidAt?: string;
}

export interface RegisterMemberResponse {
  message: string;
  member: Member;
}
