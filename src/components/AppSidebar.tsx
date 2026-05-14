import { useState } from "react";
import { DollarSign, Receipt, BarChart3, CloudUpload } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { BackupRestore } from "@/components/BackupRestore";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Transactions", url: "/", icon: Receipt },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [backupOpen, setBackupOpen] = useState(false);

  return (
    <>
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center gap-2 px-3 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <span className="font-display text-lg font-bold tracking-tight">DollarWise</span>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent/50"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setBackupOpen(true)}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <CloudUpload className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Backup</span>}
        </Button>
        <ThemeToggle collapsed={collapsed} />
      </SidebarFooter>
    </Sidebar>

    <BackupRestore open={backupOpen} onOpenChange={setBackupOpen} />
    </>
  );
}
