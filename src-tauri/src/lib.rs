use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tauri::async_runtime;
use tauri::Emitter;
use tiktoken_rs::{cl100k_base, o200k_base, CoreBPE};
use walkdir::WalkDir;

const MAX_PROCESS_SIZE: usize = 500 * 1024;
const MAX_FILE_SIZE: usize = 5 * 1024 * 1024; // 5MB max file size
const PLACEHOLDER_PREFIX: &str = "\0STR";
const PLACEHOLDER_SUFFIX: &str = "END\0";

#[derive(Clone)]
struct CommentPattern {
  single: Option<Regex>,
  multi: Option<Regex>,
  docstring: Option<Regex>,
  preserve_strings: bool,
}

#[derive(Clone, Copy)]
enum ProcessingMode {
  Raw,
  RemoveComments,
  Minify,
}

impl ProcessingMode {
  fn from_str(mode: &str) -> Self {
    match mode {
      "remove-comments" => ProcessingMode::RemoveComments,
      "minify" => ProcessingMode::Minify,
      _ => ProcessingMode::Raw,
    }
  }
}

static COMMENT_PATTERNS: Lazy<HashMap<&'static str, CommentPattern>> = Lazy::new(|| {
  let mut map = HashMap::new();

  let c_style_single = r"//[^\n]*";
  let c_style_multi = r"/\*[^*]*\*+(?:[^/*][^*]*\*+)*/";
  let hash_single = r"#[^\n]*";
  let py_docstring = r###"\"\"\"[^"]*(?:"")?[^"]*\"\"\"|'''[^']*(?:'')?[^']*'''"###;

  let build = |single: Option<&str>, multi: Option<&str>, docstring: Option<&str>, preserve: bool| CommentPattern {
    single: single.map(|p| Regex::new(p).expect("invalid regex")),
    multi: multi.map(|p| Regex::new(p).expect("invalid regex")),
    docstring: docstring.map(|p| Regex::new(p).expect("invalid regex")),
    preserve_strings: preserve,
  };

  // JS / TS family
  for ext in ["js", "mjs", "cjs", "ts", "mts", "tsx", "jsx"] {
    map.insert(ext, build(Some(c_style_single), Some(c_style_multi), None, true));
  }

  // C-style family
  for ext in ["c", "h", "cpp", "hpp", "cc", "cs", "java", "go", "rs", "swift", "kt", "kts", "dart", "scala", "groovy"] {
    map.insert(ext, build(Some(c_style_single), Some(c_style_multi), None, true));
  }

  // Python
  for ext in ["py", "pyw"] {
    map.insert(
      ext,
      build(
        Some(hash_single),
        None,
        Some(py_docstring),
        true,
      ),
    );
  }
  map.insert("pyx", build(Some(hash_single), None, None, true));

  // Ruby
  map.insert("rb", build(Some(hash_single), Some(r"=begin[^=]*=end"), None, true));

  // Shell / config hash
  for ext in ["sh", "bash", "zsh", "fish", "r", "yaml", "yml", "toml", "conf"] {
    map.insert(ext, build(Some(hash_single), None, None, false));
  }
  map.insert("ini", build(Some(r"[;#][^\n]*"), None, None, false));

  // Perl
  for ext in ["pl", "pm"] {
    map.insert(ext, build(Some(hash_single), None, None, true));
  }

  // HTML/XML style
  for ext in ["html", "htm", "xml", "svg", "xhtml"] {
    map.insert(ext, build(None, Some(r"<!--[^>]*-->"), None, false));
  }

  // Vue / Svelte
  for ext in ["vue", "svelte"] {
    map.insert(
      ext,
      build(
        Some(c_style_single),
        Some(r"/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|<!--[^>]*-->"),
        None,
        true,
      ),
    );
  }

  // CSS family
  map.insert("css", build(None, Some(c_style_multi), None, false));
  map.insert("scss", build(Some(c_style_single), Some(c_style_multi), None, false));
  map.insert("sass", build(Some(c_style_single), None, None, false));
  map.insert("less", build(Some(c_style_single), Some(c_style_multi), None, false));

  // SQL
  map.insert("sql", build(Some(r"--[^\n]*"), Some(c_style_multi), None, false));

  // Lua
  map.insert("lua", build(Some(r"--[^\n]*"), None, None, false));

  // PHP
  map.insert(
    "php",
    build(
      Some(r"(?://|#)[^\n]*"),
      Some(c_style_multi),
      None,
      true,
    ),
  );

  // Haskell
  map.insert("hs", build(Some(r"--[^\n]*"), None, None, false));

  // Lisp family
  for ext in ["clj", "cljs", "lisp", "el", "scm"] {
    map.insert(ext, build(Some(r";[^\n]*"), None, None, false));
  }

  // PowerShell
  for ext in ["ps1", "psm1"] {
    map.insert(ext, build(Some(hash_single), Some(r"<#[^#]*#>"), None, false));
  }

  // Batch
  for ext in ["bat", "cmd"] {
    map.insert(ext, build(Some(r"(?m)^[ \t]*(?:REM|rem|::)[^\n]*"), None, None, false));
  }

  // JSONC
  map.insert("jsonc", build(Some(c_style_single), Some(c_style_multi), None, false));

  // YAML aliases already handled
  map
});

static TOKENIZER: Lazy<Result<Arc<CoreBPE>, String>> = Lazy::new(|| {
  o200k_base()
    .or_else(|_| cl100k_base())
    .map(Arc::new)
    .map_err(|e| format!("failed to load tokenizer: {e}"))
});

static TRIPLE_NEWLINES: Lazy<Regex> = Lazy::new(|| Regex::new(r"\n{3,}").expect("valid regex"));
static TRAILING_WS: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?m)[ \t]+$").expect("valid regex"));
static LEADING_WS: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?m)^[ \t]+").expect("valid regex"));
static MULTIPLE_NEWLINES: Lazy<Regex> = Lazy::new(|| Regex::new(r"\n{2,}").expect("valid regex"));
static JSON_COMMENT: Lazy<Regex> = Lazy::new(|| Regex::new(r"/\*[^*]*\*+(?:[^/*][^*]*\*+)*/|//[^\n]*").expect("valid regex"));
static ANGLE_WHITESPACE: Lazy<Regex> = Lazy::new(|| Regex::new(r">\s+<").expect("valid regex"));

fn protect_strings(code: &str) -> (String, Vec<String>) {
  let mut strings = Vec::new();
  let mut result = String::with_capacity(code.len());
  let bytes = code.as_bytes();
  let mut i = 0;

  while i < bytes.len() {
    match bytes[i] {
      b'`' => {
        let start = i;
        i += 1;
        while i < bytes.len() {
          if bytes[i] == b'\\' && i + 1 < bytes.len() {
            i += 2;
            continue;
          }
          if bytes[i] == b'`' {
            i += 1;
            break;
          }
          if bytes[i] == b'$' && i + 1 < bytes.len() && bytes[i + 1] == b'{' {
            i += 2;
            let mut depth = 1;
            while i < bytes.len() && depth > 0 {
              if bytes[i] == b'{' {
                depth += 1;
              } else if bytes[i] == b'}' {
                depth -= 1;
              }
              i += 1;
            }
            continue;
          }
          i += 1;
        }
        let original = &code[start..i.min(code.len())];
        strings.push(original.to_string());
        result.push_str(PLACEHOLDER_PREFIX);
        result.push_str(&(strings.len() - 1).to_string());
        result.push_str(PLACEHOLDER_SUFFIX);
      }
      b'"' => {
        let start = i;
        i += 1;
        while i < bytes.len() {
          if bytes[i] == b'\\' && i + 1 < bytes.len() {
            i += 2;
            continue;
          }
          if bytes[i] == b'"' {
            i += 1;
            break;
          }
          if bytes[i] == b'\n' {
            break;
          }
          i += 1;
        }
        let original = &code[start..i.min(code.len())];
        strings.push(original.to_string());
        result.push_str(PLACEHOLDER_PREFIX);
        result.push_str(&(strings.len() - 1).to_string());
        result.push_str(PLACEHOLDER_SUFFIX);
      }
      b'\'' => {
        let start = i;
        i += 1;
        while i < bytes.len() {
          if bytes[i] == b'\\' && i + 1 < bytes.len() {
            i += 2;
            continue;
          }
          if bytes[i] == b'\'' {
            i += 1;
            break;
          }
          if bytes[i] == b'\n' {
            break;
          }
          i += 1;
        }
        let original = &code[start..i.min(code.len())];
        strings.push(original.to_string());
        result.push_str(PLACEHOLDER_PREFIX);
        result.push_str(&(strings.len() - 1).to_string());
        result.push_str(PLACEHOLDER_SUFFIX);
      }
      other => {
        result.push(other as char);
        i += 1;
      }
    }
  }

  (result, strings)
}

fn restore_strings(code: &str, strings: &[String]) -> String {
  if strings.is_empty() {
    return code.to_string();
  }

  let mut result = code.to_string();
  for (idx, original) in strings.iter().enumerate() {
    let placeholder = format!("{PLACEHOLDER_PREFIX}{idx}{PLACEHOLDER_SUFFIX}");
    result = result.replace(&placeholder, original);
  }
  result
}

fn remove_comments(code: &str, extension: &str) -> String {
  if code.len() < 2 || code.len() > MAX_PROCESS_SIZE {
    return code.to_string();
  }

  let ext = extension.trim_start_matches('.').to_lowercase();
  let Some(patterns) = COMMENT_PATTERNS.get(ext.as_str()) else {
    return code.to_string();
  };

  let mut working = code.to_string();
  let mut strings = Vec::new();

  if patterns.preserve_strings {
    let (protected, captured) = protect_strings(&working);
    working = protected;
    strings = captured;
  }

  if let Some(doc) = &patterns.docstring {
    working = doc.replace_all(&working, "").into_owned();
  }
  if let Some(multi) = &patterns.multi {
    working = multi.replace_all(&working, "").into_owned();
  }
  if let Some(single) = &patterns.single {
    working = single.replace_all(&working, "").into_owned();
  }

  if !strings.is_empty() {
    working = restore_strings(&working, &strings);
  }

  working = TRIPLE_NEWLINES.replace_all(&working, "\n\n").into_owned();
  working = TRAILING_WS.replace_all(&working, "").into_owned();

  working
}

fn minify_code(code: &str, extension: &str) -> String {
  if code.len() < 2 || code.len() > MAX_PROCESS_SIZE {
    return code.to_string();
  }

  let ext = extension.trim_start_matches('.').to_lowercase();
  let mut result = remove_comments(code, &ext);

  if ["py", "pyw", "yaml", "yml", "coffee", "sass", "pug", "haml"].contains(&ext.as_str()) {
    result = TRAILING_WS.replace_all(&result, "").into_owned();
    result = TRIPLE_NEWLINES.replace_all(&result, "\n\n").into_owned();
    return result.trim().to_string();
  }

  if ["json", "jsonc"].contains(&ext.as_str()) {
    let cleaned = JSON_COMMENT.replace_all(&result, "");
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&cleaned) {
      if let Ok(compact) = serde_json::to_string(&parsed) {
        return compact;
      }
    }
    return result.split_whitespace().collect::<Vec<_>>().join(" ");
  }

  if ["html", "htm", "xml", "svg"].contains(&ext.as_str()) {
    result = ANGLE_WHITESPACE.replace_all(&result, "><").into_owned();
    result = result.split_whitespace().collect::<Vec<_>>().join(" ");
    return result.trim().to_string();
  }

  let (protected, strings) = protect_strings(&result);
  result = protected;

  result = TRAILING_WS.replace_all(&result, "").into_owned();
  result = MULTIPLE_NEWLINES.replace_all(&result, "\n").into_owned();
  result = LEADING_WS.replace_all(&result, " ").into_owned();
  result = result.trim().to_string();

  restore_strings(&result, &strings)
}

#[tauri::command]
async fn count_tokens(text: String) -> Result<usize, String> {
  let encoder = TOKENIZER
    .as_ref()
    .map_err(|e| e.clone())?
    .clone();

  async_runtime::spawn_blocking(move || {
    Ok::<usize, String>(encoder.encode_ordinary(&text).len())
  })
  .await
  .map_err(|e| format!("token task failed: {e}"))?
}

#[tauri::command]
async fn process_code(code: String, mode: String, extension: String) -> Result<String, String> {
  let processing_mode = ProcessingMode::from_str(&mode);
  async_runtime::spawn_blocking(move || {
    let processed = match processing_mode {
      ProcessingMode::Raw => code,
      ProcessingMode::RemoveComments => remove_comments(&code, &extension),
      ProcessingMode::Minify => minify_code(&code, &extension),
    };
    Ok::<String, String>(processed)
  })
  .await
  .map_err(|e| format!("process task failed: {e}"))?
}

/// File info returned from read_files_from_paths
#[derive(serde::Serialize)]
pub struct FileInfo {
  pub name: String,
  pub path: String,
  pub content: String,
  pub is_text: bool,
}

/// List of text file extensions (matches frontend TEXT_FILE_EXTENSIONS)
const TEXT_EXTENSIONS: &[&str] = &[
    "txt", "md", "json", "xml", "html", "htm", "css", "scss", "sass", "less",
    "js", "mjs", "cjs", "ts", "mts", "tsx", "jsx", "vue", "svelte", "astro",
    "py", "pyw", "pyx", "rb", "php", "java", "c", "h", "cpp", "hpp", "cc",
    "cs", "go", "rs", "swift", "kt", "kts", "scala", "groovy", "clj", "cljs",
    "ex", "exs", "erl", "hrl", "hs", "elm", "lua", "r", "R", "jl", "pl", "pm",
    "sh", "bash", "zsh", "fish", "ps1", "psm1", "bat", "cmd",
    "sql", "graphql", "gql", "prisma", "proto",
    "yaml", "yml", "toml", "ini", "conf", "env", "cfg",
    "dockerfile", "containerfile", "makefile", "cmake",
    "gitignore", "gitattributes", "npmrc", "nvmrc", "editorconfig",
    "lock", "log", "csv", "tsv",
];

/// Check if file is likely a text file
fn is_text_file(path: &Path) -> bool {
    // Check by extension
    if let Some(ext) = path.extension() {
        let ext_lower = ext.to_string_lossy().to_lowercase();
        if TEXT_EXTENSIONS.contains(&ext_lower.as_str()) {
            return true;
        }
    }

    // Check for dot files (e.g., .gitignore, .env)
    if let Some(name) = path.file_name() {
        let name_str = name.to_string_lossy();
        if name_str.starts_with('.') && !name_str.contains('.') {
            return true;
        }
        // Common dotfiles
        let dotfiles = [".gitignore", ".gitattributes", ".npmrc", ".nvmrc", 
                        ".editorconfig", ".prettierrc", ".eslintrc", ".babelrc",
                        ".env", ".env.local", ".env.development", ".env.production"];
        if dotfiles.contains(&name_str.as_ref()) {
            return true;
        }
    }

    false
}

/// Read files from a list of paths (files or directories)
/// This enables drag-and-drop from GUI applications like VSCode
#[tauri::command]
async fn read_files_from_paths(paths: Vec<String>) -> Result<Vec<FileInfo>, String> {
    let mut files = Vec::new();

    for path_str in paths {
        let path = Path::new(&path_str);
        
        if !path.exists() {
            log::warn!("Path does not exist: {}", path_str);
            continue;
        }

        if path.is_file() {
            // Single file
            if let Some(file_info) = read_single_file(path) {
                files.push(file_info);
            }
        } else if path.is_dir() {
            // Directory - walk recursively
            for entry in WalkDir::new(path)
                .follow_links(true)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let entry_path = entry.path();
                
                // Skip hidden files and directories
                if entry_path.components().any(|c| {
                    c.as_os_str()
                        .to_string_lossy()
                        .starts_with('.')
                }) {
                    continue;
                }

                if entry_path.is_file() {
                    if let Some(file_info) = read_single_file(entry_path) {
                        files.push(file_info);
                    }
                }
            }
        }
    }

    log::info!("Read {} files from paths", files.len());
    Ok(files)
}

/// Read a single file and return FileInfo
fn read_single_file(path: &Path) -> Option<FileInfo> {
    let name = path.file_name()?.to_string_lossy().to_string();
    let path_str = path.to_string_lossy().to_string();
    
    // Check file size
    let metadata = fs::metadata(path).ok()?;
    if metadata.len() > MAX_FILE_SIZE as u64 {
        log::warn!("File too large, skipping: {}", path_str);
        return None;
    }

    let is_text = is_text_file(path);
    
    if is_text {
        // Read as text
        match fs::read_to_string(path) {
            Ok(content) => Some(FileInfo {
                name,
                path: path_str,
                content,
                is_text: true,
            }),
            Err(e) => {
                log::warn!("Failed to read file as text: {} - {}", path_str, e);
                None
            }
        }
    } else {
        // For non-text files, just return metadata
        Some(FileInfo {
            name,
            path: path_str,
            content: String::new(),
            is_text: false,
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![count_tokens, process_code, read_files_from_paths])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::DragDrop(drag_drop_event) = event {
        // Handle dropped files
        if let tauri::DragDropEvent::Drop { paths, .. } = drag_drop_event {
          // Convert paths to strings
          let path_strings: Vec<String> = paths
            .iter()
            .filter_map(|p| p.to_str().map(|s| s.to_string()))
            .collect();
          
          if !path_strings.is_empty() {
            log::info!("Files dropped: {:?}", path_strings);
            
            // Read files directly
            let mut file_infos: Vec<FileInfo> = Vec::new();
            for path_str in &path_strings {
              let path = Path::new(path_str);
              
              if path.is_file() {
                if let Some(info) = read_single_file(path) {
                  file_infos.push(info);
                }
              } else if path.is_dir() {
                // Walk directory
                for entry in WalkDir::new(path)
                  .follow_links(true)
                  .into_iter()
                  .filter_map(|e| e.ok())
                {
                  let entry_path = entry.path();
                  
                  // Skip hidden files and directories
                  if entry_path.components().any(|c| {
                    c.as_os_str().to_string_lossy().starts_with('.')
                  }) {
                    continue;
                  }

                  if entry_path.is_file() {
                    if let Some(info) = read_single_file(entry_path) {
                      file_infos.push(info);
                    }
                  }
                }
              }
            }
            
            log::info!("Read {} files from dropped paths", file_infos.len());
            
            // Emit file infos to frontend
            match window.emit("files-loaded", &file_infos) {
              Ok(_) => log::info!("Files loaded event emitted successfully"),
              Err(e) => log::error!("Failed to emit files-loaded event: {}", e),
            }
          }
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
