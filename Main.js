// ======================================================
// GLOBALS
// ======================================================

let materialsList = [];
let inkCodesList = [];

let jobsDB = {
  jobs: [],
  templates: []
};

let currentJob = null;
let currentJobId = null;

// NEW: Track which template is currently loaded
let currentTemplateId = null;

const FALLBACK_WIDTH = 665;

// ======================================================
// LOAD MATERIALS + INK CODES + STORED JOBS
// ======================================================

window.addEventListener("DOMContentLoaded", () => {
  fetch("materials.json")
    .then(r => r.json())
    .then(data => {
      materialsList = data;
      populateMaterialDropdowns();
    });

  fetch("inkcodes.json")
    .then(r => r.json())
    .then(data => {
      inkCodesList = data;
    });

  loadJobsDB();
  populateTemplateDropdown();
});

// ======================================================
// JOBS DB LOAD/SAVE
// ======================================================

function loadJobsDB() {
  const stored = localStorage.getItem("jobsDB");
  if (!stored) return;
  jobsDB = JSON.parse(stored);
}

function saveJobsDB() {
  localStorage.setItem("jobsDB", JSON.stringify(jobsDB));
}

// ======================================================
// TEMPLATE DROPDOWN
// ======================================================

function populateTemplateDropdown() {
  const dropdown = document.getElementById("templateDropdown");
  dropdown.innerHTML = '<option value="">-- Select Template --</option>';

  const templates = [...jobsDB.templates].sort((a, b) => {
    const an = a.jobName || a.name || "";
    const bn = b.jobName || b.name || "";
    return an.localeCompare(bn);
  });

  templates.forEach(tpl => {
    const opt = document.createElement("option");
    opt.value = tpl.id;
    opt.textContent = tpl.jobName || tpl.name || "Template";
    dropdown.appendChild(opt);
  });
}

document.getElementById("loadTemplateBtn").addEventListener("click", () => {
  const tplId = document.getElementById("templateDropdown").value;
  if (!tplId) return alert("Select a template first.");

  const tpl = jobsDB.templates.find(t => t.id === tplId);
  if (!tpl) return alert("Template not found.");

  // NEW: Track which template is loaded
  currentTemplateId = tpl.id;

  const job = JSON.parse(JSON.stringify(tpl));
  job.id = "job-" + Date.now();
  job.templateId = tpl.id;

  currentJob = job;
  currentJobId = job.id;

  loadJobIntoUI(job);
});

// ======================================================
// POPULATE MATERIAL DROPDOWNS
// ======================================================

function populateMaterialDropdowns() {
  const primarySel = document.getElementById("primaryMaterialSelect");
  const secondarySel = document.getElementById("secondaryMaterialSelect");

  primarySel.innerHTML = "";
  secondarySel.innerHTML = "";

  materialsList.forEach(mat => {
    const label = `${mat.material} ${mat.micron}µ ${mat.widths.join(",")}mm`;

    const opt1 = document.createElement("option");
    opt1.value = mat.id;
    opt1.textContent = label;
    primarySel.appendChild(opt1);

    const opt2 = document.createElement("option");
    opt2.value = mat.id;
    opt2.textContent = label;
    secondarySel.appendChild(opt2);
  });

  primarySel.addEventListener("change", () => fillMaterialFields("primary"));
  secondarySel.addEventListener("change", () => fillMaterialFields("secondary"));
}

// ======================================================
// FILL MATERIAL FIELDS
// ======================================================

function fillMaterialFields(which) {
  const sel = document.getElementById(which === "primary" ? "primaryMaterialSelect" : "secondaryMaterialSelect");
  const micronField = document.getElementById(which === "primary" ? "primaryMicron" : "secondaryMicron");
  const widthSel = document.getElementById(which === "primary" ? "primaryWidthSelect" : "secondaryWidthSelect");
  const mPerKgField = document.getElementById(which === "primary" ? "primaryMPerKg" : "secondaryMPerKg");

  const mat = materialsList.find(m => m.id === sel.value);
  if (!mat) return;

  micronField.value = mat.micron;
  mPerKgField.value = mat.mPerKg;

  widthSel.innerHTML = "";
  mat.widths.forEach(w => {
    const opt = document.createElement("option");
    opt.value = w;
    opt.textContent = w;
    widthSel.appendChild(opt);
  });
}

// ======================================================
// SURFACE vs LAMINATE PRINT TYPE
// ======================================================

const secondarySection = document.getElementById("secondaryMaterialSection");

document.getElementById("printTypeSelect").addEventListener("change", (e) => {
  const type = e.target.value;

  if (type === "SURFACE") {
    secondarySection.style.display = "none";

    document.querySelectorAll(".unitWeb").forEach(sel => {
      sel.value = "primary";
      sel.querySelector("option[value='secondary']").disabled = true;
    });

  } else {
    secondarySection.style.display = "block";

    document.querySelectorAll(".unitWeb").forEach(sel => {
      sel.querySelector("option[value='secondary']").disabled = false;
    });
  }
});

// ======================================================
// LOAD JOB INTO UI
// ======================================================

function loadJobIntoUI(job) {
  currentJob = job;
  currentJobId = job.id;

  renderJobInfo(job);
  enterEditMode(job);
}

// ======================================================
// RENDER JOB INFO (SAFE DEFAULTS)
// ======================================================

function renderJobInfo(job) {
  const m = job.materials || { primary: {}, secondary: null };
  const p = job.press || { typicalSpeed: 0, unitCount: job.units?.length || 0 };

  document.getElementById("jobInfo").innerHTML = `
    <strong>Customer:</strong> ${job.customer || ""}<br>
    <strong>Job Name:</strong> ${job.jobName || ""}<br>
    <strong>Product Code:</strong> ${job.productCode || ""}
  `;

  document.getElementById("materialsInfo").innerHTML = `
    <strong>Primary:</strong> ${m.primary.material || "?"}, ${m.primary.micron || 0}µm, ${m.primary.mPerKg || 0} m/kg<br>
    <strong>Secondary:</strong> ${m.secondary ? `${m.secondary.material}, ${m.secondary.micron}µm, ${m.secondary.mPerKg} m/kg` : "None (Surface Print)"}
  `;

  document.getElementById("pressInfo").innerHTML = `
    <strong>Typical speed:</strong> ${p.typicalSpeed} m/min<br>
    <strong>Units:</strong> ${p.unitCount}
  `;

  let html = `<table><tr><th>Unit</th><th>Ink</th><th>Cylinder</th><th>Ink Code</th><th>Web</th></tr>`;
  (job.units || []).forEach(u => {
    html += `<tr>
      <td>${u.number || ""}</td>
      <td>${u.inkName || ""}</td>
      <td>${u.cylinder || ""}</td>
      <td>${u.inkCode || ""}</td>
      <td>${u.web || ""}</td>
    </tr>`;
  });
  html += `</table>`;
  document.getElementById("cylindersTable").innerHTML = html;
}
// ======================================================
// ENTER EDIT MODE
// ======================================================

function enterEditMode(job) {
  document.getElementById("newProductCode").value = job.productCode || "";
  document.getElementById("newCustomer").value = job.customer || "";
  document.getElementById("newJobName").value = job.jobName || "";

  document.getElementById("printTypeSelect").value = job.printType || "SURFACE";

  if (job.materials?.primary?.id) {
    document.getElementById("primaryMaterialSelect").value = job.materials.primary.id;
    fillMaterialFields("primary");
    document.getElementById("primaryWidthSelect").value = job.materials.primary.width || FALLBACK_WIDTH;
  }

  if (job.printType === "LAMINATE" && job.materials.secondary) {
    secondarySection.style.display = "block";
    document.getElementById("secondaryMaterialSelect").value = job.materials.secondary.id;
    fillMaterialFields("secondary");
    document.getElementById("secondaryWidthSelect").value = job.materials.secondary.width || FALLBACK_WIDTH;
  } else {
    secondarySection.style.display = "none";
  }

  renderUnitsEditor(job.units || []);

  document.getElementById("saveNewJobBtn").textContent = "Save Edited Job";
  document.getElementById("exportNewJobBtn").textContent = "Export Edited Job";
}

// ======================================================
// RENDER UNITS EDITOR
// ======================================================

function renderUnitsEditor(units) {
  const list = document.getElementById("unitsList");
  list.innerHTML = "";

  units.forEach(u => {
    const div = document.createElement("div");
    div.className = "unitBox";

    div.innerHTML = `
      <label>Unit Number</label>
      <input type="number" class="unitNumber" value="${u.number || ""}">

      <label>Ink Code</label>
      <select class="unitInkCode"></select>

      <label>Ink (auto-filled)</label>
      <input type="text" class="unitInk" value="${u.inkName || ""}" readonly>

      <label>Cylinder Code</label>
      <input type="text" class="unitCylinder" value="${u.cylinder || ""}">

      <label>Factor</label>
      <input type="number" step="0.01" class="unitFactor" value="${u.factor || 0}">

      <label>Web</label>
      <select class="unitWeb">
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
      </select>

      <div class="btnRow">
        <button class="smallBtn unitDeleteBtn">Delete</button>
      </div>
    `;

    populateInkDropdown(div.querySelector(".unitInkCode"), div.querySelector(".unitInk"));
    div.querySelector(".unitInkCode").value = u.inkCode || "";
    div.querySelector(".unitWeb").value = u.web || "primary";

    div.querySelector(".unitDeleteBtn").addEventListener("click", () => {
      div.remove();
    });

    list.appendChild(div);
  });
}

// ======================================================
// ADD UNIT UI
// ======================================================

document.getElementById("addUnitBtn").addEventListener("click", () => {
  const div = document.createElement("div");
  div.className = "unitBox";

  div.innerHTML = `
    <label>Unit Number</label>
    <input type="number" class="unitNumber">

    <label>Ink Code</label>
    <select class="unitInkCode"></select>

    <label>Ink (auto-filled)</label>
    <input type="text" class="unitInk" readonly>

    <label>Cylinder Code</label>
    <input type="text" class="unitCylinder">

    <label>Factor</label>
    <input type="number" step="0.01" class="unitFactor">

    <label>Web</label>
    <select class="unitWeb">
      <option value="primary">Primary</option>
      <option value="secondary">Secondary</option>
    </select>

    <div class="btnRow">
      <button class="smallBtn unitClearBtn">Clear</button>
      <button class="smallBtn unitDeleteBtn">Delete</button>
    </div>
  `;

  populateInkDropdown(div.querySelector(".unitInkCode"), div.querySelector(".unitInk"));

  div.querySelector(".unitClearBtn").addEventListener("click", () => {
    div.querySelector(".unitNumber").value = "";
    div.querySelector(".unitInkCode").value = "";
    div.querySelector(".unitInk").value = "";
    div.querySelector(".unitCylinder").value = "";
    div.querySelector(".unitFactor").value = "";
    div.querySelector(".unitWeb").value = "primary";
  });

  div.querySelector(".unitDeleteBtn").addEventListener("click", () => {
    div.remove();
  });

  document.getElementById("unitsList").appendChild(div);

  if (document.getElementById("printTypeSelect").value === "SURFACE") {
    div.querySelector(".unitWeb").querySelector("option[value='secondary']").disabled = true;
  }
});

// ======================================================
// POPULATE INK DROPDOWN
// ======================================================

function populateInkDropdown(selectEl, inkField) {
  selectEl.innerHTML = "";

  inkCodesList.forEach(ink => {
    const opt = document.createElement("option");
    opt.value = ink.code;
    opt.textContent = `${ink.name} (${ink.code})`;
    selectEl.appendChild(opt);
  });

  selectEl.onchange = () => {
    const code = selectEl.value;
    const inkObj = inkCodesList.find(i => i.code === code);
    inkField.value = inkObj ? inkObj.name : "";
  };
}

// ======================================================
// BUILD JOB FROM UI (WITH VALIDATION + SAFE DEFAULTS)
// ======================================================

function buildJobFromUI() {
  const productCode = document.getElementById("newProductCode").value.trim();
  const customer = document.getElementById("newCustomer").value.trim();
  const jobName = document.getElementById("newJobName").value.trim();
  const printType = document.getElementById("printTypeSelect").value;

  const primaryMatId = document.getElementById("primaryMaterialSelect").value;
  const secondaryMatId = document.getElementById("secondaryMaterialSelect").value;

  const primaryMat = materialsList.find(m => m.id === primaryMatId);
  const secondaryMat = materialsList.find(m => m.id === secondaryMatId);

  const primaryWidth = parseInt(document.getElementById("primaryWidthSelect").value) || FALLBACK_WIDTH;
  const secondaryWidth = parseInt(document.getElementById("secondaryWidthSelect").value) || FALLBACK_WIDTH;

  const unitDivs = document.querySelectorAll("#unitsList .unitBox");
  const units = [];

  unitDivs.forEach(div => {
    const number = parseInt(div.querySelector(".unitNumber").value);
    const inkCode = div.querySelector(".unitInkCode").value;
    const inkName = div.querySelector(".unitInk").value;
    const cylinder = div.querySelector(".unitCylinder").value;
    const factor = parseFloat(div.querySelector(".unitFactor").value);
    const web = div.querySelector(".unitWeb").value;

    units.push({ number, inkCode, inkName, cylinder, factor, web });
  });

  // ======================================================
  // VALIDATION (SOFT STOP ALERT)
  // ======================================================

  const missing =
    !productCode ||
    !customer ||
    !jobName ||
    !primaryMat ||
    !primaryWidth ||
    units.length === 0 ||
    units.some(u =>
      !u.number ||
      !u.inkCode ||
      !u.inkName ||
      !u.cylinder ||
      isNaN(u.factor)
    ) ||
    (printType === "LAMINATE" && !secondaryMat);

  if (missing) {
    alert("Job is incomplete — please fill missing fields before saving.");
    return null;
  }

  // ======================================================
  // BUILD JOB OBJECT
  // ======================================================

  return {
    id: currentJobId || ("job-" + Date.now()),
    templateId: currentTemplateId || null,

    productCode,
    customer,
    jobName,
    printType,

    materials: {
      primary: {
        id: primaryMat.id,
        material: primaryMat.material,
        micron: primaryMat.micron,
        width: primaryWidth,
        mPerKg: primaryMat.mPerKg
      },
      secondary: (printType === "SURFACE")
        ? null
        : {
            id: secondaryMat.id,
            material: secondaryMat.material,
            micron: secondaryMat.micron,
            width: secondaryWidth,
            mPerKg: secondaryMat.mPerKg
          }
    },

    press: {
      typicalSpeed: currentJob?.press?.typicalSpeed || 0,
      unitCount: units.length
    },

    units
  };
}
// ======================================================
// SAVE NEW JOB OR SAVE EDITED JOB
// ======================================================

document.getElementById("saveNewJobBtn").addEventListener("click", () => {
  const job = buildJobFromUI();
  if (!job) return; // validation failed

  const idx = jobsDB.jobs.findIndex(j => j.id === job.id);

  if (idx === -1) {
    jobsDB.jobs.push(job);
    alert("New job saved.");
  } else {
    jobsDB.jobs[idx] = job;
    alert("Job updated.");
  }

  currentJob = job;
  currentJobId = job.id;

  saveJobsDB();
});

// ======================================================
// SAVE AS TEMPLATE (CORRECT OVERWRITE LOGIC)
// ======================================================

function saveAsTemplate() {
  const job = buildJobFromUI();
  if (!job) return; // validation failed

  currentJob = job;
  currentJobId = job.id;

  let tplIndex = -1;

  // If a template is currently loaded, overwrite it
  if (currentTemplateId) {
    tplIndex = jobsDB.templates.findIndex(t => t.id === currentTemplateId);
  }

  // If no template loaded, try matching by jobName
  if (tplIndex === -1) {
    tplIndex = jobsDB.templates.findIndex(t =>
      (t.name && t.name === job.jobName) ||
      (t.jobName && t.jobName === job.jobName)
    );
  }

  const tpl = JSON.parse(JSON.stringify(job));
  tpl.id = currentTemplateId || ("tpl-" + Date.now());
  tpl.name = tpl.jobName;
  tpl.templateId = null;

  if (tplIndex !== -1) {
    jobsDB.templates[tplIndex] = tpl;
    alert("Template updated.");
  } else {
    jobsDB.templates.push(tpl);
    alert("Template saved.");
  }

  // Update global tracker
  currentTemplateId = tpl.id;

  saveJobsDB();
  populateTemplateDropdown();
}

// Add Save As Template button
const tplBtn = document.createElement("button");
tplBtn.textContent = "Save as Template";
tplBtn.className = "smallBtn";
tplBtn.style.marginLeft = "10px";
tplBtn.addEventListener("click", saveAsTemplate);
document.getElementById("jobActions").appendChild(tplBtn);

// ======================================================
// CREATE JOB FROM TEMPLATE
// ======================================================

document.getElementById("createFromTemplateBtn").addEventListener("click", () => {
  const tplId = document.getElementById("templateSelect").value;
  if (!tplId) return alert("Select a template first.");

  createJobFromTemplate(tplId);
});

function createJobFromTemplate(templateId) {
  const tpl = jobsDB.templates.find(t => t.id === templateId);
  if (!tpl) {
    alert("Template not found.");
    return;
  }

  const job = JSON.parse(JSON.stringify(tpl));
  job.id = "job-" + Date.now();
  job.productCode = "";
  job.customer = "";
  job.jobName = tpl.name + " (new job)";
  job.templateId = tpl.id;

  jobsDB.jobs.push(job);
  saveJobsDB();

  // IMPORTANT: Do NOT set currentTemplateId here
  // This is a new job created FROM a template, not editing the template itself.

  loadJobIntoUI(job);
}

// ======================================================
// EXPORT CURRENT JOB
// ======================================================

function exportCurrentJob() {
  if (!currentJob) {
    alert("Load or create a job first before exporting.");
    return;
  }

  const blob = new Blob([JSON.stringify(currentJob, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentJob.productCode || "job"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("exportNewJobBtn").addEventListener("click", exportCurrentJob);

// ======================================================
// IMPORT JOB (SAFE DEFAULTS + LOAD BUT BLOCK SAVE)
// ======================================================

document.getElementById("importJobSpecsInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);

      parsed.id = parsed.id || ("job-" + Date.now());
      parsed.templateId = parsed.templateId || null;

      parsed.units = parsed.units || [];

      if (!parsed.materials) {
        parsed.materials = {
          primary: null,
          secondary: null
        };
      }

      alert("Job imported — please review fields before saving.");

      // Reset template tracking when importing
      currentTemplateId = null;

      loadJobIntoUI(parsed);

    } catch (err) {
      alert("Invalid JSON file.");
    }
  };

  reader.readAsText(file);
});

// ======================================================
// CALCULATE INK USAGE
// ======================================================

function calculateInk() {
  if (!currentJob) {
    alert("Load a job first.");
    return;
  }

  const kilos = parseFloat(document.getElementById("wrapKgInput").value);
  if (isNaN(kilos) || kilos <= 0) {
    alert("Enter kilos of wrap ordered.");
    return;
  }

  const addMargin = document.getElementById("safetyMarginCheckbox").checked;
  const finalKilos = addMargin ? kilos * 1.10 : kilos;

  const primary = currentJob.materials?.primary;
  const secondary = currentJob.materials?.secondary;

  if (!primary || !primary.mPerKg) {
    alert("Primary material missing or invalid — cannot calculate ink.");
    return;
  }

  const results = [];

  (currentJob.units || []).forEach(unit => {
    const factor = parseFloat(unit.factor);
    if (isNaN(factor)) return;

    let mPerKg = 0;

    if (unit.web === "primary") {
      mPerKg = primary.mPerKg || 0;
    } else {
      if (!secondary || !secondary.mPerKg) return;
      mPerKg = secondary.mPerKg || 0;
    }

    if (!mPerKg || mPerKg <= 0) return;

    const meters = finalKilos * mPerKg;
    const inkKg = meters * factor;

    results.push({
      unit: unit.number,
      inkName: unit.inkName,
      inkCode: unit.inkCode,
      web: unit.web,
      meters,
      inkKg
    });
  });

  renderInkResults(results, finalKilos);
}

// ======================================================
// RENDER INK RESULTS
// ======================================================

function renderInkResults(results, finalKilos) {
  const tableDiv = document.getElementById("inkTable");
  const totalsDiv = document.getElementById("totalsInfo");

  if (!results.length) {
    tableDiv.innerHTML = "<p>No ink usage calculated.</p>";
    totalsDiv.innerHTML = "";
    return;
  }

  let html = `
    <table>
      <tr>
        <th>Unit</th>
        <th>Ink</th>
        <th>Code</th>
        <th>Web</th>
        <th>Meters</th>
        <th>Ink (kg)</th>
      </tr>
  `;

  let totalInk = 0;

  results.forEach(r => {
    totalInk += r.inkKg;

    html += `
      <tr>
        <td>${r.unit}</td>
        <td>${r.inkName}</td>
        <td>${r.inkCode}</td>
        <td>${r.web}</td>
        <td>${r.meters.toFixed(0)}</td>
        <td>${r.inkKg.toFixed(3)}</td>
      </tr>
    `;
  });

  html += `</table>`;
  tableDiv.innerHTML = html;

  totalsDiv.innerHTML = `
    <strong>Kilos used (with margin):</strong> ${finalKilos.toFixed(2)} kg<br>
    <strong>Total Ink:</strong> ${totalInk.toFixed(3)} kg
  `;
}

// ======================================================
// FINAL BUTTON LISTENER
// ======================================================

document.getElementById("calcInkBtn").addEventListener("click", calculateInk);
