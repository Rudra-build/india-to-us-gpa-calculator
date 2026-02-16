// Hi this is Rudra's India → US GPA tool.
// Vanilla JS. Clear logic. Transparent scoring. No fake promises.

"use strict"; // Helps catch silent JS mistakes early.



// ===================== TABS =====================

const tabPercent = document.getElementById("tabPercent");
const tabCgpa = document.getElementById("tabCgpa");
const panelPercent = document.getElementById("panelPercent");
const panelCgpa = document.getElementById("panelCgpa");

let mode = "percent"; // Default input mode

tabPercent.addEventListener("click", () => setMode("percent"));
tabCgpa.addEventListener("click", () => setMode("cgpa"));

function setMode(next)
    {
        mode = next;

        const isPercent = mode === "percent";

        tabPercent.classList.toggle("active", isPercent);
        tabCgpa.classList.toggle("active", !isPercent);

        tabPercent.setAttribute("aria-selected", String(isPercent));
        tabCgpa.setAttribute("aria-selected", String(!isPercent));

        panelPercent.classList.toggle("hidden", !isPercent);
        panelCgpa.classList.toggle("hidden", isPercent);

        clearError();
    }



// ===================== ELEMENTS =====================

const btnGpa = document.getElementById("btnGpa");
const resetBtn = document.getElementById("resetBtn");
const btnReady = document.getElementById("btnReady");
const resetReadyBtn = document.getElementById("resetReadyBtn");

const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");

const errorBox = document.getElementById("error");
const gpaOut = document.getElementById("gpaOut");

const methodChip = document.getElementById("methodChip");
const strictChip = document.getElementById("strictChip");

const fieldSelect = document.getElementById("field");
const fieldExtrasInner = document.getElementById("fieldExtrasInner");

const signalText = document.getElementById("signalText");
const quickFixes = document.getElementById("quickFixes");
const bigMoves = document.getElementById("bigMoves");

btnGpa.addEventListener("click", calculateGpaOnly);
resetBtn.addEventListener("click", resetAll);

copyBtn.addEventListener("click", copyReport);
shareBtn.addEventListener("click", copyLink);

if (btnReady)
    {
        btnReady.addEventListener("click", analyseReadinessOnly);
    }

if (resetReadyBtn)
    {
        resetReadyBtn.addEventListener("click", resetReadinessOnly);
    }

if (fieldSelect)
    {
        fieldSelect.addEventListener("change", renderFieldExtras);
    }



// ===================== GPA LOGIC =====================


// Anchor bands for smoother percentage conversion.
// Avoids hard jumps at 60/70/80.
const PCT_POINTS =
    [
        { pct: 0, gpa: 0.0 },
        { pct: 35, gpa: 0.7 },
        { pct: 40, gpa: 1.0 },
        { pct: 50, gpa: 2.0 },
        { pct: 55, gpa: 2.6 },
        { pct: 60, gpa: 3.0 },
        { pct: 65, gpa: 3.3 },
        { pct: 70, gpa: 3.6 },
        { pct: 75, gpa: 3.8 },
        { pct: 80, gpa: 3.9 },
        { pct: 85, gpa: 4.0 },
        { pct: 100, gpa: 4.0 }
    ];



function clamp(n, min, max)
    {
        return Math.min(max, Math.max(min, n));
    }


function parseNumber(raw)
    {
        if (raw == null) return null;

        const s = String(raw).trim();
        if (!s) return null;

        const normalized = s.replace(",", ".");
        const n = Number(normalized);

        return Number.isFinite(n) ? n : null;
    }


function lerp(x, x0, x1, y0, y1)
    {
        return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
    }


function gpaFromPercentage(pct)
    {
        const x = clamp(pct, 0, 100);

        for (let i = 0; i < PCT_POINTS.length - 1; i++)
            {
                const a = PCT_POINTS[i];
                const b = PCT_POINTS[i + 1];

                if (x >= a.pct && x <= b.pct)
                    {
                        if (b.pct === a.pct) return a.gpa;
                        return lerp(x, a.pct, b.pct, a.gpa, b.gpa);
                    }
            }

        return 4.0;
    }


function gpaFromCgpa(cgpa)
    {
        const x = clamp(cgpa, 0, 10);

        let gpa = (x / 10) * 4;

        // Slight compression near 4.0 to avoid everything being perfect.
        if (gpa > 3.6)
            {
                const t = (gpa - 3.6) / 0.4;
                gpa = gpa * (1 - 0.05 * clamp(t, 0, 1));
            }

        return gpa;
    }



// ===================== FIELD CHECKLIST =====================

const FIELD_CHECKLISTS =
    {
        cs: ["GitHub portfolio", "Deployed project", "Strong DSA", "Core CS subjects", "Open source"],
        data: ["End-to-end ML project", "Strong statistics", "Clean notebooks", "SQL pipelines", "Model evaluation clarity"],
        ai: ["DL project", "Linear algebra depth", "Paper implementation", "Model training", "Experiment analysis"],
        engineering: ["Core strength", "Internships", "Technical builds", "Tool proficiency", "Problem solving"],
        cyber: ["CTF/security labs", "Networking basics", "Security audit", "Vulnerability knowledge", "Automation scripting"],
        business: ["Quant skills", "Leadership", "Impact metrics", "Internship value", "Clear goals"],
        mba: ["Leadership role", "Work responsibility", "Career growth", "Business metrics", "Professional references"],
        finance: ["Math strength", "Financial modelling", "Excel/Python/R", "Finance internship", "Market knowledge"],
        healthcare: ["Academic depth", "Clinical exposure", "Motivation clarity", "Research", "Strong references"],
        biotech: ["R/Python bio work", "Lab exposure", "Genomics project", "Statistics depth", "Research experience"],
        other: ["Clear focus", "Relevant experience", "Strong LORs", "Skill depth", "Defined direction"]
    };


function renderFieldExtras()
    {
        if (!fieldSelect || !fieldExtrasInner) return;

        fieldExtrasInner.innerHTML = "";

        const field = fieldSelect.value;
        const items = FIELD_CHECKLISTS[field] || FIELD_CHECKLISTS["other"];

        for (let i = 0; i < items.length; i++)
            {
                const row = document.createElement("div");
                row.className = "checkboxRow";

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.id = "extra_" + i;

                const label = document.createElement("label");
                label.setAttribute("for", "extra_" + i);
                label.textContent = items[i];

                row.appendChild(checkbox);
                row.appendChild(label);
                fieldExtrasInner.appendChild(row);
            }
    }



// ===================== BUTTON 1: GPA ONLY =====================

function calculateGpaOnly()
    {
        clearError();

        const percentRaw = document.getElementById("percentInput").value;
        const cgpaRaw = document.getElementById("cgpaInput").value;

        let baseGpa = null;

        if (mode === "percent")
            {
                const pct = parseNumber(percentRaw);

                if (pct === null || pct < 0 || pct > 100)
                    {
                        showError("Enter a valid percentage between 0 and 100.");
                        return;
                    }

                baseGpa = gpaFromPercentage(pct);
                methodChip.textContent = "Using Percentage";
            }
        else
            {
                const cgpa = parseNumber(cgpaRaw);

                if (cgpa === null || cgpa < 0 || cgpa > 10)
                    {
                        showError("Enter a valid CGPA between 0 and 10.");
                        return;
                    }

                baseGpa = gpaFromCgpa(cgpa);
                methodChip.textContent = "Using CGPA";
            }

        methodChip.hidden = false;
        strictChip.hidden = true;

        const finalGpa = clamp(baseGpa, 0, 4.0);
        gpaOut.textContent = finalGpa.toFixed(2);

        document.getElementById("Results").scrollIntoView(
            { behavior: "smooth", block: "start" }
        );
    }



// ===================== BUTTON 2: READINESS ONLY =====================

function analyseReadinessOnly()
    {
        clearError();

        const gpaText = gpaOut.textContent;

        if (!gpaText || gpaText === "—")
            {
                showError("Calculate your GPA first.");
                return;
            }

        const finalGpa = Number(gpaText);

        if (!Number.isFinite(finalGpa))
            {
                showError("Calculate your GPA first.");
                return;
            }

        const hasReadinessUi =
            document.getElementById("targetTier") &&
            fieldSelect &&
            signalText &&
            quickFixes &&
            bigMoves;

        if (!hasReadinessUi)
            {
                showError("Readiness section is missing from the page.");
                return;
            }


        if (fieldExtrasInner && fieldExtrasInner.childElementCount === 0)
            {
                renderFieldExtras();
            }

        generatePlan(finalGpa);

        document.getElementById("Results").scrollIntoView(
            { behavior: "smooth", block: "start" }
        );
    }



// ===================== READINESS ENGINE =====================

function generatePlan(gpa)
    {
        quickFixes.innerHTML = "";
        bigMoves.innerHTML = "";

        const tier = document.getElementById("targetTier").value;
        const field = fieldSelect.value;

        const projects = Number(document.getElementById("projects").value);
        const experience = Number(document.getElementById("experience").value);
        const research = Number(document.getElementById("research").value);
        const lors = Number(document.getElementById("lors").value);

        const checkedExtras = fieldExtrasInner.querySelectorAll("input:checked").length;

        // Field-aware weighting (kept honest + simple)
        let gpaWeight = 0.6;
        let projectWeight = 0.1;
        let experienceWeight = 0.1;
        let researchWeight = 0.1;
        let lorsWeight = 0.1;

        if (field === "cs" || field === "data" || field === "ai")
            {
                projectWeight = 0.2;
                researchWeight = 0.15;
                experienceWeight = 0.15;
            }

        if (field === "mba")
            {
                experienceWeight = 0.25;
                projectWeight = 0.05;
                researchWeight = 0.05;
            }

        if (field === "healthcare")
            {
                gpaWeight = 0.7;
                researchWeight = 0.15;
            }

        let score = 0;

        score += (gpa / 4) * 100 * gpaWeight;
        score += (projects / 2) * 100 * projectWeight;
        score += (experience / 2) * 100 * experienceWeight;
        score += (research / 2) * 100 * researchWeight;
        score += (lors / 2) * 100 * lorsWeight;

        score += clamp(checkedExtras * 2, 0, 8);
        score = clamp(score, 0, 100);

        let strongThreshold;
        let okThreshold;

        if (tier === "top")
            {
                strongThreshold = 85;
                okThreshold = 72;
            }
        else if (tier === "strong")
            {
                strongThreshold = 75;
                okThreshold = 62;
            }
        else
            {
                strongThreshold = 65;
                okThreshold = 52;
            }

        let band = "Needs Work";

        if (score >= strongThreshold)
            {
                band = "Strong";
            }
        else if (score >= okThreshold)
            {
                band = "Borderline";
            }

        signalText.textContent =
            "Readiness score: " +
            Math.round(score) +
            "/100 — " +
            band +
            " for " +
            tier +
            " tier.";

        // Practical improvements
        if (gpa < 3.3)
            {
                addItem(quickFixes, "Upgrade one serious project immediately.");
                addItem(bigMoves, "Add advanced coursework or certification.");
            }

        if (projects < 2)
            {
                addItem(quickFixes, "Improve project depth and measurable impact.");
            }

        if (experience === 0)
            {
                addItem(bigMoves, "Secure relevant internship or research role.");
            }

        if (research === 0 && tier === "top")
            {
                addItem(bigMoves, "Aim for publication or research collaboration.");
            }

        if (lors < 1)
            {
                addItem(quickFixes, "Strengthen recommendation letters strategically.");
            }

        if (quickFixes.children.length === 0)
            {
                addItem(quickFixes, "Polish SOP and tailor applications carefully.");
            }

        if (bigMoves.children.length === 0)
            {
                addItem(bigMoves, "Deepen expertise with one high-impact project.");
            }
    }



function addItem(list, text)
    {
        const li = document.createElement("li");
        li.textContent = text;
        list.appendChild(li);
    }



// ===================== UTIL =====================

function showError(msg)
    {
        errorBox.hidden = false;
        errorBox.textContent = msg;
    }

function clearError()
    {
        errorBox.hidden = true;
        errorBox.textContent = "";
    }

function resetAll()
    {
        clearError();

        document.getElementById("percentInput").value = "";
        document.getElementById("cgpaInput").value = "";

        gpaOut.textContent = "—";

        methodChip.hidden = true;
        strictChip.hidden = true;

        resetReadinessOnly();
    }

function resetReadinessOnly()
    {
        if (quickFixes) quickFixes.innerHTML = "";
        if (bigMoves) bigMoves.innerHTML = "";

        if (signalText) signalText.textContent = "Fill inputs and hit Analyse readiness.";

        if (fieldExtrasInner) fieldExtrasInner.innerHTML = "";
    }

async function copyReport()
    {
        if (!gpaOut.textContent || gpaOut.textContent === "—") return;

        const extraLine = signalText ? ("\n" + signalText.textContent) : "";

        const text =
            "Estimated US GPA: " +
            gpaOut.textContent +
            "/4.0" +
            extraLine +
            "\n\nGenerated via Rudra's GPA tool.";

        await navigator.clipboard.writeText(text);
    }

async function copyLink()
    {
        await navigator.clipboard.writeText(window.location.href);
    }



// First load: render checklist so it doesn't look empty.
if (fieldSelect && fieldExtrasInner)
    {
        renderFieldExtras();
    }