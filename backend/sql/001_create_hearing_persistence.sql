BEGIN;

CREATE TABLE IF NOT EXISTS hearing_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    translation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    translation_target VARCHAR(10),
    status VARCHAR(20) NOT NULL DEFAULT 'saved',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_hearing_sessions_user_id
    ON hearing_sessions(user_id);

CREATE INDEX IF NOT EXISTS ix_hearing_sessions_status
    ON hearing_sessions(status);

CREATE INDEX IF NOT EXISTS ix_hearing_sessions_user_created_at
    ON hearing_sessions(user_id, created_at DESC);


CREATE TABLE IF NOT EXISTS hearing_captions (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES hearing_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(120) NOT NULL,
    sequence INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    translated_text TEXT,
    detected_language VARCHAR(10) NOT NULL DEFAULT 'en',
    translation_target VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hearing_caption_session_client
        UNIQUE(session_id, client_id)
);

CREATE INDEX IF NOT EXISTS ix_hearing_captions_session_id
    ON hearing_captions(session_id);

CREATE INDEX IF NOT EXISTS ix_hearing_captions_user_id
    ON hearing_captions(user_id);

CREATE INDEX IF NOT EXISTS ix_hearing_captions_session_sequence
    ON hearing_captions(session_id, sequence, created_at);


CREATE TABLE IF NOT EXISTS hearing_sound_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES hearing_sessions(id) ON DELETE SET NULL,
    care_alert_id UUID REFERENCES care_alerts(id) ON DELETE SET NULL,
    client_id VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL,
    label VARCHAR(160) NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,
    threshold NUMERIC(5,4) NOT NULL,
    model VARCHAR(160) NOT NULL DEFAULT 'yamnet',
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_hearing_sound_event_user_client
        UNIQUE(user_id, client_id)
);

CREATE INDEX IF NOT EXISTS ix_hearing_sound_events_user_id
    ON hearing_sound_events(user_id);

CREATE INDEX IF NOT EXISTS ix_hearing_sound_events_session_id
    ON hearing_sound_events(session_id);

CREATE INDEX IF NOT EXISTS ix_hearing_sound_events_care_alert_id
    ON hearing_sound_events(care_alert_id);

CREATE INDEX IF NOT EXISTS ix_hearing_sound_events_category
    ON hearing_sound_events(category);

CREATE INDEX IF NOT EXISTS ix_hearing_sound_events_is_critical
    ON hearing_sound_events(is_critical);

CREATE INDEX IF NOT EXISTS ix_hearing_sound_events_user_created_at
    ON hearing_sound_events(user_id, created_at DESC);

COMMIT;

-- Verification queries (run after the transaction if desired):
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('hearing_sessions', 'hearing_captions', 'hearing_sound_events')
-- ORDER BY table_name;
