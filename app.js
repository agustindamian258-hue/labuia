// ============================================
// LABUIA - Lógica principal
// ============================================

let modalidad = 'remoto';
let empleosActuales = [];
let empleoSeleccionado = null;
let cvFinal = '';
let opcionCVactual = '';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================
// NAVEGACIÓN
// ============================================

function irA(pantalla) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.getElementById(pantalla).classList.add('activa');
  window.scrollTo(0, 0);
}

function setNav(btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('activo'));
  btn.classList.add('activo');
}

// ============================================
// TOGGLES MODALIDAD
// ============================================

document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    modalidad = btn.dataset.valor;
  });
});

// ============================================
// API KEY
// ============================================

function toggleAPIkey() {
  const zona = document.getElementById('api-key-zona');
  const arrow = document.getElementById('api-key-arrow');
  zona.classList.toggle('oculto');
  arrow.textContent = zona.classList.contains('oculto') ? '▼' : '▲';
}

function guardarAPIkey() {
  const key = document.getElementById('gemini-key').value.trim();
  const estado = document.getElementById('api-key-estado');

  if (!key || key.length < 10) {
    estado.style.background = '#1c0a00';
    estado.style.color = '#f97316';
    estado.style.border = '1px solid #f97316';
    estado.textContent = '❌ API Key inválida. Verificá que esté completa';
    return;
  }

  localStorage.setItem('labuia_gemini_key', key);
  estado.style.background = '#052e16';
  estado.style.color = '#22c55e';
  estado.style.border = '1px solid #22c55e';
  estado.textContent = '✅ API Key guardada. IA activada correctamente';
}

// ============================================
// OPCIONES DE CV
// ============================================

function seleccionarOpcionCV(opcion) {
  opcionCVactual = opcion;
  document.querySelectorAll('.cv-opcion').forEach(el => el.classList.remove('activo'));
  document.getElementById('opcion-' + opcion).classList.add('activo');
  document.querySelectorAll('.zona-cv').forEach(z => z.classList.add('oculto'));
  document.getElementById('zona-' + opcion).classList.remove('oculto');
}

// ============================================
// PROCESAR PDF
// ============================================

async function procesarPDF(input) {
  const archivo = input.files[0];
  if (!archivo) return;

  const estado = document.getElementById('pdf-estado');
  estado.className = '';
  estado.textContent = '⏳ Extrayendo texto del PDF...';

  try {
    const arrayBuffer = await archivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let textoCompleto = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const pagina = await pdf.getPage(i);
      const contenido = await pagina.getTextContent();
      textoCompleto += contenido.items.map(item => item.str).join(' ') + '\n';
    }

    if (textoCompleto.trim().length < 50) throw new Error('PDF sin texto');

    cvFinal = textoCompleto.trim();
    estado.className = 'pdf-ok';
    estado.textContent = `✅ CV extraído correctamente (${pdf.numPages} páginas leídas)`;

  } catch {
    estado.className = 'pdf-error';
    estado.textContent = '❌ No pudimos leer el PDF. Probá pegando el texto manualmente.';
    seleccionarOpcionCV('texto');
  }
}

// ============================================
// LLAMADA A GEMINI (soporta AIza y AQ.)
// ============================================

async function llamarGemini(prompt, apiKey) {
  // Intentamos con el endpoint nuevo primero (soporta ambos tipos de key)
  const endpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await res.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (texto) return texto;
    } catch {}
  }

  return null;
}

// ============================================
// GENERAR CV CON IA
// ============================================

async function generarCVconIA() {
  const nombre = document.getElementById('nombre').value.trim() || 'El candidato';
  const experiencia = document.getElementById('gen-experiencia').value.trim();
  const trabajos = document.getElementById('gen-trabajos').value.trim();
  const habilidades = document.getElementById('gen-habilidades').value.trim();
  const estudios = document.getElementById('gen-estudios').value.trim();

  if (!experiencia && !trabajos && !habilidades) {
    alert('Completá al menos un campo para generar tu CV');
    return;
  }

  const preview = document.getElementById('cv-generado-preview');
  preview.style.display = 'block';
  preview.textContent = '⏳ Generando tu CV con IA...';

  const apiKey = localStorage.getItem('labuia_gemini_key') || '';

  if (apiKey) {
    const prompt = `Sos un experto en recursos humanos argentino.
Generá un CV profesional en español para esta persona.

DATOS:
- Nombre: ${nombre}
- Experiencia: ${experiencia || 'No especificada'}
- Trabajos anteriores: ${trabajos || 'No especificado'}
- Habilidades: ${habilidades || 'No especificadas'}
- Estudios: ${estudios || 'No especificados'}

Generá el CV completo con estas secciones:
DATOS PERSONALES, OBJETIVO PROFESIONAL, EXPERIENCIA LABORAL, HABILIDADES, EDUCACIÓN, DISPONIBILIDAD.

Escribilo en texto plano, sin asteriscos ni símbolos raros. Hacelo profesional y adaptado al mercado laboral argentino.`;

    const cvGenerado = await llamarGemini(prompt, apiKey);

    if (cvGenerado) {
      cvFinal = cvGenerado;
      preview.textContent = cvGenerado;
      return;
    }
  }

  // Sin API key o si falla: CV generado localmente
  cvFinal = `CURRÍCULUM VITAE

DATOS PERSONALES
Nombre: ${nombre}
País: Argentina

OBJETIVO PROFESIONAL
Profesional con ${experiencia || 'experiencia en el área'} buscando nuevas oportunidades de crecimiento laboral. Comprometido con el trabajo en equipo y la mejora continua.

EXPERIENCIA LABORAL
${trabajos || 'Disponible para primer empleo o cambio laboral'}

HABILIDADES
${habilidades || 'Trabajo en equipo, responsabilidad, puntualidad, adaptabilidad'}

EDUCACIÓN
${estudios || 'Formación en proceso'}

DISPONIBILIDAD
Inmediata`;

  preview.textContent = cvFinal;
}

// ============================================
// GUARDAR PERFIL Y BUSCAR
// ============================================

function guardarPerfilYBuscar() {
  const nombre = document.getElementById('nombre').value.trim();
  const puesto = document.getElementById('puesto').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();

  if (!puesto) {
    alert('Escribí el puesto que buscás');
    return;
  }

  if (opcionCVactual === 'texto') {
    cvFinal = document.getElementById('cv-texto').value.trim();
  }

  if (!cvFinal || cvFinal.length < 20) {
    alert('Necesitamos tu CV. Elegí una opción arriba: subir PDF, pegar texto o generarlo con IA.');
    return;
  }

  localStorage.setItem('labuia_perfil', JSON.stringify({
    nombre, puesto, ciudad, cv: cvFinal, modalidad
  }));

  irA('pantalla-resultados');
  buscarEmpleos(puesto, ciudad, cvFinal);
}

// ============================================
// CARGAR PERFIL GUARDADO
// ============================================

window.addEventListener('load', () => {
  const perfil = JSON.parse(localStorage.getItem('labuia_perfil') || '{}');
  if (perfil.nombre) document.getElementById('nombre').value = perfil.nombre;
  if (perfil.puesto) document.getElementById('puesto').value = perfil.puesto;
  if (perfil.ciudad) document.getElementById('ciudad').value = perfil.ciudad;
  if (perfil.cv) cvFinal = perfil.cv;
  if (perfil.modalidad) {
    modalidad = perfil.modalidad;
    document.querySelectorAll('.toggle').forEach(b => {
      b.classList.toggle('activo', b.dataset.valor === modalidad);
    });
  }

  const keyGuardada = localStorage.getItem('labuia_gemini_key') || '';
  if (keyGuardada) {
    document.getElementById('gemini-key').value = keyGuardada;
  }
});

// ============================================
// BUSCAR EMPLEOS
// ============================================

async function buscarEmpleos(puesto, ciudad, cv) {
  document.getElementById('titulo-resultados').textContent = 'Buscando empleos...';
  document.getElementById('subtitulo-resultados').textContent = 'La IA está analizando las mejores opciones para vos';
  document.getElementById('lista-empleos').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      Analizando ofertas con IA...
    </div>
  `;

  try {
    const empleos = await obtenerEmpleos(puesto, ciudad);
    const analizados = await analizarConIA(empleos, puesto, cv);
    empleosActuales = analizados.sort((a, b) => b.score - a.score);
    mostrarResultados(empleosActuales, puesto);
  } catch {
    document.getElementById('lista-empleos').innerHTML = `
      <div class="cargando">❌ Error al buscar. Revisá tu conexión e intentá de nuevo.</div>
    `;
  }
}

// ============================================
// OBTENER EMPLEOS
// ============================================

async function obtenerEmpleos(puesto, ciudad) {
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(puesto)}&limit=10`
    );
    const data = await res.json();

    if (data.jobs && data.jobs.length > 0) {
      return data.jobs.slice(0, 8).map((job, i) => ({
        id: i + 1,
        titulo: job.title,
        empresa: job.company_name,
        ubicacion: job.candidate_required_location || 'Remoto',
        descripcion: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 600),
        link: job.url,
        score: 0,
        analisis: null
      }));
    }
  } catch {}

  return generarEmpleosDemo(puesto, ciudad);
}

function generarEmpleosDemo(puesto, ciudad) {
  const empresas = ['Mercado Libre', 'Globant', 'Naranja X', 'PedidosYa', 'Despegar', 'OLX Argentina'];
  const niveles = ['Sr', 'Jr', 'Semi Senior', 'Trainee', 'Lead', 'Ssr'];
  return empresas.map((emp, i) => ({
    id: i + 1,
    titulo: `${puesto} ${niveles[i]}`,
    empresa: emp,
    ubicacion: ciudad || 'Buenos Aires, Argentina',
    descripcion: `Buscamos ${puesto} para unirse a nuestro equipo. Se valorará experiencia, trabajo en equipo y ganas de crecer.`,
    link: 'https://www.bumeran.com.ar',
    score: 0,
    analisis: null
  }));
}

// ============================================
// ANALIZAR CON IA
// ============================================

async function analizarConIA(empleos, puesto, cv) {
  const apiKey = localStorage.getItem('labuia_gemini_key') || '';

  if (!apiKey) {
    return empleos.map((e, i) => ({
      ...e,
      score: Math.max(95 - (i * 7), 40),
      analisis: {
        fortalezas: [
          'Tu perfil fue cargado correctamente',
          'Podés ver todas las ofertas disponibles',
          'Activá la IA para ver análisis real de compatibilidad'
        ],
        debilidades: ['Agregá tu API Key de Gemini en Configuración de IA para análisis real'],
        resumen: 'Score estimado. Activá la IA gratuita para ver tu compatibilidad real.'
      }
    }));
  }

  const resultado = [];
  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino.
Analizá la compatibilidad entre este CV y esta oferta de trabajo.

CV DEL CANDIDATO:
${cv.substring(0, 800)}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Descripción: ${empleo.descripcion.substring(0, 400)}

Respondé ÚNICAMENTE con este JSON sin texto extra:
{
  "score": numero del 1 al 100,
  "fortalezas": ["razón 1", "razón 2", "razón 3"],
  "debilidades": ["punto 1", "punto 2"],
  "resumen": "Una oración corta explicando la compatibilidad"
}`;

      const texto = await llamarGemini(prompt, apiKey);
      if (texto) {
        const analisis = JSON.parse(texto.replace(/```json|```/g, '').trim());
        resultado.push({ ...empleo, score: analisis.score || 50, analisis });
      } else {
        resultado.push({ ...empleo, score: 50, analisis: null });
      }
    } catch {
      resultado.push({ ...empleo, score: 50, analisis: null });
    }
  }

  return resultado;
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================

function mostrarResultados(empleos, puesto) {
  document.getElementById('titulo-resultados').textContent = 'Empleos para vos';
  document.getElementById('subtitulo-resultados').textContent =
    `${empleos.length} ofertas encontradas para "${puesto}"`;

  document.getElementById('lista-empleos').innerHTML = empleos.map(emp => {
    const clase = emp.score >= 75 ? 'score-alto' : emp.score >= 50 ? 'score-medio' : 'score-bajo';
    return `
      <div class="empleo-card" onclick="verDetalle(${emp.id})">
        <div class="empleo-card-top">
          <div class="empleo-info">
            <div class="empleo-titulo">${emp.titulo}</div>
            <div class="empleo-empresa">${emp.empresa}</div>
          </div>
          <div class="score-circulo ${clase}">${emp.score}%</div>
        </div>
        <div class="empleo-tags">
          <span class="tag">📍 ${emp.ubicacion}</span>
          <span class="tag">💼 ${modalidad}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// VER DETALLE
// ============================================

function verDetalle(id) {
  empleoSeleccionado = empleosActuales.find(e => e.id === id);
  if (!empleoSeleccionado) return;

  const emp = empleoSeleccionado;
  const clase = emp.score >= 75 ? 'score-alto' : emp.score >= 50 ? 'score-medio' : 'score-bajo';

  document.getElementById('contenido-detalle').innerHTML = `
    <div class="detalle-header">
      <div class="detalle-titulo">${emp.titulo}</div>
      <div class="detalle-empresa">${emp.empresa} · ${emp.ubicacion}</div>
      <div class="score-grande ${clase}">${emp.score}%</div>
      <p class="resumen-texto">${emp.analisis?.resumen || 'Activá la IA para ver tu compatibilidad real'}</p>
    </div>

    ${emp.analisis?.fortalezas?.length ? `
    <div class="detalle-seccion">
      <h3>✅ Por qué encajás</h3>
      ${emp.analisis.fortalezas.map(f => `<div class="check-item">✓ ${f}</div>`).join('')}
    </div>` : ''}

    ${emp.analisis?.debilidades?.length ? `
    <div class="detalle-seccion">
      <h3>⚠️ Lo que te falta</h3>
      ${emp.analisis.debilidades.map(d => `<div class="warn-item">• ${d}</div>`).join('')}
    </div>` : ''}

    <button class="btn-postular" onclick="postularme()">
      💼 Postularme ahora
    </button>
  `;

  irA('pantalla-detalle');
}

// ============================================
// POSTULACIÓN
// ============================================

function postularme() {
  if (!empleoSeleccionado) return;

  const postulaciones = JSON.parse(localStorage.getItem('labuia_postulaciones') || '[]');
  const yaExiste = postulaciones.find(p =>
    p.titulo === empleoSeleccionado.titulo && p.empresa === empleoSeleccionado.empresa
  );

  if (!yaExiste) {
    postulaciones.unshift({
      titulo: empleoSeleccionado.titulo,
      empresa: empleoSeleccionado.empresa,
      ubicacion: empleoSeleccionado.ubicacion,
      score: empleoSeleccionado.score,
      fecha: new Date().toLocaleDateString('es-AR'),
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      estado: 'Enviada',
      link: empleoSeleccionado.link
    });
    localStorage.setItem('labuia_postulaciones', JSON.stringify(postulaciones));
  }

  window.open(empleoSeleccionado.link, '_blank');
}

// ============================================
// POSTULACIONES
// ============================================

function cargarPostulaciones() {
  const lista = JSON.parse(localStorage.getItem('labuia_postulaciones') || '[]');

  if (lista.length === 0) {
    document.getElementById('lista-postulaciones').innerHTML = `
      <div class="empty-state">
        <div class="icono">💼</div>
        <p>Todavía no te postulaste a ningún empleo</p>
      </div>
    `;
    return;
  }

  document.getElementById('lista-postulaciones').innerHTML = `
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-numero">${lista.length}</div>
        <div class="stat-label">Enviadas</div>
      </div>
      <div class="stat-card">
        <div class="stat-numero">${lista.filter(p => p.estado === 'Respuesta').length}</div>
        <div class="stat-label">Respuestas</div>
      </div>
    </div>
    ${lista.map(p => {
      const clase = p.score >= 75 ? 'score-alto' : p.score >= 50 ? 'score-medio' : 'score-bajo';
      return `
        <div class="empleo-card">
          <div class="empleo-card-top">
            <div class="empleo-info">
              <div class="empleo-titulo">${p.titulo}</div>
              <div class="empleo-empresa">${p.empresa}</div>
            </div>
            <div class="score-circulo ${clase}">${p.score}%</div>
          </div>
          <div class="empleo-tags">
            <span class="tag">📅 ${p.fecha} ${p.hora}</span>
            <span class="tag" style="color:#22c55e">✓ ${p.estado}</span>
          </div>
        </div>
      `;
    }).join('')}
  `;
    }
