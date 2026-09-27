/// Input is display-math bodies separated by standalone %--- lines.
/// Macros live in the preamble so TeX's own definition syntax remains available.
pub fn wrap(source: &str, macros: &str, font: &str) -> Result<String, String> {
    validate_math_body(source)?;
    let source = formula_sections(source)
        .iter()
        .map(|section| {
            format!(
                "\\begin{{texdraftformula}}\n{}\n\\end{{texdraftformula}}",
                comment_blank_lines(section)
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    let macros = comment_blank_lines(macros);
    let fonts = match font {
        "latin-modern" => r"\usepackage{lmodern}",
        "pagella" => "\\usepackage{newpxtext}\n\\usepackage{newpxmath}",
        "termes" => "\\usepackage{newtxtext}\n\\usepackage{newtxmath}",
        _ => return Err(format!("Unknown math font: {font}")),
    };
    Ok(format!(
        "\\documentclass[10pt,border=14pt,multi=texdraftformula]{{standalone}}\n\
         \\usepackage{{amsmath,amssymb,mathtools}}\n\
         {fonts}\n\
         \\usepackage{{bm,esint}}\n\
         \\newenvironment{{texdraftformula}}{{$\\displaystyle}}{{$}}\n\
         {macros}\n\
         \\begin{{document}}\n\
         {source}\n\
         \\end{{document}}\n"
    ))
}

fn formula_sections(source: &str) -> Vec<String> {
    let mut sections = vec![String::new()];
    for line in source.split_inclusive('\n') {
        if line.trim() == "%---" {
            sections.push(String::new());
        } else {
            sections.last_mut().unwrap().push_str(line);
        }
    }
    sections.retain(|section| has_math_content(section));
    sections
}

fn has_math_content(source: &str) -> bool {
    let mut characters = source.chars();
    while let Some(character) = characters.next() {
        if character == '%' {
            for next in characters.by_ref() {
                if next == '\n' {
                    break;
                }
            }
        } else if !character.is_whitespace() {
            // A backslash (including an escaped percent sign) is meaningful.
            return true;
        }
    }
    false
}

// TeX turns empty input lines into \par, including inside macro definitions.
// Comment only those lines: keep line numbers, ordinary newlines (which may
// separate words), existing comments, and escaped percent signs unchanged.
fn comment_blank_lines(input: &str) -> String {
    input
        .split('\n')
        .map(|line| {
            if line.trim().is_empty() {
                format!("%{line}")
            } else {
                line.to_owned()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn validate_math_body(source: &str) -> Result<(), String> {
    // Ignore comments and escaped symbols: \\% starts a comment, \% does not.
    let mut characters = source.chars().peekable();
    let mut uncommented = String::new();
    while let Some(character) = characters.next() {
        match character {
            '%' => {
                for next in characters.by_ref() {
                    if next == '\n' {
                        break;
                    }
                }
                uncommented.push('\n');
            }
            '\\' => {
                let next = characters.next();
                if matches!(next, Some('[' | ']' | '(' | ')')) {
                    return Err("Enter only the contents of display math; remove the surrounding math delimiters.".into());
                }
                uncommented.push('\\');
                if let Some(next) = next {
                    uncommented.push(next);
                }
            }
            '$' => {
                return Err(
                    "Enter only the contents of display math; remove the surrounding $ delimiters."
                        .into(),
                )
            }
            _ => uncommented.push(character),
        }
    }
    if [
        "\\documentclass",
        "\\begin{document}",
        "\\end{document}",
        "\\begin{equation",
        "\\begin{align}",
        "\\begin{align*}",
        "\\begin{gather}",
        "\\begin{gather*}",
        "\\begin{displaymath}",
    ]
    .iter()
    .any(|token| uncommented.contains(token))
    {
        return Err("Enter a display-math body. Use aligned, gathered, cases or matrix for multiline mathematics.".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supports_macros_and_nested_math() {
        let source = r"\begin{aligned}\foo{x}&=\bm{x}\\y&=\oiint f\end{aligned}";
        let macros = r"\newcommand{\foo}[1]{#1^2}\DeclareMathOperator{\rank}{rank}";
        let document = wrap(source, macros, "latin-modern").unwrap();
        assert!(document.find(macros).unwrap() < document.find(r"\begin{document}").unwrap());
        assert!(document.contains(source));
        assert!(document.contains(r"\usepackage{bm,esint}"));
    }

    #[test]
    fn rejects_wrapped_input_but_accepts_escaped_dollars_and_comments() {
        for source in ["$$x$$", r"\[x\]", r"\begin{equation}x\end{equation}"] {
            assert!(wrap(source, "", "latin-modern").is_err());
        }
        assert!(wrap("x % $ ignored\n + \\text{\\$}", "", "latin-modern").is_ok());
    }

    #[test]
    fn font_selection_is_explicit_and_stateless() {
        assert!(wrap("x", "", "pagella").unwrap().contains("newpxmath"));
        assert!(wrap("x", "", "termes").unwrap().contains("newtxmath"));
        assert!(!wrap("x", "", "latin-modern").unwrap().contains("newtxmath"));
        assert!(wrap("x", "", "unknown").is_err());
    }

    #[test]
    fn blank_lines_are_comments_without_changing_other_tex_or_line_numbers() {
        let source = "\n \t\n\\text{two\nwords} + \\% % comment\n\n x\r\n \r\n";
        let normalized = comment_blank_lines(source);
        assert_eq!(
            normalized,
            "%\n% \t\n\\text{two\nwords} + \\% % comment\n%\n x\r\n% \r\n%"
        );
        assert_eq!(normalized.lines().count(), source.split('\n').count());
        let macros = "\\newcommand{\\foo}[1]{\n\n#1\n \t\n}";
        let document = wrap(source, macros, "latin-modern").unwrap();
        assert!(document.contains("\\newcommand{\\foo}[1]{\n%\n#1\n% \t\n}"));
        assert!(document.contains(&normalized));
    }

    #[test]
    fn explicit_separator_creates_independent_sections_only() {
        let source = "%---\n% comment\n%---\n\\foo{x}\n\n + 1\n  %--- \r\n%---\nx %--- inline\n%---- ordinary comment\n+ \\%\n%---\n";
        let document = wrap(source, r"\newcommand{\foo}[1]{#1^2}", "latin-modern").unwrap();
        assert_eq!(document.matches(r"\begin{texdraftformula}").count(), 2);
        assert!(document.contains("\\foo{x}\n%\n + 1"));
        assert!(document.contains("x %--- inline\n%---- ordinary comment\n+ \\%"));
        assert!(document.contains("multi=texdraftformula"));
        assert!(formula_sections("%---\n\n% ordinary comment\n%---").is_empty());
    }
}
