import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { ConnectionStatus, OfficeSnapshot } from "@altf4/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export function useOfficeSocket() {
  const [snapshot, setSnapshot] = useState<OfficeSnapshot | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [togglingIds, setTogglingIds] = useState<string[]>([]);

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

  async function toggleDevice(deviceId: string) {
    // Optimistic UI Update: toggle state locally immediately for instant 0ms visual response
    setSnapshot((prev) => {
      if (!prev) return prev;
      const updatedDevices = prev.devices.map((device) => {
        if (device.id === deviceId) {
          return { ...device, isOn: !device.isOn };
        }
        return device;
      });
      const currentPowerWatts = updatedDevices.reduce(
        (sum, d) => sum + (d.isOn ? d.watts : 0),
        0
      );
      return {
        ...prev,
        devices: updatedDevices,
        currentPowerWatts
      };
    });

    setTogglingIds((current) => (current.includes(deviceId) ? current : [...current, deviceId]));
    try {
      const response = await fetch(`${API_URL}/api/devices/${deviceId}/toggle`, {
        method: "POST"
      });
      if (!response.ok) {
        throw new Error("Unable to toggle device");
      }
      const nextSnapshot = (await response.json()) as OfficeSnapshot;
      setSnapshot(nextSnapshot);
    } catch {
      // Revert to canonical server snapshot if request fails
      fetch(`${API_URL}/api/snapshot`)
        .then((r) => r.json() as Promise<OfficeSnapshot>)
        .then(setSnapshot)
        .catch(() => {});
    } finally {
      setTogglingIds((current) => current.filter((id) => id !== deviceId));
    }
  }

  return { snapshot, connectionStatus, toggleDevice, togglingIds };
}
