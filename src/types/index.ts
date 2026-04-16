export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
} from "./database.types";

// ---------------------------------------------------------------------------
// Convenience aliases for table row types
// ---------------------------------------------------------------------------
import type { Tables, Enums } from "./database.types";

export type Profile = Tables<"profiles">;
export type Company = Tables<"companies">;
export type CompanyRegion = Tables<"company_regions">;
export type CompanyRadius = Tables<"company_radius">;
export type QuoteRequest = Tables<"quote_requests">;
export type QuoteDistribution = Tables<"quote_distributions">;
export type Transaction = Tables<"transactions">;
export type Subscription = Tables<"subscriptions">;
export type Review = Tables<"reviews">;
export type CompanyPhoto = Tables<"company_photos">;
export type CompanyQna = Tables<"company_qna">;
export type Claim = Tables<"claims">;
export type BlogPost = Tables<"blog_posts">;
export type Page = Tables<"pages">;
export type Notification = Tables<"notifications">;

// ---------------------------------------------------------------------------
// Enum type aliases
// ---------------------------------------------------------------------------
export type UserRole = Enums<"user_role">;
export type AccountStatus = Enums<"account_status">;
export type KycStatus = Enums<"kyc_status">;
export type QuoteCategory = Enums<"quote_category">;
export type QuoteStatus = Enums<"quote_status">;
export type DistributionStatus = Enums<"distribution_status">;
export type TransactionType = Enums<"transaction_type">;
export type PaymentStatus = Enums<"payment_status">;
export type SubscriptionPlan = Enums<"subscription_plan">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type SubscriptionInterval = Enums<"subscription_interval">;
export type ClaimReason = Enums<"claim_reason">;
export type ClaimStatus = Enums<"claim_status">;
export type NotificationType = Enums<"notification_type">;
export type NotificationChannel = Enums<"notification_channel">;
export type MatchType = Enums<"match_type">;

// ---------------------------------------------------------------------------
// Utility types
// ---------------------------------------------------------------------------

/** Company with its related regions and radius zones */
export type CompanyWithCoverage = Company & {
  company_regions: CompanyRegion[];
  company_radius: CompanyRadius[];
};

/** Quote distribution with the related quote request */
export type DistributionWithQuote = QuoteDistribution & {
  quote_requests: QuoteRequest;
};

/** Quote distribution with the related company */
export type DistributionWithCompany = QuoteDistribution & {
  companies: Company;
};
