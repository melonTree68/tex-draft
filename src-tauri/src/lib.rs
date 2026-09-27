mod compiler;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![compiler::compile_math])
        .run(tauri::generate_context!())
        .expect("failed to launch TeXDraft");
}
