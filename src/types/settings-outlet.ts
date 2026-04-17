import type { AppOutletContext } from "@/types/app-outlet";
import type { GridPage } from "@/types/grid";

/** Context passed from `SettingsLayout` to nested settings routes. */
export type SettingsOutletContext = AppOutletContext & {
  requestRenamePage: (page: GridPage) => void;
};
