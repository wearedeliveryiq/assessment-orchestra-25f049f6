import { useEffect, useState } from "react";

/** True once the component has hydrated in the browser. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
