export const SEARCH_URL: string;
export const PAGE_SIZE: 50;
export interface SearchScope {
  state?: 'wa' | 'nsw' | 'vic' | 'qld' | 'sa' | 'tas' | 'act' | 'nt';
  condition?: 'Used' | 'New' | 'Demo';
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  priceFrom?: number;
  priceTo?: number;
  fuelType?: string;
  transmissionType?: string;
  driveType?: string;
  bodyTypeGroup?: string;
}
export type Listing = Record<string, unknown>;
export interface PageMetadata {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
  returned: number;
}
export interface ParsedPage { metadata: PageMetadata; listings: Listing[] }
export interface CapturedPage extends ParsedPage { pageNumber: number; url: string }
export interface RequestMetadata {
  page: number;
  role: 'capture' | 'consistency_probe';
  attempt: number;
  url: string;
  requestedAt: string;
  status: number | null;
  sha256: string | null;
}
export interface Summary {
  scope: SearchScope;
  startedAt: string;
  completedAt: string | null;
  status: 'COMPLETE' | 'PARTIAL' | 'INVALID' | 'CHANGED_DURING_CAPTURE';
  sourceTotalStart: number | null;
  sourceTotalEnd: number | null;
  pagesExpected: number;
  pagesFetched: number;
  rawHits: number;
  uniqueListingIds: number;
  duplicateHits: number;
  missingListingIds: number;
  populationChanged: boolean;
  firstPageChanged: boolean;
  requests: RequestMetadata[];
  errors: string[];
}
export type Transport = (url: string, options: { timeoutMs: number }) => Promise<{
  status: number;
  headers: Headers;
  bytes: Uint8Array;
}>;
export interface CollectionOptions {
  allowNetwork: true;
  scope?: SearchScope;
  /** Defaults to one page. null explicitly requests all pages. */
  maxPages?: number | null;
  delayMs?: number;
  timeoutMs?: number;
  maxAttempts?: number;
  transport?: Transport;
  sleep?: (milliseconds: number) => Promise<void>;
  onPage: (page: CapturedPage) => void | Promise<void>;
  /** Called for every HTTP response before parsing, including error responses. */
  onResponse?: (response: RequestMetadata & { bytes: Uint8Array }) => void | Promise<void>;
}
export function normalizeScope(input?: SearchScope): SearchScope;
export function buildSearchUrl(input?: SearchScope, page?: number): string;
export function parsePage(bytes: Uint8Array, expectedPage?: number): ParsedPage;
export const curlTransport: Transport;
export const fetchTransport: Transport;
export function collectListings(options: CollectionOptions): Promise<Summary>;
export class AcquisitionError extends Error {
  summary: Summary;
  constructor(message: string, summary: Summary, cause?: unknown);
}
