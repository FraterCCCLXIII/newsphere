fn main() {
    // Icon bytes are embedded at compile time; ensure any icon file change invalidates the build.
    let manifest_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    for rel in [
        "icons/32x32.png",
        "icons/64x64.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico",
        "icons/icon.png",
    ] {
        println!(
            "cargo:rerun-if-changed={}",
            manifest_dir.join(rel).display()
        );
    }
    tauri_build::build()
}
