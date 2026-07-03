import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { ConnectionStatus, OfficeSnapshot } from "@altf4/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function useOfficeSocket() {
  const [snapshot, setSnapshot] = useState<OfficeSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");

  useEffect(() => {
    let active = true;

    fetch(`${API_URL}/api/snapshot`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load office snapshot");
        }
        return response.json() as Promise<OfficeSnapshot>;
      })
      .then((nextSnapshot) => {
        if (active) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch(() => {
        if (active) {
          setConnectionStatus("offline");
        }
      });

    const socket = io(API_URL, {
      reconnectionDelayMax: 3_000
    });

    socket.on("connect", () => setConnectionStatus("live"));
    socket.on("disconnect", () => setConnectionStatus("offline"));
    socket.on("connect_error", () => setConnectionStatus("offline"));
    socket.on("snapshot", (nextSnapshot: OfficeSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

  return { snapshot, connectionStatus };
}

