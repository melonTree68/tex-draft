#[path = "document.rs"]
mod document;

use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tectonic::{
    config::PersistentConfig,
    driver::{OutputFormat, ProcessingSessionBuilder},
    status::NoopStatusBackend,
};

// Tectonic's engines have global state; serialize complete processing sessions.
static COMPILER: Mutex<()> = Mutex::new(());

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileRequest {
    source: String,
    macros: String,
    font: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompileResult {
    pdf_base64: String,
}

#[tauri::command]
pub async fn compile_math(request: CompileRequest) -> Result<CompileResult, String> {
    tauri::async_runtime::spawn_blocking(move || compile(request))
        .await
        .map_err(|error| format!("Compilation worker failed: {error}"))?
}

fn compile(request: CompileRequest) -> Result<CompileResult, String> {
    let document = document::wrap(&request.source, &request.macros, &request.font)?;
    let _guard = COMPILER.lock().map_err(|error| error.to_string())?;
    let mut status = NoopStatusBackend::default();
    let config = PersistentConfig::open(false)
        .map_err(|error| format!("Compiler configuration: {error:#}"))?;
    let bundle = config.default_bundle(false).map_err(|error| format!("TeX resources could not be loaded. The first compilation needs an internet connection.\n{error:#}"))?;
    let cache = config
        .format_cache_path()
        .map_err(|error| format!("TeX cache: {error:#}"))?;
    let workspace = tempfile::tempdir().map_err(|error| error.to_string())?;
    let mut builder = ProcessingSessionBuilder::default();
    builder
        .bundle(bundle)
        .primary_input_buffer(document.as_bytes())
        .tex_input_name("draft.tex")
        .format_name("latex")
        .format_cache_path(cache)
        .filesystem_root(workspace.path())
        .keep_logs(true)
        .keep_intermediates(false)
        .print_stdout(false)
        .shell_escape_disabled()
        .output_format(OutputFormat::Pdf)
        .do_not_write_output_files();
    let mut session = builder
        .create(&mut status)
        .map_err(|error| format!("TeX initialization: {error:#}"))?;
    let result = session.run(&mut status);
    let mut files = session.into_file_data();
    let log = files
        .remove("draft.log")
        .map(|file| String::from_utf8_lossy(&file.data).into_owned())
        .unwrap_or_default();
    if let Err(error) = result {
        return Err(format!("{error:#}\n\n{log}"));
    }
    let pdf = files
        .remove("draft.pdf")
        .ok_or_else(|| format!("The compiler did not produce a PDF.\n{log}"))?;
    Ok(CompileResult {
        pdf_base64: STANDARD.encode(pdf.data),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "downloads TeX resources on first run; use cargo test -- --ignored"]
    fn real_engine_fonts_macros_packages_and_error_recovery() {
        for font in ["latin-modern", "pagella", "termes"] {
            let result = compile(CompileRequest {
                source: r"\begin{aligned}\R^n &\ni \bm{x}\\\rank A &= \sum_{i=1}^{n} \foo{i}+\oiint_S f\end{aligned}".into(),
                macros: r"\def\R{\mathbb{R}}\newcommand{\foo}[1]{#1^2}\DeclareMathOperator{\rank}{rank}".into(),
                font: font.into(),
            }).unwrap_or_else(|error| panic!("{font}: {error}"));
            assert!(STANDARD
                .decode(result.pdf_base64)
                .unwrap()
                .starts_with(b"%PDF-"));
        }
        let error = compile(CompileRequest {
            source: r"\nonexistentcommand".into(),
            macros: "".into(),
            font: "latin-modern".into(),
        })
        .err()
        .unwrap();
        assert!(error.contains("Undefined control sequence"));
        let result = compile(CompileRequest {
            source: "x+1".into(),
            macros: "".into(),
            font: "latin-modern".into(),
        });
        assert!(result.is_ok());
        // Definitions from earlier sessions must not leak into a new draft.
        assert!(compile(CompileRequest {
            source: r"\foo{x}".into(),
            macros: "".into(),
            font: "latin-modern".into()
        })
        .is_err());
    }
}
