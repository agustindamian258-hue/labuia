// ============================================
// LABUIA - App principal con Firebase
// ============================================

import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc }
  from './firebase-config.js';

// Estado global
let perfil = {};
let modalidad = 'presencial';
let viaje = 'zona';
let experiencia = 'sin_exp';
let horarios = ['cualquier_horario'];
let habilidades = [];
let empleosActuales = [];
let empleoSeleccionado = null;
let cvFinal = '';
let opcionCVactual = '';
let cvAdaptadoTexto = '';
let usuarioActual = null;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================
// AUTENTICACIÓN
// ============================================

onAuthStateChanged(auth, async (usuario) => {
  if (usuario) {
    usuarioActual = usuario;
    document.getElementById('navbar').style.display = 'flex';
    const foto = document.getElementById('usuario-foto');
    if (usuario.photoURL) {
      foto.src = usuario.photoURL;
      foto.style.display = 'block';
    }
    await cargarPerfilFirebase(usuario.uid);
    irA('pantalla-perfil');
  } else {
    usuarioActual = null;
    document.getElementById('navbar').style.display = 'none';
    irA('pantalla-login');
  }
});

async function loginConGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    alert('Error al iniciar sesión. Intentá de nuevo.');
  }
}

async function cerrarSesion() {
  await signOut(auth);
}

window.loginConGoogle = loginConGoogle;
window.cerrarSesion = cerrarSesion;

// ============================================
// FIREBASE — GUARDAR Y CARGAR PERFIL
// ============================================

async function guardarPerfilFirebase(uid, datos) {
  try {
    await setDoc(doc(db, 'usuarios', uid), datos, { merge: true });
  } catch (e) {
    console.log('Error guardando perfil:', e);
  }
}

async function cargarPerfilFirebase(uid) {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (snap.exists()) {
      const datos = snap.data();
      if (datos.nombre) document.getElementById('nombre').value = datos.nombre;
      if (datos.edad) document.getElementById('edad').value = datos.edad;
      if (datos.ciudad) document.getElementById('ciudad').value = datos.ciudad;
      if (datos.puestoBuscado) document.getElementById('puesto-buscado').value = datos.puestoBuscado;
      if (datos.salario) document.getElementById('salario').value = datos.salario;
      if (datos.estudios) document.getElementById('estudios').value = datos.estudios;
      if (datos.cv) cvFinal = datos.cv;
      if (datos.geminiKey) {
        localStorage.setItem('labuia_gemini_key', datos.geminiKey);
        document.getElementById('gemini-key').value = datos.geminiKey;
      }
      if (datos.modalidad) {
        modalidad = datos.modalidad;
        actualizarToggle('modalidad', modalidad);
      }
      if (datos.viaje) {
        viaje = datos.viaje;
        actualizarToggleSimple(viaje);
      }
      if (datos.experiencia) {
        experiencia = datos.experiencia;
        actualizarToggle('experiencia', experiencia);
        if (experiencia !== 'sin_exp') {
          document.getElementById('zona-experiencia-detalle').classList.remove('oculto');
        }
      }
      if (datos.horarios) {
        horarios = datos.horarios;
        actualizarToggleCheck(horarios);
      }
      if (datos.habilidades) {
        habilidades = datos.habilidades;
        actualizarToggleCheck(habilidades);
      }
    }
  } catch (e) {
    console.log('Error cargando perfil:', e);
  }
}

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

window.irA = irA;
window.setNav = setNav;

// ============================================
// TOGGLES
// ============================================

function actualizarToggle(grupo, valor) {
  document.querySelectorAll(`[data-grupo="${grupo}"]`).forEach(b => {
    b.classList.toggle('activo', b.dataset.valor === valor);
  });
}

function actualizarToggleSimple(valor) {
  document.querySelectorAll('.toggle:not([data-grupo])').forEach(b => {
    b.classList.toggle('activo', b.dataset.valor === valor);
  });
}

function actualizarToggleCheck(valores) {
  document.querySelectorAll('.toggle-check').forEach(b => {
    b.classList.toggle('activo', valores.includes(b.dataset.valor));
  });
}

document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const grupo = btn.dataset.grupo;
    if (grupo === 'modalidad') {
      actualizarToggle('modalidad', btn.dataset.valor);
      modalidad = btn.dataset.valor;
    } else if (grupo === 'experiencia') {
      actualizarToggle('experiencia', btn.dataset.valor);
      experiencia = btn.dataset.valor;
      const zona = document.getElementById('zona-experiencia-detalle');
      if (experiencia === 'sin_exp') {
        zona.classList.add('oculto');
      } else {
        zona.classList.remove('oculto');
      }
    } else {
      document.querySelectorAll('.toggle:not([data-grupo])').forEach(b => b.classList.remove('activo'));
      btn.classList.add('activo');
      viaje = btn.dataset.valor;
    }
  });
});

document.querySelectorAll('.toggle-check').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('activo');
    const valor = btn.dataset.valor;
    const esHorario = ['manana','tarde','noche','rotativo','cualquier_horario'].includes(valor);
    if (esHorario) {
      if (horarios.includes(valor)) {
        horarios = horarios.filter(h => h !== valor);
      } else {
        horarios.push(valor);
      }
    } else {
      if (habilidades.includes(valor)) {
        habilidades = habilidades.filter(h => h !== valor);
      } else {
        habilidades.push(valor);
      }
    }
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
    estado.style.cssText = 'background:#1c0a00;color:#f97316;border:1px solid #f97316';
    estado.textContent = '❌ Key inválida';
    return;
  }
  localStorage.setItem('labuia_gemini_key', key);
  if (usuarioActual) {
    guardarPerfilFirebase(usuarioActual.uid, { geminiKey: key });
  }
  estado.style.cssText = 'background:#052e16;color:#22c55e;border:1px solid #22c55e';
  estado.textContent = '✅ IA activada correctamente';
}

window.toggleAPIkey = toggleAPIkey;
window.guardarAPIkey = guardarAPIkey;

// ============================================
// OPCIONES CV
// ============================================

function seleccionarOpcionCV(opcion) {
  opcionCVactual = opcion;
  document.querySelectorAll('.cv-opcion').forEach(el => el.classList.remove('activo'));
  document.getElementById('opcion-' + opcion).classList.add('activo');
  document.querySelectorAll('.zona-cv').forEach(z => z.classList.add('oculto'));
  document.getElementById('zona-' + opcion).classList.remove('oculto');
}

window.seleccionarOpcionCV = seleccionarOpcionCV;

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
    let texto = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const pagina = await pdf.getPage(i);
      const contenido = await pagina.getTextContent();
      texto += contenido.items.map(item => item.str).join(' ') + '\n';
    }
    if (texto.trim().length < 50) throw new Error('Sin texto');
    cvFinal = texto.trim();
    estado.className = 'pdf-ok';
    estado.textContent = `✅ CV extraído (${pdf.numPages} páginas)`;
  } catch {
    estado.className = 'pdf-error';
    estado.textContent = '❌ No pudimos leer el PDF. Probá pegando el texto.';
    seleccionarOpcionCV('texto');
  }
}

window.procesarPDF = procesarPDF;

// ============================================
// GENERAR CV CON IA
// ============================================

async function generarCVconIA() {
  const nombre = document.getElementById('nombre').value.trim() || 'El candidato';
  const edad = document.getElementById('edad').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();
  const expDetalle = document.getElementById('experiencia-detalle')?.value.trim() || '';
  const estudiosVal = document.getElementById('estudios').value;
  const habilidadesTexto = habilidades.join(', ');
  const puesto = document.getElementById('puesto-buscado').value.trim();

  const preview = document.getElementById('cv-generado-preview');
  preview.style.display = 'block';
  preview.textContent = '⏳ Generando CV con IA...';

  const apiKey = localStorage.getItem('labuia_gemini_key') || '';
  const expTexto = experiencia === 'sin_exp' ? 'Sin experiencia laboral previa' :
    experiencia === 'poca_exp' ? `Poca experiencia (1-2 años): ${expDetalle}` :
    experiencia === 'media_exp' ? `Experiencia media (3-5 años): ${expDetalle}` :
    `Experiencia amplia (+5 años): ${expDetalle}`;

  const prompt = `Sos un experto en recursos humanos argentino.
Generá un CV profesional en español para esta persona buscando trabajo en Argentina.

DATOS:
- Nombre: ${nombre}
- Edad: ${edad || 'No especificada'}
- Ciudad: ${ciudad || 'Argentina'}
- Experiencia: ${expTexto}
- Estudios: ${estudiosVal || 'No especificado'}
- Habilidades: ${habilidadesTexto || 'No especificadas'}
- Tipo de trabajo buscado: ${puesto || 'Cualquier empleo'}

IMPORTANTE: Si no tiene experiencia, destacá su predisposición, ganas de trabajar, puntualidad y capacidad de aprendizaje. Adaptá el CV para que sea competitivo aunque sea su primer empleo.

Generá el CV con estas secciones:
DATOS PERSONALES, OBJETIVO PROFESIONAL, EXPERIENCIA LABORAL, HABILIDADES Y COMPETENCIAS, EDUCACIÓN, DISPONIBILIDAD.

Escribilo en texto plano sin asteriscos ni símbolos raros. Hacelo profesional y adaptado al mercado laboral argentino.`;

  if (apiKey) {
    const texto = await llamarGemini(prompt, apiKey);
    if (texto) {
      cvFinal = texto;
      preview.textContent = texto;
      return;
    }
  }

  // CV local si no hay IA
  cvFinal = `CURRÍCULUM VITAE

DATOS PERSONALES
Nombre: ${nombre}
${edad ? `Edad: ${edad} años` : ''}
${ciudad ? `Localidad: ${ciudad}` : ''}
País: Argentina

OBJETIVO PROFESIONAL
${experiencia === 'sin_exp'
  ? `Joven con muchas ganas de incorporarme al mundo laboral. Me caracterizo por ser responsable, puntual y con gran predisposición para aprender. Busco mi primera oportunidad laboral en el rubro ${puesto || 'que me permita crecer profesionalmente'}.`
  : `Profesional con ${expTexto}. Busco nuevas oportunidades de crecimiento en el área de ${puesto || 'mi especialidad'}.`
}

EXPERIENCIA LABORAL
${expDetalle || (experiencia === 'sin_exp' ? 'Sin experiencia laboral previa. Disponible para capacitarme.' : 'Experiencia en el área')}

HABILIDADES Y COMPETENCIAS
${habilidadesTexto || 'Trabajo en equipo, responsabilidad, puntualidad, adaptabilidad, predisposición para aprender'}

EDUCACIÓN
${estudiosVal === 'primario' ? 'Primario completo' :
  estudiosVal === 'secundario_inc' ? 'Secundario incompleto' :
  estudiosVal === 'secundario' ? 'Secundario completo' :
  estudiosVal === 'terciario' ? 'Estudios terciarios/universitarios' :
  estudiosVal === 'universitario' ? 'Universitario completo' : 'Formación en proceso'}

DISPONIBILIDAD
Inmediata - ${horarios.includes('cualquier_horario') ? 'Cualquier horario' : horarios.join(', ')}`;

  preview.textContent = cvFinal;
}

window.generarCVconIA = generarCVconIA;

// ============================================
// LLAMAR GEMINI
// ============================================

async function llamarGemini(prompt, apiKey) {
  const modelos = [
    'gemini-1.5-flash',
    'gemini-pro'
  ];
  for (const modelo of modelos) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      const data = await res.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (texto) return texto;
    } catch {}
  }
  return null;
}

// ============================================
// GUARDAR PERFIL Y BUSCAR
// ============================================

async function guardarPerfilYBuscar() {
  const nombre = document.getElementById('nombre').value.trim();
  const edad = document.getElementById('edad').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();
  const puesto = document.getElementById('puesto-buscado').value.trim();
  const salario = document.getElementById('salario').value.trim();
  const estudiosVal = document.getElementById('estudios').value;
  const expDetalle = document.getElementById('experiencia-detalle')?.value.trim() || '';

  if (!puesto) {
    alert('Escribí qué tipo de trabajo buscás');
    return;
  }

  if (!ciudad) {
    alert('Escribí en qué ciudad o zona vivís');
    return;
  }

  if (opcionCVactual === 'texto') {
    cvFinal = document.getElementById('cv-texto').value.trim();
  }

  perfil = {
    nombre, edad, ciudad, puesto, salario,
    estudios: estudiosVal, experiencia, expDetalle,
    modalidad, viaje, horarios, habilidades, cv: cvFinal
  };

  if (usuarioActual) {
    await guardarPerfilFirebase(usuarioActual.uid, perfil);
  }

  irA('pantalla-resultados');
  buscarEmpleos(puesto, ciudad, cvFinal);
}

window.guardarPerfilYBuscar = guardarPerfilYBuscar;

// ============================================
// BUSCAR EMPLEOS
// ============================================

async function buscarEmpleos(puesto, ciudad, cv) {
  document.getElementById('titulo-resultados').textContent = 'Buscando empleos...';
  document.getElementById('subtitulo-resultados').textContent = 'La IA está analizando las mejores opciones para vos';
  document.getElementById('lista-empleos').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      Buscando en portales argentinos...
    </div>
  `;

  try {
    const empleos = await obtenerEmpleos(puesto, ciudad);
    const analizados = await analizarConIA(empleos, puesto, cv);
    empleosActuales = analizados.sort((a, b) => b.score - a.score);
    mostrarResultados(empleosActuales, puesto);
  } catch {
    document.getElementById('lista-empleos').innerHTML =
      '<div class="cargando">❌ Error al buscar. Revisá tu conexión.</div>';
  }
}

// ============================================
// OBTENER EMPLEOS ARGENTINOS
// ============================================

async function obtenerEmpleos(puesto, ciudad) {
  const empleos = [];

  // Fuente 1: Arbeitnow (tiene empleos en español)
  try {
    const res = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(puesto)}`
    );
    const data = await res.json();
    if (data.data && data.data.length > 0) {
      data.data.slice(0, 5).forEach((job, i) => {
        empleos.push({
          id: empleos.length + 1,
          titulo: job.title,
          empresa: job.company_name || 'Empresa',
          ubicacion: job.location || 'Argentina',
          descripcion: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 500),
          link: job.url,
          fuente: 'Arbeitnow',
          score: 0,
          analisis: null
        });
      });
    }
  } catch {}

  // Fuente 2: Remotive
  try {
    const res = await fetch(
      `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(puesto)}&limit=5`
    );
    const data = await res.json();
    if (data.jobs && data.jobs.length > 0) {
      data.jobs.slice(0, 5).forEach((job) => {
        empleos.push({
          id: empleos.length + 1,
          titulo: job.title,
          empresa: job.company_name,
          ubicacion: job.candidate_required_location || 'Remoto',
          descripcion: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 500),
          link: job.url,
          fuente: 'Remotive',
          score: 0,
          analisis: null
        });
      });
    }
  } catch {}

  // Si no encontramos nada, generamos demo argentino
  if (empleos.length === 0) {
    return generarEmpleosArgentinos(puesto, ciudad);
  }

  return empleos;
}

function generarEmpleosArgentinos(puesto, ciudad) {
  const zona = ciudad || 'Buenos Aires';
  const empresas = [
    { nombre: 'Supermercado Día', zona: zona },
    { nombre: 'Carrefour Argentina', zona: zona },
    { nombre: 'Mercado Libre', zona: 'Buenos Aires' },
    { nombre: 'Atento Argentina', zona: zona },
    { nombre: 'Sodexo Argentina', zona: zona },
    { nombre: 'Securitas Argentina', zona: zona },
    { nombre: 'Adecco Argentina', zona: zona },
    { nombre: 'Manpower Argentina', zona: zona }
  ];

  const descripcionesPorPuesto = {
    operario: `Buscamos operario/a de producción para incorporarse a nuestro equipo. 
Tareas: manejo de maquinaria, control de calidad, orden y limpieza del sector.
Requisitos: secundario completo, disponibilidad horaria, responsabilidad.
Se valorará experiencia previa pero no es excluyente. Capacitación a cargo de la empresa.`,
    repositor: `Incorporamos repositor/a para nuestro local. 
Tareas: reposición de mercadería, control de stock, mantenimiento del orden en góndola.
Requisitos: secundario completo, buena predisposición, trabajo en equipo.
Turnos rotativos. No se requiere experiencia previa.`,
    cajero: `Buscamos cajero/a para incorporarse a nuestro equipo de trabajo.
Tareas: atención al cliente, cobro en caja, manejo de efectivo y tarjetas.
Requisitos: secundario completo, habilidades numéricas, trato amable.
Capacitación incluida. Horarios rotativos.`,
    default: `Buscamos personal para incorporarse a nuestro equipo.
Requisitos: buena predisposición, responsabilidad, ganas de trabajar.
Se valora experiencia previa pero no es excluyente.
Capacitación a cargo de la empresa. Posibilidades de crecimiento.`
  };

  const puestoLower = puesto.toLowerCase();
  const descripcion = descripcionesPorPuesto[
    puestoLower.includes('operario') ? 'operario' :
    puestoLower.includes('repositor') ? 'repositor' :
    puestoLower.includes('cajero') ? 'cajero' : 'default'
  ];

  return empresas.map((emp, i) => ({
    id: i + 1,
    titulo: `${puesto} - ${['Turno mañana', 'Turno tarde', 'Turno rotativo', 'Full time', 'Part time', 'Ingreso inmediato', 'Con y sin exp.', 'Zona Norte'][i]}`,
    empresa: emp.nombre,
    ubicacion: emp.zona + ', Argentina',
    descripcion: descripcion,
    link: `https://www.bumeran.com.ar/empleos-${puesto.toLowerCase().replace(/ /g, '-')}.html`,
    fuente: 'Bumeran',
    score: 0,
    analisis: null
  }));
}

// ============================================
// ANALIZAR CON IA
// ============================================

async function analizarConIA(empleos, puesto, cv) {
  const apiKey = localStorage.getItem('labuia_gemini_key') || '';

  const perfilTexto = `
Nombre: ${perfil.nombre || 'Candidato'}
Ciudad: ${perfil.ciudad || 'Argentina'}
Experiencia: ${perfil.experiencia || 'sin_exp'}
Estudios: ${perfil.estudios || 'No especificado'}
Habilidades: ${(perfil.habilidades || []).join(', ') || 'No especificadas'}
Disponibilidad: ${(perfil.horarios || []).join(', ')}
Trabajo buscado: ${puesto}
${cv ? `CV completo:\n${cv.substring(0, 600)}` : ''}
  `.trim();

  if (!apiKey) {
    return empleos.map((e, i) => ({
      ...e,
      score: Math.max(92 - (i * 6), 45),
      analisis: {
        fortalezas: [
          'Tu búsqueda coincide con este tipo de puesto',
          'Tu zona está cerca de esta empresa',
          'Activá la IA para ver análisis detallado'
        ],
        debilidades: ['Configurá tu API Key de Gemini para análisis real'],
        resumen: 'Score estimado. Activá la IA para compatibilidad real.'
      }
    }));
  }

  const resultado = [];
  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino especializado en perfiles operativos y sin experiencia.
Analizá la compatibilidad entre este perfil y esta oferta de trabajo.

PERFIL DEL CANDIDATO:
${perfilTexto}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Ubicación: ${empleo.ubicacion}
Descripción: ${empleo.descripcion.substring(0, 400)}

IMPORTANTE: Si el candidato no tiene experiencia pero el puesto tampoco la requiere, dale un score alto.
Si el candidato tiene habilidades relevantes como licencia de conducir o manejo de PC para el puesto, valoralo positivamente.

Respondé ÚNICAMENTE con este JSON sin texto extra:
{
  "score": numero del 1 al 100,
  "fortalezas": ["razón concreta 1", "razón concreta 2", "razón concreta 3"],
  "debilidades": ["punto 1", "punto 2"],
  "resumen": "Una oración corta en español argentino explicando la compatibilidad"
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
          <span class="tag">${emp.fuente || 'Argentina'}</span>
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

    <div class="detalle-seccion">
      <h3>📄 Descripción del puesto</h3>
      <p style="font-size:13px;color:#cbd5e1;line-height:1.6">${emp.descripcion}</p>
    </div>

    <button class="btn-adaptar" onclick="adaptarCV()">
      📄 Adaptar mi CV a este puesto
    </button>

    <button class="btn-postular" onclick="postularme()">
      💼 Postularme ahora
    </button>
  `;

  irA('pantalla-detalle');
}

window.verDetalle = verDetalle;

// ============================================
// ADAPTAR CV AL PUESTO
// ============================================

async function adaptarCV() {
  if (!empleoSeleccionado) return;

  irA('pantalla-cv-adaptado');
  document.getElementById('subtitulo-cv-adaptado').textContent =
    `Para: ${empleoSeleccionado.titulo} en ${empleoSeleccionado.empresa}`;
  document.getElementById('cv-adaptado-contenido').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      La IA está adaptando tu CV...
    </div>
  `;

  const apiKey = localStorage.getItem('labuia_gemini_key') || '';
  const emp = empleoSeleccionado;

  const perfilTexto = `
Nombre: ${perfil.nombre || 'Candidato'}
Ciudad: ${perfil.ciudad || 'Argentina'}
Experiencia: ${perfil.experiencia === 'sin_exp' ? 'Sin experiencia laboral' :
  perfil.expDetalle || 'Con experiencia'}
Estudios: ${perfil.estudios || 'No especificado'}
Habilidades: ${(perfil.habilidades || []).join(', ') || 'No especificadas'}
Disponibilidad: ${(perfil.horarios || []).join(', ')}
${cvFinal ? `CV actual:\n${cvFinal.substring(0, 800)}` : ''}
  `.trim();

  const prompt = `Sos un experto en recursos humanos argentino.
Adaptá el CV de esta persona específicamente para el puesto indicado.

PERFIL:
${perfilTexto}

PUESTO AL QUE SE POSTULA:
Título: ${emp.titulo}
Empresa: ${emp.empresa}
Descripción: ${emp.descripcion}

INSTRUCCIONES IMPORTANTES:
- Si no tiene experiencia, destacá sus ganas de trabajar, responsabilidad, puntualidad y capacidad de aprendizaje
- Resaltá las habilidades que coincidan con el puesto
- Escribí un objetivo profesional específico para este puesto
- Hacelo en texto plano, sin asteriscos
- Usá lenguaje argentino natural y profesional
- El CV debe verse competitivo para este puesto específico

Generá el CV adaptado completo.`;

  if (apiKey) {
    const cvAdaptado = await llamarGemini(prompt, apiKey);
    if (cvAdaptado) {
      cvAdaptadoTexto = cvAdaptado;
      document.getElementById('cv-adaptado-contenido').innerHTML =
        `<div class="cv-adaptado-box">${cvAdaptado}</div>`;
      return;
    }
  }

  // Sin IA: CV adaptado básico
  cvAdaptadoTexto = `CURRÍCULUM VITAE
Adaptado para: ${emp.titulo} - ${emp.empresa}

DATOS PERSONALES
Nombre: ${perfil.nombre || 'Candidato'}
${perfil.ciudad ? `Localidad: ${perfil.ciudad}` : ''}
País: Argentina

OBJETIVO PROFESIONAL
Me postulo para el puesto de ${emp.titulo} en ${emp.empresa}. 
${perfil.experiencia === 'sin_exp'
  ? 'Aunque no cuento con experiencia formal, me caracterizo por mi responsabilidad, puntualidad y gran predisposición para aprender y adaptarme rápidamente.'
  : `Cuento con ${perfil.expDetalle || 'experiencia en el área'} y busco nuevos desafíos profesionales.`}

EXPERIENCIA LABORAL
${perfil.expDetalle || (perfil.experiencia === 'sin_exp' 
  ? 'Sin experiencia previa. Disponible para capacitación inmediata.' 
  : 'Experiencia en el área')}

HABILIDADES Y COMPETENCIAS
${(perfil.habilidades || []).join(', ') || 'Trabajo en equipo, responsabilidad, puntualidad, predisposición para aprender'}

EDUCACIÓN
${perfil.estudios === 'secundario' ? 'Secundario completo' :
  perfil.estudios === 'secundario_inc' ? 'Secundario incompleto' :
  perfil.estudios === 'primario' ? 'Primario completo' :
  perfil.estudios || 'Formación en proceso'}

DISPONIBILIDAD
Inmediata - ${(perfil.horarios || ['Cualquier horario']).join(', ')}`;

  document.getElementById('cv-adaptado-contenido').innerHTML =
    `<div class="cv-adaptado-box">${cvAdaptadoTexto}</div>`;
}

window.adaptarCV = adaptarCV;

// ============================================
// COPIAR CV
// ============================================

function copiarCV() {
  if (!cvAdaptadoTexto) return;
  navigator.clipboard.writeText(cvAdaptadoTexto).then(() => {
    alert('✅ CV copiado al portapapeles');
  }).catch(() => {
    alert('Para copiar: mantenés presionado el texto del CV y seleccionás todo');
  });
}

window.copiarCV = copiarCV;

// ============================================
// POSTULACIÓN
// ============================================

function postularme() {
  if (!empleoSeleccionado) return;
  guardarPostulacion(empleoSeleccionado);
  window.open(empleoSeleccionado.link, '_blank');
}

function postularmeConCV() {
  if (!empleoSeleccionado) return;
  guardarPostulacion(empleoSeleccionado);
  window.open(empleoSeleccionado.link, '_blank');
}

async function guardarPostulacion(empleo) {
  const postulaciones = JSON.parse(localStorage.getItem('labuia_postulaciones') || '[]');
  const yaExiste = postulaciones.find(p =>
    p.titulo === empleo.titulo && p.empresa === empleo.empresa
  );
  if (!yaExiste) {
    postulaciones.unshift({
      titulo: empleo.titulo,
      empresa: empleo.empresa,
      ubicacion: empleo.ubicacion,
      score: empleo.score,
      fecha: new Date().toLocaleDateString('es-AR'),
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      estado: 'Enviada',
      link: empleo.link
    });
    localStorage.setItem('labuia_postulaciones', JSON.stringify(postulaciones));
    if (usuarioActual) {
      await guardarPerfilFirebase(usuarioActual.uid, { postulaciones });
    }
  }
}

window.postularme = postularme;
window.postularmeConCV = postularmeConCV;

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
            <span class="tag-verde">✓ ${p.estado}</span>
          </div>
        </div>
      `;
    }).join('')}
  `;
}

window.cargarPostulaciones = cargarPostulaciones;
