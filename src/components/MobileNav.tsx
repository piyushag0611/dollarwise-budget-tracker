import { useState } from "react";
import { Receipt, CloudUpload, Moon, Sun, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { BackupRestore } from "@/components/BackupRestore";

const tabs = [
  { label: "Transactions", path: "/", icon: Receipt },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

export function MobileNav() {
  const { theme, setTheme } = useTheme();
  const [backupOpen, setBackupOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
        <div className="flex h-16 items-center justify-around">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors",
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                )
              }
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setBackupOpen(true)}
            className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-muted-foreground transition-colors"
          >
            <CloudUpload className="h-5 w-5" />
            <span>Backup</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-muted-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span>Theme</span>
          </button>
        </div>
      </nav>

      <BackupRestore open={backupOpen} onOpenChange={setBackupOpen} />
    </>
  );
}
