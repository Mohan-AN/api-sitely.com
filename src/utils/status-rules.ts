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
  handoverDate?: string | null;
  serviceType: string;
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
    if (input.serviceType === 'maintain' && !input.renewalDate) {
      return { ok: false, error: 'Renewal date is required for maintain websites going Live' };
    }
  }

  if (targetWebsite === 'Completed' && input.serviceType === 'handover') {
    if (!input.handoverDate) {
      return { ok: false, error: 'Handover date is required to mark a handover website as Completed' };
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
  serviceType: string,
  renewalDate: string | null,
  lastPaymentReceived: string | null,
): boolean {
  if (serviceType !== 'maintain' || !renewalDate) return false;
  const today = new Date().toISOString().split('T')[0]!;
  if (renewalDate >= today) return false;
  if (!lastPaymentReceived) return true;
  return lastPaymentReceived < renewalDate;
}
