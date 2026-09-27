/// Input is the contents of one display-math block, never a complete document.
/// Macros live in the preamble so TeX's own definition syntax remains available.
pub fn wrap(source: &str, macros: &str, font: &str) -> Result<String, String> {
    validate_math_body(source)?;
    let fonts = match font {
        "latin-modern" => r"\usepackage{lmodern}",
        "pagella" => "\\usepackage{newpxtext}\n\\usepackage{newpxmath}",
        "termes" => "\\usepackage{newtxtext}\n\\usepackage{newtxmath}",
        _ => return Err(format!("Unknown math font: {font}")),
    };
    Ok(format!(
        "\\documentclass[border=14pt]{{standalone}}\n\
         \\usepackage{{amsmath,amssymb,mathtools}}\n\
         {fonts}\n\
         \\usepackage{{bm,esint}}\n\
         {macros}\n\
         \\begin{{document}}\n\
         $\\displaystyle\n\
         {source}\n\
         $\n\
         \\end{{document}}\n"
    ))
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
}
