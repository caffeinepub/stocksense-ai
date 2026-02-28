import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BreakingNewsTrade, ScanMetadata, StockPick } from "../backend.d";
import { useActor } from "./useActor";

export function useTopPicks() {
  const { actor, isFetching } = useActor();
  return useQuery<StockPick[]>({
    queryKey: ["topPicks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopPicks();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useBreakingNewsTrades() {
  const { actor, isFetching } = useActor();
  return useQuery<BreakingNewsTrade[]>({
    queryKey: ["breakingNews"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBreakingNewsTrades();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useScanMetadata() {
  const { actor, isFetching } = useActor();
  return useQuery<ScanMetadata>({
    queryKey: ["scanMetadata"],
    queryFn: async () => {
      if (!actor) {
        return {
          totalPicksGenerated: 0n,
          marketStatus: "Closed",
          dataFreshnessMinutes: 0n,
          nextScheduledScan: 0n,
          lastScanTimestamp: 0n,
          scanStatus: "Idle",
          totalBreakingNews: 0n,
        } as ScanMetadata;
      }
      return actor.getScanMetadata();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30_000,
    staleTime: 25_000,
  });
}

export function useTriggerScan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation<string, Error>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.triggerManualScan();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topPicks"] });
      queryClient.invalidateQueries({ queryKey: ["breakingNews"] });
      queryClient.invalidateQueries({ queryKey: ["scanMetadata"] });
    },
  });
}
