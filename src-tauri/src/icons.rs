use std::path::PathBuf;

/// Writes `public/app-icon.svg` relative to the repo (src-tauri → .. → public).
/// Used by the in-app Icon Studio; path exists when developing from the source tree.
#[tauri::command]
pub fn save_app_icon_svg(contents: String) -> Result<(), String> {
    let dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let target = dir.join("../public/app-icon.svg");
    let parent = target.parent().ok_or("Invalid path")?;
    if !parent.is_dir() {
        return Err(format!(
            "Expected public/ next to the project ({}). Icon Studio save works when running from the dev tree.",
            parent.display()
        ));
    }
    std::fs::write(&target, contents).map_err(|e| e.to_string())?;
    Ok(())
}
