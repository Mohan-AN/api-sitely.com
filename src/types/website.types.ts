export interface Website {
  websiteId: string;
  clientId: string;
  projectName: string;
  url: string | null;
  siteType: string;
  platform: string;
  serviceType: string;
  websiteStatus: string;
  maintenanceStatus: string;
  startDate: string | null;
  hostedDate: string | null;
  lastInvoiceSent: string | null;
  lastPaymentReceived: string | null;
  renewalDate: string | null;
  handoverDate: string | null;
  transferCompleted: boolean;
  serviceTypeChangedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteWithMeta extends Website {
  clientName: string;
  isOverdue: boolean;
}
