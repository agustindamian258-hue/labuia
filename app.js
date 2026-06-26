// ============================================
// LABUIA - Lógica principal
// ============================================

let pantallaActual = 'pantalla-inicio';
let modalidad = 'remoto';
let empleosActuales = [];
let empleoSeleccionado = null;

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
// TOGGLES DE MODALIDAD
// ============================================

document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle').forEach(b => b.classList.remove('activo'));
    btn.classList.add('activo');
    modalidad = btn.dataset.valor;
  });
});

// ============================================
// GUARDAR PERFIL Y BUSCAR
// ============================================

function guardarPerfilYBuscar() {
  const nombre = document.getElementById('nombre').value.trim();
  const puesto = document.getElementById('puesto').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();
  const cv = document.getElementById('cv').value.trim();

  if (!puesto) {
    alert('Escribí el puesto que buscás');
    return;
  }

  if (!cv) {
    alert('Pegá el texto de tu CV para que la IA pueda analizarlo');
    return;
  }

  // Guardamos en localStorage
  localStorage.setItem('labuia_perfil', JSON.stringify({ nombre, puesto, ciudad, cv, modalidad }));

  irA('pantalla-resultados');
  buscarEmpleos(puesto, ciudad, cv);
}

// ============================================
// CARGAR PERFIL GUARDADO
// ============================================

window.addEventListener('load', () => {
  const perfil = JSON.parse(localStorage.getItem('labuia_perfil') || '{}');
  if (perfil.nombre) document.getElementById('nombre').value = perfil.nombre;
  if (perfil.puesto) document.getElementById('puesto').value = perfil.puesto;
  if (perfil.ciudad) document.getElementById('ciudad').value = perfil.ciudad;
  if (perfil.cv) document.getElementById('cv').value = perfil.cv;
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
    // Obtenemos empleos
    const empleos = await obtenerEmpleos(puesto, ciudad);

    // Analizamos con IA
    const analizados = await analizarConIA(empleos, puesto, cv);

    // Ordenamos por score
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
// OBTENER EMPLEOS (FUENTE: REMOTIVE + DEMO)
// ============================================

async function obtenerEmpleos(puesto, ciudad) {
  const empleosDemo = generarEmpleosDemo(puesto, ciudad);

  try {
    // Intentamos con Remotive API (gratis, sin key)
    const response = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(puesto)}&limit=10`
    );
    const data = await response.json();

    if (data.jobs && data.jobs.length > 0) {
      const empleosReales = data.jobs.slice(0, 8).map((job, i) => ({
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
      return empleosReales;
    }
  } catch {
    // Si falla la API usamos los de demo
  }

  return empleosDemo;
}

function generarEmpleosDemo(puesto, ciudad) {
  const empresas = [
    { nombre: 'Mercado Libre', ubi: 'Buenos Aires, Argentina' },
    { nombre: 'Globant', ubi: 'Córdoba, Argentina' },
    { nombre: 'Naranja X', ubi: 'Córdoba, Argentina' },
    { nombre: 'PedidosYa', ubi: 'Buenos Aires, Argentina' },
    { nombre: 'Despegar', ubi: 'Buenos Aires, Argentina' },
    { nombre: 'OLX Argentina', ubi: 'Buenos Aires, Argentina' },
  ];

  return empresas.map((emp, i) => ({
    id: i + 1,
    titulo: `${puesto} ${['Sr', 'Jr', 'Semi Senior', 'Trainee', 'Lead', 'Ssr'][i]}`,
    empresa: emp.nombre,
    ubicacion: ciudad || emp.ubi,
    descripcion: `Buscamos ${puesto} para unirse a nuestro equipo. Se valorará experiencia en el área, trabajo en equipo y ganas de crecer profesionalmente. Ofrecemos excelente clima laboral, obra social de primer nivel y posibilidades de crecimiento.`,
    link: `https://www.bumeran.com.ar/empleos-publicacion-${i + 1}.html`,
    score: 0,
    analisis: null
  }));
}

// ============================================
// ANALIZAR CON GEMINI IA
// ============================================

async function analizarConIA(empleos, puesto, cv) {
  const apiKey = localStorage.getItem('labuia_gemini_key') || '';

  if (!apiKey) {
    // Sin API key: scores simulados para demo
    return empleos.map((e, i) => ({
      ...e,
      score: Math.max(95 - (i * 7), 40),
      analisis: {
        fortalezas: [
          'Configurá tu API key de Gemini para ver análisis real',
          'Andá a Perfil → Configuración para activar la IA'
        ],
        debilidades: ['Sin API key no podemos analizar compatibilidad real'],
        resumen: 'Activá la IA gratuita de Google para ver tu compatibilidad real con este empleo'
      }
    }));
  }

  const resultado = [];

  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en Recursos Humanos argentino. 
Analizá la compatibilidad entre este CV y esta oferta de trabajo.

CV:
${cv.substring(0, 1000)}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Descripción: ${empleo.descripcion.substring(0, 400)}

Respondé ÚNICAMENTE con este JSON sin ningún texto extra:
{
  "score": numero del 1 al 100,
  "fortalezas": ["razón 1", "razón 2", "razón 3"],
  "debilidades": ["punto 1", "punto 2"],
  "resumen": "Una sola oración explicando la compatibilidad"
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
  document.getElementById('titulo-resultados').textContent = `Empleos para vos`;
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
      <p class="resumen-texto">${emp.analisis?.resumen || 'Activá la IA para ver tu compatibilidad'}</p>
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

  // Guardamos la postulación
  const postulaciones = JSON.parse(localStorage.getItem('labuia_postulaciones') || '[]');
  const yaExiste = postulaciones.find(p => p.titulo === empleoSeleccionado.titulo && p.empresa === empleoSeleccionado.empresa);

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

  // Abrimos el portal de empleo
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
