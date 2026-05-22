import { createContext } from "react";

export const context = createContext<{ pages: HTMLElement[] | null } | null>(null);
