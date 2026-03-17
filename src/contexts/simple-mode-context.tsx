"use client";
import { createContext, useContext } from "react";

interface SimpleModeContextType {
  isSimple: boolean;
  toggle: () => void;
}

const SimpleModeContext = createContext<SimpleModeContextType>({
  isSimple: false,
  toggle: () => {},
});

export function SimpleModeProvider({ children }: { children: React.ReactNode }) {
  return (
    <SimpleModeContext.Provider value={{ isSimple: false, toggle: () => {} }}>
      {children}
    </SimpleModeContext.Provider>
  );
}

export function useSimpleMode() {
  return useContext(SimpleModeContext);
}
