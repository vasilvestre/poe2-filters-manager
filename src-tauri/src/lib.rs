use tauri_plugin_autostart::MacosLauncher;
use std::path::PathBuf;
use std::fs::File;
use serde::{ser::Serializer, Serialize};
use tauri::{
    command,
    Runtime, Window,
};

type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Zip(#[from] zip_extract::ZipExtractError),
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[command]
async fn extract<R: Runtime>(
    _window: Window<R>,
    src_zip: &str,
    out_dir: &str,
) -> Result<String> {
    let target_dir = PathBuf::from(out_dir);
    let file = File::open(src_zip)?;
    zip_extract::extract(file, &target_dir, true)?;
    Ok("Extracted".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_upload::init())
        .invoke_handler(tauri::generate_handler![extract])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
