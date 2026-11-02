const STORAGE_KEYS = {
    portfolios: "portexaPortfolios",
    current: "portexaCurrentPortfolio",
    user: "portexaUser",
    settings: "portexaSettings",
    template: "portexaSelectedTemplate"
};
const API_URL = "http://localhost:8000";

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
        template: selectedTemplate || current.template || "3d-minimal"
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
            github: formData.github || null, linkedin: formData.linkedin || null, theme: "3d-minimal"
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
                    template: "3D Minimal",
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
                    <p class="eyebrow">3D Minimal</p>
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
            if (selected) writeJson(STORAGE_KEYS.current, selected);
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

