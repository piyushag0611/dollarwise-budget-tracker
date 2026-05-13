import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDatabase } from "@/contexts/DatabaseContext";
import { signInWithGoogle, getStoredToken, clearToken, consumeAuthRedirect } from "@/lib/googleAuth";
import { exportDatabase, importDatabase, uploadBackup, downloadBackup, getBackupInfo } from "@/lib/driveSync";
import type { BackupInfo } from "@/lib/driveSync";

export function useGoogleDrive() {
  const db = useDatabase();
  const queryClient = useQueryClient();
  const [isSignedIn, setIsSignedIn] = useState(() => getStoredToken() !== null);

  // Pick up the token if we just returned from a Google OAuth redirect
  useEffect(() => {
    consumeAuthRedirect().then((token) => {
      if (token) {
        setIsSignedIn(true);
        queryClient.invalidateQueries({ queryKey: ["backup-info"] });
      }
    }).catch(console.error);
  }, []);

  // ─── Auth ────────────────────────────────────────────────────────────────────

  const signIn = async () => {
    await signInWithGoogle();
    setIsSignedIn(true);
    queryClient.invalidateQueries({ queryKey: ["backup-info"] });
  };

  const signOut = () => {
    clearToken();
    setIsSignedIn(false);
    queryClient.invalidateQueries({ queryKey: ["backup-info"] });
  };

  // ─── Backup metadata ─────────────────────────────────────────────────────────

  const { data: backupInfo = { exists: false, modifiedAt: null } as BackupInfo } = useQuery({
    queryKey: ["backup-info"],
    queryFn: () => getBackupInfo(getStoredToken()!),
    enabled: isSignedIn,
  });

  // ─── Backup ──────────────────────────────────────────────────────────────────

  const backupMutation = useMutation({
    mutationFn: async () => {
      const token = getStoredToken()!;
      const json = await exportDatabase(db!);
      await uploadBackup(token, json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-info"] });
    },
  });

  // ─── Restore ─────────────────────────────────────────────────────────────────

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const token = getStoredToken()!;
      const json = await downloadBackup(token);
      if (!json) throw new Error("No backup found on Google Drive.");
      await importDatabase(db!, json);
    },
    onSuccess: () => {
      // Invalidate everything — the entire local DB has changed
      queryClient.invalidateQueries();
    },
  });

  return {
    isSignedIn,
    signIn,
    signOut,
    backup: backupMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    backupInfo,
    isBackingUp: backupMutation.isPending,
    isRestoring: restoreMutation.isPending,
    backupError: backupMutation.error,
    restoreError: restoreMutation.error,
  };
}
