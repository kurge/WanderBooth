import type { Actor, BoothState, Command } from "./session.js";

export type ClientMessage =
  | { type: "HELLO"; actor: Actor; clientId: string }
  | { type: "COMMAND"; actor: Actor; clientId: string; commandId: string; command: Command };

export type ServerMessage =
  | { type: "STATE"; state: BoothState }
  | { type: "ACK"; commandId: string }
  | { type: "ERROR"; commandId?: string; message: string };
