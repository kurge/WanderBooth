import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { Actor, BoothState, Command } from "../shared/session.js";

export class BoothDatabase {
  private readonly database: DatabaseSync;

  constructor(dataDirectory: string) {
    mkdirSync(dataDirectory, { recursive: true });
    this.database = new DatabaseSync(join(dataDirectory, "wanderbooth.sqlite"));
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        command_id TEXT,
        actor TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  loadState(): BoothState | null {
    const row = this.database.prepare("SELECT state_json FROM app_state WHERE id = 1").get() as
      | { state_json: string }
      | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.state_json) as BoothState;
    } catch {
      return null;
    }
  }

  saveState(state: BoothState) {
    this.database
      .prepare(`
        INSERT INTO app_state (id, state_json, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          state_json = excluded.state_json,
          updated_at = excluded.updated_at
      `)
      .run(JSON.stringify(state), state.updatedAt);
  }

  recordEvent(input: {
    sessionId: string | null;
    commandId?: string;
    actor: Actor;
    command: Command;
  }) {
    this.database
      .prepare(`
        INSERT INTO session_events (
          session_id,
          command_id,
          actor,
          event_type,
          payload_json,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.sessionId,
        input.commandId ?? null,
        input.actor,
        input.command.type,
        JSON.stringify(input.command),
        new Date().toISOString(),
      );
  }
}
