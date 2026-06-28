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
      if (datos.nombre) document.getElementById('nombre').value = datos.nombre;
      if (datos.edad) document.getElementById('edad').value = datos.edad;
      if (datos.celular) document.getElementById('celular').value = datos.celular;
      if (datos.emailContacto) document.getElementById('email-contacto').value = datos.emailContacto;
      if (datos.ciudad) document.getElementById('ciudad').value = datos.ciudad;
      if (datos.puestoBuscado) document.getElementById('puesto-buscado').value = datos.puestoBuscado;
      if (datos.salario) document.getElementById('salario').value = datos.salario;
      if (datos.estudios) document.getElementById('estudios').value = datos.estudios;
      if (datos.institucion) document.getElementById('institucion').value = datos.institucion;
      if (datos.expEmpresa) document.getElementById('experiencia-empresa').value = datos.expEmpresa;
      if (datos.expDetalle) document.getElementById('experiencia-detalle').value = datos.expDetalle;
      if (datos.infoExtra) document.getElementById('info-extra').value = datos.infoExtra;
      if (datos.cv) cvFinal = datos.cv;

      if (datos.geminiKey) {
        localStorage.setItem('labuia_gemini_key', datos.geminiKey);
        document.getElementById('gemini-key').value = datos.geminiKey;
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
          document.getElementById('zona-experiencia-detalle').classList.remove('oculto');
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
// CONSTRUIR PERFIL TEXTO COMPLETO
// ============================================

function construirPerfilTexto() {
  const nombre = perfil.nombre || 'Candidato';
  const celular = perfil.celular || '';
  const email = perfil.emailContacto || '';
  const ciudad = perfil.ciudad || 'Argentina';
  const edad = perfil.edad || '';
  const estudios = perfil.estudios || '';
  const institucion = perfil.institucion || '';
  const habilidadesTexto = (perfil.habilidades || []).join(', ');
  const expEmpresa = perfil.expEmpresa || '';
  const expDetalle = perfil.expDetalle || '';
  const infoExtra = perfil.infoExtra || '';
  const horarioTexto = (perfil.horarios || [])
    .map(h => h === 'cualquier_horario' ? 'Cualquier horario' :
      h === 'manana' ? 'Turno mañana' :
      h === 'tarde' ? 'Turno tarde' :
      h === 'noche' ? 'Turno noche' :
      h === 'rotativo' ? 'Turno rotativo' : h)
    .join(', ');

  const expTexto = experiencia === 'sin_exp' ? 'Sin experiencia laboral previa' :
    experiencia === 'poca_exp' ? 'Poca experiencia (1-2 años)' :
    experiencia === 'media_exp' ? 'Experiencia media (3-5 años)' :
    'Experiencia amplia (+5 años)';

  return `
DATOS DE CONTACTO:
Nombre: ${nombre}
${edad ? `Edad: ${edad} años` : ''}
${celular ? `Celular: ${celular}` : ''}
${email ? `Email: ${email}` : ''}
Ciudad: ${ciudad}

NIVEL DE EXPERIENCIA: ${expTexto}
${expEmpresa ? `Empresas donde trabajó: ${expEmpresa}` : ''}
${expDetalle ? `Descripción de sus tareas: ${expDetalle}` : ''}
${infoExtra ? `Información adicional: ${infoExtra}` : ''}

ESTUDIOS: ${estudios}${institucion ? ` en ${institucion}` : ''}
HABILIDADES: ${habilidadesTexto || 'No especificadas'}
DISPONIBILIDAD: ${horarioTexto}
MODALIDAD: ${modalidad}
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
  const perfilTexto = construirPerfilTexto();
  const puesto = perfil.puestoBuscado || document.getElementById('puesto-buscado').value.trim();

  const prompt = `Sos un experto en recursos humanos argentino especializado en redactar CVs profesionales.
Generá un CV profesional en español para esta persona buscando trabajo en Argentina.

INFORMACIÓN DEL CANDIDATO:
${perfilTexto}
PUESTO QUE BUSCA: ${puesto || 'Cualquier empleo'}

INSTRUCCIONES IMPORTANTES:
- Si trabajó en empresas, deducí el nombre correcto del puesto y describí las tareas de forma profesional
- Si tiene habilidades como "Manejo de auto-elevador", incluíla como "Manejo de autoelevador / Clark (conocimiento práctico)"
- Si no tiene experiencia formal, destacá fuertemente las ganas de trabajar, responsabilidad y capacidad de aprendizaje
- Incluí SIEMPRE los datos de contacto al inicio (nombre, celular, email, ciudad)
- Escribí en texto plano sin asteriscos ni símbolos raros
- Usá lenguaje argentino profesional
- El CV debe verse competitivo y profesional

FORMATO DEL CV:
DATOS PERSONALES Y CONTACTO
OBJETIVO PROFESIONAL (específico para el puesto buscado)
EXPERIENCIA LABORAL (con tareas detalladas y profesionales)
HABILIDADES Y COMPETENCIAS
EDUCACIÓN
DISPONIBILIDAD`;

  if (apiKey) {
    const texto = await llamarGemini(prompt, apiKey);
    if (texto) {
      cvFinal = texto;
      preview.textContent = texto;
      return;
    }
  }

  // CV local sin IA
  const nombre = perfil.nombre || document.getElementById('nombre').value.trim() || 'Candidato';
  const celular = perfil.celular || document.getElementById('celular').value.trim();
  const emailC = perfil.emailContacto || document.getElementById('email-contacto').value.trim();
  const ciudad = perfil.ciudad || document.getElementById('ciudad').value.trim();
  const estudiosVal = perfil.estudios || document.getElementById('estudios').value;
  const expEmpresa = document.getElementById('experiencia-empresa')?.value.trim() || '';
  const expDetalle = document.getElementById('experiencia-detalle')?.value.trim() || '';
  const habilidadesTexto = habilidades.join(', ');

  cvFinal = `CURRÍCULUM VITAE

DATOS PERSONALES Y CONTACTO
Nombre: ${nombre}
${celular ? `Celular: ${celular}` : ''}
${emailC ? `Email: ${emailC}` : ''}
${ciudad ? `Localidad: ${ciudad}` : ''}
País: Argentina

OBJETIVO PROFESIONAL
${experiencia === 'sin_exp'
  ? `Joven con muchas ganas de incorporarme al mundo laboral. Me caracterizo por mi responsabilidad, puntualidad y predisposición para aprender. Busco mi primera oportunidad en ${puesto || 'el área que me permita crecer profesionalmente'}.`
  : `Profesional con experiencia en ${expEmpresa || 'el área'}. Busco nuevas oportunidades en ${puesto || 'mi especialidad'} donde pueda seguir creciendo.`}

EXPERIENCIA LABORAL
${expEmpresa ? `Empresa: ${expEmpresa}
Tareas: ${expDetalle || 'Tareas operativas y de producción'}` : 
(experiencia === 'sin_exp' ? 'Sin experiencia laboral formal previa. Disponible para capacitación inmediata a cargo de la empresa.' : expDetalle || 'Experiencia en el área')}

HABILIDADES Y COMPETENCIAS
${habilidadesTexto || 'Trabajo en equipo, responsabilidad, puntualidad, adaptabilidad, predisposición para aprender'}

EDUCACIÓN
${estudiosVal === 'primario' ? 'Primario completo' :
  estudiosVal === 'secundario_inc' ? 'Secundario incompleto' :
  estudiosVal === 'secundario' ? 'Secundario completo' :
  estudiosVal === 'terciario' ? 'Estudios terciarios en curso' :
  estudiosVal === 'universitario' ? 'Universitario completo' : 'Formación en proceso'}

DISPONIBILIDAD
Inmediata - ${horarios.includes('cualquier_horario') ? 'Cualquier horario' :
  horarios.map(h => h === 'manana' ? 'Turno mañana' : h === 'tarde' ? 'Turno tarde' :
  h === 'noche' ? 'Turno noche' : h === 'rotativo' ? 'Turno rotativo' : h).join(', ')}`;

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
  const infoExtra = document.getElementById('info-extra').value.trim();

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
    const analizados = await analizarConIA(empleos, puesto);
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
  if (modalidad === 'remoto') {
    try {
      const res = await fetch(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(puesto)}&limit=10`
      );
      const data = await res.json();
      if (data.jobs && data.jobs.length > 0) {
        return data.jobs.slice(0, 10).map((job, i) => ({
          id: i + 1,
          titulo: job.title,
          empresa: job.company_name,
          ubicacion: 'Remoto desde Argentina',
          descripcion: (job.description || '').replace(/<[^>]*>/g, '').substring(0, 500),
          link: job.url,
          fuente: 'Remotive',
          esEmpresaGrande: false,
          score: 0,
          analisis: null
        }));
      }
    } catch {}
  }
  return generarEmpleosArgentinos(puesto, ciudad);
}

function generarEmpleosArgentinos(puesto, ciudad) {
  const zona = ciudad || 'Buenos Aires';
  const puestoLower = puesto.toLowerCase();

  const empresasGrandes = ['arcor', 'carrefour', 'coto', 'jumbo', 'walmart', 'pepsico',
    'unilever', 'quilmes', 'molinos', 'mercado libre', 'banco galicia', 'santander'];

  const empleosPorRubro = {
    repositor: [
      { empresa: 'Carrefour Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-repositor.html', grande: true },
      { empresa: 'Supermercados DIA', extra: 'Turno tarde', link: 'https://www.bumeran.com.ar/empleos-repositor.html', grande: true },
      { empresa: 'Coto CICSA', extra: 'Turno rotativo', link: 'https://www.computrabajo.com.ar/trabajo-de-repositor', grande: true },
      { empresa: 'Jumbo Argentina', extra: 'Part time', link: 'https://www.zonajobs.com.ar/empleos-de-repositor.html', grande: true },
      { empresa: 'La Anónima', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-repositor.html', grande: false },
      { empresa: 'Walmart Argentina', extra: 'Ingreso inmediato', link: 'https://www.computrabajo.com.ar/trabajo-de-repositor', grande: true },
      { empresa: 'Disco Vea', extra: 'Turno mañana o tarde', link: 'https://www.bumeran.com.ar/empleos-repositor.html', grande: true },
      { empresa: 'Supermercado Toledo', extra: 'Con y sin experiencia', link: 'https://www.computrabajo.com.ar/trabajo-de-repositor', grande: false },
      { empresa: 'El Super', extra: 'Zona Norte GBA', link: 'https://www.zonajobs.com.ar/empleos-de-repositor.html', grande: false },
      { empresa: 'Changomas', extra: 'Turno rotativo', link: 'https://www.bumeran.com.ar/empleos-repositor.html', grande: true },
      { empresa: 'Makro Argentina', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-repositor', grande: true },
      { empresa: 'Supermercado Nini', extra: 'Zona Norte', link: 'https://www.zonajobs.com.ar/empleos-de-repositor.html', grande: false },
    ],
    cajero: [
      { empresa: 'Carrefour Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-cajero.html', grande: true },
      { empresa: 'Farmacity', extra: 'Part time', link: 'https://www.bumeran.com.ar/empleos-cajero.html', grande: true },
      { empresa: 'Coto CICSA', extra: 'Turno rotativo', link: 'https://www.zonajobs.com.ar/empleos-de-cajero.html', grande: true },
      { empresa: 'Supermercados DIA', extra: 'Ingreso inmediato', link: 'https://www.bumeran.com.ar/empleos-cajero.html', grande: true },
      { empresa: 'Rapipago', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-cajero', grande: false },
      { empresa: 'Pago Fácil', extra: 'Turno tarde', link: 'https://www.bumeran.com.ar/empleos-cajero.html', grande: false },
      { empresa: 'Jumbo Argentina', extra: 'Turno mañana', link: 'https://www.computrabajo.com.ar/trabajo-de-cajero', grande: true },
      { empresa: 'Walmart Argentina', extra: 'Turno rotativo', link: 'https://www.zonajobs.com.ar/empleos-de-cajero.html', grande: true },
      { empresa: 'Changomas', extra: 'Part time', link: 'https://www.bumeran.com.ar/empleos-cajero.html', grande: true },
      { empresa: 'Dr. Ahorro', extra: 'Con o sin experiencia', link: 'https://www.computrabajo.com.ar/trabajo-de-cajero', grande: false },
    ],
    operario: [
      { empresa: 'Arcor', extra: 'Turno rotativo', link: 'https://www.bumeran.com.ar/empleos-operario.html', grande: true },
      { empresa: 'Molinos Río de la Plata', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-operario', grande: true },
      { empresa: 'Quilmes', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-operario.html', grande: true },
      { empresa: 'Pepsico Argentina', extra: 'Relación de dependencia', link: 'https://www.zonajobs.com.ar/empleos-de-operario.html', grande: true },
      { empresa: 'Unilever Argentina', extra: 'Turno tarde', link: 'https://www.bumeran.com.ar/empleos-operario.html', grande: true },
      { empresa: 'Adecco Argentina', extra: 'Eventual con posibilidad de pase', link: 'https://www.computrabajo.com.ar/trabajo-de-operario', grande: false },
      { empresa: 'Manpower Argentina', extra: 'Múltiples turnos', link: 'https://www.bumeran.com.ar/empleos-operario.html', grande: false },
      { empresa: 'CCU Argentina', extra: 'Turno rotativo', link: 'https://www.computrabajo.com.ar/trabajo-de-operario', grande: true },
      { empresa: 'Kraft Heinz Argentina', extra: 'Full time', link: 'https://www.zonajobs.com.ar/empleos-de-operario.html', grande: true },
      { empresa: 'Bimbo Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-operario.html', grande: true },
      { empresa: 'Georgalos', extra: 'Con y sin experiencia', link: 'https://www.computrabajo.com.ar/trabajo-de-operario', grande: false },
      { empresa: 'Bayton Grupo Empresarial', extra: 'Ingreso inmediato', link: 'https://www.zonajobs.com.ar/empleos-de-operario.html', grande: false },
    ],
    limpieza: [
      { empresa: 'Sodexo Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-limpieza.html', grande: true },
      { empresa: 'ISS Argentina', extra: 'Part time', link: 'https://www.computrabajo.com.ar/trabajo-de-limpieza', grande: true },
      { empresa: 'Compass Group', extra: 'Turno tarde', link: 'https://www.bumeran.com.ar/empleos-limpieza.html', grande: true },
      { empresa: 'Limpiolux', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-limpieza', grande: false },
      { empresa: 'Grupo Soluciones', extra: 'Zona Norte GBA', link: 'https://www.zonajobs.com.ar/empleos-de-limpieza.html', grande: false },
      { empresa: 'Cintas Corporation', extra: 'Relación de dependencia', link: 'https://www.bumeran.com.ar/empleos-limpieza.html', grande: true },
      { empresa: 'Securitas Argentina', extra: 'Con beneficios', link: 'https://www.computrabajo.com.ar/trabajo-de-limpieza', grande: true },
      { empresa: 'Absa Ambiental', extra: 'Turno rotativo', link: 'https://www.zonajobs.com.ar/empleos-de-limpieza.html', grande: false },
    ],
    seguridad: [
      { empresa: 'Securitas Argentina', extra: 'Turno rotativo', link: 'https://www.bumeran.com.ar/empleos-seguridad.html', grande: true },
      { empresa: 'G4S Argentina', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-seguridad', grande: true },
      { empresa: 'Prosegur Argentina', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-seguridad.html', grande: true },
      { empresa: 'Brinks Argentina', extra: 'Relación de dependencia', link: 'https://www.zonajobs.com.ar/empleos-de-seguridad.html', grande: true },
      { empresa: 'Omint', extra: 'Zona Norte', link: 'https://www.bumeran.com.ar/empleos-seguridad.html', grande: false },
      { empresa: 'Vigencia SA', extra: 'Turno noche', link: 'https://www.computrabajo.com.ar/trabajo-de-seguridad', grande: false },
    ],
    mozo: [
      { empresa: 'TGI Fridays Argentina', extra: 'Part time', link: 'https://www.bumeran.com.ar/empleos-mozo.html', grande: false },
      { empresa: 'Grupo Pegasso', extra: 'Turno noche', link: 'https://www.computrabajo.com.ar/trabajo-de-mozo', grande: false },
      { empresa: 'Mostaza', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-mozo.html', grande: false },
      { empresa: 'McDonald\'s Argentina', extra: 'Part time', link: 'https://www.computrabajo.com.ar/trabajo-de-mozo', grande: true },
      { empresa: 'Burguer King Argentina', extra: 'Turno tarde-noche', link: 'https://www.zonajobs.com.ar/empleos-de-mozo.html', grande: true },
      { empresa: 'Freddo', extra: 'Temporada', link: 'https://www.bumeran.com.ar/empleos-mozo.html', grande: false },
      { empresa: 'Café Martínez', extra: 'Part time', link: 'https://www.computrabajo.com.ar/trabajo-de-mozo', grande: false },
      { empresa: 'Subway Argentina', extra: 'Flexible', link: 'https://www.zonajobs.com.ar/empleos-de-mozo.html', grande: false },
    ],
    delivery: [
      { empresa: 'PedidosYa', extra: 'Flexible', link: 'https://www.bumeran.com.ar/empleos-delivery.html', grande: true },
      { empresa: 'Rappi Argentina', extra: 'Por horas', link: 'https://www.computrabajo.com.ar/trabajo-de-delivery', grande: true },
      { empresa: 'Glovo Argentina', extra: 'Turno libre', link: 'https://www.bumeran.com.ar/empleos-delivery.html', grande: true },
      { empresa: 'Mercado Envíos', extra: 'Relación de dependencia', link: 'https://www.zonajobs.com.ar/empleos-de-delivery.html', grande: true },
      { empresa: 'Andreani', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-delivery.html', grande: true },
      { empresa: 'OCA Argentina', extra: 'Turno mañana', link: 'https://www.computrabajo.com.ar/trabajo-de-delivery', grande: true },
    ],
    chofer: [
      { empresa: 'Mercado Envíos', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-chofer.html', grande: true },
      { empresa: 'DHL Argentina', extra: 'Turno mañana', link: 'https://www.computrabajo.com.ar/trabajo-de-chofer', grande: true },
      { empresa: 'Andreani', extra: 'Relación de dependencia', link: 'https://www.bumeran.com.ar/empleos-chofer.html', grande: true },
      { empresa: 'OCA Argentina', extra: 'Full time', link: 'https://www.zonajobs.com.ar/empleos-de-chofer.html', grande: true },
      { empresa: 'Rapipago', extra: 'Zona Norte GBA', link: 'https://www.bumeran.com.ar/empleos-chofer.html', grande: false },
      { empresa: 'Logística 3PL', extra: 'Con experiencia', link: 'https://www.computrabajo.com.ar/trabajo-de-chofer', grande: false },
    ],
    administrativo: [
      { empresa: 'Adecco Argentina', extra: 'Full time', link: 'https://www.bumeran.com.ar/empleos-administrativo.html', grande: false },
      { empresa: 'Manpower Argentina', extra: 'Relación de dependencia', link: 'https://www.computrabajo.com.ar/trabajo-de-administrativo', grande: false },
      { empresa: 'Banco Galicia', extra: 'Con beneficios', link: 'https://www.zonajobs.com.ar/empleos-de-administrativo.html', grande: true },
      { empresa: 'OSDE', extra: 'Turno mañana', link: 'https://www.bumeran.com.ar/empleos-administrativo.html', grande: true },
      { empresa: 'Telecom Argentina', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-administrativo', grande: true },
      { empresa: 'Grupo Clarín', extra: 'Híbrido', link: 'https://www.zonajobs.com.ar/empleos-de-administrativo.html', grande: true },
    ],
    vendedor: [
      { empresa: 'Frávega', extra: 'Comisiones', link: 'https://www.bumeran.com.ar/empleos-vendedor.html', grande: true },
      { empresa: 'Garbarino', extra: 'Full time + comisiones', link: 'https://www.computrabajo.com.ar/trabajo-de-vendedor', grande: true },
      { empresa: 'Personal (Telecom)', extra: 'Turno rotativo', link: 'https://www.bumeran.com.ar/empleos-vendedor.html', grande: true },
      { empresa: 'Claro Argentina', extra: 'Con comisiones', link: 'https://www.zonajobs.com.ar/empleos-de-vendedor.html', grande: true },
      { empresa: 'Movistar Argentina', extra: 'Relación de dependencia', link: 'https://www.bumeran.com.ar/empleos-vendedor.html', grande: true },
      { empresa: 'Red Link', extra: 'Full time', link: 'https://www.computrabajo.com.ar/trabajo-de-vendedor', grande: false },
    ],
    default: [
      { empresa: 'Adecco Argentina', extra: 'Múltiples turnos', link: `https://www.bumeran.com.ar/empleos-${puestoLower.replace(/ /g,'-')}.html`, grande: false },
      { empresa: 'Manpower Argentina', extra: 'Ingreso inmediato', link: `https://www.computrabajo.com.ar/trabajo-de-${puestoLower.replace(/ /g,'-')}`, grande: false },
      { empresa: 'Randstad Argentina', extra: 'Relación de dependencia', link: `https://www.zonajobs.com.ar/empleos-de-${puestoLower.replace(/ /g,'-')}.html`, grande: false },
      { empresa: 'Kelly Services Argentina', extra: 'Full time', link: `https://www.bumeran.com.ar/empleos-${puestoLower.replace(/ /g,'-')}.html`, grande: false },
      { empresa: 'Grupo Gestión', extra: 'Turno rotativo', link: `https://www.computrabajo.com.ar/trabajo-de-${puestoLower.replace(/ /g,'-')}`, grande: false },
      { empresa: 'Bayton Grupo Empresarial', extra: 'Con y sin experiencia', link: `https://www.bumeran.com.ar/empleos-${puestoLower.replace(/ /g,'-')}.html`, grande: false },
      { empresa: 'Puntual RRHH', extra: 'Zona Norte GBA', link: `https://www.computrabajo.com.ar/trabajo-de-${puestoLower.replace(/ /g,'-')}`, grande: false },
      { empresa: 'Personal eventual', extra: 'Urgente', link: `https://www.zonajobs.com.ar/empleos-de-${puestoLower.replace(/ /g,'-')}.html`, grande: false },
    ]
  };

  const descripcionesPorRubro = {
    repositor: `Buscamos repositor/a para incorporarse a nuestro equipo.
Tareas: reposición de mercadería en góndola, control de stock, mantenimiento del orden y limpieza del sector, recepción y verificación de mercadería, rotación de productos.
Requisitos: secundario completo (excluyente), disponibilidad horaria, responsabilidad y proactividad.
No se requiere experiencia previa. Capacitación completa a cargo de la empresa.
Ofrecemos: sueldo según convenio + adicionales, obra social, bonos por presentismo y asistencia perfecta.`,

    cajero: `Incorporamos cajero/a para nuestras sucursales.
Tareas: atención al cliente en caja, cobro en efectivo y tarjetas, manejo de terminales POS, cierre y apertura de caja, mantenimiento del orden en el sector.
Requisitos: secundario completo, habilidades numéricas básicas, trato amable con el público, responsabilidad en el manejo de dinero.
No se requiere experiencia previa. Capacitación incluida.
Ofrecemos: sueldo según convenio + bonos, obra social de primer nivel.`,

    operario: `Incorporamos operarios/as de producción para nuestras plantas.
Tareas: operación y control de maquinaria, control de calidad del producto, mantenimiento del orden y limpieza del sector, cumplimiento de normas de seguridad e higiene, trabajo en línea de producción.
Requisitos: secundario completo, disponibilidad para trabajo en turnos rotativos, responsabilidad y compromiso.
Se valorará experiencia previa aunque no es excluyente.
Ofrecemos: sueldo según convenio + horas extra, obra social, comedor en planta, ropa de trabajo, posibilidades de crecimiento.`,

    limpieza: `Buscamos personal de limpieza y mantenimiento para diferentes clientes.
Tareas: limpieza y desinfección de instalaciones, mantenimiento del orden, uso correcto de productos de limpieza profesionales, reporte al supervisor de área.
Requisitos: buena predisposición, responsabilidad, puntualidad.
No se requiere experiencia previa.
Ofrecemos: sueldo según convenio de maestranza, obra social.`,

    seguridad: `Incorporamos agentes de seguridad privada.
Tareas: control de accesos, vigilancia de instalaciones, atención al público, reporte de incidentes.
Requisitos: secundario completo, preferentemente con curso de vigilador (no excluyente). Disponibilidad horaria.
Ofrecemos: sueldo según convenio + adicionales nocturnos, obra social.`,

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
    esEmpresaGrande: emp.grande,
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
          'Oferta disponible en tu zona',
          'El puesto coincide con tu búsqueda',
          'Activá la IA Gemini para ver análisis real'
        ],
        debilidades: ['Configurá tu API Key en "Activar IA real" para análisis detallado'],
        resumen: 'Score estimado. Activá la IA para ver tu compatibilidad real con este puesto.'
      }
    }));
  }

  const resultado = [];
  for (const empleo of empleos) {
    try {
      const prompt = `Sos un experto en RRHH argentino especializado en perfiles operativos y trabajadores sin experiencia.
Analizá la compatibilidad entre este perfil y esta oferta de trabajo argentina.

PERFIL DEL CANDIDATO:
${perfilTexto}

OFERTA:
Puesto: ${empleo.titulo}
Empresa: ${empleo.empresa}
Ubicación: ${empleo.ubicacion}
Descripción: ${empleo.descripcion.substring(0, 400)}

REGLAS IMPORTANTES:
- Si el puesto no requiere experiencia y el candidato no tiene → score entre 70 y 85
- Si tiene habilidades que coinciden con el puesto → sumá 10-15 puntos
- Si la empresa es grande y tiene sistemas ATS → mencionalo como ventaja si el CV está bien estructurado
- Si el candidato describe tareas con sus propias palabras, valorá eso positivamente
- Sé específico y útil en las fortalezas y debilidades

Respondé ÚNICAMENTE con este JSON, sin texto extra:
{
  "score": numero del 1 al 100,
  "fortalezas": ["razón específica 1", "razón específica 2", "razón específica 3"],
  "debilidades": ["punto concreto 1", "punto concreto 2"],
  "resumen": "Una oración clara en español rioplatense explicando la compatibilidad"
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
    const badgeGrande = emp.esEmpresaGrande ? '<span class="tag-verde">🏢 Empresa grande</span>' : '';
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
          ${badgeGrande}
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
  const atsAviso = emp.esEmpresaGrande ? `
    <div class="aviso-ats">
      🏢 <strong>Empresa grande</strong> — Al adaptar tu CV, la IA lo formatea en estilo Harvard/ATS para pasar los filtros automáticos de selección.
    </div>` : '';

  document.getElementById('contenido-detalle').innerHTML = `
    <div class="detalle-header">
      <div class="detalle-titulo">${emp.titulo}</div>
      <div class="detalle-empresa">${emp.empresa} · ${emp.ubicacion}</div>
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
// ADAPTAR CV AL PUESTO CON IA
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
  const perfilTexto = construirPerfilTexto();
  const esGrande = emp.esEmpresaGrande;

  const prompt = `Sos un experto en recursos humanos argentino y especialista en redacción de CVs profesionales.
Adaptá el CV de esta persona específicamente para este puesto.

INFORMACIÓN DEL CANDIDATO:
${perfilTexto}
${cvFinal ? `CV actual del candidato:\n${cvFinal.substring(0, 600)}` : ''}

PUESTO AL QUE SE POSTULA:
Título: ${emp.titulo}
Empresa: ${emp.empresa}
Descripción: ${emp.descripcion}

INSTRUCCIONES CRÍTICAS:
${esGrande ? 
  '- Esta es una EMPRESA GRANDE que usa sistemas ATS de lectura automática de CVs. Usá formato Harvard: texto plano, una columna, sin tablas, sin colores. Las habilidades deben estar como palabras clave que el sistema pueda detectar.' :
  '- Esta es una empresa mediana/pyme. Podés usar un formato más visual y cálido.'
}
- Si el candidato describió sus tareas con palabras simples (ej: "armaba rollos de tela"), transformalas en lenguaje profesional (ej: "Preparación y embalaje de rollos textiles para distribución")
- Si tiene habilidades como "Manejo de auto-elevador" incluíla aunque haya sido por poco tiempo como: "Manejo de autoelevador/Clark (conocimiento práctico)"
- Incluí SIEMPRE los datos de contacto completos al inicio
- Si no tiene experiencia, el objetivo profesional debe ser muy fuerte y específico para ESTE puesto
- Texto plano sin asteriscos ni símbolos raros
- Lenguaje argentino profesional

Generá el CV adaptado completo y profesional.`;

  if (apiKey) {
    const cvAdaptado = await llamarGemini(prompt, apiKey);
    if (cvAdaptado) {
      cvAdaptadoTexto = cvAdaptado;
      document.getElementById('cv-adaptado-contenido').innerHTML =
        `<div class="cv-adaptado-box">${cvAdaptado.replace(/\n/g, '<br>')}</div>`;
      return;
    }
  }

  // CV adaptado sin IA
  const nombre = perfil.nombre || 'Candidato';
  const celular = perfil.celular || '';
  const emailC = perfil.emailContacto || '';
  const ciudad = perfil.ciudad || 'Argentina';
  const habilidadesTexto = (perfil.habilidades || habilidades).join(', ');
  const expEmpresa = perfil.expEmpresa || '';
  const expDetalle = perfil.expDetalle || '';
  const estudiosVal = perfil.estudios || '';

  cvAdaptadoTexto = `CURRÍCULUM VITAE
Adaptado para: ${emp.titulo} en ${emp.empresa}

DATOS PERSONALES Y CONTACTO
Nombre: ${nombre}
${celular ? `Celular: ${celular}` : ''}
${emailC ? `Email: ${emailC}` : ''}
${ciudad ? `Localidad: ${ciudad}` : ''}
País: Argentina

OBJETIVO PROFESIONAL
Me postulo para el puesto de ${emp.titulo} en ${emp.empresa}.
${perfil.experiencia === 'sin_exp'
  ? 'Me caracterizo por mi responsabilidad, puntualidad y gran predisposición para aprender y adaptarme rápidamente al entorno laboral. Estoy disponible de forma inmediata para incorporarme y capacitarme.'
  : `Cuento con experiencia en ${expEmpresa || 'el área'} y busco nuevos desafíos profesionales donde pueda aportar mis conocimientos y seguir creciendo.`}

EXPERIENCIA LABORAL
${expEmpresa ? `Empresa: ${expEmpresa}
Tareas: ${expDetalle || 'Operaciones generales del sector'}` :
(perfil.experiencia === 'sin_exp'
  ? 'Sin experiencia laboral formal previa. Disponible para capacitación inmediata a cargo de la empresa.'
  : expDetalle || 'Experiencia en el área')}

HABILIDADES Y COMPETENCIAS
${habilidadesTexto || 'Trabajo en equipo, responsabilidad, puntualidad, predisposición para aprender, adaptabilidad'}

EDUCACIÓN
${estudiosVal === 'primario' ? 'Nivel Primario Completo' :
  estudiosVal === 'secundario_inc' ? 'Nivel Secundario Incompleto' :
  estudiosVal === 'secundario' ? 'Nivel Secundario Completo' :
  estudiosVal === 'terciario' ? 'Estudios Terciarios en Curso' :
  estudiosVal === 'universitario' ? 'Nivel Universitario Completo' : 'Formación en proceso'}
${perfil.institucion ? `Institución: ${perfil.institucion}` : ''}

DISPONIBILIDAD
Inmediata
Horarios: ${(perfil.horarios || horarios).includes('cualquier_horario') ? 'Cualquier horario / Turnos rotativos' :
  (perfil.horarios || horarios).map(h =>
    h === 'manana' ? 'Turno Mañana' :
    h === 'tarde' ? 'Turno Tarde' :
    h === 'noche' ? 'Turno Noche' :
    h === 'rotativo' ? 'Turno Rotativo' : h
  ).join(' / ')}`;

  document.getElementById('cv-adaptado-contenido').innerHTML =
    `<div class="cv-adaptado-box">${cvAdaptadoTexto.replace(/\n/g, '<br>')}</div>`;
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
