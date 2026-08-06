/**
 * Calendar-aware follow-up and keep-in-touch extensions. Runs after extend.ts,
 * which creates follow_ups and the legacy day-count cadence columns.
 */
export const SCHEDULING_DDL = `
-- General TODOs have neither association; company tasks use company_id only.
-- Dropping NOT NULL preserves every existing row and widens what may be added.
ALTER TABLE follow_ups ALTER COLUMN contact_id DROP NOT NULL;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS company_id text REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_contact_id_fkey;
ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_company_id_fkey;
ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS recurrence_frequency text;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS recurrence_interval integer;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS recurrence_weekday integer;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS recurrence_month_day integer;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS recurrence_month integer;
ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_recurrence_due_check;
ALTER TABLE follow_ups ADD CONSTRAINT follow_ups_recurrence_due_check
  CHECK (recurrence_frequency IS NULL OR due_date IS NOT NULL);
CREATE INDEX IF NOT EXISTS follow_ups_companyId_idx
  ON follow_ups (company_id, created_at DESC) WHERE status = 'open';

-- Keep reach_out_every_days for compatibility/scoring while promoting existing
-- cadence rows to calendar rules. Weekly rows receive a stable, even spread;
-- later Auto saves use live People/day loads to choose their concrete weekday.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_recurrence_frequency text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_recurrence_interval integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_recurrence_weekday integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_recurrence_month_day integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS reach_out_recurrence_month integer;
WITH legacy_cadences AS (
  SELECT id, reach_out_every_days,
    row_number() OVER (ORDER BY id) - 1 AS weekly_slot
  FROM contacts
  WHERE reach_out_every_days IN (1, 7, 15, 30, 90, 180, 365)
    AND reach_out_recurrence_frequency IS NULL
)
UPDATE contacts AS contact
SET
  reach_out_recurrence_frequency = CASE
    WHEN legacy.reach_out_every_days = 1 THEN 'daily'
    WHEN legacy.reach_out_every_days IN (7, 15) THEN 'weekly'
    WHEN legacy.reach_out_every_days IN (30, 90, 180) THEN 'monthly'
    ELSE 'yearly'
  END,
  reach_out_recurrence_interval = CASE legacy.reach_out_every_days
    WHEN 15 THEN 2 WHEN 90 THEN 3 WHEN 180 THEN 6 ELSE 1
  END,
  reach_out_recurrence_weekday = CASE
    WHEN legacy.reach_out_every_days IN (7, 15)
      THEN legacy.weekly_slot % 7
    ELSE NULL
  END
FROM legacy_cadences AS legacy
WHERE contact.id = legacy.id;
`;
