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
  populateTemplateDropdown();   // NEW
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
// TEMPLATE DROPDOWN (NEW)
// ======================================================

function populateTemplateDropdown() {
  const dropdown = document.getElementById("templateDropdown");
  dropdown.innerHTML = '<option value="">-- Select Template --</option>';

  jobsDB.templates.forEach((tpl, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = tpl.jobName || `Template ${index + 1}`;
    dropdown.appendChild(opt);
  });
}

document.getElementById("loadTemplateBtn").addEventListener("click", () => {
  const index = document.getElementById("templateDropdown").value;
  if (index === "") return alert("Select a template first.");

  const tpl = jobsDB.templates[index];
  if (!tpl) return alert("Template not found.");

  loadJobIntoUI(tpl);
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
// RENDER JOB INFO
// ======================================================

function renderJobInfo(job) {
  document.getElementById("jobInfo").innerHTML = `
    <strong>Customer:</strong> ${job.customer}<br>
    <strong>Job Name:</strong> ${job.jobName}<br>
    <strong>Product Code:</strong> ${job.productCode}
  `;

  const m = job.materials;
  document.getElementById("materialsInfo").innerHTML = `
    <strong>Primary:</strong> ${m.primary.material}, ${m.primary.micron}µm, ${m.primary.mPerKg} m/kg<br>
    <strong>Secondary:</strong> ${m.secondary ? `${m.secondary.material}, ${m.secondary.micron}µm, ${m.secondary.mPerKg} m/kg` : "None (Surface Print)"}
  `;

  document.getElementById("pressInfo").innerHTML = `
    <strong>Typical speed:</strong> ${job.press.typicalSpeed} m/min<br>
    <strong>Units:</strong> ${job.press.unitCount}
  `;

  let html = `<table><tr><th>Unit</th><th>Ink</th><th>Cylinder</th><th>Ink Code</th><th>Web</th></tr>`;
  job.units.forEach(u => {
    html += `<tr>
      <td>${u.number}</td>
      <td>${u.inkName}</td>
      <td>${u.cylinder}</td>
      <td>${u.inkCode}</td>
      <td>${u.web}</td>
    </tr>`;
  });
  html += `</table>`;
  document.getElementById("cylindersTable").innerHTML = html;
}
// ======================================================
// ENTER EDIT MODE
// ======================================================

function enterEditMode(job) {
  document.getElementById("newProductCode").value = job.productCode;
  document.getElementById("newCustomer").value = job.customer;
  document.getElementById("newJobName").value = job.jobName;

  document.getElementById("printTypeSelect").value = job.printType;

  document.getElementById("primaryMaterialSelect").value = job.materials.primary.id;
  fillMaterialFields("primary");
  document.getElementById("primaryWidthSelect").value = job.materials.primary.width;

  if (job.printType === "LAMINATE" && job.materials.secondary) {
    secondarySection.style.display = "block";
    document.getElementById("secondaryMaterialSelect").value = job.materials.secondary.id;
    fillMaterialFields("secondary");
    document.getElementById("secondaryWidthSelect").value = job.materials.secondary.width;
  } else {
    secondarySection.style.display = "none";
  }

  renderUnitsEditor(job.units);

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
      <input type="number" class="unitNumber" value="${u.number}">

      <label>Ink Code</label>
      <select class="unitInkCode"></select>

      <label>Ink (auto-filled)</label>
      <input type="text" class="unitInk" value="${u.inkName}" readonly>

      <label>Cylinder Code</label>
      <input type="text" class="unitCylinder" value="${u.cylinder}">

      <label>Factor</label>
      <input type="number" step="0.01" class="unitFactor" value="${u.factor}">

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
    div.querySelector(".unitInkCode").value = u.inkCode;
    div.querySelector(".unitWeb").value = u.web;

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
// BUILD JOB FROM UI
// ======================================================

function buildJobFromUI() {
  const productCode = document.getElementById("newProductCode").value.trim();
  const customer = document.getElementById("newCustomer").value.trim();
  const jobName = document.getElementById("newJobName").value.trim();
  const printType = document.getElementById("printTypeSelect").value;

  const primaryMat = materialsList.find(m => m.id === document.getElementById("primaryMaterialSelect").value);
  const secondaryMat = materialsList.find(m => m.id === document.getElementById("secondaryMaterialSelect").value);

  const primaryWidth = parseInt(document.getElementById("primaryWidthSelect").value);
  const secondaryWidth = parseInt(document.getElementById("secondaryWidthSelect").value);

  const unitDivs = document.querySelectorAll("#unitsList .unitBox");
  const units = [];

  unitDivs.forEach(div => {
    const number = parseInt(div.querySelector(".unitNumber").value);
    const inkCode = div.querySelector(".unitInkCode").value;
    const inkName = div.querySelector(".unitInk").value;
    const cylinder = div.querySelector(".unitCylinder").value;
    const factor = parseFloat(div.querySelector(".unitFactor").value);
    const web = div.querySelector(".unitWeb").value;

    if (!isNaN(number) && inkCode && inkName && cylinder && !isNaN(factor)) {
      units.push({ number, inkCode, inkName, cylinder, factor, web });
    }
  });

  return {
    id: currentJobId || ("job-" + Date.now()),
    templateId: currentJob ? currentJob.templateId : null,

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
      typicalSpeed: currentJob ? currentJob.press.typicalSpeed : 0,
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
// SAVE AS TEMPLATE
// ======================================================

function saveAsTemplate() {
  if (!currentJob) {
    alert("Load or create a job first.");
    return;
  }

  const tpl = JSON.parse(JSON.stringify(currentJob));
  tpl.id = "tpl-" + Date.now();
  tpl.name = tpl.jobName;

  jobsDB.templates.push(tpl);
  saveJobsDB();

  populateTemplateDropdown(); // refresh dropdown
  alert("Template saved.");
}

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
// IMPORT JOB
// ======================================================

document.getElementById("importJobSpecsInput").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);

      if (!parsed.productCode || !parsed.materials || !parsed.units) {
        alert("Invalid job file. Missing required fields.");
        return;
      }

      parsed.id = parsed.id || ("job-" + Date.now());
      parsed.templateId = parsed.templateId || null;

      jobsDB.jobs.push(parsed);
      saveJobsDB();

      alert(`Imported job: ${parsed.jobName || parsed.productCode}`);

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

  const primary = currentJob.materials.primary;
  const secondary = currentJob.materials.secondary;

  const results = [];

  currentJob.units.forEach(unit => {
    const factor = unit.factor;
    if (isNaN(factor)) return;

    let mPerKg = 0;

    if (unit.web === "primary") {
      mPerKg = primary.mPerKg;
    } else {
      if (!secondary) return;
      mPerKg = secondary.mPerKg;
    }

    if (!mPerKg || mPerKg <= 0) {
      console.warn("Invalid mPerKg for unit", unit);
      return;
    }

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
// FORCE‑ATTACH INK CALC BUTTON LISTENER
// ======================================================

document.getElementById("calcInkBtn").addEventListener("click", calculateInk);
