/**
 * LaTeX template strings and data-filling utility for PDF resume export.
 * Each template has distinct layout and styling to match the React components.
 */

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/[&%$#_{}]/g, (m) => '\\' + m)
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}');
}

function bulletPoints(description) {
    if (!description) return '\\item No details provided';
    const lines = description.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';
    return lines.map(l => `\\item ${esc(l)}`).join('\n');
}

// ------------------------------------------------------------
// MODERN TEMPLATE (2-Column, Sans-serif, Blue Accents)
// ------------------------------------------------------------
function generateModern(data) {
    const { personalInfo: pi = {}, education = [], experience = [], projects = [], skills = [], achievements = [] } = data;

    let tex = `
\\documentclass[10pt]{article}
\\usepackage[a4paper,margin=0.6in]{geometry}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{fontawesome5}

\\definecolor{primary}{HTML}{111827}
\\definecolor{accent}{HTML}{4A6CF7}
\\definecolor{graytext}{HTML}{4b5563}
\\definecolor{lightgray}{HTML}{E5E7EB}

\\titleformat{\\section}{\\large\\bfseries\\color{primary}\\uppercase}{}{0em}{}[\\vspace{-0.5em}\\color{lightgray}\\rule{\\linewidth}{0.5pt}\\vspace{0.5em}]
\\titlespacing*{\\section}{0pt}{4pt}{4pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}

\\begin{document}

% Header
{\\Huge \\textbf{\\color{primary} ${esc(pi.fullName) || 'Your Name'}}}\\\\[4pt]
{\\large \\textbf{\\color{accent} ${esc(pi.title) || ''}}}\\\\[8pt]

{\\color{graytext}\\small
`;
    const icons = [];
    if (pi.email) icons.push(`\\faEnvelope\\ \\href{mailto:${esc(pi.email)}}{${esc(pi.email)}}`);
    if (pi.phone) icons.push(`\\faPhone\\ ${esc(pi.phone)}`);
    if (pi.location) icons.push(`\\faMapMarker\\ ${esc(pi.location)}`);
    if (pi.website) icons.push(`\\faGlobe\\ \\href{${esc(pi.website)}}{${esc(pi.website)}}`);
    if (pi.github) icons.push(`\\faGithub\\ ${esc(pi.github).replace('https://', '')}`);
    if (pi.linkedin) icons.push(`\\faLinkedin\\ ${esc(pi.linkedin).replace(/https:\/\/(www\.)?linkedin\.com\/in\//, '')}`);
    
    tex += icons.join(' \\quad ') + `}
\\vspace{6pt}
{\\color{accent}\\hrule height 2pt}
\\vspace{12pt}
`;

    if (pi.summary) {
        tex += `{\\small \\textit{${esc(pi.summary)}}}\\\\[12pt]`;
    }

    tex += `\n\\begin{minipage}[t]{0.64\\textwidth}\n`;

    if (experience.length > 0) {
        tex += `\\section*{Experience}\n`;
        experience.forEach(exp => {
            tex += `{\\bfseries ${esc(exp.position)}} \\hfill {\\scriptsize \\color{graytext} ${esc(exp.startDate)} -- ${exp.current ? 'Present' : esc(exp.endDate)}}\\\\\n`;
            tex += `{\\small \\color{accent} ${esc(exp.company)}${exp.location ? ` $\\cdot$ ${esc(exp.location)}` : ''}}\\\\\n`;
            if (exp.description) {
                tex += `\\vspace{-4pt}{\\small \\begin{itemize}[leftmargin=12pt,itemsep=0pt]\n${bulletPoints(exp.description)}\n\\end{itemize}}\n\\vspace{4pt}`;
            } else {
                tex += `\\vspace{6pt}\n`;
            }
        });
    }

    if (projects.length > 0) {
        tex += `\\vspace{6pt}\\section*{Projects}\n`;
        projects.forEach(proj => {
            tex += `{\\bfseries ${esc(proj.name)}} \\hfill {\\scriptsize \\color{graytext} ${esc(proj.startDate)} -- ${esc(proj.endDate)}}\\\\\n`;
            if (proj.technologies) tex += `{\\scriptsize \\color{accent}\\textit{Tech: ${esc(proj.technologies)}}}\\\\\n`;
            if (proj.description) {
                tex += `\\vspace{-4pt}{\\small \\begin{itemize}[leftmargin=12pt,itemsep=0pt]\n${bulletPoints(proj.description)}\n\\end{itemize}}\n\\vspace{4pt}`;
            } else {
                tex += `\\vspace{6pt}\n`;
            }
        });
    }

    tex += `\\end{minipage}%
\\hfill%
\\begin{minipage}[t]{0.32\\textwidth}\n`;

    if (education.length > 0) {
        tex += `\\section*{Education}\n`;
        education.forEach(edu => {
            tex += `{\\small \\bfseries ${esc(edu.institution)}}\\\\\n`;
            tex += `{\\small ${esc(edu.degree)}}\\\\\n`;
            tex += `{\\scriptsize \\color{graytext} ${esc(edu.startDate)} -- ${esc(edu.endDate)}}\\\\\n`;
            if (edu.description) tex += `{\\scriptsize \\color{accent} ${esc(edu.description)}}\\\\\n`;
            tex += `\\vspace{6pt}\n`;
        });
    }

    if (skills.length > 0) {
        tex += `\\section*{Skills}\n{\\small `;
        tex += skills.map(s => esc(s.name)).join(', ');
        tex += `}\\\\\n\\vspace{6pt}\n`;
    }

    if (achievements.length > 0) {
        tex += `\\section*{Highlights}\n`;
        achievements.forEach(ach => {
            tex += `{\\small \\bfseries ${esc(ach.title)}}\\\\\n`;
            if (ach.description) tex += `{\\scriptsize \\color{graytext} ${esc(ach.description)}}\\\\\n`;
            tex += `\\vspace{4pt}\n`;
        });
    }

    tex += `\\end{minipage}\n\\end{document}`;
    return tex;
}


// ------------------------------------------------------------
// CLASSIC TEMPLATE (Serif, Centered Header, Traditional)
// ------------------------------------------------------------
function generateClassic(data) {
    const { personalInfo: pi = {}, education = [], experience = [], projects = [], skills = [], achievements = [] } = data;

    let tex = `
\\documentclass[11pt]{article}
\\usepackage[a4paper,margin=0.8in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}

\\titleformat{\\section}{\\large\\bfseries}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{6pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\begin{center}
{\\Huge \\textbf{${esc(pi.fullName) || 'Your Name'}}}\\\\[4pt]
${esc(pi.title) || ''}\\\\[6pt]
`;
    
    const links = [];
    if (pi.email) links.push(`\\href{mailto:${esc(pi.email)}}{${esc(pi.email)}}`);
    if (pi.phone) links.push(esc(pi.phone));
    if (pi.location) links.push(esc(pi.location));
    tex += links.join(' | ') + `\\\\`;
    
    const webLinks = [];
    if (pi.github) webLinks.push(`\\href{${esc(pi.github)}}{GitHub}`);
    if (pi.linkedin) webLinks.push(`\\href{${esc(pi.linkedin)}}{LinkedIn}`);
    if (pi.website) webLinks.push(`\\href{${esc(pi.website)}}{Portfolio}`);
    if (webLinks.length > 0) tex += `\n${webLinks.join(' | ')}`;

    tex += `\n\\end{center}\n\\vspace{8pt}\n`;

    if (pi.summary) tex += `\\section*{Professional Summary}\n${esc(pi.summary)}\n`;

    if (skills.length > 0) {
        tex += `\\section*{Technical Skills}\n${skills.map(s => esc(s.name)).join(', ')}\n`;
    }

    if (experience.length > 0) {
        tex += `\\section*{Experience}\n`;
        experience.forEach(exp => {
            tex += `\\textbf{${esc(exp.position)} -- ${esc(exp.company)}} \\hfill ${esc(exp.startDate)} -- ${exp.current ? 'Present' : esc(exp.endDate)}\\\\\n`;
            if (exp.description) {
                tex += `\\vspace{-4pt}\\begin{itemize}[leftmargin=*]\n${bulletPoints(exp.description)}\n\\end{itemize}\n`;
            }
        });
    }

    if (projects.length > 0) {
        tex += `\\section*{Key Projects}\n`;
        projects.forEach(proj => {
            tex += `\\textbf{${esc(proj.name)}} \\hfill ${esc(proj.startDate)} -- ${esc(proj.endDate)}\\\\\n`;
            if (proj.technologies) tex += `\\textit{Tech: ${esc(proj.technologies)}}\\\\\n`;
            if (proj.description) {
                tex += `\\vspace{-4pt}\\begin{itemize}[leftmargin=*]\n${bulletPoints(proj.description)}\n\\end{itemize}\n`;
            }
        });
    }

    if (education.length > 0) {
        tex += `\\section*{Education}\n`;
        education.forEach(edu => {
            tex += `\\textbf{${esc(edu.degree)}} -- ${esc(edu.institution)} \\hfill ${esc(edu.startDate)} -- ${esc(edu.endDate)}\\\\\n`;
            if (edu.description) tex += `${esc(edu.description)}\\\\\n`;
        });
    }

    if (achievements.length > 0) {
        tex += `\\section*{Achievements}\n\\begin{itemize}[leftmargin=*]\n`;
        achievements.forEach(ach => {
            tex += `\\item \\textbf{${esc(ach.title)}}` + (ach.description ? ` -- ${esc(ach.description)}` : '') + `\n`;
        });
        tex += `\\end{itemize}\n`;
    }


    tex += `\\end{document}`;
    return tex;
}


// ------------------------------------------------------------
// EXECUTIVE TEMPLATE (Clean, Professional, Focus on impact)
// ------------------------------------------------------------
function generateExecutive(data) {
    // Similar to Classic but perhaps slightly different section naming
    const { personalInfo: pi = {}, education = [], experience = [], projects = [], skills = [], achievements = [] } = data;

    let tex = `
\\documentclass[10pt]{article}
\\usepackage[a4paper,margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{helvet} % Often executive resumes use clean sans-serif
\\renewcommand{\\familydefault}{\\sfdefault}

\\titleformat{\\section}{\\bfseries\\large\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{6pt}

\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{3pt}

\\begin{document}

\\begin{center}
{\\Huge \\textbf{${esc(pi.fullName) || 'Your Name'}}}\\\\[2pt]
{\\large \\textit{${esc(pi.title) || ''}}}\\\\[6pt]
`;
    // Links same as classic
    const links = [];
    if (pi.email) links.push(esc(pi.email));
    if (pi.phone) links.push(esc(pi.phone));
    if (pi.location) links.push(esc(pi.location));
    if (pi.linkedin) links.push(esc(pi.linkedin).replace(/https:\/\/(www\.)?linkedin\.com\/in\//, 'linkedin.com/in/'));
    tex += links.join(' $\\cdot$ ') + `\n\\end{center}\n\\vspace{6pt}\n`;

    if (pi.summary) tex += `\\section*{Executive Summary}\n${esc(pi.summary)}\n`;

    if (skills.length > 0) {
        tex += `\\section*{Core Competencies}\n${skills.map(s => esc(s.name)).join(' $\\cdot$ ')}\n`;
    }

    if (experience.length > 0) {
        tex += `\\section*{Professional Experience}\n`;
        experience.forEach(exp => {
            tex += `{\\large \\textbf{${esc(exp.company)}} } \\hfill ${esc(exp.startDate)} -- ${exp.current ? 'Present' : esc(exp.endDate)}\\\\\n`;
            tex += `{\\bfseries ${esc(exp.position)}}${exp.location ? ` | ${esc(exp.location)}` : ''}\\\\\n`;
            if (exp.description) {
                tex += `\\vspace{-4pt}\\begin{itemize}[leftmargin=*]\n${bulletPoints(exp.description)}\n\\end{itemize}\n`;
            }
        });
    }

    if (projects.length > 0) {
        tex += `\\section*{Strategic Projects}\n`;
        projects.forEach(proj => {
            tex += `\\textbf{${esc(proj.name)}} \\hfill ${esc(proj.startDate)} -- ${esc(proj.endDate)}\\\\\n`;
            if (proj.description) {
                tex += `\\vspace{-4pt}\\begin{itemize}[leftmargin=*]\n${bulletPoints(proj.description)}\n\\end{itemize}\n`;
            }
        });
    }

    if (education.length > 0) {
        tex += `\\section*{Education}\n`;
        education.forEach(edu => {
            tex += `\\textbf{${esc(edu.degree)}} -- ${esc(edu.institution)} \\hfill ${esc(edu.startDate)} -- ${esc(edu.endDate)}\\\\\n`;
        });
    }

    if (achievements.length > 0) {
        tex += `\\section*{Leadership \\& Awards}\n\\begin{itemize}[leftmargin=*]\n`;
        achievements.forEach(ach => {
            tex += `\\item \\textbf{${esc(ach.title)}}` + (ach.description ? ` -- ${esc(ach.description)}` : '') + `\n`;
        });
        tex += `\\end{itemize}\n`;
    }

    tex += `\\end{document}`;
    return tex;
}


/**
 * Fill a LaTeX template with resume data
 */
function fillTemplate(templateId, data) {
    if (templateId === 'modern') return generateModern(data);
    if (templateId === 'executive') return generateExecutive(data);
    return generateClassic(data); // Default fallback covers 'latex' as well
}

module.exports = { fillTemplate };
