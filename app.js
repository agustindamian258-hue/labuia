// ============================================
// LABUIA - App principal
// ============================================

import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged, doc, setDoc, getDoc,
  browserLocalPersistence, setPersistence }
  from './firebase-config.js';

let perfil = {};
let modalidad = 'presencial';
let viaje = 'zona';
let radioKm = 20;
let experiencia = 'sin_exp';
let horarios = ['cualquier_horario'];
let habilidades = [];
let empleosActuales = [];
let empleoSeleccionado = null;
let cvFinal = '';
let opcionCVactual = '';
let cvAdaptadoTexto = '';
let usuarioActual = null;
let ultimoErrorIA = '';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ============================================
// LLAMAR CLAUDE (vía proxy /api/claude)
// Sin API key en el navegador, sin errores de auth
// ============================================

async function llamarIA(prompt, maxTokens = 2048) {
  ultimoErrorIA = '';
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, max_tokens: maxTokens })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      ultimoErrorIA = data.error || `HTTP ${res.status}`;
      return null;
    }

    if (data.texto && data.texto.length > 10) {
      return data.texto;
    }

    ultimoErrorIA = 'Respuesta vacía del servidor';
    return null;
  } catch (e) {
    ultimoErrorIA = e.message;
    return null;
  }
}

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
    await setPersistence(auth, browserLocalPersistence);
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user') return;
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
      const expEmp = document.getElementById('experiencia-empresa');
      if (expEmp && datos.expEmpresa) expEmp.value = datos.expEmpresa;
      const expDet = document.getElementById('experiencia-detalle');
      if (expDet && datos.expDetalle) expDet.value = datos.expDetalle;
      const infoEx = document.getElementById('info-extra');
      if (infoEx && datos.infoExtra) infoEx.value = datos.infoExtra;

      // CV: cargar desde Firebase y mostrar indicador visual
      if (datos.cv && datos.cv.length > 50) {
        cvFinal = datos.cv;
        mostrarCVcargado();
      }

      if (datos.fotoPerfil) {
        perfil.fotoPerfil = datos.fotoPerfil;
        const previewFoto = document.getElementById('preview-foto');
        const placeholder = document.getElementById('foto-placeholder');
        if (previewFoto && placeholder) {
          previewFoto.src = datos.fotoPerfil;
          previewFoto.style.display = 'block';
          placeholder.style.display = 'none';
        }
      }

      // Ya no se necesita API key en el cliente — Claude corre en el servidor
      mostrarIAactivada();

      if (datos.modalidad) { modalidad = datos.modalidad; actualizarToggle('modalidad', modalidad); }
      if (datos.radioKm) {
        radioKm = datos.radioKm;
        const slider = document.getElementById('radio-km-slider');
        if (slider) { slider.value = radioKm; actualizarSliderMapa(radioKm); }
      }
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

// Muestra indicador de CV guardado en pantalla
function mostrarCVcargado() {
  const estado = document.getElementById('pdf-estado');
  if (estado) {
    estado.className = 'pdf-ok';
    estado.textContent = '✅ CV guardado — no necesitás volver a cargarlo';
  }
}

function mostrarIAactivada() {
  const estado = document.getElementById('api-key-estado');
  if (estado) {
    estado.style.cssText = 'background:#052e16;color:#22c55e;border:1px solid #22c55e;padding:8px;border-radius:8px;text-align:center;margin-top:8px';
    estado.textContent = '✅ IA activada (Claude)';
  }
  const zona = document.getElementById('api-key-zona');
  const arrow = document.getElementById('api-key-arrow');
  if (zona) zona.classList.add('oculto');
  if (arrow) arrow.textContent = '▼';
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
// TOGGLE HABILIDADES DESPLEGABLE
// ============================================

function toggleHabilidades() {
  const lista = document.getElementById('habilidades-lista');
  const arrow = document.getElementById('habilidades-arrow');
  lista.classList.toggle('oculto');
  arrow.textContent = lista.classList.contains('oculto') ? '▼' : '▲';
}

window.toggleHabilidades = toggleHabilidades;

// ============================================
// API KEY — ya no se necesita en el cliente
// Las funciones quedan para no romper el HTML
// ============================================

function toggleAPIkey() {
  const zona = document.getElementById('api-key-zona');
  const arrow = document.getElementById('api-key-arrow');
  if (zona) zona.classList.toggle('oculto');
  if (arrow) arrow.textContent = zona?.classList.contains('oculto') ? '▼' : '▲';
}

async function guardarAPIkey() {
  // Ya no se usa — Claude corre en el servidor con la key de Vercel
  mostrarIAactivada();
}

window.toggleAPIkey = toggleAPIkey;
window.guardarAPIkey = guardarAPIkey;

// ============================================
// FOTO DE PERFIL
// ============================================

async function subirFotoPerfil(input) {
  const archivo = input.files[0];
  if (!archivo) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    perfil.fotoPerfil = e.target.result;
    document.getElementById('preview-foto').src = e.target.result;
    document.getElementById('preview-foto').style.display = 'block';
    document.getElementById('foto-placeholder').style.display = 'none';
    if (usuarioActual) {
      await guardarPerfilFirebase(usuarioActual.uid, { fotoPerfil: e.target.result });
    }
  };
  reader.readAsDataURL(archivo);
}

window.subirFotoPerfil = subirFotoPerfil;

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
    if (usuarioActual) guardarPerfilFirebase(usuarioActual.uid, { cv: cvFinal });
    estado.className = 'pdf-ok';
    estado.textContent = `✅ CV guardado correctamente (${pdf.numPages} páginas) — no lo perdés al cerrar`;
  } catch {
    estado.className = 'pdf-error';
    estado.textContent = '❌ No pudimos leer el PDF. Seleccioná otro archivo.';
  }
}

window.procesarPDF = procesarPDF;

// ============================================
// CONSTRUIR PERFIL TEXTO COMPLETO
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

  const cvTexto = cvFinal || perfil.cv || '';

  return `
NOMBRE COMPLETO: ${perfil.nombre || ''}
EDAD: ${perfil.edad || ''} años
CELULAR: ${perfil.celular || ''}
EMAIL: ${perfil.emailContacto || ''}
LOCALIDAD: ${perfil.ciudad || 'Argentina'}
NIVEL DE EXPERIENCIA: ${expTexto}
EMPRESA(S) DONDE TRABAJÓ: ${perfil.expEmpresa || 'Ninguna'}
DESCRIPCIÓN DE TAREAS: "${perfil.expDetalle || 'No especificado'}"
INFORMACIÓN ADICIONAL: "${perfil.infoExtra || 'Ninguna'}"
ESTUDIOS: ${estudiosTexto}
INSTITUCIÓN EDUCATIVA: ${perfil.institucion || 'No especificada'}
HABILIDADES Y CERTIFICACIONES: ${habilidadesTexto || 'No especificadas'}
DISPONIBILIDAD HORARIA: ${horarioTexto}
MODALIDAD BUSCADA: ${perfil.modalidad || modalidad}
RADIO DE BÚSQUEDA: ${radioKm} km desde ${perfil.ciudad || 'su localidad'}
${cvTexto ? `\nCONTENIDO COMPLETO DEL CV (USAR COMO BASE PRINCIPAL):\n${cvTexto.substring(0, 3000)}` : ''}
`.trim();
}

// ============================================
// GENERAR CV BASE CON IA
// ============================================

async function generarCVconIA() {
  const preview = document.getElementById('cv-generado-preview');
  preview.style.display = 'block';
  preview.textContent = '⏳ Generando tu CV profesional con IA...';

  const puesto = perfil.puestoBuscado || document.getElementById('puesto-buscado').value.trim();

  const prompt = `Sos un experto en recursos humanos argentino especializado en redactar CVs profesionales.
Generá un CV profesional completo usando TODA la información disponible del candidato.

INFORMACIÓN DEL CANDIDATO:
${construirPerfilTexto()}

PUESTO QUE BUSCA: ${puesto || 'Empleos en general'}

REGLAS CRÍTICAS:
1. Si hay CV cargado en "CONTENIDO COMPLETO DEL CV", usá esa información como base principal
2. Transformá el lenguaje coloquial en profesional
3. Habilidades con nombres legibles
4. NUNCA inventar datos
5. Contacto completo al inicio
6. Texto plano sin asteriscos

SECCIONES:
DATOS PERSONALES Y CONTACTO
OBJETIVO PROFESIONAL
EXPERIENCIA LABORAL
HABILIDADES Y COMPETENCIAS
EDUCACIÓN
DISPONIBILIDAD`;

  const texto = await llamarIA(prompt);
  if (texto) {
    cvFinal = texto;
    preview.textContent = texto;
    if (usuarioActual) guardarPerfilFirebase(usuarioActual.uid, { cv: cvFinal });
  } else {
    preview.textContent = `❌ Error al generar CV: ${ultimoErrorIA || 'Revisá la configuración del servidor'}`;
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
  const habilidadesEscritas = document.getElementById('habilidades-escritas')?.value.trim() || '';

  if (!puesto) { alert('Escribí qué tipo de trabajo buscás'); return; }
  if (!ciudad) { alert('Escribí en qué ciudad o zona vivís'); return; }

  let habilidadesFinales = [...habilidades];
  if (habilidadesEscritas) {
    const extra = habilidadesEscritas.split(',').map(h => h.trim()).filter(h => h.length > 0);
    habilidadesFinales = [...new Set([...habilidadesFinales, ...extra])];
  }

  perfil = {
    nombre, edad, celular, emailContacto, ciudad,
    puestoBuscado: puesto, salario,
    estudios: estudiosVal, institucion,
    experiencia, expEmpresa, expDetalle, infoExtra,
    modalidad, radioKm,
    horarios, habilidades: habilidadesFinales,
    cv: cvFinal,
    fotoPerfil: perfil.fotoPerfil || ''
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
  document.getElementById('titulo-resultados').textContent = 'Encontrando oportunidades...';
  document.getElementById('subtitulo-resultados').textContent = 'Buscando tu próxima oportunidad profesional';
  document.getElementById('lista-empleos').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      Buscando tu próxima oportunidad profesional...
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
// JOOBLE API
// ============================================

const ZONAS_ARGENTINA = [
  'argentina','buenos aires','cordoba','rosario','mendoza','tucuman','salta','misiones',
  'corrientes','chaco','entre rios','santiago del estero','san juan','jujuy','rio negro',
  'neuquen','formosa','santa cruz','chubut','la pampa','catamarca','san luis','la rioja',
  'tierra del fuego','gba','gran buenos aires','conurbano','caba','capital federal',
  'jose c paz','jose c. paz','moreno','merlo','lujan','pilar','tigre','san isidro',
  'vicente lopez','quilmes','lomas de zamora','lanus','avellaneda','general san martin',
  'tres de febrero','ituzaingo','hurlingham','palermo','belgrano','flores','almagro',
  'villa urquiza','boedo','caballito','mar del plata','bahia blanca','la plata',
  'san miguel','malvinas argentinas'
];

function esUbicacionArgentina(ubicacion) {
  if (!ubicacion) return false;
  const u = ubicacion.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ZONAS_ARGENTINA.some(z => u.includes(z));
}

async function obtenerEmpleosJooble(puesto, ciudad) {
  try {
    const response = await fetch('/api/jooble', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: puesto, location: ciudad || '' })
    });

    const data = await response.json().catch(() => ({}));

    if (data.jobs && data.jobs.length > 0) {
      const empleosArgentina = data.jobs.filter(job =>
        esUbicacionArgentina(job.location || '')
      );

      if (empleosArgentina.length === 0) return generarEmpleosRespaldo(puesto, ciudad);

      return empleosArgentina.slice(0, 15).map((job, i) => ({
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
    console.log('Error Jooble:', e.message);
  }

  return generarEmpleosRespaldo(puesto, ciudad);
}

function detectarEmpresaGrande(nombre) {
  const grandes = ['arcor','carrefour','mercado libre','mercadolibre','banco','galicia',
    'santander','bbva','hsbc','quilmes','pepsico','unilever','walmart','coto','jumbo',
    'dia','molinos','bimbo','kraft','danone','coca-cola','personal','claro','movistar',
    'telecom','despegar','globant','mercadopago','pedidosya','rappi','adecco','manpower',
    'toyota','ford','fiat','renault','volkswagen','samsung','lg','philips'];
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
    mozo: ["McDonald's Argentina","Burger King Argentina",'Mostaza','TGI Fridays','Café Martínez'],
    delivery: ['PedidosYa','Rappi Argentina','Glovo Argentina','Andreani','OCA Argentina'],
    chofer: ['Andreani','DHL Argentina','OCA Argentina','Mercado Envíos'],
    soldador: ['TERNIUM Argentina','Techint','Tenaris','Siderca','Metalúrgica Tandil'],
    mecanico: ['TERNIUM Argentina','Techint','Toyota Argentina','Ford Argentina','Volkswagen Argentina'],
  };
  const clave = Object.keys(mapa).find(k => p.includes(k)) || null;
  const empresas = clave ? mapa[clave] : ['Adecco Argentina','Manpower Argentina','Randstad Argentina','Kelly Services','Bayton RRHH','Grupo Gestión'];
  const link = `https://ar.jooble.org/trabajos-${p.replace(/ /g,'-')}/${encodeURIComponent(zona)}`;

  return empresas.map((emp, i) => ({
    id: i + 1,
    titulo: puesto,
    empresa: emp,
    ubicacion: `${zona}, Argentina`,
    descripcion: `Oportunidad de ${puesto} en ${emp}. Tocá "Ver detalles" para conocer todos los requisitos y condiciones del puesto.`,
    link,
    salario: '',
    fuente: 'Jooble',
    esEmpresaGrande: detectarEmpresaGrande(emp),
    score: 0,
    analisis: null
  }));
}

// ============================================
// ANALIZAR CON IA (Claude)
// ============================================

async function analizarConIA(empleos, puesto) {
  const perfilTexto = construirPerfilTexto();
  const resultado = [];

  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino. Analizá compatibilidad entre este perfil y esta oferta.

PERFIL:
${perfilTexto}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Ubicación: ${empleo.ubicacion}
Descripción: ${empleo.descripcion.substring(0, 300)}

CRITERIOS:
- Sin experiencia + puesto entry-level = score 70-80
- Experiencia relevante = score 80-95
- Habilidades que coinciden = sumar puntos
- Radio de búsqueda: ${radioKm} km desde ${perfil.ciudad || 'su localidad'}
- Si el empleo está fuera del radio = restar puntos

Respondé SOLO con JSON válido sin texto extra:
{"score":75,"fortalezas":["r1","r2","r3"],"debilidades":["d1","d2"],"resumen":"una oración en español argentino"}`;

      const texto = await llamarIA(prompt, 500);
      if (texto) {
        const limpio = texto.replace(/```json|```/g, '').trim();
        const inicio = limpio.indexOf('{');
        const fin = limpio.lastIndexOf('}');
        const analisis = JSON.parse(limpio.substring(inicio, fin + 1));
        resultado.push({ ...empleo, score: Math.min(Math.max(analisis.score || 50, 1), 100), analisis });
      } else {
        resultado.push({ ...empleo, score: 60, analisis: null });
      }
    } catch {
      resultado.push({ ...empleo, score: 60, analisis: null });
    }
  }
  return resultado;
}

// ============================================
// MOSTRAR RESULTADOS
// ============================================

function mostrarResultados(empleos, puesto) {
  document.getElementById('titulo-resultados').textContent = 'Oportunidades para vos';
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
          ${emp.salario ? `<span class="tag">💰 ${emp.salario}</span>` : ''}
          ${emp.esEmpresaGrande ? '<span class="tag-verde">🏢 Empresa grande</span>' : ''}
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
  const atsAviso = emp.esEmpresaGrande
    ? '<div class="aviso-ats">🏢 <strong>Empresa grande</strong> — Tu CV será adaptado en formato ATS/Harvard para pasar filtros automáticos.</div>'
    : '<div class="aviso-ats" style="border-color:#22c55e;background:#0d2d1a">✨ <strong>Empresa mediana</strong> — Tu CV será adaptado con formato moderno y profesional.</div>';

  document.getElementById('contenido-detalle').innerHTML = `
    <div class="detalle-header">
      <div class="detalle-titulo">${emp.titulo}</div>
      <div class="detalle-empresa">${emp.empresa} · ${emp.ubicacion}</div>
      ${emp.salario ? `<div style="color:#22c55e;font-size:14px;margin:8px 0">💰 ${emp.salario}</div>` : ''}
      <div class="score-grande ${clase}">${emp.score}%</div>
      <p class="resumen-texto">${emp.analisis?.resumen || 'Analizando compatibilidad...'}</p>
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
    <button class="btn-adaptar" onclick="adaptarCV()">📄 Adaptar mi CV</button>
    <button class="btn-secundario" onclick="descargarCV()" style="margin-top:10px;border-color:#60a5fa;color:#60a5fa">⬇️ Descargar CV en PDF</button>
    <button class="btn-postular" onclick="postularme()">💼 Ir a postularme</button>
  `;

  irA('pantalla-detalle');
}

window.verDetalle = verDetalle;

// ============================================
// ADAPTAR CV CON IA (Claude)
// ============================================

async function adaptarCV() {
  if (!empleoSeleccionado) return;

  irA('pantalla-cv-adaptado');
  const emp = empleoSeleccionado;
  document.getElementById('subtitulo-cv-adaptado').textContent = `Para: ${emp.titulo} en ${emp.empresa}`;
  document.getElementById('cv-adaptado-contenido').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      La IA está creando tu CV profesional...<br>
      <small style="font-size:11px;margin-top:8px;display:block">Esto puede tardar hasta 30 segundos</small>
    </div>
  `;

  const esGrande = emp.esEmpresaGrande;

  const formatoInstruccion = esGrande
    ? `FORMATO: ATS/Harvard — texto plano, sin tablas ni íconos, secciones en MAYÚSCULAS, palabras clave del puesto visibles, máximo 1 página A4`
    : `FORMATO: Moderno y profesional — lenguaje cálido, destacar actitud y potencial, objetivo profesional específico para esta empresa`;

  const prompt = `Sos un experto en recursos humanos argentino especialista en CVs.
Generá un CV COMPLETAMENTE ADAPTADO al puesto indicado.

INFORMACIÓN DEL CANDIDATO:
${construirPerfilTexto()}

PUESTO: ${emp.titulo}
EMPRESA: ${emp.empresa}
DESCRIPCIÓN DEL PUESTO: ${emp.descripcion}

${formatoInstruccion}

INSTRUCCIONES OBLIGATORIAS:
1. Si hay "CONTENIDO COMPLETO DEL CV" usalo como base principal y mejoralo
2. Combiná con el formulario para completar lo que falte
3. Transformá lenguaje coloquial a profesional:
   - "acomodaba el depósito" → "Gestión y organización de inventario en depósito"
   - "manejé auto elevador" → "Operación de autoelevador / Clark"
   - "controlaba que salga bien" → "Control de calidad en línea de producción"
   - "limpiaba" → "Mantenimiento de instalaciones según protocolos"
4. Adaptá el OBJETIVO PROFESIONAL específicamente a ${emp.empresa} y al puesto ${emp.titulo}
5. Destacá las habilidades que coincidan con la descripción del puesto
6. NUNCA inventar datos
7. Contacto completo al inicio
8. Texto plano sin asteriscos ni **

Generá el CV adaptado ahora:`;

  const cvGenerado = await llamarIA(prompt, 2048);

  if (cvGenerado) {
    cvAdaptadoTexto = cvGenerado;
    const badge = esGrande
      ? '<div class="aviso-ats">🏢 <strong>Formato ATS/Harvard</strong> — Optimizado para sistemas automáticos de grandes empresas.</div>'
      : '<div class="aviso-ats" style="border-color:#22c55e;background:#0d2d1a">✨ <strong>Formato moderno</strong> — Diseñado para destacar en empresas medianas y pymes.</div>';
    document.getElementById('cv-adaptado-contenido').innerHTML =
      badge + `<div class="cv-adaptado-box">${cvGenerado.replace(/\n/g, '<br>')}</div>`;
  } else {
    const cvBasico = generarCVbasico(emp);
    cvAdaptadoTexto = cvBasico;
    document.getElementById('cv-adaptado-contenido').innerHTML = `
      <div class="aviso-ats" style="border-color:#f97316;background:#1c0a00">
        ⚠️ Error al conectar con la IA: ${ultimoErrorIA || 'Revisá la configuración del servidor'}<br>
        <small>Mostrando CV básico con tu información</small>
      </div>
      <div class="cv-adaptado-box">${cvBasico.replace(/\n/g, '<br>')}</div>
    `;
  }
}

function generarCVbasico(emp) {
  const cvTexto = cvFinal || perfil.cv || '';
  if (cvTexto && cvTexto.length > 100) {
    return `CURRÍCULUM VITAE — ADAPTADO PARA: ${emp.titulo.toUpperCase()} EN ${emp.empresa.toUpperCase()}\n\n${cvTexto}`;
  }
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
  ? 'Me caracterizo por mi responsabilidad, puntualidad y predisposición para aprender.'
  : `Profesional con experiencia en ${perfil.expEmpresa || 'el área'}. Busco nuevas oportunidades de crecimiento.`}

EXPERIENCIA LABORAL
${perfil.expEmpresa ? `Empresa: ${perfil.expEmpresa}\nTareas: ${perfil.expDetalle || 'Tareas operativas'}` : 'Sin experiencia formal previa. Disponible para capacitación.'}
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
  if (!cvAdaptadoTexto && !cvFinal) {
    alert('Primero adaptá tu CV tocando "Adaptar mi CV"');
    return;
  }
  const textoParaPDF = cvAdaptadoTexto || cvFinal;
  try {
    const { jsPDF } = window.jspdf;
    const docPDF = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margenIzq = 20;
    const anchoUtil = 170;
    let posY = 25;
    docPDF.setFont('helvetica', 'normal');
    const lineas = textoParaPDF.split('\n');
    for (const linea of lineas) {
      if (posY > 275) { docPDF.addPage(); posY = 20; }
      const t = linea.trim();
      if (!t) { posY += 4; continue; }
      const esTitulo = t === t.toUpperCase() && t.length > 3 && !t.includes('@') && !t.includes(':');
      if (esTitulo) {
        posY += 2;
        docPDF.setFont('helvetica', 'bold');
        docPDF.setFontSize(11);
        docPDF.text(t, margenIzq, posY);
        posY += 2;
        docPDF.setLineWidth(0.3);
        docPDF.line(margenIzq, posY, 190, posY);
        posY += 5;
        docPDF.setFont('helvetica', 'normal');
        docPDF.setFontSize(10);
      } else {
        docPDF.setFont('helvetica', 'normal');
        docPDF.setFontSize(10);
        const split = docPDF.splitTextToSize(t, anchoUtil);
        split.forEach(s => {
          if (posY > 275) { docPDF.addPage(); posY = 20; }
          docPDF.text(s, margenIzq, posY);
          posY += 5.5;
        });
      }
    }
    const nombre = (perfil.nombre || 'CV').replace(/ /g, '_');
    const empresa = empleoSeleccionado ? `_${empleoSeleccionado.empresa.replace(/ /g, '_')}` : '';
    docPDF.save(`CV_${nombre}${empresa}_LabuIA.pdf`);
  } catch (e) {
    console.log('Error PDF:', e);
    navigator.clipboard.writeText(textoParaPDF)
      .then(() => alert('✅ CV copiado al portapapeles'))
      .catch(() => alert('No se pudo generar el PDF. Copiá el texto manualmente.'));
  }
}

window.descargarCV = descargarCV;

// ============================================
// COPIAR CV
// ============================================

function copiarCV() {
  const texto = cvAdaptadoTexto || cvFinal;
  if (!texto) return;
  navigator.clipboard.writeText(texto)
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
      <div class="empty-state"><div class="icono">💼</div><p>Todavía no te postulaste a ninguna oportunidad</p></div>
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

// ============================================
// MAPA DE RADIO CON LEAFLET
// ============================================

let mapaLeaflet = null;
let circuloRadio = null;
let marcadorUbicacion = null;

function inicializarMapa() {
  if (mapaLeaflet) return;
  const contenedor = document.getElementById('mapa-radio');
  if (!contenedor) return;

  let lat = -34.6037;
  let lng = -58.3816;

  mapaLeaflet = L.map('mapa-radio', {
    zoomControl: false, dragging: false, scrollWheelZoom: false,
    doubleClickZoom: false, touchZoom: false
  }).setView([lat, lng], calcularZoom(radioKm));

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(mapaLeaflet);

  marcadorUbicacion = L.circleMarker([lat, lng], {
    radius: 8, fillColor: '#7c3aed', color: '#ffffff', weight: 2, fillOpacity: 1
  }).addTo(mapaLeaflet);

  circuloRadio = L.circle([lat, lng], {
    radius: radioKm * 1000, color: '#7c3aed', fillColor: '#7c3aed', fillOpacity: 0.15, weight: 3
  }).addTo(mapaLeaflet);

  function actualizarPosicion(la, ln) {
    lat = la; lng = ln;
    marcadorUbicacion.setLatLng([lat, lng]);
    circuloRadio.setLatLng([lat, lng]);
    mapaLeaflet.setView([lat, lng], calcularZoom(radioKm));
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      actualizarPosicion(pos.coords.latitude, pos.coords.longitude);
    }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
  }
}

function calcularZoom(km) {
  if (km <= 10) return 12;
  if (km <= 20) return 11;
  if (km <= 35) return 10;
  if (km <= 50) return 9;
  if (km <= 75) return 8;
  return 7;
}

function actualizarSliderMapa(km) {
  radioKm = parseInt(km);
  document.getElementById('radio-km-valor').textContent = `${radioKm} km`;
  if (!mapaLeaflet || !circuloRadio || !marcadorUbicacion) return;
  const centro = marcadorUbicacion.getLatLng();
  circuloRadio.setRadius(radioKm * 1000);
  mapaLeaflet.setView(centro, calcularZoom(radioKm), { animate: false });
  setTimeout(() => {
    if (circuloRadio && mapaLeaflet) {
      circuloRadio.setLatLng(centro);
      circuloRadio.setRadius(radioKm * 1000);
      mapaLeaflet.invalidateSize();
    }
  }, 50);
}

window.actualizarSliderMapa = actualizarSliderMapa;
window.inicializarMapa = inicializarMapa;
