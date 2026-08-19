import { create } from "zustand";
import type { QueueEntrySummary } from "@anora/shared-types";

interface QueueState {
  doctorProfileId: string | null;
  entries: QueueEntrySummary[];
  lastRegisteredId: string | null;
  setQueue: (doctorProfileId: string, entries: QueueEntrySummary[]) => void;
  flagJustRegistered: (id: string) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  doctorProfileId: null,
  entries: [],
  lastRegisteredId: null,
  setQueue: (doctorProfileId, entries) => set({ doctorProfileId, entries }),
  flagJustRegistered: (id) => set({ lastRegisteredId: id }),
}));
