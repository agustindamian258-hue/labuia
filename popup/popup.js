// ============================================
// LABUIA - Motor principal de la extensión
// ============================================

const GEMINI_API_KEY = ""; // Se completa desde configuración del usuario
let modalidadSeleccionada = "remoto";
let empleosEncontrados = [];

// ============================================
// INICIO
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  cargarConfiguracion();
  iniciarToggleModalidad();
  iniciarNavegacion();

  document.getElementById("btn-buscar").addEventListener("click", buscarEmpleos);
  document.getElementById("btn-volver").addEventListener("click", () => mostrarSeccion("busqueda"));
  document.getElementById("btn-volver-lista").addEventListener("click", () => mostrarSeccion("resultados"));
});

// ============================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================

function mostrarSeccion(seccion) {
  document.getElementById("seccion-busqueda").classList.add("oculto");
  document.getElementById("seccion-resultados").classList.add("oculto");
  document.getElementById("seccion-detalle").classList.add("oculto");
  document.getElementById(`seccion-${seccion}`).classList.remove("oculto");
}

function iniciarNavegacion() {
  document.getElementById("nav-buscar").addEventListener("click", () => {
    mostrarSeccion("busqueda");
    setNavActivo("nav-buscar");
  });

  document.getElementById("nav-cv").addEventListener("click", () => {
    abrirSeccionCV();
    setNavActivo("nav-cv");
  });

  document.getElementById("nav-postulaciones").addEventListener("click", () => {
    abrirPostulaciones();
    setNavActivo("nav-postulaciones");
  });

  document.getElementById("nav-perfil").addEventListener("click", () => {
    abrirPerfil();
    setNavActivo("nav-perfil");
  });
}

function setNavActivo(id) {
  document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("activo"));
  document.getElementById(id).classList.add("activo");
}

// ============================================
// TOGGLE MODALIDAD
// ============================================

function iniciarToggleModalidad() {
  document.querySelectorAll(".toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".toggle").forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
      modalidadSeleccionada = btn.dataset.valor;
    });
  });
}

// ============================================
// BUSCAR EMPLEOS
// ============================================

async function buscarEmpleos() {
  const puesto = document.getElementById("puesto").value.trim();
  const ciudad = document.getElementById("ciudad").value.trim() || "Argentina";

  if (!puesto) {
    alert("Escribí el puesto que buscás");
    return;
  }

  mostrarSeccion("resultados");
  document.getElementById("lista-empleos").innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      Buscando empleos con IA...
    </div>
  `;

  try {
    const empleos = await obtenerEmpleosDeBumeran(puesto, ciudad);
    const empleosConScore = await analizarCompatibilidad(empleos, puesto);
    empleosEncontrados = empleosConScore.sort((a, b) => b.score - a.score);
    mostrarResultados(empleosEncontrados);
  } catch (error) {
    document.getElementById("lista-empleos").innerHTML = `
      <div class="cargando">
        ❌ Error al buscar empleos. Intentá de nuevo.
      </div>
    `;
  }
}

// ============================================
// SCRAPING DE BUMERAN (RSS PÚBLICO LEGAL)
// ============================================

async function obtenerEmpleosDeBumeran(puesto, ciudad) {
  const puestoFormateado = puesto.toLowerCase().replace(/ /g, "-");
  const ciudadFormateada = ciudad.toLowerCase().replace(/ /g, "-");

  const urls = [
    `https://www.bumeran.com.ar/empleos-${puestoFormateado}.html`,
    `https://www.computrabajo.com.ar/trabajo-de-${puestoFormateado}`,
    `https://www.zonajobs.com.ar/empleos-de-${puestoFormateado}.html`
  ];

  // Usamos el proxy de allorigins para evitar CORS
  const url = `https://api.allorigins.win/get?url=${encodeURIComponent(urls[0])}`;
  const response = await fetch(url);
  const data = await response.json();
  const html = data.contents;

  return parsearEmpleosBumeran(html, puesto);
}

function parsearEmpleosBumeran(html, puesto) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const empleos = [];

  // Selectores de Bumeran
  const cards = doc.querySelectorAll("[class*='avisos'] [class*='aviso'], article, [data-qa='posting']");

  cards.forEach((card, index) => {
    if (index >= 15) return;

    const titulo = card.querySelector("h2, h3, [class*='titulo'], [class*='title']")?.textContent?.trim();
    const empresa = card.querySelector("[class*='empresa'], [class*='company']")?.textContent?.trim();
    const ubicacion = card.querySelector("[class*='ubicacion'], [class*='location']")?.textContent?.trim();
    const link = card.querySelector("a")?.href;

    if (titulo) {
      empleos.push({
        id: index,
        titulo: titulo || puesto,
        empresa: empresa || "Empresa confidencial",
        ubicacion: ubicacion || "Argentina",
        link: link || "#",
        descripcion: card.textContent?.trim()?.substring(0, 500) || "",
        score: 0,
        analisis: null
      });
    }
  });

  // Si no encontró cards reales, generamos ejemplos para demo
  if (empleos.length === 0) {
    return generarEmpleosDemo(puesto);
  }

  return empleos;
}

function generarEmpleosDemo(puesto) {
  return [
    {
      id: 1,
      titulo: `${puesto} Senior`,
      empresa: "Mercado Libre",
      ubicacion: "Buenos Aires, Argentina",
      link: "https://www.bumeran.com.ar",
      descripcion: `Buscamos ${puesto} con experiencia mínima de 3 años. Trabajo remoto, excelente clima laboral, obra social de primer nivel.`,
      score: 0,
      analisis: null
    },
    {
      id: 2,
      titulo: `${puesto} Jr`,
      empresa: "Globant",
      ubicacion: "Córdoba, Argentina",
      link: "https://www.bumeran.com.ar",
      descripcion: `Incorporamos ${puesto} junior para proyecto internacional. No se requiere experiencia previa, capacitación incluida.`,
      score: 0,
      analisis: null
    },
    {
      id: 3,
      titulo: `${puesto} - Modalidad Híbrida`,
      empresa: "Naranja X",
      ubicacion: "Córdoba, Argentina",
      link: "https://www.bumeran.com.ar",
      descripcion: `Sumamos ${puesto} para equipo ágil. Modalidad híbrida, sueldo en blanco, beneficios adicionales.`,
      score: 0,
      analisis: null
    }
  ];
}

// ============================================
// ANÁLISIS CON GEMINI IA
// ============================================

async function analizarCompatibilidad(empleos, puestoBuscado) {
  const config = await obtenerConfiguracion();
  const apiKey = config.geminiKey || "";
  const cvUsuario = config.cv || "";

  if (!apiKey || !cvUsuario) {
    // Sin API key o CV, asignamos scores básicos
    return empleos.map((e, i) => ({
      ...e,
      score: 90 - (i * 8),
      analisis: {
        fortalezas: ["Completá tu CV en la sección Mi CV para ver análisis detallado"],
        debilidades: ["Configurá tu API key de Gemini en Perfil"],
        resumen: "Configurá tu perfil para ver compatibilidad real"
      }
    }));
  }

  const empleosAnalizados = [];

  for (const empleo of empleos.slice(0, 8)) {
    try {
      const prompt = `
Sos un experto en RRHH argentino. Analizá la compatibilidad entre este CV y esta oferta de trabajo.

CV DEL CANDIDATO:
${cvUsuario}

OFERTA DE TRABAJO:
Título: ${empleo.titulo}
Empresa: ${empleo.empresa}
Descripción: ${empleo.descripcion}

Respondé SOLO con JSON válido, sin texto extra:
{
  "score": (número del 1 al 100),
  "fortalezas": ["punto 1", "punto 2", "punto 3"],
  "debilidades": ["punto 1", "punto 2"],
  "resumen": "Una oración explicando la compatibilidad"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await response.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const limpio = texto.replace(/```json|```/g, "").trim();
      const analisis = JSON.parse(limpio);

      empleosAnalizados.push({
        ...empleo,
        score: analisis.score || 50,
        analisis: analisis
      });

    } catch {
      empleosAnalizados.push({ ...empleo, score: 50, analisis: null });
    }
  }

  return empleosAnalizados;
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================

function mostrarResultados(empleos) {
  document.getElementById("cantidad-resultados").textContent =
    `${empleos.length} empleos encontrados`;

  const lista = document.getElementById("lista-empleos");

  if (empleos.length === 0) {
    lista.innerHTML = `<div class="cargando">No encontramos empleos. Probá con otras palabras.</div>`;
    return;
  }

  lista.innerHTML = empleos.map(empleo => {
    const scoreClase = empleo.score >= 75 ? "score-alto" : empleo.score >= 50 ? "score-medio" : "score-bajo";
    return `
      <div class="empleo-card" onclick="verDetalle(${empleo.id})">
        <div class="empleo-card-header">
          <div>
            <div class="empleo-titulo">${empleo.titulo}</div>
            <div class="empleo-empresa">${empleo.empresa}</div>
          </div>
          <div class="score-badge ${scoreClase}">${empleo.score}%</div>
        </div>
        <div class="empleo-tags">
          <span class="tag">📍 ${empleo.ubicacion}</span>
          <span class="tag">💼 ${modalidadSeleccionada}</span>
        </div>
      </div>
    `;
  }).join("");
}

// ============================================
// VER DETALLE DEL EMPLEO
// ============================================

function verDetalle(id) {
  const empleo = empleosEncontrados.find(e => e.id === id);
  if (!empleo) return;

  mostrarSeccion("detalle");

  const scoreClase = empleo.score >= 75 ? "score-alto" : empleo.score >= 50 ? "score-medio" : "score-bajo";
  const fortalezas = empleo.analisis?.fortalezas || [];
  const debilidades = empleo.analisis?.debilidades || [];

  document.getElementById("detalle-empleo").innerHTML = `
    <div class="detalle-box">
      <div class="detalle-titulo">${empleo.titulo}</div>
      <div class="detalle-empresa">${empleo.empresa} · ${empleo.ubicacion}</div>
      <div class="score-grande ${scoreClase}">${empleo.score}%</div>
      <p style="text-align:center; color:#8899aa; font-size:13px;">
        ${empleo.analisis?.resumen || "Analizá tu compatibilidad completando tu CV"}
      </p>
    </div>

    ${fortalezas.length > 0 ? `
    <div class="detalle-box">
      <h3>✅ Por qué encajás</h3>
      ${fortalezas.map(f => `<div class="check-item">✓ ${f}</div>`).join("")}
    </div>` : ""}

    ${debilidades.length > 0 ? `
    <div class="detalle-box">
      <h3>⚠️ Lo que te falta</h3>
      ${debilidades.map(d => `<div class="warn-item">• ${d}</div>`).join("")}
    </div>` : ""}

    <button class="btn-postular" onclick="postularme('${empleo.link}')">
      💼 Postularme ahora
    </button>
  `;
}

// ============================================
// POSTULACIÓN
// ============================================

function postularme(link) {
  chrome.tabs.create({ url: link });
  guardarPostulacion(empleosEncontrados.find(e => e.link === link));
}

function guardarPostulacion(empleo) {
  if (!empleo) return;
  chrome.storage.local.get(["postulaciones"], (result) => {
    const lista = result.postulaciones || [];
    lista.unshift({
      titulo: empleo.titulo,
      empresa: empleo.empresa,
      ubicacion: empleo.ubicacion,
      score: empleo.score,
      fecha: new Date().toLocaleDateString("es-AR"),
      hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      estado: "Enviada"
    });
    chrome.storage.local.set({ postulaciones: lista });
  });
}

// ============================================
// SECCIÓN MI CV
// ============================================

function abrirSeccionCV() {
  mostrarSeccion("busqueda");
  document.getElementById("seccion-busqueda").innerHTML = `
    <div style="padding: 20px;">
      <h2 style="margin-bottom: 16px;">📄 Mi CV</h2>
      <label>Pegá el texto de tu CV acá:</label>
      <textarea id="cv-texto" style="
        width: 100%;
        height: 200px;
        background: #111f3a;
        border: 1px solid #1e3a6e;
        border-radius: 10px;
        padding: 12px;
        color: #ffffff;
        font-size: 13px;
        margin-top: 8px;
        resize: none;
        outline: none;
      " placeholder="Nombre: Juan Pérez&#10;Experiencia: 3 años como desarrollador...&#10;Habilidades: React, Node.js..."></textarea>
      <button class="btn-principal" onclick="guardarCV()" style="margin-top: 16px;">
        💾 Guardar CV
      </button>
    </div>
  `;

  chrome.storage.local.get(["cv"], (result) => {
    if (result.cv) document.getElementById("cv-texto").value = result.cv;
  });
}

function guardarCV() {
  const cv = document.getElementById("cv-texto").value.trim();
  if (!cv) { alert("Escribí tu CV primero"); return; }
  chrome.storage.local.set({ cv }, () => {
    alert("✅ CV guardado correctamente");
  });
}

// ============================================
// SECCIÓN POSTULACIONES
// ============================================

function abrirPostulaciones() {
  mostrarSeccion("busqueda");
  chrome.storage.local.get(["postulaciones"], (result) => {
    const lista = result.postulaciones || [];
    document.getElementById("seccion-busqueda").innerHTML = `
      <div style="padding: 20px;">
        <h2 style="margin-bottom: 4px;">💼 Mis postulaciones</h2>
        <p style="color:#8899aa; font-size:13px; margin-bottom:16px;">Este mes: ${lista.length} empleos</p>
        ${lista.length === 0
          ? `<div class="cargando">Todavía no te postulaste a ningún empleo</div>`
          : lista.map(p => `
            <div class="empleo-card">
              <div class="empleo-card-header">
                <div>
                  <div class="empleo-titulo">${p.titulo}</div>
                  <div class="empleo-empresa">${p.empresa}</div>
                </div>
                <div class="score-badge score-alto">${p.score}%</div>
              </div>
              <div class="empleo-tags">
                <span class="tag">📅 ${p.fecha} ${p.hora}</span>
                <span class="tag" style="color:#22c55e">✓ ${p.estado}</span>
              </div>
            </div>
          `).join("")
        }
      </div>
    `;
  });
}

// ============================================
// SECCIÓN PERFIL / API KEY
// ============================================

function abrirPerfil() {
  mostrarSeccion("busqueda");
  chrome.storage.local.get(["geminiKey"], (result) => {
    document.getElementById("seccion-busqueda").innerHTML = `
      <div style="padding: 20px;">
        <h2 style="margin-bottom: 16px;">👤 Mi perfil</h2>
        <label>API Key de Gemini (gratis en aistudio.google.com)</label>
        <input type="password" id="gemini-key" placeholder="AIza..." value="${result.geminiKey || ''}"
          style="margin-top: 8px;">
        <button class="btn-principal" onclick="guardarAPIKey()" style="margin-top: 16px;">
          💾 Guardar configuración
        </button>
        <a href="https://aistudio.google.com/app/apikey" target="_blank"
          style="display:block; text-align:center; color:#7c3aed; font-size:13px; margin-top:16px;">
          → Obtener API Key gratis
        </a>
      </div>
    `;
  });
}

function guardarAPIKey() {
  const key = document.getElementById("gemini-key").value.trim();
  if (!key) { alert("Ingresá tu API key"); return; }
  chrome.storage.local.set({ geminiKey: key }, () => {
    alert("✅ Configuración guardada");
  });
}

// ============================================
// UTILIDADES
// ============================================

function obtenerConfiguracion() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["geminiKey", "cv"], resolve);
  });
}

function cargarConfiguracion() {
  chrome.storage.local.get(["geminiKey", "cv"], (result) => {
    if (!result.geminiKey || !result.cv) {
      console.log("LabuIA: Configuración pendiente");
    }
  });
}
