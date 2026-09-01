import { activities, candidates, elections, results, voters } from '@/data/mockData';
export const mockApi = {
  listElections: async () => elections,
  listCandidates: async () => candidates,
  listVoters: async () => voters,
  listActivity: async () => activities,
  listResults: async (id: string) => results[id] ?? [],
};