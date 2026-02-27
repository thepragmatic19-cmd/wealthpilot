"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface SimpleModeContextType {
  isSimple: boolean;
  toggle: () => void;
}

const SimpleModeContext = createContext<SimpleModeContextType>({
  isSimple: false,
  toggle: () => {},
});

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
  const [isSimple, setIsSimple] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("wealthpilot-simple-mode");
      if (stored === "true") setIsSimple(true);
    } catch {
      // localStorage not available (SSR guard)
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
