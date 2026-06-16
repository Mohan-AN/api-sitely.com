export interface Client {
  clientId: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWithCount extends Client {
  websiteCount: number;
}

export interface ClientDetail extends Client {
  websites: ClientWebsiteSummary[];
}

export interface ClientWebsiteSummary {
  websiteId: string;
  projectName: string;
  url: string | null;
  websiteStatus: string;
  maintenanceStatus: string;
}
