import { useMemo, useState } from "react";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";

import { RenamePageDialog } from "@/components/settings/rename-page-dialog";
import { SettingsPagesNav } from "@/components/settings/settings-pages-nav";
import type { AppOutletContext } from "@/types/app-outlet";
import type { GridPage } from "@/types/grid";
import type { SettingsOutletContext } from "@/types/settings-outlet";

export function SettingsLayout() {
  const ctx = useOutletContext<AppOutletContext>();
  const {
    pages,
    activePageId,
    setActivePage,
    addPage,
    reorderPages,
    renamePage,
  } = ctx;
  const navigate = useNavigate();
  const [renameTargetPage, setRenameTargetPage] = useState<GridPage | null>(
    null,
  );

  const nestedOutletContext = useMemo<SettingsOutletContext>(
    () => ({
      ...ctx,
      requestRenamePage: (page) => setRenameTargetPage(page),
    }),
    [ctx],
  );

  return (
    <>
      <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col md:flex-row">
        <SettingsPagesNav
          pages={pages}
          activePageId={activePageId}
          onSelectPage={(pageId) => {
            navigate("/settings");
            void setActivePage(pageId);
          }}
          onAddPage={addPage}
          onReorderPages={reorderPages}
          onRequestRenamePage={setRenameTargetPage}
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet context={nestedOutletContext} />
        </div>
      </div>

      <RenamePageDialog
        page={renameTargetPage}
        onDismiss={() => setRenameTargetPage(null)}
        onSave={renamePage}
      />
    </>
  );
}
