"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface SimpleModeContextType {
  isSimple: boolean;
  toggle: () => void;
}

const SimpleModeContext = createContext<SimpleModeContextType>({
  isSimple: true,
  toggle: () => {},
});

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
  // Default: simple mode ON — advanced users can disable it
  const [isSimple, setIsSimple] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wealthpilot-simple-mode");
      // Only override if explicitly stored — null means first visit → simple mode
      if (stored !== null) setIsSimple(stored === "true");
    } catch {
      // localStorage not available
    }
  }, []);

  function toggle() {
    setIsSimple((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("wealthpilot-simple-mode", String(next));
      } catch {}
      return next;
    });
  }

  return (
    <SimpleModeContext.Provider value={{ isSimple, toggle }}>
      {children}
    </SimpleModeContext.Provider>
  );
}

export function useSimpleMode() {
  return useContext(SimpleModeContext);
}
