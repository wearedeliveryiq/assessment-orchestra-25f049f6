import { Link, useNavigate } from "@tanstack/react-router";
import { HelpCircle, LogOut, Monitor, Moon, Settings, Sun, User } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIdentity } from "@/hooks/use-identity";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import type { ThemeMode } from "@/lib/shell/types";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "dark", label: "Dark", icon: Moon },
  { mode: "light", label: "Light", icon: Sun },
  { mode: "system", label: "System", icon: Monitor },
];

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "DQ";
}

/** Profile, appearance, settings and help — the top bar's right-hand cluster. */
export function UserMenu() {
  const { identity, isAuthenticated } = useIdentity();
  const { mode, setTheme } = useTheme();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Button asChild size="sm">
        <Link to="/auth/login">Sign in</Link>
      </Button>
    );
  }

  const displayName = identity?.profile?.displayName ?? identity?.user?.email ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="Account menu">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-caption font-semibold">
              {initialsOf(displayName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to="/account">
            <User className="mr-2 h-4 w-4" aria-hidden />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" aria-hidden />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/design-system">
            <HelpCircle className="mr-2 h-4 w-4" aria-hidden />
            Design system & help
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-label uppercase text-muted-foreground">Appearance</DropdownMenuLabel>
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.mode}
            onSelect={() => void setTheme(option.mode)}
            aria-current={mode === option.mode}
          >
            <option.icon className="mr-2 h-4 w-4" aria-hidden />
            {option.label}
            {mode === option.mode ? <span className="ml-auto text-caption text-primary">Active</span> : null}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await supabase.auth.signOut();
            void navigate({ to: "/auth/login" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
