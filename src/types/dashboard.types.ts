export interface DashboardCounts {
  totalClients: number;
  totalWebsites: number;
  byWebsiteStatus: Record<string, number>;
  byMaintenanceStatus: Record<string, number>;
  byPlatform: Record<string, number>;
  byServiceType: Record<string, number>;
}

export interface ExpiredItem {
  websiteId: string;
  projectName: string;
  clientName: string;
  renewalDate: string;
  daysOverdue: number;
}

export interface UpcomingRenewalItem {
  websiteId: string;
  projectName: string;
  clientName: string;
  renewalDate: string;
  daysLeft: number;
}

export interface TransferPendingItem {
  websiteId: string;
  projectName: string;
  clientName: string;
  handoverDate: string | null;
}

export interface RecentActivityItem {
  logId: string;
  description: string;
  userName: string | null;
  createdAt: string;
}

export interface DashboardData {
  counts: DashboardCounts;
  expired: ExpiredItem[];
  upcomingRenewals: UpcomingRenewalItem[];
  transferPending: TransferPendingItem[];
  recentActivity: RecentActivityItem[];
}
