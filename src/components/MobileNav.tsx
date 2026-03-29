import { Receipt, Tags, Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Transactions", path: "/", icon: Receipt },
  { label: "Categories", path: "/categories", icon: Tags },
];

export function MobileNav() {
  const { theme, setTheme } = useTheme();

  return (
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
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex flex-col items-center gap-1 px-4 py-2 text-xs text-muted-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span>Theme</span>
        </button>
      </div>
    </nav>
  );
}
