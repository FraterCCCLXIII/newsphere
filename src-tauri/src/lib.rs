mod url_policy;
mod feed;
mod icons;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            feed::fetch_feed,
            feed::fetch_article_html,
            icons::save_app_icon_svg
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            schedule_shadow_invalidation(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// On macOS transparent windows the WindowServer computes the drop shadow from
/// the window's compositing layer.  At startup that layer is still empty, so
/// the shadow is missing.  Calling `[NSWindow invalidateShadow]` after a short
/// delay forces the compositor to recompute from the fully-rendered content.
#[cfg(target_os = "macos")]
fn schedule_shadow_invalidation(app: &tauri::App) {
    use tauri::Manager;

    let window = match app.get_webview_window("main") {
        Some(w) => w,
        None => return,
    };

    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(600)).await;
        let inner = window.clone();
        let _ = window.run_on_main_thread(move || {
            invalidate_ns_window_shadow(&inner);
        });
    });
}

#[cfg(target_os = "macos")]
fn invalidate_ns_window_shadow<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    use std::ffi::{c_void, CString};

    // Link against the Objective-C runtime (always present on macOS).
    #[link(name = "objc", kind = "dylib")]
    extern "C" {
        fn sel_registerName(name: *const i8) -> *const c_void;
        fn objc_msgSend(receiver: *mut c_void, selector: *const c_void) -> *mut c_void;
    }

    // WebviewWindow<R> derefs to Window<R> which exposes ns_window() on macOS.
    let ns_window = match window.ns_window() {
        Ok(ptr) => ptr,
        Err(_) => return,
    };

    unsafe {
        let sel_name = CString::new("invalidateShadow").unwrap();
        let sel = sel_registerName(sel_name.as_ptr() as *const i8);
        objc_msgSend(ns_window as *mut c_void, sel);
    }
}
