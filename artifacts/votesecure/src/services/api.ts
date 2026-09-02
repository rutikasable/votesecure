/**
 * VoteSecure Frontend API Service
 * Centralized client for communicating with the VoteSecure Express backend.
 */

const ensureApiSuffix = (url: string): string => {
  const trimmed = url.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

// Base API URL configured via Vite environment variable VITE_API_URL or current host
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;

  if (envUrl && envUrl.trim() !== '') {
    try {
      const parsed = new URL(
        envUrl,
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
      );
      // If envUrl is explicitly pointing to an external production host (e.g. Railway, Render, etc.), always use it!
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return ensureApiSuffix(envUrl);
      }
      // If envUrl is localhost, but accessed from a LAN IP in dev (e.g. 192.100.30.203), adapt host
      if (
        typeof window !== 'undefined' &&
        window.location.hostname &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1'
      ) {
        parsed.hostname = window.location.hostname;
        return ensureApiSuffix(parsed.toString());
      }
      return ensureApiSuffix(envUrl);
    } catch {
      return ensureApiSuffix(envUrl);
    }
  }

  // Fallback if no VITE_API_URL is configured
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
  }

  return 'http://localhost:5000/api';
};

export const API_BASE_URL: string = getApiBaseUrl();

// Storage key for authenticated JWT token
export const TOKEN_STORAGE_KEY = 'voteSecure_token';

// ==========================================
// 1. TOKEN UTILITIES
// ==========================================

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    return null;
  }
};

export const setToken = (token: string): void => {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error('Failed to save auth token:', err);
  }
};

export const removeToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove auth token:', err);
  }
};

// ==========================================
// 2. TYPES
// ==========================================

export type UserRole = 'voter' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  mobile?: string | null;
  role: UserRole;
  created_at?: string;
}

export type ElectionStatus = 'upcoming' | 'active' | 'ended';

export interface Election {
  id: number;
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  status: ElectionStatus;
  created_at?: string;
}

export interface Candidate {
  id: number;
  name: string;
  photo?: string | null;
  party?: string | null;
  description?: string | null;
  election_id: number;
}

export interface VotePayload {
  election_id: number;
  candidate_id: number;
}

export interface VoteResponse {
  success: boolean;
  message: string;
}

export interface ElectionResultItem {
  candidate_id: number;
  candidate_name: string;
  party: string | null;
  photo: string | null;
  vote_count: number;
}

export interface ElectionResults {
  success: boolean;
  election: {
    id: number;
    title: string;
    status: string;
  };
  total_votes: number;
  results: ElectionResultItem[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ==========================================
// 3. CORE REQUEST HELPER
// ==========================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  requiresAuth?: boolean;
}

async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, requiresAuth = false } = options;

  const url = `${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Automatically attach Bearer token if present
  const token = getToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  } else if (requiresAuth) {
    throw new ApiError('Authentication token is required for this request.', 401);
  }

  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined && body !== null) {
    fetchOptions.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err: any) {
    throw new ApiError(
      err.message || 'Network error: Unable to communicate with the VoteSecure API server.',
      0
    );
  }

  let responseData: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = null;
    }
  } else {
    try {
      responseData = await response.text();
    } catch (e) {
      responseData = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && requiresAuth) {
      removeToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }

    const errorMessage =
      (typeof responseData === 'object' && responseData !== null && responseData.message) ||
      (typeof responseData === 'string' && responseData) ||
      `HTTP Error ${response.status}: ${response.statusText}`;

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData as T;
}

// ==========================================
// 4. API FUNCTIONS
// ==========================================

// --- AUTHENTICATION ---

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  mobile?: string;
}): Promise<{ success: boolean; message: string; user: User }> {
  return apiRequest<{ success: boolean; message: string; user: User }>('/auth/register', {
    method: 'POST',
    body: data,
  });
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string; token: string; user: User }> {
  const res = await apiRequest<{ success: boolean; message: string; token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: data,
  });
  if (res && res.token) {
    setToken(res.token);
  }
  return res;
}

export async function getCurrentUser(): Promise<{ success: boolean; user: User }> {
  return apiRequest<{ success: boolean; user: User }>('/auth/me', {
    method: 'GET',
    requiresAuth: true,
  });
}

export function logoutUser(): void {
  removeToken();
}

// --- ELECTIONS ---

export async function getElections(
  status?: ElectionStatus
): Promise<{ success: boolean; count: number; elections: Election[] }> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<{ success: boolean; count: number; elections: Election[] }>(`/elections${query}`, {
    method: 'GET',
  });
}

export async function getElectionById(
  id: number | string
): Promise<{ success: boolean; election: Election }> {
  return apiRequest<{ success: boolean; election: Election }>(`/elections/${id}`, {
    method: 'GET',
  });
}

export async function createElection(data: {
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  status?: ElectionStatus;
}): Promise<{ success: boolean; message: string; election: Election }> {
  return apiRequest<{ success: boolean; message: string; election: Election }>('/elections', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function updateElection(
  id: number | string,
  data: Partial<{
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: ElectionStatus;
  }>
): Promise<{ success: boolean; message: string; election: Election }> {
  return apiRequest<{ success: boolean; message: string; election: Election }>(`/elections/${id}`, {
    method: 'PUT',
    body: data,
    requiresAuth: true,
  });
}

export async function deleteElection(
  id: number | string
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/elections/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

// --- CANDIDATES ---

export async function getCandidates(
  electionId?: number | string
): Promise<{ success: boolean; count: number; candidates: Candidate[] }> {
  const query = electionId ? `?election_id=${encodeURIComponent(electionId)}` : '';
  return apiRequest<{ success: boolean; count: number; candidates: Candidate[] }>(`/candidates${query}`, {
    method: 'GET',
  });
}

export async function getCandidateById(
  id: number | string
): Promise<{ success: boolean; candidate: Candidate }> {
  return apiRequest<{ success: boolean; candidate: Candidate }>(`/candidates/${id}`, {
    method: 'GET',
  });
}

export async function getCandidatesByElection(
  electionId: number | string
): Promise<{ success: boolean; electionId: number; count: number; candidates: Candidate[] }> {
  return apiRequest<{ success: boolean; electionId: number; count: number; candidates: Candidate[] }>(
    `/elections/${electionId}/candidates`,
    {
      method: 'GET',
    }
  );
}

export async function createCandidate(data: {
  name: string;
  election_id: number;
  photo?: string | null;
  party?: string | null;
  description?: string | null;
}): Promise<{ success: boolean; message: string; candidate: Candidate }> {
  return apiRequest<{ success: boolean; message: string; candidate: Candidate }>('/candidates', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function updateCandidate(
  id: number | string,
  data: Partial<{
    name: string;
    photo: string | null;
    party: string | null;
    description: string | null;
    election_id: number;
  }>
): Promise<{ success: boolean; message: string; candidate: Candidate }> {
  return apiRequest<{ success: boolean; message: string; candidate: Candidate }>(`/candidates/${id}`, {
    method: 'PUT',
    body: data,
    requiresAuth: true,
  });
}

export async function deleteCandidate(
  id: number | string
): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/candidates/${id}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}

// --- VOTING ---

export async function castVote(data: VotePayload): Promise<VoteResponse> {
  return apiRequest<VoteResponse>('/votes', {
    method: 'POST',
    body: data,
    requiresAuth: true,
  });
}

export async function getElectionVoteStatus(
  electionId: number | string
): Promise<{ success: boolean; has_voted: boolean }> {
  return apiRequest<{ success: boolean; has_voted: boolean }>(`/votes/status/${electionId}`, {
    method: 'GET',
    requiresAuth: true,
  });
}

export const getVoteStatus = getElectionVoteStatus;

export interface VoteHistoryItem {
  id: number;
  election_id: number;
  election_title: string;
  election_status: ElectionStatus | string;
  voted_at: string;
  receipt_code: string;
  status: string;
}

export async function getVoteHistory(): Promise<{
  success: boolean;
  count: number;
  history: VoteHistoryItem[];
}> {
  return apiRequest<{
    success: boolean;
    count: number;
    history: VoteHistoryItem[];
  }>('/votes/history', {
    method: 'GET',
    requiresAuth: true,
  });
}

// --- RESULTS ---

export async function getElectionResults(
  electionId: number | string
): Promise<ElectionResults> {
  return apiRequest<ElectionResults>(`/elections/${electionId}/results`, {
    method: 'GET',
  });
}

// --- ADMIN STATS & REGISTRY ---

export interface AdminStats {
  totalElections: number;
  activeElections: number;
  upcomingElections: number;
  endedElections: number;
  totalCandidates: number;
  totalVotes: number;
  registeredVoters: number;
}

export interface AdminElectionSummary {
  id: number;
  title: string;
  status: ElectionStatus;
  start_date: string;
  end_date: string;
  votes: number;
}

export interface AdminVoterRecord {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  registrationDate: string;
  hasVoted: boolean;
}

export async function getAdminStats(): Promise<{
  success: boolean;
  stats: AdminStats;
  elections: AdminElectionSummary[];
}> {
  return apiRequest<{
    success: boolean;
    stats: AdminStats;
    elections: AdminElectionSummary[];
  }>('/admin/stats', {
    method: 'GET',
    requiresAuth: true,
  });
}

export async function getAdminVoters(): Promise<{
  success: boolean;
  count: number;
  voters: AdminVoterRecord[];
}> {
  return apiRequest<{
    success: boolean;
    count: number;
    voters: AdminVoterRecord[];
  }>('/admin/voters', {
    method: 'GET',
    requiresAuth: true,
  });
}

// ==========================================
// 5. BACKWARD COMPATIBILITY
// ==========================================
import { activities, candidates as mockCandidates, elections as mockElections, results as mockResults, voters as mockVoters } from '@/data/mockData';
export const mockApi = {
  listElections: async () => mockElections,
  listCandidates: async () => mockCandidates,
  listVoters: async () => mockVoters,
  listActivity: async () => activities,
  listResults: async (id: string) => mockResults[id] ?? [],
};