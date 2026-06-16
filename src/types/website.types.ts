export interface Website {
  websiteId: string;
  clientId: string;
  projectName: string;
  url: string | null;
  siteType: string;
  platform: string;
  websiteStatus: string;
  maintenanceStatus: string;
  startDate: string | null;
  hostedDate: string | null;
  lastInvoiceSent: string | null;
  lastPaymentReceived: string | null;
  renewalDate: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteWithMeta extends Website {
  clientName: string;
  isOverdue: boolean;
}

export interface WebsiteDetail extends WebsiteWithMeta {
  allowedActions: string[];
}

export interface WebsiteActivity {
  logId: string;
  action: string;
  description: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  userName: string;
}

export interface WebsiteStats {
  websites: number;
  clients: number;
  live: number;
  expired: number;
  dueSoon: number;
}
