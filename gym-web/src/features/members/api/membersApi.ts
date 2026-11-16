import { API_URL } from "../../../shared/config";
import type {
  MembersResponse,
  RegisterMemberInput,
  RegisterMemberResponse,
} from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body?.errors?.join(" · ") ?? body?.error ?? `Error ${res.status}`;
    throw new Error(message);
  }
  return body as T;
}

export function fetchMembers(): Promise<MembersResponse> {
  return request<MembersResponse>("/members");
}

export function registerMember(
  input: RegisterMemberInput,
): Promise<RegisterMemberResponse> {
  return request<RegisterMemberResponse>("/members", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
