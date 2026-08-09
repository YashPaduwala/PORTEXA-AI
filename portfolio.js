const API_URL = "http://localhost:5000";


// ==========================================
// LOAD AI PORTFOLIO
// ==========================================

async function loadPortfolio() {

    const token = localStorage.getItem("token");

    // Check login
    if (!token) {
        alert("Please login first.");
        window.location.href = "login.html";
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/api/ai/portfolio`,
            {
                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        const data = await response.json();


        // API error
        if (!response.ok) {

            console.error(data);

            alert(
                data.message ||
                "Failed to load portfolio"
            );

            return;
        }


        console.log(
            "AI Portfolio:",
            data
        );


        // Get portfolio content
        const portfolio = data.portfolio.content;


        // ==========================================
        // BASIC INFORMATION
        // ==========================================

        document.getElementById("headline").textContent =
            portfolio.headline || "My Portfolio";


        document.getElementById("summary").textContent =
            portfolio.summary || "";


        document.getElementById("about").textContent =
            portfolio.about || "";


        // ==========================================
        // SKILLS
        // ==========================================

        const skillsContainer =
            document.getElementById("skills");

        skillsContainer.innerHTML = "";


        if (
            portfolio.skills &&
            portfolio.skills.length > 0
        ) {

            portfolio.skills.forEach(skill => {

                const skillElement =
                    document.createElement("span");

                skillElement.className = "skill";

                skillElement.textContent =
                    typeof skill === "string"
                        ? skill
                        : skill.name || skill.skill_name || "";

                skillsContainer.appendChild(
                    skillElement
                );

            });

        } else {

            skillsContainer.innerHTML =
                "<p>No skills added yet.</p>";

        }


        // ==========================================
        // PROJECTS
        // ==========================================

        const projectsContainer =
            document.getElementById("projects");

        projectsContainer.innerHTML = "";


        if (
            portfolio.projects &&
            portfolio.projects.length > 0
        ) {

            portfolio.projects.forEach(project => {

                const technologies =
                    project.technologies || [];


                const techHTML =
                    technologies.map(tech => {

                        return `
                            <span class="tech">
                                ${tech}
                            </span>
                        `;

                    }).join("");


                const projectHTML = `
                    <div class="col-md-6">

                        <div class="project-card">

                            <h4>
                                ${project.title || "Project"}
                            </h4>

                            <p>
                                ${project.description || ""}
                            </p>

                            <div>
                                ${techHTML}
                            </div>

                        </div>

                    </div>
                `;


                projectsContainer.innerHTML +=
                    projectHTML;

            });

        } else {

            projectsContainer.innerHTML =
                "<p>No projects added yet.</p>";

        }


        // ==========================================
        // EXPERIENCE
        // ==========================================

        const experienceContainer =
            document.getElementById("experience");

        experienceContainer.innerHTML = "";


        if (
            portfolio.experience &&
            portfolio.experience.length > 0
        ) {

            portfolio.experience.forEach(exp => {

                experienceContainer.innerHTML += `

                    <div class="info-card">

                        <h4>
                            ${exp.job_title ||
                            exp.position ||
                            "Experience"}
                        </h4>

                        <h6>
                            ${exp.company || ""}
                        </h6>

                        <p>
                            ${exp.description || ""}
                        </p>

                    </div>

                `;

            });

        } else {

            experienceContainer.innerHTML =
                "<p>No experience added yet.</p>";

        }


        // ==========================================
        // EDUCATION
        // ==========================================

        const educationContainer =
            document.getElementById("education");

        educationContainer.innerHTML = "";


        if (
            portfolio.education &&
            portfolio.education.length > 0
        ) {

            portfolio.education.forEach(edu => {

                educationContainer.innerHTML += `

                    <div class="info-card">

                        <h4>
                            ${edu.degree ||
                            "Education"}
                        </h4>

                        <h6>
                            ${edu.institution || ""}
                        </h6>

                        <p>
                            ${edu.description || ""}
                        </p>

                    </div>

                `;

            });

        } else {

            educationContainer.innerHTML =
                "<p>No education added yet.</p>";

        }


        // ==========================================
        // CERTIFICATES
        // ==========================================

        const certificatesContainer =
            document.getElementById("certificates");

        certificatesContainer.innerHTML = "";


        if (
            portfolio.certificates &&
            portfolio.certificates.length > 0
        ) {

            portfolio.certificates.forEach(cert => {

                const imageHTML =
                    cert.certificate_image
                        ? `
                            <img
                                src="${API_URL}${cert.certificate_image}"
                                alt="Certificate"
                            >
                          `
                        : "";


                certificatesContainer.innerHTML += `

                    <div class="col-md-6">

                        <div class="certificate-card">

                            ${imageHTML}

                            <h4>
                                ${cert.certificate_name || ""}
                            </h4>

                            <p>
                                ${cert.issuing_organization || ""}
                            </p>

                            <p>
                                ${cert.description || ""}
                            </p>

                        </div>

                    </div>

                `;

            });

        } else {

            certificatesContainer.innerHTML =
                "<p>No certificates added yet.</p>";

        }


        // ==========================================
        // ACHIEVEMENTS
        // ==========================================

        const achievementsContainer =
            document.getElementById("achievements");

        achievementsContainer.innerHTML = "";


        if (
            portfolio.achievements &&
            portfolio.achievements.length > 0
        ) {

            portfolio.achievements.forEach(
                achievement => {

                    achievementsContainer.innerHTML += `

                        <div class="info-card">

                            <h4>
                                ${achievement.title ||
                                achievement.achievement_name ||
                                "Achievement"}
                            </h4>

                            <p>
                                ${achievement.description || ""}
                            </p>

                        </div>

                    `;

                }
            );

        } else {

            achievementsContainer.innerHTML =
                "<p>No achievements added yet.</p>";

        }

    } catch (error) {

        console.error(
            "Portfolio loading error:",
            error
        );

        alert(
            "Unable to connect to the backend."
        );

    }

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem("token");

    window.location.href = "login.html";

}


// ==========================================
// LOAD WHEN PAGE OPENS
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    loadPortfolio
);