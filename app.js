// ============================================
// LABUIA - App principal con Firebase + Jooble
// ============================================

import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc }
  from './firebase-config.js';

// ============================================
// CONFIGURACIÓN
// ============================================

const JOOBLE_API_KEY = '9a26ed6d-5b55-40aa-807f-e5ea117782ca';
const JOOBLE_API_URL = 'https://jooble.org/api/';

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
// AUTENTICACIÓN - SESIÓN PERSISTENTE
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
// FIREBASE
// ============================================

async function guardarPerfilFirebase(uid, datos) {
  try {
    await setDoc(doc(db, 'usuarios', uid), datos, { merge: true });
  } catch (e) {
    console.log('Error guardando:', e);
  }
}

async function cargarPerfilFirebase(uid) {
  try {
    const snap = await getDoc(doc(db, 'usuarios', uid));
    if (snap.exists()) {
      const datos = snap.data();
      perfil = datos;
      if (datos.nombre) document.getElementById('nombre').value = datos.nombre;
      if (datos.edad) document.getElementById('edad').value = datos.edad;
      if (datos.celular) document.getElementById('celular').value = datos.celular;
      if (datos.emailContacto) document.getElementById('email-contacto').value = datos.emailContacto;
      if (datos.ciudad) document.getElementById('ciudad').value = datos.ciudad;
      if (datos.puestoBuscado) document.getElementById('puesto-buscado').value = datos.puestoBuscado;
      if (datos.salario) document.getElementById('salario').value = datos.salario;
      if (datos.estudios) document.getElementById('estudios').value = datos.estudios;
      if (datos.institucion) document.getElementById('institucion').value = datos.institucion;
      if (datos.expEmpresa) {
        const el = document.getElementById('experiencia-empresa');
        if (el) el.value = datos.expEmpresa;
      }
      if (datos.expDetalle) {
        const el = document.getElementById('experiencia-detalle');
        if (el) el.value = datos.expDetalle;
      }
      if (datos.infoExtra) {
        const el = document.getElementById('info-extra');
        if (el) el.value = datos.infoExtra;
      }
      if (datos.cv) cvFinal = datos.cv;

      if (datos.geminiKey) {
        localStorage.setItem('labuia_gemini_key', datos.geminiKey);
        const el = document.getElementById('gemini-key');
        if (el) el.value = datos.geminiKey;
        const estado = document.getElementById('api-key-estado');
        if (estado) {
          estado.style.cssText = 'background:#052e16;color:#22c55e;border:1px solid #22c55e';
          estado.textContent = '✅ IA activada';
        }
      }

      if (datos.modalidad) { modalidad = datos.modalidad; actualizarToggle('modalidad', modalidad); }
      if (datos.viaje) { viaje = datos.viaje; actualizarToggleSimple(viaje); }
      if (datos.experiencia) {
        experiencia = datos.experiencia;
        actualizarToggle('experiencia', experiencia);
        if (experiencia !== 'sin_exp') {
          const zona = document.getElementById('zona-experiencia-detalle');
          if (zona) zona.classList.remove('oculto');
        }
      }
      if (datos.horarios) { horarios = datos.horarios; actualizarToggleCheck(horarios); }
      if (datos.habilidades) { habilidades = datos.habilidades; actualizarToggleCheck(habilidades); }
    }
  } catch (e) {
    console.log('Error cargando:', e);
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
      if (zona) experiencia === 'sin_exp' ? zona.classList.add('oculto') : zona.classList.remove('oculto');
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
      horarios = horarios.includes(valor) ? horarios.filter(h => h !== valor) : [...horarios, valor];
    } else {
      habilidades = habilidades.includes(valor) ? habilidades.filter(h => h !== valor) : [...habilidades, valor];
    }
  });
});

// ============================================
// API KEY GEMINI
// ============================================

function toggleAPIkey() {
  const zona = document.getElementById('api-key-zona');
  const arrow = document.getElementById('api-key-arrow');
  zona.classList.toggle('oculto');
  arrow.textContent = zona.classList.contains('oculto') ? '▼' : '▲';
}

async function guardarAPIkey() {
  const key = document.getElementById('gemini-key').value.trim();
  const estado = document.getElementById('api-key-estado');
  if (!key || key.length < 10) {
    estado.style.cssText = 'background:#1c0a00;color:#f97316;border:1px solid #f97316';
    estado.textContent = '❌ Key inválida';
    return;
  }
  localStorage.setItem('labuia_gemini_key', key);
  if (usuarioActual) {
    await guardarPerfilFirebase(usuarioActual.uid, { geminiKey: key });
  }
  estado.style.cssText = 'background:#052e16;color:#22c55e;border:1px solid #22c55e';
  estado.textContent = '✅ IA activada y guardada para siempre';
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
// LLAMAR GEMINI
// ============================================

async function llamarGemini(prompt, apiKey) {
  const modelos = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
  for (const modelo of modelos) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
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
// CONSTRUIR PERFIL TEXTO
// ============================================

function construirPerfilTexto() {
  const horarioTexto = (perfil.horarios || horarios)
    .map(h => h === 'cualquier_horario' ? 'Cualquier horario' :
      h === 'manana' ? 'Turno mañana' :
      h === 'tarde' ? 'Turno tarde' :
      h === 'noche' ? 'Turno noche' :
      h === 'rotativo' ? 'Turno rotativo' : h)
    .join(', ');

  const expTexto = (perfil.experiencia || experiencia) === 'sin_exp' ? 'Sin experiencia laboral' :
    (perfil.experiencia || experiencia) === 'poca_exp' ? 'Poca experiencia (1-2 años)' :
    (perfil.experiencia || experiencia) === 'media_exp' ? 'Experiencia media (3-5 años)' :
    'Experiencia amplia (+5 años)';

  return `
Nombre: ${perfil.nombre || ''}
Edad: ${perfil.edad || 'No especificada'}
Celular: ${perfil.celular || 'No especificado'}
Email: ${perfil.emailContacto || 'No especificado'}
Ciudad: ${perfil.ciudad || 'Argentina'}
Nivel de experiencia: ${expTexto}
Empresa(s) donde trabajó: ${perfil.expEmpresa || 'No especificado'}
Descripción de sus tareas (en sus palabras): ${perfil.expDetalle || 'No especificado'}
Información adicional: ${perfil.infoExtra || 'No especificado'}
Estudios: ${perfil.estudios || 'No especificado'}
Institución educativa: ${perfil.institucion || 'No especificada'}
Habilidades: ${(perfil.habilidades || habilidades).join(', ') || 'No especificadas'}
Disponibilidad: ${horarioTexto}
Modalidad buscada: ${perfil.modalidad || modalidad}
${cvFinal ? `CV cargado:\n${cvFinal.substring(0, 800)}` : ''}
  `.trim();
}

// ============================================
// GENERAR CV CON IA
// ============================================

async function generarCVconIA() {
  const preview = document.getElementById('cv-generado-preview');
  preview.style.display = 'block';
  preview.textContent = '⏳ Generando CV con IA...';

  const apiKey = localStorage.getItem('labuia_gemini_key') || '';
  const puesto = perfil.puestoBuscado || document.getElementById('puesto-buscado').value.trim();

  const prompt = `Sos un experto en recursos humanos argentino especializado en redactar CVs profesionales.
Tu tarea es generar un CV profesional y competitivo.

INFORMACIÓN DEL CANDIDATO:
${construirPerfilTexto()}
PUESTO QUE BUSCA: ${puesto || 'Cualquier empleo'}

INSTRUCCIONES:
- Si describió sus tareas con palabras simples, transformalas en lenguaje profesional
- Si tiene habilidades técnicas aunque sea por poco tiempo, incluílas con "(conocimiento práctico)"
- Si no tiene experiencia formal, destacá fuertemente las ganas de trabajar y capacidad de aprendizaje
- Incluí SIEMPRE los datos de contacto completos al inicio
- Texto plano sin asteriscos ni símbolos raros
- Lenguaje argentino profesional

SECCIONES: DATOS PERSONALES Y CONTACTO, OBJETIVO PROFESIONAL, EXPERIENCIA LABORAL, HABILIDADES Y COMPETENCIAS, EDUCACIÓN, DISPONIBILIDAD`;

  if (apiKey) {
    const texto = await llamarGemini(prompt, apiKey);
    if (texto) {
      cvFinal = texto;
      preview.textContent = texto;
      if (usuarioActual) guardarPerfilFirebase(usuarioActual.uid, { cv: cvFinal });
      return;
    }
  }

  // CV local sin IA
  const estudiosTexto = (perfil.estudios || '') === 'primario' ? 'Primario completo' :
    (perfil.estudios || '') === 'secundario_inc' ? 'Secundario incompleto' :
    (perfil.estudios || '') === 'secundario' ? 'Secundario completo' :
    (perfil.estudios || '') === 'terciario' ? 'Terciario en curso' :
    (perfil.estudios || '') === 'universitario' ? 'Universitario completo' : 'Formación en proceso';

  cvFinal = `CURRÍCULUM VITAE

DATOS PERSONALES Y CONTACTO
Nombre: ${perfil.nombre || ''}
${perfil.edad ? `Edad: ${perfil.edad} años` : ''}
${perfil.celular ? `Celular: ${perfil.celular}` : ''}
${perfil.emailContacto ? `Email: ${perfil.emailContacto}` : ''}
${perfil.ciudad ? `Localidad: ${perfil.ciudad}, Argentina` : 'País: Argentina'}

OBJETIVO PROFESIONAL
${(perfil.experiencia || experiencia) === 'sin_exp'
  ? `Joven con muchas ganas de incorporarme al mundo laboral. Me caracterizo por mi responsabilidad, puntualidad y predisposición para aprender. Busco mi primera oportunidad en ${puesto || 'el área que me permita crecer'}.`
  : `Profesional con experiencia en ${perfil.expEmpresa || 'el área'}. Busco nuevas oportunidades en ${puesto || 'mi especialidad'}.`}

EXPERIENCIA LABORAL
${perfil.expEmpresa ? `Empresa: ${perfil.expEmpresa}
Tareas: ${perfil.expDetalle || 'Tareas operativas'}` : 'Sin experiencia formal previa. Disponible para capacitación.'}
${perfil.infoExtra ? `\nInformación adicional: ${perfil.infoExtra}` : ''}

HABILIDADES Y COMPETENCIAS
${(perfil.habilidades || habilidades).join(', ') || 'Trabajo en equipo, responsabilidad, puntualidad, adaptabilidad'}

EDUCACIÓN
${estudiosTexto}
${perfil.institucion ? `Institución: ${perfil.institucion}` : ''}

DISPONIBILIDAD
Inmediata`;

  preview.textContent = cvFinal;
}

window.generarCVconIA = generarCVconIA;

// ============================================
// GUARDAR PERFIL Y BUSCAR
// ============================================

async function guardarPerfilYBuscar() {
  const nombre = document.getElementById('nombre').value.trim();
  const edad = document.getElementById('edad').value.trim();
  const celular = document.getElementById('celular').value.trim();
  const emailContacto = document.getElementById('email-contacto').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();
  const puesto = document.getElementById('puesto-buscado').value.trim();
  const salario = document.getElementById('salario').value.trim();
  const estudiosVal = document.getElementById('estudios').value;
  const institucion = document.getElementById('institucion').value.trim();
  const expEmpresa = document.getElementById('experiencia-empresa')?.value.trim() || '';
  const expDetalle = document.getElementById('experiencia-detalle')?.value.trim() || '';
  const infoExtra = document.getElementById('info-extra')?.value.trim() || '';

  if (!puesto) { alert('Escribí qué tipo de trabajo buscás'); return; }
  if (!ciudad) { alert('Escribí en qué ciudad o zona vivís'); return; }

  if (opcionCVactual === 'texto') {
    cvFinal = document.getElementById('cv-texto').value.trim();
  }

  perfil = {
    nombre, edad, celular, emailContacto, ciudad,
    puestoBuscado: puesto, salario,
    estudios: estudiosVal, institucion,
    experiencia, expEmpresa, expDetalle, infoExtra,
    modalidad, viaje, horarios, habilidades, cv: cvFinal
  };

  if (usuarioActual) {
    await guardarPerfilFirebase(usuarioActual.uid, perfil);
  }

  irA('pantalla-resultados');
  buscarEmpleos(puesto, ciudad);
}

window.guardarPerfilYBuscar = guardarPerfilYBuscar;

// ============================================
// BUSCAR EMPLEOS CON JOOBLE
// ============================================

async function buscarEmpleos(puesto, ciudad) {
  document.getElementById('titulo-resultados').textContent = 'Buscando empleos...';
  document.getElementById('subtitulo-resultados').textContent = 'Buscando en portales argentinos...';
  document.getElementById('lista-empleos').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      Buscando empleos reales en Argentina...
    </div>
  `;

  try {
    const empleos = await obtenerEmpleosJooble(puesto, ciudad);
    const analizados = await analizarConIA(empleos, puesto);
    empleosActuales = analizados.sort((a, b) => b.score - a.score);
    mostrarResultados(empleosActuales, puesto);
  } catch (e) {
    console.log('Error:', e);
    document.getElementById('lista-empleos').innerHTML =
      '<div class="cargando">❌ Error al buscar. Revisá tu conexión e intentá de nuevo.</div>';
  }
}

// ============================================
// API JOOBLE - EMPLEOS REALES
// ============================================

async function obtenerEmpleosJooble(puesto, ciudad) {
  try {
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(
      `${JOOBLE_API_URL}${JOOBLE_API_KEY}`
    )}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: puesto,
        location: ciudad || 'Argentina',
        country: 'ar',
        page: 1,
        resultsOnPage: 20
      })
    });

    const data = await response.json();

    if (data.jobs && data.jobs.length > 0) {
      return data.jobs.slice(0, 15).map((job, i) => ({
        id: i + 1,
        titulo: job.title || puesto,
        empresa: job.company || 'Empresa confidencial',
        ubicacion: job.location || ciudad || 'Argentina',
        descripcion: (job.snippet || '').replace(/<[^>]*>/g, '').substring(0, 600),
        link: job.link,
        salario: job.salary || '',
        fuente: 'Jooble',
        esEmpresaGrande: detectarEmpresaGrande(job.company || ''),
        score: 0,
        analisis: null
      }));
    }
  } catch (e) {
    console.log('Error Jooble:', e);
  }

  // Si Jooble falla, usamos empleos de respaldo
  return generarEmpleosRespaldo(puesto, ciudad);
}

function detectarEmpresaGrande(nombre) {
  const grandes = ['arcor', 'carrefour', 'mercado libre', 'mercadolibre', 'banco',
    'galicia', 'santander', 'bbva', 'hsbc', 'quilmes', 'pepsico', 'unilever',
    'walmart', 'coto', 'jumbo', 'dia', 'molinos', 'bimbo', 'kraft', 'danone',
    'coca-cola', 'personal', 'claro', 'movistar', 'telecom', 'despegar',
    'globant', 'mercadopago', 'pedidosya', 'rappi'];
  const nombreLower = nombre.toLowerCase();
  return grandes.some(g => nombreLower.includes(g));
}

function generarEmpleosRespaldo(puesto, ciudad) {
  const zona = ciudad || 'Buenos Aires';
  const puestoLower = puesto.toLowerCase();
  const empresas = {
    repositor: [
      { empresa: 'Carrefour Argentina', link: 'https://ar.jooble.org/trabajos-repositor/Argentina' },
      { empresa: 'Supermercados DIA', link: 'https://ar.jooble.org/trabajos-repositor/Argentina' },
      { empresa: 'Coto CICSA', link: 'https://ar.jooble.org/trabajos-repositor/Argentina' },
      { empresa: 'Jumbo Argentina', link: 'https://ar.jooble.org/trabajos-repositor/Argentina' },
      { empresa: 'Walmart Argentina', link: 'https://ar.jooble.org/trabajos-repositor/Argentina' },
    ],
    operario: [
      { empresa: 'Arcor', link: 'https://ar.jooble.org/trabajos-operario/Argentina' },
      { empresa: 'Molinos Río de la Plata', link: 'https://ar.jooble.org/trabajos-operario/Argentina' },
      { empresa: 'Quilmes', link: 'https://ar.jooble.org/trabajos-operario/Argentina' },
      { empresa: 'Pepsico Argentina', link: 'https://ar.jooble.org/trabajos-operario/Argentina' },
      { empresa: 'CCU Argentina', link: 'https://ar.jooble.org/trabajos-operario/Argentina' },
    ],
    cajero: [
      { empresa: 'Carrefour Argentina', link: 'https://ar.jooble.org/trabajos-cajero/Argentina' },
      { empresa: 'Farmacity', link: 'https://ar.jooble.org/trabajos-cajero/Argentina' },
      { empresa: 'Coto CICSA', link: 'https://ar.jooble.org/trabajos-cajero/Argentina' },
      { empresa: 'Rapipago', link: 'https://ar.jooble.org/trabajos-cajero/Argentina' },
      { empresa: 'Pago Fácil', link: 'https://ar.jooble.org/trabajos-cajero/Argentina' },
    ],
    default: [
      { empresa: 'Adecco Argentina', link: `https://ar.jooble.org/trabajos-${puestoLower.replace(/ /g,'-')}/Argentina` },
      { empresa: 'Manpower Argentina', link: `https://ar.jooble.org/trabajos-${puestoLower.replace(/ /g,'-')}/Argentina` },
      { empresa: 'Randstad Argentina', link: `https://ar.jooble.org/trabajos-${puestoLower.replace(/ /g,'-')}/Argentina` },
      { empresa: 'Kelly Services', link: `https://ar.jooble.org/trabajos-${puestoLower.replace(/ /g,'-')}/Argentina` },
      { empresa: 'Bayton RRHH', link: `https://ar.jooble.org/trabajos-${puestoLower.replace(/ /g,'-')}/Argentina` },
    ]
  };

  const clave = Object.keys(empresas).find(k => puestoLower.includes(k)) || 'default';
  return empresas[clave].map((emp, i) => ({
    id: i + 1,
    titulo: puesto,
    empresa: emp.empresa,
    ubicacion: `${zona}, Argentina`,
    descripcion: `Oferta de ${puesto} en ${emp.empresa}. Hacé clic en "Postularme" para ver los detalles completos y aplicar directamente en el portal de empleos.`,
    link: emp.link,
    salario: '',
    fuente: 'Jooble',
    esEmpresaGrande: detectarEmpresaGrande(emp.empresa),
    score: 0,
    analisis: null
  }));
}

// ============================================
// ANALIZAR CON IA
// ============================================

async function analizarConIA(empleos, puesto) {
  const apiKey = localStorage.getItem('labuia_gemini_key') || '';
  const perfilTexto = construirPerfilTexto();

  if (!apiKey) {
    return empleos.map((e, i) => ({
      ...e,
      score: Math.max(88 - (i * 4), 50),
      analisis: {
        fortalezas: [
          'Empleo real encontrado en Argentina',
          'El puesto coincide con tu búsqueda',
          'Activá la IA Gemini para ver análisis de compatibilidad real'
        ],
        debilidades: ['Configurá tu API Key en "Activar IA real" para análisis detallado'],
        resumen: 'Score estimado. Activá la IA para ver tu compatibilidad real.'
      }
    }));
  }

  const resultado = [];
  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino.
Analizá la compatibilidad entre este perfil y esta oferta real de trabajo.

PERFIL:
${perfilTexto}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Ubicación: ${empleo.ubicacion}
Descripción: ${empleo.descripcion.substring(0, 400)}

REGLAS:
- Si el puesto no requiere experiencia y el candidato no tiene → score 70-85
- Si tiene habilidades que coinciden → sumá puntos
- Si describió experiencia relevante → valoralo aunque esté en sus palabras
- Sé específico y útil

Respondé SOLO con este JSON:
{
  "score": numero del 1 al 100,
  "fortalezas": ["razón 1", "razón 2", "razón 3"],
  "debilidades": ["punto 1", "punto 2"],
  "resumen": "Una oración en español rioplatense"
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
    `${empleos.length} ofertas reales encontradas para "${puesto}"`;

  document.getElementById('lista-empleos').innerHTML = `
    <div class="powered-by">🔍 Empleos provistos por <strong>Jooble</strong></div>
    ${empleos.map(emp => {
      const clase = emp.score >= 75 ? 'score-alto' : emp.score >= 50 ? 'score-medio' : 'score-bajo';
      const badgeGrande = emp.esEmpresaGrande ? '<span class="tag-verde">🏢 Empresa grande</span>' : '';
      const salario = emp.salario ? `<span class="tag">💰 ${emp.salario}</span>` : '';
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
            ${salario}
            ${badgeGrande}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

// ============================================
// VER DETALLE
// ============================================

function verDetalle(id) {
  empleoSeleccionado = empleosActuales.find(e => e.id === id);
  if (!empleoSeleccionado) return;

  const emp = empleoSeleccionado;
  const clase = emp.score >= 75 ? 'score-alto' : emp.score >= 50 ? 'score-medio' : 'score-bajo';
  const atsAviso = emp.esEmpresaGrande ?
    '<div class="aviso-ats">🏢 <strong>Empresa grande</strong> — Al adaptar tu CV, la IA lo formatea en estilo ATS/Harvard para pasar los filtros automáticos.</div>' :
    '<div class="aviso-ats" style="border-color:#22c55e;background:#0d2d1a">✨ <strong>Empresa mediana</strong> — La IA usará un formato moderno y cálido para tu CV.</div>';

  document.getElementById('contenido-detalle').innerHTML = `
    <div class="detalle-header">
      <div class="detalle-titulo">${emp.titulo}</div>
      <div class="detalle-empresa">${emp.empresa} · ${emp.ubicacion}</div>
      ${emp.salario ? `<div style="color:#22c55e;font-size:14px;margin:8px 0">💰 ${emp.salario}</div>` : ''}
      <div class="score-grande ${clase}">${emp.score}%</div>
      <p class="resumen-texto">${emp.analisis?.resumen || 'Activá la IA para ver tu compatibilidad real'}</p>
    </div>

    ${atsAviso}

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
// ADAPTAR CV CON IA
// ============================================

async function adaptarCV() {
  if (!empleoSeleccionado) return;

  irA('pantalla-cv-adaptado');
  const emp = empleoSeleccionado;
  document.getElementById('subtitulo-cv-adaptado').textContent =
    `Para: ${emp.titulo} en ${emp.empresa}`;
  document.getElementById('cv-adaptado-contenido').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      La IA está generando tu CV profesional...
    </div>
  `;

  const apiKey = localStorage.getItem('labuia_gemini_key') || '';
  const esGrande = emp.esEmpresaGrande;

  const estudiosTexto = (perfil.estudios || '') === 'primario' ? 'Primario completo' :
    (perfil.estudios || '') === 'secundario_inc' ? 'Secundario incompleto' :
    (perfil.estudios || '') === 'secundario' ? 'Secundario completo' :
    (perfil.estudios || '') === 'terciario' ? 'Terciario en curso' :
    (perfil.estudios || '') === 'universitario' ? 'Universitario completo' : '';

  const horarioTexto = (perfil.horarios || horarios)
    .map(h => h === 'cualquier_horario' ? 'Cualquier horario' :
      h === 'manana' ? 'Turno mañana' :
      h === 'tarde' ? 'Turno tarde' :
      h === 'noche' ? 'Turno noche' :
      h === 'rotativo' ? 'Turno rotativo' : h)
    .join(', ');

  const formatoInstruccion = esGrande ?
    `FORMATO REQUERIDO: ATS/Harvard
- Una sola columna, texto plano
- Sin tablas, sin colores, sin íconos
- Palabras clave del puesto bien visibles
- Secciones en MAYÚSCULAS
- Orden: DATOS PERSONALES, OBJETIVO, EXPERIENCIA, HABILIDADES, EDUCACIÓN, DISPONIBILIDAD` :
    `FORMATO REQUERIDO: Moderno y cercano
- Lenguaje cálido y profesional
- Destacar actitud y personalidad
- Objetivo profesional entusiasta y específico`;

  if (!apiKey) {
    cvAdaptadoTexto = generarCVbasico(emp, estudiosTexto, horarioTexto);
    document.getElementById('cv-adaptado-contenido').innerHTML =
      `<div class="cv-adaptado-box">${cvAdaptadoTexto.replace(/\n/g, '<br>')}</div>`;
    return;
  }

  const prompt = `Sos un experto en recursos humanos argentino especializado en CVs profesionales.
Generá un CV adaptado específicamente para este puesto.

DATOS COMPLETOS DEL CANDIDATO:
${construirPerfilTexto()}

PUESTO AL QUE SE POSTULA:
Título: ${emp.titulo}
Empresa: ${emp.empresa}
Descripción: ${emp.descripcion}

${formatoInstruccion}

REGLAS CRÍTICAS:
1. Usá SOLO información real del candidato. NUNCA inventes datos ni fechas.
2. Si describió tareas en palabras simples, transformalas en lenguaje profesional.
3. Habilidades técnicas aunque sean por poco tiempo: incluílas como "(conocimiento práctico)"
4. SIEMPRE incluí los datos de contacto completos al inicio.
5. Si no tiene experiencia formal: el OBJETIVO debe ser muy potente y específico para este puesto.
6. Texto plano sin asteriscos ni símbolos decorativos.
7. Lenguaje argentino profesional.

Generá el CV completo ahora:`;

  try {
    const cvGenerado = await llamarGemini(prompt, apiKey);
    if (cvGenerado) {
      cvAdaptadoTexto = cvGenerado;
      const badge = esGrande ?
        '<div class="aviso-ats">🏢 <strong>Formato ATS/Harvard</strong> — Optimizado para sistemas automáticos de grandes empresas.</div>' :
        '<div class="aviso-ats" style="border-color:#22c55e;background:#0d2d1a">✨ <strong>Formato moderno</strong> — Diseñado para destacar en empresas medianas y pymes.</div>';
      document.getElementById('cv-adaptado-contenido').innerHTML =
        badge + `<div class="cv-adaptado-box">${cvGenerado.replace(/\n/g, '<br>')}</div>`;
      return;
    }
  } catch (e) {
    console.log('Error adaptando CV:', e);
  }

  cvAdaptadoTexto = generarCVbasico(emp, estudiosTexto, horarioTexto);
  document.getElementById('cv-adaptado-contenido').innerHTML =
    `<div class="cv-adaptado-box">${cvAdaptadoTexto.replace(/\n/g, '<br>')}</div>`;
}

function generarCVbasico(emp, estudiosTexto, horarioTexto) {
  const expTexto = (perfil.experiencia || experiencia) === 'sin_exp' ? 'sin experiencia formal previa' :
    `con experiencia en ${perfil.expEmpresa || 'el área'}`;

  return `CURRÍCULUM VITAE

DATOS PERSONALES Y CONTACTO
Nombre: ${perfil.nombre || ''}
${perfil.edad ? `Edad: ${perfil.edad} años` : ''}
${perfil.celular ? `Celular: ${perfil.celular}` : ''}
${perfil.emailContacto ? `Email: ${perfil.emailContacto}` : ''}
${perfil.ciudad ? `Localidad: ${perfil.ciudad}, Argentina` : 'País: Argentina'}

OBJETIVO PROFESIONAL
Me postulo para el puesto de ${emp.titulo} en ${emp.empresa}.
${(perfil.experiencia || experiencia) === 'sin_exp'
  ? 'Me caracterizo por mi responsabilidad, puntualidad y gran predisposición para aprender. Estoy disponible de forma inmediata.'
  : `Profesional ${expTexto}. Busco nuevos desafíos donde pueda aportar mis conocimientos.`}

EXPERIENCIA LABORAL
${perfil.expEmpresa ? `Empresa: ${perfil.expEmpresa}
Tareas: ${perfil.expDetalle || 'Tareas operativas generales'}` : 'Sin experiencia formal. Disponible para capacitación inmediata.'}
${perfil.infoExtra ? `\nInformación adicional: ${perfil.infoExtra}` : ''}

HABILIDADES Y COMPETENCIAS
${(perfil.habilidades || habilidades).join(', ') || 'Trabajo en equipo, responsabilidad, puntualidad, adaptabilidad'}

EDUCACIÓN
${estudiosTexto || 'Formación en proceso'}
${perfil.institucion ? `Institución: ${perfil.institucion}` : ''}

DISPONIBILIDAD
Inmediata
Horarios: ${horarioTexto}`;
}

window.adaptarCV = adaptarCV;

// ============================================
// COPIAR CV
// ============================================

function copiarCV() {
  if (!cvAdaptadoTexto) return;
  navigator.clipboard.writeText(cvAdaptadoTexto)
    .then(() => alert('✅ CV copiado al portapapeles'))
    .catch(() => alert('Mantené presionado el texto para copiarlo manualmente'));
}

window.copiarCV = copiarCV;

// ============================================
// POSTULACIÓN — ABRE LINK REAL DE JOOBLE
// ============================================

function postularme() {
  if (!empleoSeleccionado) return;
  guardarPostulacion(empleoSeleccionado);
  // Abrimos el link REAL de Jooble/empresa (requisito obligatorio de Jooble)
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
