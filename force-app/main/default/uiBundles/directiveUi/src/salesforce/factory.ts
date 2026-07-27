import type { Repositories } from "./repositories";
import { createMockRepositories } from "./mock/MockRepositories";
import { createSalesforceRepositories } from "./salesforce/SalesforceRepositories";

export type DataMode = "mock" | "salesforce";

export function getDataMode(): DataMode {
  return import.meta.env.VITE_DATA_MODE === "salesforce" ? "salesforce" : "mock";
}

let cached: Repositories | null = null;

/**
 * Repository factory. Switches on VITE_DATA_MODE (default "mock"). The rest of
 * the app imports only from here, so swapping to the real org is a one-line env
 * change once the Salesforce adapter is wired.
 */
export function getRepositories(): Repositories {
  if (cached) return cached;
  cached =
    getDataMode() === "salesforce"
      ? createSalesforceRepositories()
      : createMockRepositories();
  return cached;
}
