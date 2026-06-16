// All status transition and business rules live here

const WEBSITE_STATUS_TRANSITIONS: Record<string, string[]> = {
  'In Progress': ['Live', 'On Hold', 'Discontinued'],
  'Live':        ['On Hold', 'Completed', 'Discontinued'],
  'On Hold':     ['In Progress', 'Live', 'Discontinued'],
  'Completed':   ['Live', 'Discontinued'],
  'Discontinued': [],
};

const MAINTENANCE_STATUS_TRANSITIONS: Record<string, string[]> = {
  'Not Started': ['Active', 'Cancelled'],
  'Active':      ['Paused', 'Cancelled'],
  'Paused':      ['Active', 'Cancelled'],
  'Expired':     ['Active', 'Cancelled'],
  'Cancelled':   ['Active'],
};

// Active → Expired is SYSTEM ONLY — not in manual transitions above

const LEGAL_COMBINATIONS: Record<string, string[]> = {
  'In Progress': ['Not Started'],
  'Live':        ['Active', 'Paused', 'Expired', 'Not Started'],
  'On Hold':     ['Paused', 'Not Started'],
  'Completed':   ['Not Started', 'Cancelled'],
  'Discontinued': ['Cancelled'],
};

export function canTransitionWebsiteStatus(from: string, to: string): boolean {
  return (WEBSITE_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function canTransitionMaintenanceStatus(from: string, to: string): boolean {
  return (MAINTENANCE_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

export function isLegalCombination(websiteStatus: string, maintenanceStatus: string): boolean {
  return (LEGAL_COMBINATIONS[websiteStatus] ?? []).includes(maintenanceStatus);
}

export interface StatusUpdateInput {
  currentWebsiteStatus: string;
  currentMaintenanceStatus: string;
  newWebsiteStatus?: string;
  newMaintenanceStatus?: string;
  url?: string | null;
  hostedDate?: string | null;
  renewalDate?: string | null;
}

export interface StatusValidationResult {
  ok: boolean;
  error?: string;
}

export function validateStatusTransition(input: StatusUpdateInput): StatusValidationResult {
  const targetWebsite = input.newWebsiteStatus ?? input.currentWebsiteStatus;
  const targetMaint = input.newMaintenanceStatus ?? input.currentMaintenanceStatus;
  const today = new Date().toISOString().split('T')[0]!;

  if (input.newWebsiteStatus && input.newWebsiteStatus !== input.currentWebsiteStatus) {
    if (!canTransitionWebsiteStatus(input.currentWebsiteStatus, input.newWebsiteStatus)) {
      return {
        ok: false,
        error: `Cannot transition website_status from '${input.currentWebsiteStatus}' to '${input.newWebsiteStatus}'`,
      };
    }
  }

  if (input.newMaintenanceStatus && input.newMaintenanceStatus !== input.currentMaintenanceStatus) {
    if (!canTransitionMaintenanceStatus(input.currentMaintenanceStatus, input.newMaintenanceStatus)) {
      return {
        ok: false,
        error: `Cannot transition maintenance_status from '${input.currentMaintenanceStatus}' to '${input.newMaintenanceStatus}'`,
      };
    }
  }

  if (!isLegalCombination(targetWebsite, targetMaint)) {
    return {
      ok: false,
      error: `maintenance_status '${targetMaint}' is not valid when website_status is '${targetWebsite}'`,
    };
  }

  // Field-level guards
  if (targetWebsite === 'Live') {
    if (!input.url) {
      return { ok: false, error: 'URL is required to mark a website as Live' };
    }
    if (!input.hostedDate) {
      return { ok: false, error: 'Hosted date is required to mark a website as Live' };
    }
    if (!input.renewalDate) {
      return { ok: false, error: 'Renewal date is required to mark a website as Live' };
    }
  }

  if (input.newMaintenanceStatus === 'Active' && input.currentMaintenanceStatus === 'Expired') {
    if (!input.renewalDate || input.renewalDate <= today) {
      return { ok: false, error: 'A future renewal date is required to reactivate an expired website' };
    }
  }

  return { ok: true };
}

export function isOverdue(
  renewalDate: string | null,
  lastPaymentReceived: string | null,
): boolean {
  if (!renewalDate) return false;
  const today = new Date().toISOString().split('T')[0]!;
  if (renewalDate >= today) return false;
  if (!lastPaymentReceived) return true;
  return lastPaymentReceived < renewalDate;
}

export type WebsiteAction =
  | 'mark-live'
  | 'record-payment'
  | 'put-on-hold'
  | 'discontinue';

export interface WebsiteActionInput {
  websiteStatus: string;
  maintenanceStatus: string;
  url: string | null;
  hostedDate: string | null;
  renewalDate: string | null;
}

export function getAllowedActions(website: WebsiteActionInput): WebsiteAction[] {
  const actions: WebsiteAction[] = [];

  const canMarkLive = validateStatusTransition({
    currentWebsiteStatus: website.websiteStatus,
    currentMaintenanceStatus: website.maintenanceStatus,
    newWebsiteStatus: 'Live',
    url: website.url,
    hostedDate: website.hostedDate,
    renewalDate: website.renewalDate,
  }).ok;

  if (canMarkLive) actions.push('mark-live');

  if (
    website.websiteStatus !== 'Discontinued' &&
    website.maintenanceStatus === 'Expired'
  ) {
    actions.push('record-payment');
  }

  const canPutOnHold = validateStatusTransition({
    currentWebsiteStatus: website.websiteStatus,
    currentMaintenanceStatus: website.maintenanceStatus,
    newWebsiteStatus: 'On Hold',
    newMaintenanceStatus: website.maintenanceStatus === 'Active' ? 'Paused' : website.maintenanceStatus,
    url: website.url,
    hostedDate: website.hostedDate,
    renewalDate: website.renewalDate,
  }).ok;

  if (canPutOnHold) actions.push('put-on-hold');

  const canDiscontinue = validateStatusTransition({
    currentWebsiteStatus: website.websiteStatus,
    currentMaintenanceStatus: website.maintenanceStatus,
    newWebsiteStatus: 'Discontinued',
    newMaintenanceStatus: 'Cancelled',
    url: website.url,
    hostedDate: website.hostedDate,
    renewalDate: website.renewalDate,
  }).ok;

  if (canDiscontinue) actions.push('discontinue');

  return actions;
}
