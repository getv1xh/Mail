"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Workspace } from "@prisma/client";
import { ApiClient } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  setActiveWorkspace: (id: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!session?.user) {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await ApiClient.fetch("/api/workspaces");
      const data = await res.json();
      setWorkspaces(data);

      const savedId = ApiClient.getWorkspaceId();
      if (data.length > 0) {
        let active = data.find((w: Workspace) => w.id === savedId);
        if (!active) {
          active = data[0];
          ApiClient.setWorkspaceId(active.id);
        }
        setActiveWorkspaceState(active);
      } else {
        setActiveWorkspaceState(null);
        ApiClient.setWorkspaceId("");
      }
    } catch (err) {
      console.error("Failed to load workspaces:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [session?.user?.id]);

  const setActiveWorkspace = (id: string) => {
    const ws = workspaces.find((w) => w.id === id);
    if (ws) {
      setActiveWorkspaceState(ws);
      ApiClient.setWorkspaceId(ws.id);
      // Optional: trigger full app reload or invalidate queries here if relying on headers heavily
      // window.location.reload(); 
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoading,
        setActiveWorkspace,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
