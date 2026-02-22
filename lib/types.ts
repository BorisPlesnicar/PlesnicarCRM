export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status: "lead" | "customer" | "archived";
  customer_number: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  status: "planned" | "active" | "done";
  start_date: string | null;
  end_date: string | null;
  notes: string;
  created_at: string;
  clients?: Client;
}

export interface Offer {
  id: string;
  user_id: string;
  client_id: string;
  project_id: string | null;
  offer_number: string;
  date: string;
  valid_until: string;
  consultant_name: string;
  consultant_phone: string;
  hourly_rate: number;
  global_discount_percent: number;
  vat_percent: number;
  express_enabled: boolean;
  express_surcharge_percent: number;
  hosting_setup_enabled: boolean;
  hosting_setup_fee: number;
  maintenance_enabled: boolean;
  maintenance_months: number;
  maintenance_monthly_fee: number;
  total: number;
  currency: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  offer_type?: "it" | "bau";
  created_at: string;
  offer_items?: OfferItem[];
  clients?: Client;
  projects?: Project;
}

export interface OfferItem {
  id?: string;
  offer_id?: string;
  user_id?: string;
  position: number;
  service_name: string;
  hours?: number; // Optional for BAU
  hourly_rate?: number; // Optional for BAU
  discount_percent: number;
  net_total: number;
}

export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  note: string;
  created_at: string;
  projects?: Project;
}

export const SERVICE_NAMES = [
  "Beratung & Konzept",
  "Design",
  "Frontend Umsetzung",
  "Backend/Datenbank",
  "SEO Basics",
  "Testing & Übergabe",
] as const;

export const PACKAGE_PRESETS: Record<
  string,
  { label: string; hours: number[] }
> = {
  onepage_no_db: {
    label: "OnePage (ohne DB)",
    hours: [3, 8, 10, 0, 2, 3],
  },
  onepage_with_db: {
    label: "OnePage (mit DB)",
    hours: [3, 9, 12, 12, 3, 4],
  },
  multipage_no_db: {
    label: "MultiPage (ohne DB)",
    hours: [4, 15, 25, 0, 4, 4],
  },
  multipage_with_db: {
    label: "MultiPage (mit DB)",
    hours: [5, 16, 28, 20, 5, 5],
  },
};

export interface Transaction {
  id: string;
  user_id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string | null;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  project_id: string | null;
  offer_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  payment_term_days: number;
  customer_number: string | null;
  invoice_type?: "it" | "bau";
  net_amount: number;
  vat_amount: number;
  total_amount: number;
  vat_percent: number;
  currency: string;
  is_partial_payment: boolean;
  partial_payment_of_total: number | null;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
  invoice_items?: InvoiceItem[];
  clients?: Client;
  projects?: Project;
  offers?: Offer;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  user_id?: string;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_percent: number;
  discount_percent: number;
  total: number;
}

export type EmployeeRole = "owner" | "supporter" | "employee";

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  role: EmployeeRole;
  description: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  employee_id: string | null;
  title: string;
  description: string;
  images: string[] | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile; // For author info
  employees?: Employee; // For employee info
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  created_at: string;
  updated_at: string;
}

export const CLIENT_STATUSES = ["lead", "customer", "archived"] as const;
export const PROJECT_STATUSES = ["planned", "active", "done"] as const;
export const OFFER_STATUSES = ["draft", "sent", "accepted", "rejected"] as const;
export const INVOICE_STATUSES = ["draft", "sent", "paid", "overdue", "cancelled"] as const;
export const TRANSACTION_TYPES = ["income", "expense"] as const;
