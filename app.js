const STORAGE_KEYS = {
    portfolios: "portexaPortfolios",
    current: "portexaCurrentPortfolio",
    user: "portexaUser",
    settings: "portexaSettings",
    template: "portexaSelectedTemplate"
};

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
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const data = formToObject(form);
            const username = data.username || document.getElementById("username")?.value || "Yash";
            writeJson(STORAGE_KEYS.user, { username, signedInAt: new Date().toISOString() });
            window.location.href = "Dashboard.html";
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
        template: selectedTemplate || current.template || "Modern"
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

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const portfolio = savePortfolio(formToObject(form));
        writeJson(STORAGE_KEYS.current, portfolio);
        window.location.href = "preview.html";
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
    const href = url.startsWith("http") ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`;
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

    const skills = (data.skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
    const projects = [data.projectOne, data.projectTwo].filter(Boolean);
    const links = [linkify(data.github, "GitHub"), linkify(data.linkedin, "LinkedIn")].filter(Boolean);

    target.innerHTML = `
        <header class="preview-header">
            <p>${data.template || "Modern"} Portfolio</p>
            <h1>${data.fullName || "Your Name"}</h1>
            <p>${data.role || "Your Profession"}${data.location ? ` &bull; ${data.location}` : ""}</p>
        </header>
        <div class="preview-body">
            <aside>
                <section class="preview-section">
                    <h2>Contact</h2>
                    <p>${data.email || "Add your email"}</p>
                    <p>${links.join(" | ") || "Add GitHub and LinkedIn"}</p>
                </section>
                <section class="preview-section">
                    <h2>Skills</h2>
                    <div class="chips">${skills.length ? skills.map((skill) => `<span>${skill}</span>`).join("") : "<span>Add skills</span>"}</div>
                </section>
                <section class="preview-section">
                    <h2>Education</h2>
                    <p>${data.education || "Add education details"}</p>
                </section>
            </aside>
            <section>
                <div class="preview-section">
                    <h2>About</h2>
                    <p>${data.bio || "Add a professional bio from the builder."}</p>
                </div>
                <div class="preview-section">
                    <h2>Projects</h2>
                    <p><strong>${projects.join(" | ") || "Add project names"}</strong></p>
                    <p>${data.projectDetails || "Add project details, technologies and impact."}</p>
                </div>
                <div class="preview-section">
                    <h2>Experience</h2>
                    <p>${data.experience || "Add experience, internships or freelance work."}</p>
                </div>
            </section>
        </div>
    `;
}

function renderPortfolioLists() {
    const recent = document.getElementById("recentPortfolios");
    const list = document.getElementById("portfolioList");
    const portfolios = getPortfolios();

    if (recent && portfolios.length) {
        recent.innerHTML = portfolios.slice(0, 3).map((item) => `
            <tr>
                <td>${item.role || item.fullName || "Untitled Portfolio"}</td>
                <td>${item.template || "Modern"}</td>
                <td>Saved</td>
                <td><a class="btn btn-sm btn-primary" href="preview.html" data-open-portfolio="${item.id}">Open</a></td>
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
                    <p class="eyebrow">${item.template || "Modern"}</p>
                    <h2>${item.fullName || "Untitled"}</h2>
                    <p>${item.role || "Portfolio"}</p>
                    <div class="portfolio-actions">
                        <a class="btn btn-primary" href="preview.html" data-open-portfolio="${item.id}">Preview</a>
                        <a class="btn btn-outline-light" href="create.html" data-open-portfolio="${item.id}">Edit</a>
                    </div>
                </article>
            `).join("");
        }
    }

    document.querySelectorAll("[data-open-portfolio]").forEach((link) => {
        link.addEventListener("click", () => {
            const selected = portfolios.find((item) => item.id === link.dataset.openPortfolio);
            if (selected) writeJson(STORAGE_KEYS.current, selected);
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

