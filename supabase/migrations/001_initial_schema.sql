-- ============================================================================
-- Demenagement24 - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Helper: updated_at trigger function
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. profiles
-- ============================================================================
CREATE TABLE profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'mover', 'admin')),
    email      TEXT UNIQUE NOT NULL,
    phone      TEXT,
    full_name  TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. companies
-- ============================================================================
CREATE TABLE companies (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    slug                 TEXT UNIQUE NOT NULL,
    siret                TEXT UNIQUE NOT NULL,
    vat_number           TEXT,
    address              TEXT,
    postal_code          TEXT,
    city                 TEXT,
    website              TEXT,
    phone                TEXT,
    email_contact        TEXT,
    email_billing        TEXT,
    email_general        TEXT,
    logo_url             TEXT,
    description          TEXT,
    employee_count       INTEGER,
    legal_status         TEXT,
    rating               NUMERIC(3,1) NOT NULL DEFAULT 0,
    review_count         INTEGER NOT NULL DEFAULT 0,
    account_status       TEXT NOT NULL DEFAULT 'pending'
                         CHECK (account_status IN ('pending', 'trial', 'active', 'suspended', 'closed')),
    kyc_status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected')),
    sumsub_applicant_id  TEXT,
    trial_ends_at        TIMESTAMPTZ,
    is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. company_regions
-- ============================================================================
CREATE TABLE company_regions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_code TEXT NOT NULL,
    department_name TEXT NOT NULL,
    categories      TEXT[] NOT NULL DEFAULT ARRAY['national'],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. company_radius
-- ============================================================================
CREATE TABLE company_radius (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    departure_city TEXT NOT NULL,
    lat            NUMERIC(10,7) NOT NULL,
    lng            NUMERIC(10,7) NOT NULL,
    radius_km      INTEGER NOT NULL,
    move_types     TEXT[] NOT NULL DEFAULT ARRAY['national'],
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 5. quote_requests
-- ============================================================================
CREATE TABLE quote_requests (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prospect_id         TEXT UNIQUE NOT NULL,
    category            TEXT NOT NULL CHECK (category IN ('national', 'entreprise', 'international')),
    move_type           TEXT,
    from_address        TEXT,
    from_city           TEXT,
    from_postal_code    TEXT,
    from_country        TEXT DEFAULT 'FR',
    from_housing_type   TEXT,
    from_floor          INTEGER,
    from_elevator       BOOLEAN,
    to_address          TEXT,
    to_city             TEXT,
    to_postal_code      TEXT,
    to_country          TEXT DEFAULT 'FR',
    to_housing_type     TEXT,
    to_floor            INTEGER,
    to_elevator         BOOLEAN,
    room_count          INTEGER,
    volume_m3           NUMERIC(8,2),
    move_date           DATE,
    client_name         TEXT,
    client_phone        TEXT,
    client_email        TEXT,
    client_salutation   TEXT,
    client_first_name   TEXT,
    client_last_name    TEXT,
    source_url          TEXT,
    source              TEXT NOT NULL DEFAULT 'website',
    geographic_zone     TEXT,
    status              TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'active', 'blocked', 'completed', 'archived')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER quote_requests_updated_at
    BEFORE UPDATE ON quote_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. quote_distributions
-- ============================================================================
CREATE TABLE quote_distributions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_request_id  UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    price_cents       INTEGER,
    is_trial          BOOLEAN NOT NULL DEFAULT FALSE,
    unlocked_at       TIMESTAMPTZ,
    status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'unlocked', 'blocked', 'refunded')),
    competitor_count  INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. transactions
-- ============================================================================
CREATE TABLE transactions (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_distribution_id  UUID REFERENCES quote_distributions(id) ON DELETE SET NULL,
    mollie_payment_id      TEXT,
    amount_cents           INTEGER NOT NULL,
    currency               TEXT NOT NULL DEFAULT 'EUR',
    type                   TEXT NOT NULL CHECK (type IN ('unlock', 'subscription', 'refund', 'credit')),
    status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    invoice_number         TEXT UNIQUE,
    invoice_url            TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. subscriptions
-- ============================================================================
CREATE TABLE subscriptions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    mollie_subscription_id  TEXT,
    mollie_customer_id      TEXT,
    plan                    TEXT NOT NULL,
    amount_cents            INTEGER NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'active',
    next_billing_date       DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. reviews
-- ============================================================================
CREATE TABLE reviews (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_request_id UUID REFERENCES quote_requests(id) ON DELETE SET NULL,
    rating           INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
    comment          TEXT,
    is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    is_anonymous     BOOLEAN NOT NULL DEFAULT FALSE,
    reviewer_name    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTE: Review anonymization (nullify reviewer_name where is_anonymous = true after X days)
-- should be handled by a pg_cron job configured separately:
--
--   SELECT cron.schedule(
--       'anonymize-reviews',
--       '0 3 * * *',  -- daily at 03:00
--       $$
--       UPDATE reviews
--       SET reviewer_name = NULL
--       WHERE is_anonymous = TRUE
--         AND reviewer_name IS NOT NULL
--         AND created_at < now() - INTERVAL '30 days';
--       $$
--   );

-- ============================================================================
-- 10. company_photos
-- ============================================================================
CREATE TABLE company_photos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    caption     TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. company_qna
-- ============================================================================
CREATE TABLE company_qna (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- ============================================================================
-- 12. claims
-- ============================================================================
CREATE TABLE claims (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id             UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_distribution_id  UUID REFERENCES quote_distributions(id) ON DELETE SET NULL,
    reason                 TEXT NOT NULL,
    description            TEXT,
    status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected', 'refunded')),
    admin_note             TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at            TIMESTAMPTZ
);

-- ============================================================================
-- 13. blog_posts
-- ============================================================================
CREATE TABLE blog_posts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    excerpt         TEXT,
    content         TEXT,
    cover_image     TEXT,
    category        TEXT,
    author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'archived')),
    published_at    TIMESTAMPTZ,
    seo_title       TEXT,
    seo_description TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 14. pages
-- ============================================================================
CREATE TABLE pages (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug             TEXT UNIQUE NOT NULL,
    title            TEXT NOT NULL,
    content          TEXT,
    meta_title       TEXT,
    meta_description TEXT,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 15. notifications
-- ============================================================================
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    data       JSONB DEFAULT '{}',
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);

-- companies
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_profile_id ON companies(profile_id);
CREATE INDEX idx_companies_account_status ON companies(account_status);
CREATE INDEX idx_companies_city ON companies(city);

-- company_regions
CREATE INDEX idx_company_regions_company_id ON company_regions(company_id);
CREATE INDEX idx_company_regions_department_code ON company_regions(department_code);

-- company_radius
CREATE INDEX idx_company_radius_company_id ON company_radius(company_id);
CREATE INDEX idx_company_radius_departure_city ON company_radius(departure_city);

-- quote_requests
CREATE INDEX idx_quote_requests_prospect_id ON quote_requests(prospect_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_quote_requests_category ON quote_requests(category);
CREATE INDEX idx_quote_requests_move_date ON quote_requests(move_date);
CREATE INDEX idx_quote_requests_from_postal_code ON quote_requests(from_postal_code);
CREATE INDEX idx_quote_requests_to_postal_code ON quote_requests(to_postal_code);

-- quote_distributions
CREATE INDEX idx_quote_distributions_quote_request_id ON quote_distributions(quote_request_id);
CREATE INDEX idx_quote_distributions_company_id ON quote_distributions(company_id);
CREATE INDEX idx_quote_distributions_status ON quote_distributions(status);

-- transactions
CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_mollie_payment_id ON transactions(mollie_payment_id);

-- subscriptions
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);

-- reviews
CREATE INDEX idx_reviews_company_id ON reviews(company_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- company_photos
CREATE INDEX idx_company_photos_company_id ON company_photos(company_id);

-- company_qna
CREATE INDEX idx_company_qna_company_id ON company_qna(company_id);

-- claims
CREATE INDEX idx_claims_company_id ON claims(company_id);
CREATE INDEX idx_claims_status ON claims(status);

-- blog_posts
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at);

-- pages
CREATE INDEX idx_pages_slug ON pages(slug);

-- notifications
CREATE INDEX idx_notifications_company_id ON notifications(company_id);
CREATE INDEX idx_notifications_is_read ON notifications(company_id, is_read);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_radius ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_qna ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- Helper: check if current user is admin
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --------------------------------------------------------------------------
-- profiles policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_profiles ON profiles
    FOR ALL USING (is_admin());

CREATE POLICY own_profile ON profiles
    FOR ALL USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- --------------------------------------------------------------------------
-- companies policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_companies ON companies
    FOR ALL USING (is_admin());

CREATE POLICY company_own_data ON companies
    FOR ALL USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());

-- --------------------------------------------------------------------------
-- company_regions policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_company_regions ON company_regions
    FOR ALL USING (is_admin());

CREATE POLICY own_company_regions ON company_regions
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- company_radius policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_company_radius ON company_radius
    FOR ALL USING (is_admin());

CREATE POLICY own_company_radius ON company_radius
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- quote_distributions policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_quote_distributions ON quote_distributions
    FOR ALL USING (is_admin());

CREATE POLICY own_leads ON quote_distributions
    FOR SELECT USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- quote_requests policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_quote_requests ON quote_requests
    FOR ALL USING (is_admin());

CREATE POLICY unlocked_contacts ON quote_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM quote_distributions qd
            JOIN companies c ON c.id = qd.company_id
            WHERE qd.quote_request_id = quote_requests.id
              AND qd.status = 'unlocked'
              AND c.profile_id = auth.uid()
        )
    );

-- --------------------------------------------------------------------------
-- transactions policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_transactions ON transactions
    FOR ALL USING (is_admin());

CREATE POLICY own_transactions ON transactions
    FOR SELECT USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- subscriptions policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_subscriptions ON subscriptions
    FOR ALL USING (is_admin());

CREATE POLICY own_subscriptions ON subscriptions
    FOR SELECT USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- reviews policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_reviews ON reviews
    FOR ALL USING (is_admin());

CREATE POLICY public_read_reviews ON reviews
    FOR SELECT USING (TRUE);

CREATE POLICY own_company_reviews_manage ON reviews
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- company_photos policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_company_photos ON company_photos
    FOR ALL USING (is_admin());

CREATE POLICY public_read_photos ON company_photos
    FOR SELECT USING (TRUE);

CREATE POLICY own_company_photos ON company_photos
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- company_qna policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_company_qna ON company_qna
    FOR ALL USING (is_admin());

CREATE POLICY public_read_qna ON company_qna
    FOR SELECT USING (TRUE);

CREATE POLICY own_company_qna ON company_qna
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- claims policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_claims ON claims
    FOR ALL USING (is_admin());

CREATE POLICY own_claims ON claims
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );

-- --------------------------------------------------------------------------
-- blog_posts policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_blog_posts ON blog_posts
    FOR ALL USING (is_admin());

CREATE POLICY public_read_published_posts ON blog_posts
    FOR SELECT USING (status = 'published');

-- --------------------------------------------------------------------------
-- pages policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_pages ON pages
    FOR ALL USING (is_admin());

CREATE POLICY public_read_pages ON pages
    FOR SELECT USING (TRUE);

-- --------------------------------------------------------------------------
-- notifications policies
-- --------------------------------------------------------------------------
CREATE POLICY admin_all_notifications ON notifications
    FOR ALL USING (is_admin());

CREATE POLICY own_notifications ON notifications
    FOR ALL USING (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT id FROM companies WHERE profile_id = auth.uid())
    );
