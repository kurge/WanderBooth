PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS deliveries (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'expired')),
  expected_files INTEGER NOT NULL CHECK (expected_files BETWEEN 1 AND 16),
  ready_at TEXT,
  expired_at TEXT
);

CREATE TABLE IF NOT EXISTS delivery_files (
  delivery_token TEXT NOT NULL,
  file_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('individual', 'strip', 'slideshow')),
  label TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  byte_size INTEGER,
  uploaded_at TEXT,
  PRIMARY KEY (delivery_token, file_id),
  FOREIGN KEY (delivery_token) REFERENCES deliveries(token) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deliveries_expires_at ON deliveries(expires_at);
CREATE INDEX IF NOT EXISTS idx_delivery_files_token ON delivery_files(delivery_token);
