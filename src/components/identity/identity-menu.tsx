import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/use-identity";
import { signOut } from "@/lib/identity/client";

/** Session-aware header affordance: sign in, or account + sign out. */
export function IdentityMenu() {
  const { identity, isLoading } = useIdentity();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (isLoading) return null;

  if (!identity) {
    return (
      <Button asChild size="sm" variant="secondary">
        <Link to="/auth/login">Sign in</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/account"
        className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
      >
        {identity.user.displayName}
      </Link>
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          await queryClient.cancelQueries();
          queryClient.clear();
          await signOut();
          navigate({ to: "/auth/login", replace: true });
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
