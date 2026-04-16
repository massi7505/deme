-- ============================================================================
-- 003 — Site settings (replaces admin-settings.json for Vercel compatibility)
-- ============================================================================

CREATE TABLE site_settings (
    id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    data       JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Single row, always id=1
INSERT INTO site_settings (id, data) VALUES (1, '{}');

-- Allow public read (for site name, email, phone in header/footer)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_site_settings ON site_settings
    FOR SELECT USING (TRUE);

CREATE POLICY admin_all_site_settings ON site_settings
    FOR ALL USING (is_admin());
