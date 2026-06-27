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

      // Cargar API key guardada — nunca la pide de nuevo
      if (datos.geminiKey) {
        localStorage.setItem('labuia_gemini_key', datos.geminiKey);
        document.getElementById('gemini-key').value = datos.geminiKey;
        const estado = document.getElementById('api-key-estado');
        if (estado) {
          estado.style.cssText = 'background:#052e16;color:#22c55e;border:1px solid #22c55e';
          estado.textContent = '✅ IA activada';
        }
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
      if (datos.expDetalle) {
        document.getElementById('experiencia-detalle').value = datos.expDetalle;
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
      experiencia === 'sin_exp' ? zona.classList.add('oculto') : zona.classList.remove('oculto');
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
      horarios = horarios.includes(valor)
        ? horarios.filter(h => h !== valor)
        : [...horarios, valor];
    } else {
      habilidades = habilidades.includes(valor)
        ? habilidades.filter(h => h !== valor)
        : [...habilidades, valor];
    }
  });
});

// ============================================
// API KEY — SE GUARDA UNA SOLA VEZ PARA SIEMPRE
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
  // Guardamos en Firebase para que nunca se pierda
  if (usuarioActual) {
    await guardarPerfilFirebase(usuarioActual.uid, { geminiKey: key });
  }
  estado.style.cssText = 'background:#052e16;color:#22c55e;border:1px solid #22c55e';
  estado.textContent = '✅ IA activada y guardada permanentemente';
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
  const nombre = document.getElementById('nombre').value.trim() || 'Candidato';
  const edad = document.getElementById('edad').value.trim();
  const ciudad = document.getElementById('ciudad').value.trim();
  const expDetalle = document.getElementById('experiencia-detalle')?.value.trim() || '';
  const estudiosVal = document.getElementById('estudios').value;
  const habilidadesTexto = habilidades.join(', ');
  const puesto = document.getElementById('puesto-buscado').value.trim();

  const preview = document.getElementById('cv-generado-preview');
  preview.style.display = 'block';
  preview.textContent = '⏳ Generando CV con IA...';

  const expTexto = experiencia === 'sin_exp' ? 'Sin experiencia laboral previa' :
    experiencia === 'poca_exp' ? `Poca experiencia (1-2 años): ${expDetalle}` :
    experiencia === 'media_exp' ? `Experiencia media (3-5 años): ${expDetalle}` :
    `Experiencia amplia (+5 años): ${expDetalle}`;

  const apiKey = localStorage.getItem('labuia_gemini_key') || '';

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

Generá el CV con estas secciones: DATOS PERSONALES, OBJETIVO PROFESIONAL, EXPERIENCIA LABORAL, HABILIDADES Y COMPETENCIAS, EDUCACIÓN, DISPONIBILIDAD.
Texto plano sin asteriscos. Lenguaje argentino profesional.`;

  if (apiKey) {
    const texto = await llamarGemini(prompt, apiKey);
    if (texto) {
      cvFinal = texto;
      preview.textContent = texto;
      return;
    }
  }

  cvFinal = `CURRÍCULUM VITAE

DATOS PERSONALES
Nombre: ${nombre}
${edad ? `Edad: ${edad} años` : ''}
${ciudad ? `Localidad: ${ciudad}` : ''}
País: Argentina

OBJETIVO PROFESIONAL
${experiencia === 'sin_exp'
  ? `Joven con muchas ganas de incorporarme al mundo laboral. Me caracterizo por ser responsable, puntual y con gran predisposición para aprender. Busco mi primera oportunidad en ${puesto || 'el área que me permita crecer'}.`
  : `Profesional con ${expTexto}. Busco nuevas oportunidades en ${puesto || 'mi especialidad'}.`}

EXPERIENCIA LABORAL
${expDetalle || (experiencia === 'sin_exp' ? 'Sin experiencia laboral previa. Disponible para capacitación inmediata.' : 'Experiencia en el área')}

HABILIDADES Y COMPETENCIAS
${habilidadesTexto || 'Trabajo en equipo, responsabilidad, puntualidad, adaptabilidad, predisposición para aprender'}

EDUCACIÓN
${estudiosVal === 'primario' ? 'Primario completo' :
  estudiosVal === 'secundario_inc' ? 'Secundario incompleto' :
  estudiosVal === 'secundario' ? 'Secundario completo' :
  estudiosVal === 'terciario' ? 'Estudios terciarios' :
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
  const modelos = ['gemini-1.5-flash', 'gemini-pro'];
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

  if (!puesto) { alert('Escribí qué tipo de trabajo buscás'); return; }
  if (!ciudad) { alert('Escribí en qué ciudad o zona vivís'); return; }

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
  document.getElementById('subtitulo-resultados').textContent = 'Buscando en portales argentinos...';
  document.getElementById('lista-empleos').innerHTML = `
    <div class="cargando">
      <span class="spinner">⚙️</span>
      Buscando empleos en Argentina...
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
  // Intentamos Remotive solo para puestos remotos/tech
  if (modalidad === 'remoto') {
    try {
      const res = await fetch(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(puesto)}&limit=8`
      );
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        return data.jobs.slice(0, 8).map((job, i) => ({
          id: i + 1,
          titulo: job.title,
          empresa: job.company_name,
          ubicacion: 'Remoto desde Argentina',
          descripcion: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 500),
          link: job.url,
          fuente: 'Remotive',
          score: 0,
          analisis: null
        }));
      }
    } catch {}
  }

  // Para empleos presenciales argentinos usamos base local inteligente
  return generarEmpleosArgentinos(puesto, ciudad);
}

function generarEmpleosArgentinos(puesto, ciudad) {
  const zona = ciudad || 'Buenos Aires';
  const puestoLower = puesto.toLowerCase();

  // Base de datos de empleos típicos argentinos por rubro
  const empleosPorRubro = {
    repositor: [
      { empresa: 'Carrefour Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-repositor.html' },
      { empresa: 'Supermercados DIA', extra: 'Turno tarde', link: 'https://www.bumeran.com.ar/empleos-repositor.html' },
      { empresa: 'Coto CICSA', extra: 'Turno rotativo', link: 'https://www.computrabajo.com.ar/trabajo-de-repositor' },
      { empresa: 'Jumbo Argentina', extra: 'Part time', link: 'https://www.zonajobs.com.ar/empleos-de-repositor.html' },
      { empresa: 'La Anónima', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-repositor.html' },
      { empresa: 'Walmart Argentina', extra: 'Ingreso inmediato', link: 'https://www.computrabajo.com.ar/trabajo-de-repositor' },
    ],
    cajero: [
      { empresa: 'Carrefour Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-cajero.html' },
      { empresa: 'Banco Galicia', extra: 'Relación de dependencia', link: 'https://www.computrabajo.com.ar/trabajo-de-cajero' },
      { empresa: 'Farmacity', extra: 'Part time', link: 'https://www.bumeran.com.ar/empleos-cajero.html' },
      { empresa: 'Coto CICSA', extra: 'Turno rotativo', link: 'https://www.zonajobs.com.ar/empleos-de-cajero.html' },
      { empresa: 'Supermercados DIA', extra: 'Ingreso inmediato', link: 'https://www.bumeran.com.ar/empleos-cajero.html' },
    ],
    operario: [
      { empresa: 'Arcor', extra: 'Turno rotativo', link: 'https://www.bumeran.com.ar/empleos-operario.html' },
      { empresa: 'Molinos Río de la Plata', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-operario' },
      { empresa: 'Quilmes', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-operario.html' },
      { empresa: 'Pepsico Argentina', extra: 'Relación de dependencia', link: 'https://www.zonajobs.com.ar/empleos-de-operario.html' },
      { empresa: 'Unilever Argentina', extra: 'Turno tarde', link: 'https://www.bumeran.com.ar/empleos-operario.html' },
      { empresa: 'Adecco Argentina', extra: 'Eventual con posibilidad de pase', link: 'https://www.computrabajo.com.ar/trabajo-de-operario' },
    ],
    limpieza: [
      { empresa: 'Sodexo Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-limpieza.html' },
      { empresa: 'ISS Argentina', extra: 'Part time', link: 'https://www.computrabajo.com.ar/trabajo-de-limpieza' },
      { empresa: 'Compass Group', extra: 'Turno tarde', link: 'https://www.bumeran.com.ar/empleos-limpieza.html' },
      { empresa: 'Cushman & Wakefield', extra: 'Full time', link: 'https://www.zonajobs.com.ar/empleos-de-limpieza.html' },
    ],
    seguridad: [
      { empresa: 'Securitas Argentina', extra: 'Turno rotativo', link: 'https://www.bumeran.com.ar/empleos-seguridad.html' },
      { empresa: 'G4S Argentina', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-seguridad' },
      { empresa: 'Prosegur Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-seguridad.html' },
      { empresa: 'Brinks Argentina', extra: 'Relación de dependencia', link: 'https://www.zonajobs.com.ar/empleos-de-seguridad.html' },
    ],
    mozo: [
      { empresa: 'TGI Fridays Argentina', extra: 'Part time', link: 'https://www.bumeran.com.ar/empleos-mozo.html' },
      { empresa: 'Grupo Pegasso', extra: 'Turno noche', link: 'https://www.computrabajo.com.ar/trabajo-de-mozo' },
      { empresa: 'La Cabaña Restaurant', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-mozo.html' },
      { empresa: 'Hard Rock Café BsAs', extra: 'Turno tarde-noche', link: 'https://www.zonajobs.com.ar/empleos-de-mozo.html' },
    ],
    delivery: [
      { empresa: 'PedidosYa', extra: 'Flexible', link: 'https://www.bumeran.com.ar/empleos-delivery.html' },
      { empresa: 'Rappi Argentina', extra: 'Por horas', link: 'https://www.computrabajo.com.ar/trabajo-de-delivery' },
      { empresa: 'Glovo Argentina', extra: 'Turno libre', link: 'https://www.bumeran.com.ar/empleos-delivery.html' },
      { empresa: 'Mercado Envíos', extra: 'Relación de dependencia', link: 'https://www.zonajobs.com.ar/empleos-de-delivery.html' },
    ],
    chofer: [
      { empresa: 'Mercado Envíos', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-chofer.html' },
      { empresa: 'DHL Argentina', extra: 'Turno mañana', link: 'https://www.computrabajo.com.ar/trabajo-de-chofer' },
      { empresa: 'Andreani', extra: 'Relación de dependencia', link: 'https://www.bumeran.com.ar/empleos-chofer.html' },
      { empresa: 'OCA Argentina', extra: 'Full time', link: 'https://www.zonajobs.com.ar/empleos-de-chofer.html' },
    ],
    default: [
      { empresa: 'Adecco Argentina', extra: 'Múltiples turnos', link: `https://www.bumeran.com.ar/empleos-${puestoLower.replace(/ /g,'-')}.html` },
      { empresa: 'Manpower Argentina', extra: 'Ingreso inmediato', link: `https://www.computrabajo.com.ar/trabajo-de-${puestoLower.replace(/ /g,'-')}` },
      { empresa: 'Randstad Argentina', extra: 'Relación de dependencia', link: `https://www.zonajobs.com.ar/empleos-de-${puestoLower.replace(/ /g,'-')}.html` },
      { empresa: 'Kelly Services Argentina', extra: 'Full time', link: `https://www.bumeran.com.ar/empleos-${puestoLower.replace(/ /g,'-')}.html` },
      { empresa: 'Grupo Gestión', extra: 'Turno rotativo', link: `https://www.computrabajo.com.ar/trabajo-de-${puestoLower.replace(/ /g,'-')}` },
      { empresa: 'Bayton Grupo Empresarial', extra: 'Con y sin experiencia', link: `https://www.bumeran.com.ar/empleos-${puestoLower.replace(/ /g,'-')}.html` },
    ]
  };

  const descripcionesPorRubro = {
    repositor: `Buscamos repositor/a para incorporarse a nuestro equipo.
Tareas: reposición de mercadería en góndola, control de stock, mantenimiento del orden y limpieza del sector, recepción de mercadería.
Requisitos: secundario completo (excluyente), disponibilidad horaria, responsabilidad y proactividad.
No se requiere experiencia previa. Capacitación completa a cargo de la empresa.
Ofrecemos: sueldo según convenio, obra social, bonos por presentismo.`,

    cajero: `Incorporamos cajero/a para nuestras sucursales.
Tareas: atención al cliente en caja, cobro en efectivo y tarjetas, cierre de caja, mantenimiento del orden en el sector.
Requisitos: secundario completo, habilidades numéricas, trato amable con el público.
No se requiere experiencia previa. Capacitación incluida.
Ofrecemos: sueldo según convenio + adicionales, obra social, comedor en planta.`,

    operario: `Incorporamos operarios/as de producción para nuestras plantas.
Tareas: operación de maquinaria, control de calidad del producto, mantenimiento del orden y limpieza del sector de trabajo.
Requisitos: secundario completo, disponibilidad para trabajo en turnos rotativos, responsabilidad.
Se valorará experiencia previa aunque no es excluyente.
Ofrecemos: sueldo según convenio metalúrgico/alimenticio, obra social, comedor en planta, posibilidades de crecimiento.`,

    limpieza: `Buscamos personal de limpieza y mantenimiento.
Tareas: limpieza de instalaciones, mantenimiento del orden, uso de productos de limpieza profesionales.
Requisitos: buena predisposición, responsabilidad, puntualidad.
No se requiere experiencia previa.
Ofrecemos: sueldo según convenio, obra social.`,

    default: `Buscamos personal para incorporarse a nuestro equipo de trabajo.
Tareas acordes al puesto de ${puesto}.
Requisitos: buena predisposición, responsabilidad, puntualidad y ganas de trabajar.
Se valora experiencia previa aunque no es excluyente. Capacitación a cargo de la empresa.
Ofrecemos: sueldo según convenio, obra social, posibilidades de crecimiento.`
  };

  const claveRubro = Object.keys(empleosPorRubro).find(k => puestoLower.includes(k)) || 'default';
  const listaEmpresas = empleosPorRubro[claveRubro];
  const descripcion = descripcionesPorRubro[claveRubro] || descripcionesPorRubro.default;

  return listaEmpresas.map((emp, i) => ({
    id: i + 1,
    titulo: `${puesto} - ${emp.extra}`,
    empresa: emp.empresa,
    ubicacion: `${zona}, Argentina`,
    descripcion: descripcion,
    link: emp.link,
    fuente: 'Bumeran/Computrabajo',
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
Edad: ${perfil.edad || 'No especificada'}
Experiencia: ${perfil.experiencia === 'sin_exp' ? 'Sin experiencia laboral' :
  perfil.experiencia === 'poca_exp' ? 'Poca experiencia (1-2 años)' :
  perfil.experiencia === 'media_exp' ? 'Experiencia media (3-5 años)' : 'Experiencia amplia (+5 años)'}
Trabajos anteriores: ${perfil.expDetalle || 'No especificado'}
Estudios: ${perfil.estudios || 'No especificado'}
Habilidades: ${(perfil.habilidades || []).join(', ') || 'No especificadas'}
Disponibilidad: ${(perfil.horarios || []).join(', ')}
Hasta dónde viaja: ${perfil.viaje || 'zona'}
Trabajo buscado: ${puesto}
${cv ? `CV:\n${cv.substring(0, 500)}` : ''}`.trim();

  if (!apiKey) {
    return empleos.map((e, i) => ({
      ...e,
      score: Math.max(88 - (i * 5), 50),
      analisis: {
        fortalezas: [
          'Oferta disponible en tu zona',
          'El puesto coincide con tu búsqueda',
          'Configurá la IA para ver análisis real de compatibilidad'
        ],
        debilidades: ['Activá Gemini en Configuración de IA para análisis detallado'],
        resumen: 'Score estimado. Activá la IA para ver tu compatibilidad real con este puesto.'
      }
    }));
  }

  const resultado = [];
  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino especializado en perfiles operativos.
Analizá la compatibilidad entre este perfil y esta oferta de trabajo argentina.

PERFIL:
${perfilTexto}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Ubicación: ${empleo.ubicacion}
Descripción: ${empleo.descripcion.substring(0, 400)}

REGLAS:
- Si el candidato no tiene experiencia pero el puesto no la requiere → score alto (75-90)
- Si tiene habilidades relevantes → sumá puntos
- Considerá la distancia desde ${perfil.ciudad} como factor
- Sé específico con las fortalezas y debilidades en contexto argentino

Respondé ÚNICAMENTE con este JSON:
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
          <span class="tag">${emp.fuente}</span>
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
Experiencia: ${perfil.experiencia === 'sin_exp' ? 'Sin experiencia laboral' : perfil.expDetalle || 'Con experiencia'}
Estudios: ${perfil.estudios || 'No especificado'}
Habilidades: ${(perfil.habilidades || []).join(', ') || 'No especificadas'}
Disponibilidad: ${(perfil.horarios || []).join(', ')}
${cvFinal ? `CV actual:\n${cvFinal.substring(0, 600)}` : ''}`.trim();

  const prompt = `Sos un experto en recursos humanos argentino.
Adaptá el CV de esta persona específicamente para este puesto.

PERFIL:
${perfilTexto}

PUESTO:
Título: ${emp.titulo}
Empresa: ${emp.empresa}
Descripción: ${emp.descripcion}

INSTRUCCIONES:
- Si no tiene experiencia, destacá sus ganas, responsabilidad, puntualidad y capacidad de aprender
- Resaltá las habilidades que coincidan con el puesto
- Escribí un objetivo profesional específico para ESTE puesto en ESTA empresa
- Texto plano sin asteriscos ni símbolos
- Lenguaje argentino natural y profesional
- Hacelo competitivo para este puesto específico

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

  cvAdaptadoTexto = `CURRÍCULUM VITAE
Adaptado para: ${emp.titulo} - ${emp.empresa}

DATOS PERSONALES
Nombre: ${perfil.nombre || 'Candidato'}
${perfil.ciudad ? `Localidad: ${perfil.ciudad}` : ''}
País: Argentina

OBJETIVO PROFESIONAL
Me postulo para el puesto de ${emp.titulo} en ${emp.empresa}.
${perfil.experiencia === 'sin_exp'
  ? 'Aunque no cuento con experiencia formal, me caracterizo por mi responsabilidad, puntualidad y gran predisposición para aprender y adaptarme rápidamente al entorno laboral.'
  : `Cuento con ${perfil.expDetalle || 'experiencia en el área'} y busco nuevos desafíos profesionales.`}

EXPERIENCIA LABORAL
${perfil.expDetalle || (perfil.experiencia === 'sin_exp'
  ? 'Sin experiencia previa. Disponible para capacitación inmediata a cargo de la empresa.'
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
