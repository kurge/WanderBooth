import { useCallback, useEffect, useRef, useState } from "react";

import type { ClientMessage, ServerMessage } from "../shared/protocol";
import type { Actor, BoothState, Command } from "../shared/session";
import { createId } from "./createId";

const hostName = window.location.hostname || "127.0.0.1";
const hostPort =
  window.location.port && window.location.port !== "5173" ? window.location.port : "4174";
export const hostHttpUrl = `http://${hostName}:${hostPort}`;
const hostSocketUrl = `ws://${hostName}:${hostPort}/ws`;

const clientId = (() => {
  const stored = window.sessionStorage.getItem("wanderbooth-client-id");
  if (stored) return stored;
  const generated = createId();
  window.sessionStorage.setItem("wanderbooth-client-id", generated);
  return generated;
})();

export function useBoothConnection(actor: Actor) {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | undefined>(undefined);
  const [state, setState] = useState<BoothState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerUrls, setCustomerUrls] = useState<string[]>([]);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(hostSocketUrl);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setConnected(true);
        setError(null);
        void fetch(`${hostHttpUrl}/api/info`)
          .then((response) => response.json())
          .then((info: { customerUrls?: string[] }) => setCustomerUrls(info.customerUrls ?? []))
          .catch(() => setCustomerUrls([]));
        const hello: ClientMessage = { type: "HELLO", actor, clientId };
        socket.send(JSON.stringify(hello));
      });

      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "STATE") setState(message.state);
        if (message.type === "ERROR") setError(message.message);
      });

      socket.addEventListener("close", () => {
        setConnected(false);
        if (!disposed) reconnectTimer.current = window.setTimeout(connect, 1200);
      });

      socket.addEventListener("error", () => {
        setError("The display cannot reach the WanderBooth Host yet.");
      });
    };

    connect();
    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [actor]);

  const sendCommand = useCallback(
    (command: Command) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setError("Wait for the Host to reconnect, then try again.");
        return;
      }
      setError(null);
      const message: ClientMessage = {
        type: "COMMAND",
        actor,
        clientId,
        commandId: createId(),
        command,
      };
      socket.send(JSON.stringify(message));
    },
    [actor],
  );

  return { state, connected, customerUrls, error, sendCommand };
}
