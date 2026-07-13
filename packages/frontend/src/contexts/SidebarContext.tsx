import { createContext, useContext } from "react";

type SidebarContextValue = {
  isOpen: boolean;
};

const SidebarContext = createContext<SidebarContextValue>({ isOpen: false });

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

export { SidebarContext };
