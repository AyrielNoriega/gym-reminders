import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMembers, registerMember } from "../api/membersApi";
import type { RegisterMemberInput } from "../types";

export const membersQuery = () => ({
  queryKey: ["members"] as const,
  queryFn: fetchMembers,
});

export function useMembers() {
  return useQuery(membersQuery());
}

export function useRegisterMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterMemberInput) => registerMember(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: membersQuery().queryKey }),
  });
}
