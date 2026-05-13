import { useState } from "react";
import { CloudUpload, LogIn, LogOut, RotateCcw, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";

interface BackupRestoreProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BackupRestore({ open, onOpenChange }: BackupRestoreProps) {
  const { isSignedIn, signIn, signOut, backup, restore, backupInfo, isBackingUp, isRestoring } =
    useGoogleDrive();
  const [confirmRestore, setConfirmRestore] = useState(false);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch {
      toast.error("Sign in failed. Please try again.");
    }
  };

  const handleBackup = async () => {
    try {
      await backup();
      toast.success("Backup complete.");
    } catch {
      toast.error("Backup failed. Please try again.");
    }
  };

  const handleRestore = async () => {
    setConfirmRestore(false);
    try {
      await restore();
      toast.success("Restore complete. Your data has been updated.");
    } catch (e) {
      toast.error((e as Error).message ?? "Restore failed.");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <CloudUpload className="h-5 w-5" />
              Google Drive Backup
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {!isSignedIn ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in with Google to back up and restore your data across devices.
                </p>
                <Button onClick={handleSignIn} className="w-full gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign in with Google
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    {backupInfo.exists && backupInfo.modifiedAt ? (
                      <span className="text-muted-foreground">
                        Last backup: {format(new Date(backupInfo.modifiedAt), "MMM d, yyyy h:mm a")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No backup found on Drive</span>
                    )}
                  </div>

                  <Button
                    onClick={handleBackup}
                    disabled={isBackingUp || isRestoring}
                    className="w-full gap-2"
                  >
                    <CloudUpload className="h-4 w-4" />
                    {isBackingUp ? "Backing up…" : "Back Up Now"}
                  </Button>

                  {backupInfo.exists && (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmRestore(true)}
                      disabled={isBackingUp || isRestoring}
                      className="w-full gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isRestoring ? "Restoring…" : "Restore from Drive"}
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="w-full gap-2 text-muted-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from Google Drive?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all your local data with the backup from Google Drive. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
