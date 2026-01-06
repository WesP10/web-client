import { create } from 'zustand';
import { hubsApi } from '@/services/api';
import type { HubInfo, ActiveSubscription } from '@/types';

interface HubState {
  hubs: HubInfo[];
  activeSubscriptions: ActiveSubscription[];
  selectedDevices: Set<string>; // Set of "hubId:portId" strings
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchHubs: () => Promise<void>;
  updateHub: (hub: HubInfo) => void;
  addSubscription: (subscription: ActiveSubscription) => void;
  removeSubscription: (hubId: string, portId: string) => void;
  toggleDeviceSelection: (hubId: string, portId: string) => void;
  clearDeviceSelection: () => void;
  getSelectedDevices: () => ActiveSubscription[];
}

function deviceKey(hubId: string, portId: string): string {
  return `${hubId}:${portId}`;
}

export const useHubStore = create<HubState>((set, get) => ({
  hubs: [],
  activeSubscriptions: [],
  selectedDevices: new Set(),
  isLoading: false,
  error: null,

  fetchHubs: async () => {
    set({ isLoading: true, error: null });
    try {
      const hubs = await hubsApi.getHubs();
      set({ hubs, isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || 'Failed to fetch hubs';
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateHub: (hub: HubInfo) => {
    set((state) => ({
      hubs: state.hubs.map((h) => (h.hubId === hub.hubId ? hub : h)),
    }));
  },

  addSubscription: (subscription: ActiveSubscription) => {
    set((state) => {
      const key = deviceKey(subscription.hubId, subscription.portId);
      const exists = state.activeSubscriptions.some(
        (s) => deviceKey(s.hubId, s.portId) === key
      );

      if (exists) {
        return state;
      }

      return {
        activeSubscriptions: [...state.activeSubscriptions, subscription],
      };
    });
  },

  removeSubscription: (hubId: string, portId: string) => {
    const key = deviceKey(hubId, portId);
    set((state) => ({
      activeSubscriptions: state.activeSubscriptions.filter(
        (s) => deviceKey(s.hubId, s.portId) !== key
      ),
    }));
  },

  toggleDeviceSelection: (hubId: string, portId: string) => {
    const key = deviceKey(hubId, portId);
    set((state) => {
      const newSelection = new Set(state.selectedDevices);
      if (newSelection.has(key)) {
        newSelection.delete(key);
      } else {
        newSelection.add(key);
      }
      return { selectedDevices: newSelection };
    });
  },

  clearDeviceSelection: () => {
    set({ selectedDevices: new Set() });
  },

  getSelectedDevices: () => {
    const state = get();
    const selected: ActiveSubscription[] = [];

    state.selectedDevices.forEach((key) => {
      const [hubId, portId] = key.split(':');
      const subscription = state.activeSubscriptions.find(
        (s) => s.hubId === hubId && s.portId === portId
      );

      if (subscription) {
        selected.push(subscription);
      } else {
        // If not in active subscriptions, create a basic one
        selected.push({ 
          hubId, 
          portId,
          subscribedAt: new Date().toISOString(),
        });
      }
    });

    return selected;
  },
}));
