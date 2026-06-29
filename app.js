// ============================================
// LABUIA - App principal
// ============================================

import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc }
  from './firebase-config.js';

const JOOBLE_API_KEY = '9a26ed6d-5b55-40aa-807f-e5ea117782ca';

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
      perfil = { ...datos };
      if (datos.nombre) document.getElementById('nombre').value = datos.nombre;
      if (datos.edad) document.getElementById('edad').value = datos.edad;
      if (datos.celular) document.getElementById('celular').value = datos.celular;
      if (datos.emailContacto) document.getElementById('email-contacto').value = datos.emailContacto;
      if (datos.ciudad) document.getElementById('ciudad').value = datos.ciudad;
      if (datos.puestoBuscado) document.getElementById('puesto-buscado').value = datos.puestoBuscado;
      if (datos.salario) document.getElementById('salario').value = datos.salario;
      if (datos.estudios) document.getElementById('estudios').value = datos.estudios;
      if (datos.institucion) document.getElementById('institucion').value = datos.institucion;
      if (datos.expEmpresa) { const el = document.getElementById('experiencia-empresa'); if (el) el.value = datos.expEmpresa; }
      if (datos.expDetalle) { const el = document.getElementById('experiencia-detalle'); if (el) el.value = datos.expDetalle; }
      if (datos.infoExtra) { const el = document.getElementById('info-extra'); if (el) el.value = datos.infoExtra; }
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
// API KEY
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
// LLAMAR GEMINI - SOPORTA CUALQUIER KEY
// ============================================

async function llamarGemini(prompt, apiKey) {
  // Todos los endpoints posibles según tipo de key
  const intentos = [
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      body: { contents: [{ parts: [{ text: prompt }] }] }
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      body: { contents: [{ parts: [{ text: prompt }] }] }
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`,
      body: { contents: [{ parts: [{ text: prompt }] }] }
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      body: { contents: [{ parts: [{ text: prompt }] }] }
    },
    {
      url: `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      body: { contents: [{ parts: [{ text: prompt }] }] }
    }
  ];

  for (const intento of intentos) {
    try {
      const res = await fetch(intento.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intento.body)
      });
      if (!res.ok) continue;
      const data = await res.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (texto && texto.length > 50) return texto;
    } catch {}
  }
  return null;
}

// ============================================
// CONSTRUIR PERFIL TEXTO
// ============================================

function construirPerfilTexto() {
  const habilidadesTexto = (perfil.habilidades || habilidades).join(', ');
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

  const estudiosTexto = (perfil.estudios || '') === 'primario' ? 'Primario completo' :
    (perfil.estudios || '') === 'secundario_inc' ? 'Secundario incompleto' :
    (perfil.estudios || '') === 'secundario' ? 'Secundario completo' :
    (perfil.estudios || '') === 'terciario' ? 'Terciario en curso' :
    (perfil.estudios || '') === 'universitario' ? 'Universitario completo' : '';

  return `
NOMBRE: ${perfil.nombre || ''}
EDAD: ${perfil.edad || ''} años
CELULAR: ${perfil.celular || ''}
EMAIL: ${perfil.emailContacto || ''}
LOCALIDAD: ${perfil.ciudad || 'Argentina'}
NIVEL DE EXPERIENCIA: ${expTexto}
EMPRESAS DONDE TRABAJÓ: ${perfil.expEmpresa || 'Ninguna'}
LO QUE HACÍA (en sus palabras): ${perfil.expDetalle || 'No especificado'}
INFORMACIÓN EXTRA QUE QUIERE INCLUIR: ${perfil.infoExtra || 'Ninguna'}
ESTUDIOS: ${estudiosTexto}
INSTITUCIÓN: ${perfil.institucion || ''}
HABILIDADES: ${habilidadesTexto || 'No especificadas'}
DISPONIBILIDAD HORARIA: ${horarioTexto}
MODALIDAD: ${perfil.modalidad || modalidad}
${cvFinal ? `\nCV PREVIO DEL CANDIDATO:\n${cvFinal.substring(0, 1000)}` : ''}
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

  if (!apiKey) {
    preview.textContent = '⚠️ Necesitás configurar tu API Key de Gemini para usar esta función.';
    return;
  }

  const prompt = `Sos un experto en recursos humanos argentino.
Generá un CV profesional completo para esta persona.

${construirPerfilTexto()}

PUESTO QUE BUSCA: ${puesto || 'Cualquier empleo'}

INSTRUCCIONES CRÍTICAS:
- Transformá las descripciones en palabras simples a lenguaje profesional de RRHH
- Ej: "acomodaba el depósito" → "Organización y gestión de stock en depósito"
- Ej: "manejé auto elevador" → "Operación de autoelevador / Clark (conocimiento práctico)"
- Las habilidades deben tener nombres legibles: "Atención al cliente" NO "atencion_cliente"
- Incluí datos de contacto completos al inicio
- Texto plano sin asteriscos
- Lenguaje argentino profesional

SECCIONES OBLIGATORIAS:
DATOS PERSONALES Y CONTACTO
OBJETIVO PROFESIONAL
EXPERIENCIA LABORAL
HABILIDADES Y COMPETENCIAS
EDUCACIÓN
DISPONIBILIDAD`;

  const texto = await llamarGemini(prompt, apiKey);
  if (texto) {
    cvFinal = texto;
    preview.textContent = texto;
    if (usuarioActual) guardarPerfilFirebase(usuarioActual.uid, { cv: cvFinal });
  } else {
    preview.textContent = '❌ No se pudo conectar con la IA. Verificá tu API Key.';
  }
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

  if (usuarioActual) await guardarPerfilFirebase(usuarioActual.uid, perfil);

  irA('pantalla-resultados');
  buscarEmpleos(puesto, ciudad);
}

window.guardarPerfilYBuscar = guardarPerfilYBuscar;

// ============================================
// BUSCAR EMPLEOS
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
    const apiKey = localStorage.getItem('labuia_gemini_key') || '';
    const analizados = apiKey
      ? await analizarConIA(empleos, puesto)
      : empleos.map((e, i) => ({
          ...e,
          score: Math.max(88 - (i * 4), 50),
          analisis: {
            fortalezas: ['Empleo real en Argentina', 'Coincide con tu búsqueda', 'Activá la IA para análisis real'],
            debilidades: ['Configurá tu API Key para análisis detallado'],
            resumen: 'Score estimado. Activá la IA para compatibilidad real.'
          }
        }));

    empleosActuales = analizados.sort((a, b) => b.score - a.score);
    mostrarResultados(empleosActuales, puesto);
  } catch (e) {
    console.log('Error:', e);
    document.getElementById('lista-empleos').innerHTML =
      '<div class="cargando">❌ Error al buscar. Revisá tu conexión.</div>';
  }
}

// ============================================
// JOOBLE API
// ============================================

async function obtenerEmpleosJooble(puesto, ciudad) {
  try {
    const response = await fetch(
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://jooble.org/api/${JOOBLE_API_KEY}`)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: puesto,
          location: ciudad || 'Argentina',
          page: 1,
          resultsOnPage: 20
        })
      }
    );

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

  return generarEmpleosRespaldo(puesto, ciudad);
}

function detectarEmpresaGrande(nombre) {
  const grandes = ['arcor','carrefour','mercado libre','mercadolibre','banco','galicia',
    'santander','bbva','hsbc','quilmes','pepsico','unilever','walmart','coto','jumbo',
    'dia','molinos','bimbo','kraft','danone','coca-cola','personal','claro','movistar',
    'telecom','despegar','globant','mercadopago','pedidosya','rappi','adecco','manpower'];
  return grandes.some(g => nombre.toLowerCase().includes(g));
}

function generarEmpleosRespaldo(puesto, ciudad) {
  const zona = ciudad || 'Buenos Aires';
  const p = puesto.toLowerCase();
  const mapa = {
    repositor: ['Carrefour Argentina','Supermercados DIA','Coto CICSA','Jumbo Argentina','Walmart Argentina','Changomas'],
    operario: ['Arcor','Molinos Río de la Plata','Quilmes','Pepsico Argentina','CCU Argentina','Bimbo Argentina'],
    cajero: ['Carrefour Argentina','Farmacity','Coto CICSA','Rapipago','Pago Fácil','Walmart Argentina'],
    limpieza: ['Sodexo Argentina','ISS Argentina','Compass Group','Limpiolux','Cintas Corporation'],
    seguridad: ['Securitas Argentina','G4S Argentina','Prosegur Argentina','Brinks Argentina'],
    mozo: ['McDonald\'s Argentina','Burger King Argentina','Mostaza','TGI Fridays','Café Martínez'],
    delivery: ['PedidosYa','Rappi Argentina','Glovo Argentina','Andreani','OCA Argentina'],
    chofer: ['Andreani','DHL Argentina','OCA Argentina','Mercado Envíos','Logística 3PL'],
  };
  const clave = Object.keys(mapa).find(k => p.includes(k)) || null;
  const empresas = clave ? mapa[clave] : ['Adecco Argentina','Manpower Argentina','Randstad Argentina','Kelly Services','Bayton RRHH','Grupo Gestión'];
  const link = `https://ar.jooble.org/trabajos-${p.replace(/ /g,'-')}/${encodeURIComponent(zona)}`;

  return empresas.map((emp, i) => ({
    id: i + 1,
    titulo: puesto,
    empresa: emp,
    ubicacion: `${zona}, Argentina`,
    descripcion: `Oferta de ${puesto} en ${emp}. Tocá "Postularme" para ver los detalles completos y aplicar directamente.`,
    link,
    salario: '',
    fuente: 'Jooble',
    esEmpresaGrande: detectarEmpresaGrande(emp),
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
  const resultado = [];

  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino.
Analizá compatibilidad entre este perfil y esta oferta.

PERFIL:
${perfilTexto}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Ubicación: ${empleo.ubicacion}
Descripción: ${empleo.descripcion.substring(0, 300)}

Respondé SOLO con JSON válido:
{"score":numero,"fortalezas":["r1","r2","r3"],"debilidades":["d1","d2"],"resumen":"una oración"}`;

      const texto = await llamarGemini(prompt, apiKey);
      if (texto) {
        const limpio = texto.replace(/```json|```/g, '').trim();
        const analisis = JSON.parse(limpio);
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

  document.getElementById('lista-empleos').innerHTML = `
    <div class="powered-by">🔍 Empleos provistos por <strong>Jooble</strong></div>
    ${empleos.map(emp => {
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
            ${emp.salario ? `<span class="tag">💰 ${emp.salario}</span>` : ''}
            ${emp.esEmpresaGrande ? '<span class="tag-verde">🏢 Empresa grande</span>' : ''}
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
  const atsAviso = emp.esEmpresaGrande
    ? '<div class="aviso-ats">🏢 <strong>Empresa grande</strong> — La IA generará tu CV en formato ATS/Harvard para pasar filtros automáticos.</div>'
    : '<div class="aviso-ats" style="border-color:#22c55e;background:#0d2d1a">✨ <strong>Empresa mediana/pyme</strong> — La IA usará un formato moderno y cálido.</div>';

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
      📄 Adaptar y descargar mi CV
    </button>
    <button class="btn-postular" onclick="postularme()">
      💼 Postularme en el portal
    </button>
  `;

  irA('pantalla-detalle');
}

window.verDetalle = verDetalle;

// ============================================
// ADAPTAR CV CON IA + DESCARGA PDF
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
      La IA está creando tu CV profesional...<br>
      <small style="font-size:11px;margin-top:8px;display:block">Esto puede tardar hasta 30 segundos</small>
    </div>
  `;

  const apiKey = localStorage.getItem('labuia_gemini_key') || '';
  const esGrande = emp.esEmpresaGrande;

  const formatoInstruccion = esGrande
    ? `FORMATO: ATS/Harvard (empresa grande usa sistemas automáticos)
- Una sola columna, texto plano limpio
- Sin tablas, sin gráficos, sin íconos
- Palabras clave del puesto visibles en todo el CV
- Secciones en MAYÚSCULAS
- Máximo 1 página`
    : `FORMATO: Moderno y profesional (empresa mediana/pyme)
- Lenguaje cálido pero profesional
- Destacar actitud, personalidad y potencial
- Objetivo profesional entusiasta y específico para ESTA empresa`;

  const prompt = `Sos un experto en recursos humanos argentino y especialista en CVs profesionales.
Generá un CV adaptado específicamente para este puesto y empresa.

DATOS COMPLETOS DEL CANDIDATO:
${construirPerfilTexto()}

PUESTO: ${emp.titulo}
EMPRESA: ${emp.empresa}
DESCRIPCIÓN DEL PUESTO: ${emp.descripcion}

${formatoInstruccion}

REGLAS CRÍTICAS — MUY IMPORTANTE:
1. Transformá las descripciones simples en lenguaje profesional de RRHH:
   - "acomodaba el depósito" → "Organización y gestión de inventario en depósito"
   - "limpiaba" → "Mantenimiento y limpieza de instalaciones según protocolos"
   - "manejé auto elevador" → "Operación de autoelevador / Clark (conocimiento práctico)"
   - "controlaba que salga bien" → "Control de calidad del proceso productivo"
2. Las habilidades DEBEN tener nombres legibles: "Atención al cliente" NO "atencion_cliente"
3. Si menciona licencias o certificaciones, incluílas aunque estén vencidas: agregar "(a renovar)"
4. NUNCA inventes datos, empresas ni fechas que no mencionó el candidato
5. SIEMPRE incluí los datos de contacto completos al inicio
6. Texto plano sin asteriscos ni ** ni símbolos decorativos
7. Lenguaje argentino profesional

Generá el CV completo ahora:`;

  if (!apiKey) {
    const cvBasico = generarCVbasico(emp);
    cvAdaptadoTexto = cvBasico;
    document.getElementById('cv-adaptado-contenido').innerHTML = `
      <div class="aviso-ats" style="border-color:#f97316;background:#1c0a00">
        ⚠️ <strong>IA no configurada</strong> — Este es un CV básico. Configurá tu API Key de Gemini para obtener un CV profesional adaptado.
      </div>
      <div class="cv-adaptado-box">${cvBasico.replace(/\n/g, '<br>')}</div>
    `;
    return;
  }

  const cvGenerado = await llamarGemini(prompt, apiKey);

  if (cvGenerado) {
    cvAdaptadoTexto = cvGenerado;
    const badge = esGrande
      ? '<div class="aviso-ats">🏢 <strong>Formato ATS/Harvard</strong> — Optimizado para pasar filtros automáticos de empresas grandes.</div>'
      : '<div class="aviso-ats" style="border-color:#22c55e;background:#0d2d1a">✨ <strong>Formato moderno</strong> — Diseñado para destacar en empresas medianas y pymes.</div>';
    document.getElementById('cv-adaptado-contenido').innerHTML =
      badge + `<div class="cv-adaptado-box" id="cv-texto-final">${cvGenerado.replace(/\n/g, '<br>')}</div>`;
  } else {
    const cvBasico = generarCVbasico(emp);
    cvAdaptadoTexto = cvBasico;
    document.getElementById('cv-adaptado-contenido').innerHTML = `
      <div class="aviso-ats" style="border-color:#f97316;background:#1c0a00">
        ⚠️ No se pudo conectar con la IA. Verificá tu API Key.
      </div>
      <div class="cv-adaptado-box" id="cv-texto-final">${cvBasico.replace(/\n/g, '<br>')}</div>
    `;
  }
}

function generarCVbasico(emp) {
  const habilidadesTexto = (perfil.habilidades || habilidades).join(', ');
  const estudiosTexto = (perfil.estudios || '') === 'secundario' ? 'Secundario completo' :
    (perfil.estudios || '') === 'secundario_inc' ? 'Secundario incompleto' :
    (perfil.estudios || '') === 'primario' ? 'Primario completo' :
    (perfil.estudios || '') === 'terciario' ? 'Terciario en curso' :
    (perfil.estudios || '') === 'universitario' ? 'Universitario completo' : 'Formación en proceso';

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
  ? 'Me caracterizo por mi responsabilidad, puntualidad y predisposición para aprender. Disponible de forma inmediata.'
  : `Profesional con experiencia en ${perfil.expEmpresa || 'el área'}. Busco nuevos desafíos profesionales.`}

EXPERIENCIA LABORAL
${perfil.expEmpresa
  ? `Empresa: ${perfil.expEmpresa}\nTareas: ${perfil.expDetalle || 'Tareas operativas'}`
  : 'Sin experiencia formal. Disponible para capacitación inmediata.'}
${perfil.infoExtra ? `\n${perfil.infoExtra}` : ''}

HABILIDADES Y COMPETENCIAS
${habilidadesTexto || 'Trabajo en equipo, responsabilidad, puntualidad, adaptabilidad'}

EDUCACIÓN
${estudiosTexto}
${perfil.institucion ? `Institución: ${perfil.institucion}` : ''}

DISPONIBILIDAD
Inmediata - Cualquier horario`;
}

window.adaptarCV = adaptarCV;

// ============================================
// DESCARGAR CV COMO PDF
// ============================================

async function descargarCV() {
  if (!cvAdaptadoTexto) {
    alert('Primero generá tu CV adaptado');
    return;
  }

  try {
    // Usamos la librería jsPDF desde CDN
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Configuración de fuente y márgenes
    const margenIzq = 20;
    const margenDer = 20;
    const anchoUtil = 210 - margenIzq - margenDer;
    let posY = 20;
    const lineHeight = 6;
    const fontSize = 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);

    // Dividimos el texto en líneas
    const lineas = cvAdaptadoTexto.split('\n');

    for (const linea of lineas) {
      if (posY > 270) {
        doc.addPage();
        posY = 20;
      }

      const lineaTrimmed = linea.trim();

      // Títulos de sección en mayúsculas
      if (lineaTrimmed === lineaTrimmed.toUpperCase() && lineaTrimmed.length > 3 && !lineaTrimmed.includes(':')) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        posY += 3;
        doc.text(lineaTrimmed, margenIzq, posY);
        posY += lineHeight + 1;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
      } else if (lineaTrimmed === '') {
        posY += 3;
      } else {
        // Texto normal con wrap automático
        const splitTexto = doc.splitTextToSize(lineaTrimmed, anchoUtil);
        splitTexto.forEach(t => {
          if (posY > 270) { doc.addPage(); posY = 20; }
          doc.text(t, margenIzq, posY);
          posY += lineHeight;
        });
      }
    }

    const nombreArchivo = `CV_${(perfil.nombre || 'candidato').replace(/ /g, '_')}_LabuIA.pdf`;
    doc.save(nombreArchivo);

  } catch (e) {
    console.log('Error PDF:', e);
    // Fallback: copiar al portapapeles
    copiarCV();
    alert('No se pudo generar el PDF. El CV fue copiado al portapapeles.');
  }
}

window.descargarCV = descargarCV;

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
  const yaExiste = postulaciones.find(p => p.titulo === empleo.titulo && p.empresa === empleo.empresa);
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
    if (usuarioActual) await guardarPerfilFirebase(usuarioActual.uid, { postulaciones });
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
      <div class="empty-state"><div class="icono">💼</div><p>Todavía no te postulaste a ningún empleo</p></div>
    `;
    return;
  }
  document.getElementById('lista-postulaciones').innerHTML = `
    <div class="stats-row">
      <div class="stat-card"><div class="stat-numero">${lista.length}</div><div class="stat-label">Enviadas</div></div>
      <div class="stat-card"><div class="stat-numero">${lista.filter(p => p.estado === 'Respuesta').length}</div><div class="stat-label">Respuestas</div></div>
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
