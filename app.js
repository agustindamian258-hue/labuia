// ============================================
// LABUIA - Lógica principal
// ============================================

let pantallaActual = 'pantalla-inicio';
let modalidad = 'remoto';
let empleosActuales = [];
let empleoSeleccionado = null;
let cvFinal = '';
let opcionCVactual = '';

// PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================
// NAVEGACIÓN
// ============================================

function irA(pantalla) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
  document.getElementById(pantalla).classList.add('activa');
  pantallaActual = pantalla;
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
// OPCIONES DE CV
// ============================================

function seleccionarOpcionCV(opcion) {
  opcionCVactual = opcion;

  // Resaltar opción seleccionada
  document.querySelectorAll('.cv-opcion').forEach(el => el.classList.remove('activo'));
  document.getElementById('opcion-' + opcion).classList.add('activo');

  // Ocultar todas las zonas
  document.querySelectorAll('.zona-cv').forEach(z => z.classList.add('oculto'));

  // Mostrar la zona correcta
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
      const textoPagina = contenido.items.map(item => item.str).join(' ');
      textoCompleto += textoPagina + '\n';
    }

    if (textoCompleto.trim().length < 50) {
      throw new Error('PDF sin texto legible');
    }

    cvFinal = textoCompleto.trim();
    estado.className = 'pdf-ok';
    estado.textContent = '✅ CV extraído correctamente (' + pdf.numPages + ' páginas)';

  } catch (error) {
    estado.className = 'pdf-error';
    estado.textContent = '❌ No pudimos leer el PDF. Probá pegando el texto manualmente.';
    seleccionarOpcionCV('texto');
  }
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

  try {
    const prompt = `Sos un experto en recursos humanos argentino. 
Generá un CV profesional en español para la siguiente persona.
Usá un tono profesional pero accesible, apropiado para el mercado laboral argentino.

DATOS:
- Nombre: ${nombre}
- Años de experiencia: ${experiencia || 'No especificado'}
- Trabajos anteriores: ${trabajos || 'No especificado'}
- Habilidades: ${habilidades || 'No especificado'}
- Estudios: ${estudios || 'No especificado'}

Generá el CV completo con secciones: Datos personales, Objetivo profesional, Experiencia laboral, Habilidades, y Educación.
Hacelo en texto plano, sin formato especial, listo para usar.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDemo`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const cvGenerado = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (cvGenerado) {
      cvFinal = cvGenerado;
      preview.textContent = cvGenerado;
    } else {
      // CV de respaldo si no hay API key
      cvFinal = generarCVlocal(nombre, experiencia, trabajos, habilidades, estudios);
      preview.textContent = cvFinal;
    }

  } catch {
    // CV generado localmente sin IA
    cvFinal = generarCVlocal(nombre, experiencia, trabajos, habilidades, estudios);
    preview.textContent = cvFinal;
  }
}

function generarCVlocal(nombre, experiencia, trabajos, habilidades, estudios) {
  return `CURRÍCULUM VITAE

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

  // Obtener CV según opción seleccionada
  if (opcionCVactual === 'texto') {
    cvFinal = document.getElementById('cv-texto').value.trim();
  }

  if (!cvFinal || cvFinal.length < 20) {
    alert('Necesitamos tu CV para analizar tu compatibilidad con los empleos. Elegí una opción arriba.');
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
  } catch (error) {
    document.getElementById('lista-empleos').innerHTML = `
      <div class="cargando">
        ❌ Hubo un error. Revisá tu conexión e intentá de nuevo.
      </div>
    `;
  }
}

// ============================================
// OBTENER EMPLEOS
// ============================================

async function obtenerEmpleos(puesto, ciudad) {
  try {
    const response = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(puesto)}&limit=10`
    );
    const data = await response.json();

    if (data.jobs && data.jobs.length > 0) {
      return data.jobs.slice(0, 8).map((job, i) => ({
        id: i + 1,
        titulo: job.title,
        empresa: job.company_name,
        ubicacion: job.candidate_required_location || 'Remoto',
        descripcion: job.description
          ? job.description.replace(/<[^>]*>/g, '').substring(0, 600)
          : '',
        link: job.url,
        score: 0,
        analisis: null
      }));
    }
  } catch {}

  return generarEmpleosDemo(puesto, ciudad);
}

function generarEmpleosDemo(puesto, ciudad) {
  const empresas = [
    'Mercado Libre', 'Globant', 'Naranja X',
    'PedidosYa', 'Despegar', 'OLX Argentina'
  ];
  const niveles = ['Sr', 'Jr', 'Semi Senior', 'Trainee', 'Lead', 'Ssr'];

  return empresas.map((emp, i) => ({
    id: i + 1,
    titulo: `${puesto} ${niveles[i]}`,
    empresa: emp,
    ubicacion: ciudad || 'Buenos Aires, Argentina',
    descripcion: `Buscamos ${puesto} para unirse a nuestro equipo. Se valorará experiencia, trabajo en equipo y ganas de crecer. Ofrecemos excelente clima laboral y posibilidades de crecimiento.`,
    link: `https://www.bumeran.com.ar`,
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
          'Podés ver el detalle de cada oferta',
          'La IA está lista para analizar cuando agregues tu API key'
        ],
        debilidades: ['Agregá tu API key de Gemini para ver compatibilidad real'],
        resumen: 'Score estimado. Activá la IA gratuita para análisis real.'
      }
    }));
  }

  const resultado = [];
  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino.
Analizá la compatibilidad entre este CV y esta oferta.

CV:
${cv.substring(0, 800)}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Descripción: ${empleo.descripcion.substring(0, 400)}

Respondé SOLO con este JSON sin texto extra:
{
  "score": numero del 1 al 100,
  "fortalezas": ["razón 1", "razón 2", "razón 3"],
  "debilidades": ["punto 1", "punto 2"],
  "resumen": "Una oración explicando la compatibilidad"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );

      const data = await res.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const limpio = texto.replace(/```json|```/g, '').trim();
      const analisis = JSON.parse(limpio);
      resultado.push({ ...empleo, score: analisis.score || 50, analisis });

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

  if (empleos.length === 0) {
    document.getElementById('lista-empleos').innerHTML = `
      <div class="empty-state">
        <div class="icono">🔍</div>
        <p>No encontramos empleos. Probá con otras palabras.</p>
      </div>
    `;
    return;
  }

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
  const fortalezas = emp.analisis?.fortalezas || [];
  const debilidades = emp.analisis?.debilidades || [];

  document.getElementById('contenido-detalle').innerHTML = `
    <div class="detalle-header">
      <div class="detalle-titulo">${emp.titulo}</div>
      <div class="detalle-empresa">${emp.empresa} · ${emp.ubicacion}</div>
      <div class="score-grande ${clase}">${emp.score}%</div>
      <p class="resumen-texto">${emp.analisis?.resumen || 'Activá la IA para ver tu compatibilidad real'}</p>
    </div>

    ${fortalezas.length > 0 ? `
    <div class="detalle-seccion">
      <h3>✅ Por qué encajás</h3>
      ${fortalezas.map(f => `<div class="check-item">✓ ${f}</div>`).join('')}
    </div>` : ''}

    ${debilidades.length > 0 ? `
    <div class="detalle-seccion">
      <h3>⚠️ Lo que te falta</h3>
      ${debilidades.map(d => `<div class="warn-item">• ${d}</div>`).join('')}
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
    p.titulo === empleoSeleccionado.titulo &&
    p.empresa === empleoSeleccionado.empresa
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
