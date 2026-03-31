"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet, type Counterparty, type CounterpartyType } from "@/lib/api";

export function useCounterpartyList(type?: CounterpartyType) {
  const queryParams = new URLSearchParams();

  if (type) {
    queryParams.set("type", type);
  }

  const suffix = queryParams.toString();

  return useQuery({
    queryKey: ["counterparty-list", type ?? "all"],
    queryFn: () => apiGet<Counterparty[]>(`/counterparties${suffix ? `?${suffix}` : ""}`),
  });
}
