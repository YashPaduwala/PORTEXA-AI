const STORAGE_KEYS = {
    portfolios: "portexaPortfolios",
    current: "portexaCurrentPortfolio",
    user: "portexaUser",
    settings: "portexaSettings",
    template: "portexaSelectedTemplate"
};
const API_URL = "https://portexa-api-production-d0c2.up.railway.app";

function readJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getPortfolios() {
    return readJson(STORAGE_KEYS.portfolios, []);
}

function savePortfolio(portfolio) {
    const portfolios = getPortfolios();
    const saved = {
        ...portfolio,
        id: portfolio.id || Date.now().toString(),
        updatedAt: new Date().toISOString()
    };

    const existingIndex = portfolios.findIndex((item) => item.id === saved.id);
    if (existingIndex >= 0) {
        portfolios[existingIndex] = saved;
    } else {
        portfolios.unshift(saved);
    }

    writeJson(STORAGE_KEYS.portfolios, portfolios);
    writeJson(STORAGE_KEYS.current, saved);
    return saved;
}

function formToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function initAuthForms() {

    document.querySelectorAll("[data-auth-form]").forEach((form) => {

        form.addEventListener("submit", async (event) => {

            event.preventDefault();

            const data = formToObject(form);

            // ==========================================
            // LOGIN
            // ==========================================

            if (["login", "signup"].includes(form.dataset.authForm)) {

                try {

                    const isSignup = form.dataset.authForm === "signup";
                    const response = await fetch(
                        `${API_URL}/api/auth/${isSignup ? "signup" : "login"}`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify({
                                name: [data.first, data.last].filter(Boolean).join(" "),
                                email: data.email,
                                password: data.password
                            })
                        }
                    );

                    const result = await response.json();

                    // Check if login failed
                    if (!response.ok) {

                        alert(
                            result.detail || result.message ||
                            "Login failed"
                        );

                        return;
                    }


                    // ==========================================
                    // SAVE JWT TOKEN
                    // ==========================================

                    localStorage.setItem(
                        "token",
                        result.access_token
                    );


                    // Save user information
                    writeJson(
                        STORAGE_KEYS.user,
                        result.user
                    );


                    // ==========================================
                    // GO TO DASHBOARD
                    // ==========================================

                    window.location.href =
                        "Dashboard.html";


                } catch (error) {

                    console.error(
                        "LOGIN ERROR:",
                        error
                    );

                    alert(
                        "Unable to connect to the backend."
                    );

                }

            }

        });

    });

}

function initCreatePage() {
    const form = document.getElementById("portfolioForm");
    if (!form) return;

    const selectedTemplate = localStorage.getItem(STORAGE_KEYS.template);
    const current = readJson(STORAGE_KEYS.current, {});
    const settings = readJson(STORAGE_KEYS.settings, {});
    const defaults = {
        ...current,
        fullName: current.fullName || settings.name || "",
        email: current.email || settings.email || "",
        template: selectedTemplate || current.template || current.apiPortfolio?.theme || "3d-minimal"
    };

    Object.entries(defaults).forEach(([key, value]) => {
        const field = form.elements[key];
        if (field && value) field.value = value;
    });

    document.getElementById("generateBio")?.addEventListener("click", () => {
        const role = form.elements.role.value || "professional";
        const skills = form.elements.skills.value || "modern tools";
        const projects = [form.elements.projectOne.value, form.elements.projectTwo.value].filter(Boolean).join(", ") || "practical projects";
        form.elements.bio.value = `I am a ${role} focused on building useful, polished digital experiences. My strengths include ${skills}, and I enjoy turning ideas into reliable projects such as ${projects}.`;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = formToObject(form);
        const projects = [formData.projectOne, formData.projectTwo].filter(Boolean).map((title, index) => ({ title, description: index === 0 ? formData.projectDetails || "" : "", technologies: [] }));
        const payload = {
            full_name: formData.fullName, role: formData.role, email: formData.email || null,
            location: formData.location || "", bio: formData.bio || "",
            skills: (formData.skills || "").split(",").map((item) => item.trim()).filter(Boolean),
            projects, education: formData.education ? [formData.education] : [],
            experience: formData.experience ? [formData.experience] : [],
            github: formData.github || null, linkedin: formData.linkedin || null, theme: formData.template || "3d-minimal"
        };
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Please sign in before saving a portfolio.");
            const previous = readJson(STORAGE_KEYS.current, {});
            const existingId = previous.apiPortfolio?.id;
            const response = await fetch(`${API_URL}/api/portfolios${existingId ? `/${encodeURIComponent(existingId)}` : ""}`, { method: existingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || "Unable to save portfolio.");
            savePortfolio({ ...formData, id: result.id, apiPortfolio: result });
            window.location.href = "preview.html";
        } catch (error) {
            alert(error.message || "Unable to connect to the portfolio service.");
        }
    });
}

function initTemplatePage() {
    document.querySelectorAll("[data-template]").forEach((button) => {
        button.addEventListener("click", () => {
            localStorage.setItem(STORAGE_KEYS.template, button.dataset.template);
            const current = readJson(STORAGE_KEYS.current, {});
            if (current && Object.keys(current).length) {
                writeJson(STORAGE_KEYS.current, { ...current, template: button.dataset.template });
            }
            window.location.href = "create.html";
        });
    });

    const query = new URLSearchParams(window.location.search).get("q");
    if (query) {
        document.querySelectorAll("[data-template-card]").forEach((card) => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(query.toLowerCase()) ? "" : "none";
        });
    }
}

function linkify(url, label) {
    if (!url) return "";
    const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    try {
        if (!["http:", "https:"].includes(new URL(href).protocol)) return "";
    } catch { return ""; }
    return `<a href="${escapeHTML(href)}" target="_blank" rel="noreferrer">${escapeHTML(label)}</a>`;
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

function renderPreview() {
    const target = document.getElementById("portfolioPreview");
    if (!target) return;

    const data = readJson(STORAGE_KEYS.current, null);
    if (!data) {
        target.innerHTML = `
            <div class="empty-state">
                <h1>No portfolio yet</h1>
                <p>Create your first portfolio to see a preview here.</p>
                <a class="btn btn-primary" href="create.html">Create Portfolio</a>
            </div>
        `;
        return;
    }
    const downloadButton = document.getElementById("downloadPortfolio");
    if (downloadButton && data.apiPortfolio?.id) {
        downloadButton.href = `${API_URL}/api/public/portfolios/${encodeURIComponent(data.apiPortfolio.id)}/download`;
        downloadButton.hidden = false;
    }
    const publicViewButton = document.getElementById("viewPublicPortfolio");
    if (publicViewButton && data.apiPortfolio?.id) {
        publicViewButton.href = `${API_URL}/api/public/portfolios/${encodeURIComponent(data.apiPortfolio.id)}/site`;
        publicViewButton.hidden = false;
    }

    const selectedTheme = data.apiPortfolio?.theme || data.template || data.theme || "3d-minimal";
    if (selectedTheme === "mono-orbit") {
        renderMonoOrbitPreview(target, data);
        return;
    }

    target.classList.remove("mono-orbit-preview");
    const skills = (data.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
    const projects = [data.projectOne, data.projectTwo].filter(Boolean);
    const links = [linkify(data.github, "GitHub"), linkify(data.linkedin, "LinkedIn")].filter(Boolean);

    target.innerHTML = `
        <header class="preview-header three-d-header">
            <div class="preview-orb" aria-hidden="true"></div>
            <h1>${escapeHTML(data.fullName || "Your Name")}</h1>
            <p>${escapeHTML(data.role || "Your Profession")}${data.location ? ` &bull; ${escapeHTML(data.location)}` : ""}</p>
        </header>
        <div class="preview-body">
            <aside>
                <section class="preview-section">
                    <h2>Contact</h2>
                    <p>${escapeHTML(data.email || "Add your email")}</p>
                    <p>${links.join(" | ") || "Add GitHub and LinkedIn"}</p>
                </section>
                <section class="preview-section">
                    <h2>Skills</h2>
                    <div class="chips">${skills.length ? skills.map((skill) => `<span>${escapeHTML(skill)}</span>`).join("") : "<span>Add skills</span>"}</div>
                </section>
                <section class="preview-section">
                    <h2>Education</h2>
                    <p>${escapeHTML(data.education || "Add education details")}</p>
                </section>
            </aside>
            <section>
                <div class="preview-section">
                    <h2>About</h2>
                    <p>${escapeHTML(data.bio || "Add a professional bio from the builder.")}</p>
                </div>
                <div class="preview-section">
                    <h2>Projects</h2>
                    <p><strong>${escapeHTML(projects.join(" | ") || "Add project names")}</strong></p>
                    <p>${escapeHTML(data.projectDetails || "Add project details, technologies and impact.")}</p>
                </div>
                <div class="preview-section">
                    <h2>Experience</h2>
                    <p>${escapeHTML(data.experience || "Add experience, internships or freelance work.")}</p>
                </div>
            </section>
        </div>
    `;
}

function renderMonoOrbitPreview(target, data) {
    const skills = (data.skills || "").split(",").map((item) => item.trim()).filter(Boolean);
    const projects = [data.projectOne, data.projectTwo].filter(Boolean);
    const initials = (data.fullName || "YP").split(/\s+/).slice(0, 2).map((item) => item[0]).join("").toUpperCase();
    const social = [linkify(data.github, "GitHub"), linkify(data.linkedin, "LinkedIn")].filter(Boolean).join("");
    const ticker = skills.length ? '<div class="orbit-ticker">' + escapeHTML(skills.join("　✦　")) + '　✦　' + escapeHTML(skills.join("　✦　")) + '</div>' : "";
    const skillCards = skills.map((skill, index) => '<article><small>' + String(index + 1).padStart(2, "0") + '</small><h3>' + escapeHTML(skill) + '</h3></article>').join("");
    const projectCards = projects.map((project, index) => '<article><small>' + String(index + 1).padStart(2, "0") + '</small><div><h3>' + escapeHTML(project) + '</h3><p>' + escapeHTML(data.projectDetails || "Project details") + '</p><b>' + escapeHTML(skills.join("　") || "Portfolio project") + '</b></div></article>').join("");
    target.classList.add("mono-orbit-preview");
    target.innerHTML = '<div class="orbit-site">' +
        '<header class="orbit-nav"><a class="orbit-brand" href="#orbit-top">' + escapeHTML(data.fullName || "Your Name") + '<span>.</span></a><nav><a href="#orbit-about">About</a><a href="#orbit-skills">Skills</a><a href="#orbit-projects">Projects</a><a href="#orbit-contact">Contact</a></nav><a class="orbit-talk" href="#orbit-contact">Let\'s talk ↗</a></header>' +
        '<section class="orbit-hero" id="orbit-top"><div class="orbit-copy"><p class="orbit-eyebrow">● PORTFOLIO / ' + escapeHTML(data.role || "PROFESSIONAL") + '</p><h1>' + escapeHTML(data.fullName || "Your Name") + '</h1><p class="orbit-role">' + escapeHTML(data.role || "Your Profession") + '</p><p class="orbit-bio">' + escapeHTML(data.bio || "Add a short introduction in your portfolio details.") + '</p><div class="orbit-actions"><a class="orbit-btn orbit-dark" href="#orbit-projects">Explore work ↓</a>' + (data.email ? '<a class="orbit-btn orbit-light" href="mailto:' + escapeHTML(data.email) + '">Contact ↗</a>' : "") + '</div><p class="orbit-meta">' + escapeHTML(data.location || "") + (data.location ? '　•　' : "") + 'Portfolio</p></div>' +
        '<div class="orbit-visual"><i class="orbit-ring orbit-ring-one"></i><i class="orbit-ring orbit-ring-two"></i><article class="orbit-profile"><div class="orbit-profile-top"><span>PROFILE_01</span><span>PORTEXA</span></div><div class="orbit-monogram">' + escapeHTML(initials) + '</div><div class="orbit-profile-bottom"><b>' + escapeHTML(data.fullName || "Your Name") + '<small>' + escapeHTML(data.role || "PROFESSIONAL") + '</small></b><code>01<br>10<br>01</code></div></article><span class="orbit-chip orbit-chip-one">&lt;/&gt; ' + escapeHTML(skills.slice(0, 3).join(" · ") || "Your skills") + '</span><span class="orbit-chip orbit-chip-two">✦ ' + escapeHTML(data.location || "Open to opportunities") + '</span></div></section>' + ticker +
        (data.bio ? '<section class="orbit-section orbit-split" id="orbit-about"><span class="orbit-label">01 / ABOUT</span><div><h2>Curious by default.<br><span>Builder by choice.</span></h2><p>' + escapeHTML(data.bio) + '</p></div></section>' : "") +
        (skills.length ? '<section class="orbit-section" id="orbit-skills"><span class="orbit-label">02 / SKILLS</span><h2>Tools I use to<br><span>make ideas real.</span></h2><div class="orbit-skills">' + skillCards + '</div></section>' : "") +
        (projects.length ? '<section class="orbit-section orbit-dark-section" id="orbit-projects"><span class="orbit-label">03 / SELECTED WORK</span><h2>A few things<br><span>I\'ve built.</span></h2><div class="orbit-projects">' + projectCards + '</div></section>' : "") +
        ((data.education || data.experience) ? '<section class="orbit-section orbit-split"><span class="orbit-label">04 / JOURNEY</span><div><h2>Learning and<br><span>growing.</span></h2>' + (data.education ? '<p><b>Education</b><br>' + escapeHTML(data.education) + '</p>' : "") + (data.experience ? '<p><b>Experience</b><br>' + escapeHTML(data.experience) + '</p>' : "") + '</div></section>' : "") +
        '<section class="orbit-contact" id="orbit-contact"><p class="orbit-eyebrow">LET\'S CONNECT</p><h2>Have an idea?<br><em>Let\'s build it.</em></h2>' + (data.email ? '<a class="orbit-email" href="mailto:' + escapeHTML(data.email) + '">' + escapeHTML(data.email) + ' ↗</a>' : "") + '<div class="orbit-socials">' + social + '</div></section>' +
        '<footer class="orbit-footer"><span>© ' + escapeHTML(data.fullName || "Your Name") + '</span><span>Designed with curiosity.</span><a href="#orbit-top">Back to top ↑</a></footer></div>';
}

async function renderPortfolioLists() {
    const recent = document.getElementById("recentPortfolios");
    const list = document.getElementById("portfolioList");
    let portfolios = getPortfolios();
    const token = localStorage.getItem("token");
    if ((list || recent) && token) {
        try {
            const response = await fetch(`${API_URL}/api/portfolios`, { headers: { Authorization: `Bearer ${token}` } });
            if (response.ok) {
                const result = await response.json();
                portfolios = result.items.map((record) => ({
                    id: record.id,
                    apiPortfolio: record,
                    fullName: record.content.full_name,
                    role: record.content.role,
                    email: record.content.email,
                    location: record.content.location,
                    bio: record.content.bio,
                    skills: record.content.skills.join(", "),
                    projectOne: record.content.projects[0]?.title || "",
                    projectTwo: record.content.projects[1]?.title || "",
                    projectDetails: record.content.projects[0]?.description || "",
                    education: record.content.education.join(", "),
                    experience: record.content.experience.join(", "),
                    github: record.content.github || "",
                    linkedin: record.content.linkedin || "",
                    template: record.theme === "mono-orbit" ? "Mono Orbit" : "3D Minimal",
                    updatedAt: record.updated_at
                }));
                writeJson(STORAGE_KEYS.portfolios, portfolios);
            }
        } catch (error) {
            console.error("Portfolio list could not be refreshed:", error);
        }
    }

    if (recent && portfolios.length) {
        recent.innerHTML = portfolios.slice(0, 3).map((item) => `
            <tr>
                <td>${escapeHTML(item.role || item.fullName || "Untitled Portfolio")}</td>
                <td>3D Minimal</td>
                <td>Saved</td>
                <td><a class="btn btn-sm btn-primary" href="preview.html" data-open-portfolio="${encodeURIComponent(item.id)}">Open</a></td>
            </tr>
        `).join("");
    }

    if (list) {
        if (!portfolios.length) {
            list.innerHTML = `
                <div class="portfolio-item">
                    <h2>No saved portfolios yet</h2>
                    <p>Create your first portfolio and it will appear here.</p>
                    <a class="btn btn-primary" href="create.html">Create Portfolio</a>
                </div>
            `;
        } else {
            list.innerHTML = portfolios.map((item) => `
                <article class="portfolio-item">
                    <p class="eyebrow">${escapeHTML(item.template || "3D Minimal")}</p>
                    <h2>${escapeHTML(item.fullName || "Untitled")}</h2>
                    <p>${escapeHTML(item.role || "Portfolio")}</p>
                    <div class="portfolio-actions">
                        <a class="btn btn-primary" href="preview.html" data-open-portfolio="${encodeURIComponent(item.id)}">Preview</a>
                        <a class="btn btn-outline-light" href="create.html" data-open-portfolio="${encodeURIComponent(item.id)}">Edit</a>
                        ${item.apiPortfolio?.id ? `<a class="btn btn-outline-light" href="${API_URL}/api/public/portfolios/${encodeURIComponent(item.apiPortfolio.id)}/site" target="_blank" rel="noreferrer">View Live</a>` : ""}
                        ${item.apiPortfolio?.id ? `<a class="btn btn-outline-light" href="${API_URL}/api/public/portfolios/${encodeURIComponent(item.apiPortfolio.id)}/download">Download HTML</a>` : ""}
                        ${item.apiPortfolio?.id ? `<button class="btn btn-outline-danger" type="button" data-delete-portfolio="${encodeURIComponent(item.apiPortfolio.id)}">Delete</button>` : ""}
                    </div>
                </article>
            `).join("");
        }
    }

    document.querySelectorAll("[data-open-portfolio]").forEach((link) => {
        link.addEventListener("click", () => {
            const selected = portfolios.find((item) => item.id === decodeURIComponent(link.dataset.openPortfolio));
            if (selected) {
                writeJson(STORAGE_KEYS.current, selected);
                localStorage.setItem(STORAGE_KEYS.template, selected.apiPortfolio?.theme || selected.template || "3d-minimal");
            }
        });
    });
    document.querySelectorAll("[data-delete-portfolio]").forEach((button) => {
        button.addEventListener("click", async () => {
            if (!window.confirm("Delete this portfolio? This cannot be undone.")) return;
            try {
                const response = await fetch(`${API_URL}/api/portfolios/${decodeURIComponent(button.dataset.deletePortfolio)}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) {
                    const result = await response.json();
                    throw new Error(result.detail || "Unable to delete portfolio.");
                }
                const remaining = portfolios.filter((item) => item.apiPortfolio?.id !== decodeURIComponent(button.dataset.deletePortfolio));
                writeJson(STORAGE_KEYS.portfolios, remaining);
                renderPortfolioLists();
            } catch (error) {
                alert(error.message || "Unable to connect to the portfolio service.");
            }
        });
    });
}

function initSettings() {
    const form = document.getElementById("settingsForm");
    if (!form) return;

    const settings = readJson(STORAGE_KEYS.settings, {});
    Object.entries(settings).forEach(([key, value]) => {
        const field = form.elements[key];
        if (field) field.value = value;
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        writeJson(STORAGE_KEYS.settings, formToObject(form));
        window.location.href = "Dashboard.html";
    });
}

initAuthForms();
initCreatePage();
initTemplatePage();
renderPreview();
renderPortfolioLists();
initSettings();

