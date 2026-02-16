// Hi guys!!!! I'm Rudra, Thanks for Reading this
// Please note that i have taken the help of AI to Structure and make this code more readable. That being said the idea and the code is all mine.

// Tabs to switch between percentage and classification

const tabPercent = document.getElementById("tabPercent");
const tabClass = document.getElementById("tabClass");
const panelPercent = document.getElementById("panelPercent");
const panelClass = document.getElementById("panelClass");

tabPercent.addEventListener("click", () => setMode("percent"));
tabClass.addEventListener("click", () => setMode("class"));

let mode = "percent";
function setMode(next) 
    {
        mode = next;

        if (mode === "percent") 
            {
                tabPercent.classList.add("active");
                tabPercent.setAttribute("aria-selected", "true");
                tabClass.classList.remove("active");
                tabClass.setAttribute("aria-selected", "false");
                panelPercent.classList.remove("hidden");
                panelClass.classList.add("hidden");
            } 
            
        else 
            {
                tabClass.classList.add("active");
                tabClass.setAttribute("aria-selected", "true");
                tabPercent.classList.remove("active");
                tabPercent.setAttribute("aria-selected", "false");
                panelClass.classList.remove("hidden");
                panelPercent.classList.add("hidden");
            }
    }

document.getElementById("btn").addEventListener("click", analyse);
document.getElementById("copyBtn").addEventListener("click", copyResult);
document.getElementById("shareBtn").addEventListener("click", sharePage);

function analyse() 
    {
        const tier = document.getElementById("tier").value;
        const result = document.getElementById("result");

        const ukPercent = getUkPercentFromUI();
        if (ukPercent === null) 
            {
                result.innerHTML = "Please enter a valid UK percentage (0–100) or select a UK classification.";
                return;
            }

        const gpa = ukToUsGpa(ukPercent);

        // checkboxes
        const factors = getSelectedFactors(); // array 
        const scoreObj = computeCompetitivenessScore({ gpa, tier, factors });
        const score = scoreObj.score;
        const tierLabel = scoreObj.tierLabel;

        const verdict = scoreToVerdict(score, tierLabel);
        const nextSteps = buildNextSteps({ tierLabel, score, factors, gpa });

        // Render
        result.innerHTML = `
            <h3>Results</h3>
            <p><strong>Estimated US GPA:</strong> ${gpa.toFixed(1)}</p>
            <p><strong>Competitiveness Score:</strong> ${score}%</p>
            <p><strong>Interpretation:</strong> ${verdict}</p>

            <hr style="border:none;border-top:1px solid #e6e9ef;margin:12px 0;">

            <h3>Next steps (recommended)</h3>
            <ul>
            ${nextSteps.map(s => `<li>${escapeHtml(s)}</li>`).join("")}
            </ul>

            <p style="color:#555;margin-top:10px;">
            Note: This score is an estimate for guidance, not an official acceptance probability. Universities evaluate applicants holistically.
            </p>
        `;

        const plainText = 
            [
                `Estimated US GPA: ${gpa.toFixed(1)}`,
                `Competitiveness Score: ${score}% (${tierLabel})`,
                `Interpretation: ${verdict}`,
                ``,
                `Next steps:`,
                ...nextSteps.map(s => `- ${s}`),
                ``,
                `Note: Guidance only; not an official acceptance probability.`
            ].join("\n");

        result.dataset.plain = plainText;
    }

function getUkPercentFromUI() 
    {
        if (mode === "percent") 
            {
                const ukGradeRaw = document.getElementById("ukGrade").value;
                if (ukGradeRaw === "") return null;

                const n = parseFloat(ukGradeRaw);
                if (Number.isNaN(n) || n < 0 || n > 100) return null;
                return n;
            }

        // classification mode
        const ukClass = document.getElementById("ukClass").value;
        if (!ukClass) return null;

        // midpoint estimates
        if (ukClass === "first") return 75;
        if (ukClass === "twoone") return 65;
        if (ukClass === "twotwo") return 55;
        if (ukClass === "third") return 45;

        return null;
    }

function getSelectedFactors() 
    {
    const checked = Array.from(document.querySelectorAll(".checks input[type='checkbox']:checked"));
    return checked.map(cb => cb.value);
    }

// function ukToUsGpa(uk) 
//    {
    // Simple MVP mapping
//    if (uk >= 70) return 4.0;
//    if (uk >= 67) return 3.7;
//    if (uk >= 63) return 3.5;
//    if (uk >= 60) return 3.3;
//    if (uk >= 57) return 3.0;
//    if (uk >= 53) return 2.7;
//    if (uk >= 50) return 2.3;
//    if (uk >= 40) return 2.0;
//    return 1.7;
//    }

function ukToUsGpa(uk) 
    {
        // Dynamic, banded interpolation (more realistic than hard cutoffs)

        const u = Number(uk);
        if (Number.isNaN(u)) return 0;

        if (u < 40) return 1.7;
        if (u >= 100) return 4.0;

        // helper: linear interpolation
        const lerp = (x, x0, x1, y0, y1) => y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);

        if (u <= 49) return lerp(u, 40, 49, 2.0, 2.3);
        if (u <= 59) return lerp(u, 50, 59, 2.3, 3.0);
        if (u <= 69) return lerp(u, 60, 69, 3.0, 3.7);
        return lerp(u, 70, 100, 3.7, 4.0);
        }
function computeCompetitivenessScore({ gpa, tier, factors }) 
    {
        let threshold;
        let tierLabel;

        if (tier === "10") 
            { 
                threshold = 3.7; tierLabel = "Top 10"; 
            }
        else if (tier === "25") 
            {
                 threshold = 3.5; tierLabel = "Top 25"; 
            }
        else 
            {
                 threshold = 3.3; tierLabel = "Top 50"; 
            }

        // GPA component: score around threshold
        let base = 60 + (gpa - threshold) * 35; // each +0.1 GPA ~ +3.5 points
        base = clamp(base, 20, 85);

        // Factor weights
        const weights = 
            {
                projects: 8,
                internship: 10,
                research: 12,
                publication: 12,
                leadership: 5,
                awards: 5,
                sop: 6,
                lor: 6,
                gre: 5
            };

        let bonus = 0;
        for (const f of factors) bonus += (weights[f] || 0);

        // i made this so that ticking everything doesn’t explode to 200)
        bonus = Math.min(bonus, 35);

        // Final score
        const score = clamp(Math.round(base + bonus), 0, 100);
        return { score, tierLabel };
    }

function scoreToVerdict(score, tierLabel) 
    {
        if (score >= 80) return `Strongly competitive for ${tierLabel} MS CS (based on typical expectations).`;
        if (score >= 65) return `Competitive for ${tierLabel} MS CS, but strengthen weak areas to be safer.`;
        if (score >= 50) return `Borderline for ${tierLabel}. You’ll likely need stronger projects/internships/research and a sharp SOP.`;
        return `Currently below typical ${tierLabel} competitiveness. Focus on core profile upgrades before applying widely.`;
    }

function buildNextSteps({ tierLabel, score, factors, gpa }) 
    {
        const steps = [];

        // For everyone
        steps.push("Shortlist 8–12 programs across safe/target/reach, not only one tier.");
        steps.push("Make your SOP extremely specific: why this program, what you’ll build/research, and your long-term goal.");

        // If GPA lower-ish
        if (score < 65) 
            {
                steps.push("Strengthen your technical proof: 1–2 standout projects with clear impact, metrics, and clean GitHub.");
            }

        // Missing factor suggestions
        if (!factors.includes("projects")) 
            {
                steps.push("Add at least one strong portfolio project (systems, ML, distributed, or a polished full-stack build) with README + demo.");
            }

        if (!factors.includes("internship")) 
            {
                steps.push("Try to secure an internship or part-time role (even remote) or do a serious open-source contribution to show real-world impact.");
            }

        if (!factors.includes("research")) 
            {
                steps.push("If targeting Top 10/Top 25, reach out to professors for research assistant work or a small publishable project.");
            }

        if (!factors.includes("lor")) 
            {
                steps.push("Line up 2–3 recommenders who can comment on your CS ability (projects, rigour, leadership, research).");
            }

        if (!factors.includes("sop")) 
            {
                steps.push("Write a 1-page SOP draft and get it reviewed (focus on coherence, evidence, and fit with each school).");
            }

        // Tier-specific nudges
        if (tierLabel !== "Top 50") 
            {
                steps.push("For higher tiers, prioritize: research exposure, strong letters, and a clearly defined specialization (AI/Systems/Security/etc.).");
            }

        else 
            {
                steps.push("For Top 50, strong projects + internships + a focused SOP can carry a lot of weight.");
            }

        // GPA framing tip
        steps.push(`If your GPA is around ${gpa.toFixed(1)}, highlight strength in CS/math modules and an upward trend if applicable.`);

        // i added this to keep it readable
        return steps.slice(0, 8);
    }

function clamp(x, lo, hi) 
    {
        return Math.max(lo, Math.min(hi, x));
    }

function escapeHtml(str) 
    {
        return str.replace(/[&<>"']/g, (m) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[m]));
    }

async function copyResult() 
    {
        const result = document.getElementById("result");
        const text = result.dataset.plain;

        if (!text) 
            {
                alert("Run the analysis first, then copy.");
                return;
            }

        try 
            {
                await navigator.clipboard.writeText(text);
                alert("Copied!");
            } 
        
            catch (e) 
            {
                // fallback
                const ta = document.createElement("textarea");
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand("copy");
                document.body.removeChild(ta);
                alert("Copied!");
            }
    }

async function sharePage() 
        {
        const url = window.location.href;
        const title = document.title;

        if (navigator.share) 
            {
                try {
                await navigator.share({ title, url });
                return;
                } catch (e) {
                // if user cancelles;we fall through to copy
                }
            }

        try {
            await navigator.clipboard.writeText(url);
            alert("Link copied!");
        } catch (e) {
            prompt("Copy this link:", url);
        }
    }

