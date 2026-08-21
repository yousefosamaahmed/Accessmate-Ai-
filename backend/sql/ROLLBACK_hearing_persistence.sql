-- Use only if you intentionally want to remove the Hearing Assistant persistence tables.
-- This permanently deletes saved hearing sessions and sound events.

BEGIN;
DROP TABLE IF EXISTS hearing_sound_events CASCADE;
DROP TABLE IF EXISTS hearing_captions CASCADE;
DROP TABLE IF EXISTS hearing_sessions CASCADE;
COMMIT;
