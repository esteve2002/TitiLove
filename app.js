import { 
    collection, getDocs, addDoc, doc, getDoc, query, where, deleteDoc, updateDoc, increment 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { db } from "./firebase.js";

// --- VARIABLES GLOBALES ---
let planesSeleccionados = [];
let miGrafico = null;

// --- 1. LÓGICA DE INTERACCIÓN AMOROSA (Solo para Index) ---
function inicializarInteraccion() {
    const btnCorazon = document.getElementById('btnCorazon');
    const flecha = document.getElementById('flechaGuia');
    const bienvenida = document.getElementById('bienvenidaAmor');
    const seccionPlanes = document.getElementById('seccionPlanes');
    const btnSeguir = document.getElementById('btnSeguir');

    if (btnCorazon) {
        btnCorazon.onclick = () => {
            if (flecha) flecha.style.display = 'none';
            if (bienvenida) {
                bienvenida.style.display = 'block';
                bienvenida.scrollIntoView({ behavior: 'smooth' });
            }
        };
    }

    if (btnSeguir) {
        btnSeguir.onclick = () => {
            if (bienvenida) bienvenida.style.display = 'none';
            if (seccionPlanes) {
                seccionPlanes.style.display = 'block';
                seccionPlanes.scrollIntoView({ behavior: 'smooth' });
            }
        };
    }
}

// --- 2. GESTIÓN DE NAVEGACIÓN Y SELECCIÓN ---
window.entrarAlPlan = function(id) {
    if (id) {
        localStorage.setItem("id_plan_actual", id);
        window.location.href = "plan.html";
    }
};

window.gestionarSeleccionPlan = function(id, checkbox) {
    if (checkbox.checked) {
        planesSeleccionados.push(id);
    } else {
        planesSeleccionados = planesSeleccionados.filter(planId => planId !== id);
    }
    const btnBatch = document.getElementById("btnEliminarVarios");
    if (btnBatch) {
        btnBatch.style.display = planesSeleccionados.length > 0 ? "block" : "none";
    }
};

window.eliminarPlanesSeleccionados = async function() {
    if (planesSeleccionados.length === 0) return;
    if (confirm(`¿Estás seguro de eliminar ${planesSeleccionados.length} planes?`)) {
        try {
            for (const id of planesSeleccionados) {
                await deleteDoc(doc(db, "Planes", id));
            }
            alert("Planes eliminados con éxito");
            planesSeleccionados = [];
            cargarPlanes(); 
        } catch (error) { console.error(error); }
    }
};

// --- 3. CARGA SEGÚN LA PÁGINA ---
document.addEventListener("DOMContentLoaded", async function() {
    const path = window.location.pathname;
    const idPlan = localStorage.getItem("id_plan_actual");

    // Lógica para PLAN.HTML (Detalle)
    if (path.includes("plan.html")) {
        if (!idPlan) {
            console.warn("No hay ID de plan en localStorage");
            return;
        }
        await obtenerDatosDelPlan(idPlan);
        await cargarGastosDelPlan(idPlan);
        await cargarAhorrosDelPlan(idPlan);
        await cargarDesplegableCategorias();

        if (document.getElementById('btAbrirModalCrearGasto')) configurarModalYFormularioNuevoGasto(idPlan);
        if (document.getElementById('btAbrirModalCrearAhorro')) configurarModalYFormularioNuevoAhorro(idPlan);

        const btnVerInfo = document.getElementById("verInfoPlan");
        if (btnVerInfo) {
            btnVerInfo.addEventListener("click", () => mostrarGraficaGastos(idPlan));
        }
    } 
    // Lógica para INDEX.HTML (Principal)
    else {
        inicializarInteraccion();
        cargarPlanes();
        configurarModalPrincipal();
    }
});

// --- 4. FUNCIONES FIREBASE: PLANES ---
async function obtenerDatosDelPlan(id) {
    try {
        const docSnap = await getDoc(doc(db, "Planes", id));
        if (docSnap.exists()) {
            const datos = docSnap.data();
            const tituloDoc = document.getElementById("tituloPlan");
            if (tituloDoc) tituloDoc.innerText = "Plan: " + (datos.Nombre || "Sin nombre");
        }
    } catch (error) { console.error(error); }
}

async function cargarPlanes() {
    const tablaBody = document.getElementById("cuerpoTabla");
    if (!tablaBody) return;
    const snapshot = await getDocs(collection(db, "Planes"));
    tablaBody.innerHTML = ""; 
    snapshot.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${p.Nombre || ""}</td>
            <td>${p.ObjetivoDinero || 0} €</td>
            <td>${p.GastoMax || 0} €</td>
            <td>${p.FechaFinal || "-"}</td>
            <td>${p.PresupuestoPlan || 0} €</td>
            <td><button class="btn btn-danger btn-sm" onclick="entrarAlPlan('${id}')">ENTRAR</button></td>
            <td><input type="checkbox" onchange="gestionarSeleccionPlan('${id}', this)"></td>
        `;
        tablaBody.appendChild(fila);
    });
}

// --- 5. FUNCIONES FIREBASE: GASTOS Y AHORROS ---
async function cargarGastosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaGastosPorPlan tbody");
    if (!tablaBody) return;
    const q = query(collection(db, "Gastos"), where("IdPlan", "==", idPlan));
    const snapshot = await getDocs(q);
    tablaBody.innerHTML = snapshot.empty ? `<tr><td colspan="3">No hay gastos.</td></tr>` : "";
    snapshot.forEach(docSnap => {
        const g = docSnap.data();
        const fila = document.createElement("tr");
        fila.innerHTML = `<td>${g.NombreGasto}</td><td>${g.TipoGasto}</td><td>${g.GastoNumerico} €</td>`;
        tablaBody.appendChild(fila);
    });
}

async function cargarAhorrosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaAhorrosPorPlan tbody");
    if (!tablaBody) return;
    const q = query(collection(db, "Ahorros"), where("IdPlan", "==", idPlan));
    const snapshot = await getDocs(q);
    tablaBody.innerHTML = snapshot.empty ? `<tr><td colspan="3">No hay ahorros.</td></tr>` : "";
    snapshot.forEach(docSnap => {
        const a = docSnap.data();
        const fila = document.createElement("tr");
        fila.innerHTML = `<td>${a.Apunte}</td><td>${a.Dinero_ahorrado} €</td><td>${a.Fecha_creacion}</td>`;
        tablaBody.appendChild(fila);
    });
}

async function cargarDesplegableCategorias() {
    const select = document.getElementById("selectTipoGasto");
    if (!select) return;
    const snapshot = await getDocs(collection(db, "TiposGastos"));
    select.innerHTML = '<option value="" disabled selected>Selecciona una categoría...</option>';
    snapshot.forEach(docSnap => {
        const nombre = docSnap.data().NombreTipoGasto;
        if (nombre) select.add(new Option(nombre, nombre));
    });
}

// --- 6. MODALES Y FORMULARIOS ---
function configurarModalPrincipal() {
    const modal = document.getElementById('modalForm');
    const form = document.getElementById('formPlan');
    document.getElementById('btAbrirModalCrearPlan')?.addEventListener('click', () => modal.showModal());
    document.getElementById('cerrarForm')?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombrePlan = form.NombrePlan.value;
        const presupuesto = form.PresupuestoPlan.value;
        const fechaFinal = form.FechaPlan.value;

        await addDoc(collection(db, "Planes"), {
            Nombre: nombrePlan,
            FechaFinal: fechaFinal,
            GastoMax: Number(form.GastoMaxPlan.value),
            ObjetivoDinero: Number(form.DineroNecesario.value),
            PresupuestoPlan: Number(presupuesto),
            fechaCreacion: new Date()
        });

        emailjs.send('service_lt35sn2', 'template_2u3ervl', {
            nombre_plan: nombrePlan,
            presupuesto_total: presupuesto,
            fecha_limite: fechaFinal,
            to_email: 'zaiirareyyes7@gmail.com' 
        });

        modal.close();
        form.reset();
        cargarPlanes();
    });
}

function configurarModalYFormularioNuevoGasto(idPlan) {
    const modal = document.getElementById('modalFormGasto');
    const form = document.getElementById('formGasto');
    document.getElementById('btAbrirModalCrearGasto').onclick = () => modal.showModal();
    document.getElementById('cerrarFormGasto').onclick = () => modal.close();

    form.onsubmit = async (e) => {
        e.preventDefault();
        const valor = Number(form.GastoNumerico.value);
        await addDoc(collection(db, "Gastos"), {
            NombreGasto: form.NombreGasto.value,
            TipoGasto: form.TipoGasto.value,
            GastoNumerico: valor,
            IdPlan: idPlan,
            fechaCreacion: new Date()
        });
        await updateDoc(doc(db, "Planes", idPlan), { PresupuestoPlan: increment(-valor) });
        modal.close();
        form.reset();
        cargarGastosDelPlan(idPlan);
        obtenerDatosDelPlan(idPlan);
    };
}

function configurarModalYFormularioNuevoAhorro(idPlan) {
    const modal = document.getElementById('modalFormAhorro');
    const form = document.getElementById('formAhorro');
    document.getElementById('btAbrirModalCrearAhorro').onclick = () => modal.showModal();
    document.getElementById('cerrarFormAhorro').onclick = () => modal.close();

    form.onsubmit = async (e) => {
        e.preventDefault();
        await addDoc(collection(db, "Ahorros"), {
            Apunte: form.Apunte.value,
            Dinero_ahorrado: Number(form.Dinero_ahorrado.value),
            Fecha_creacion: form.Fecha_creacion.value,
            IdPlan: idPlan
        });
        modal.close();
        form.reset();
        cargarAhorrosDelPlan(idPlan);
    };
}

async function mostrarGraficaGastos(idPlan) {
    const modalElement = document.getElementById('modalGrafica');
    const canvas = document.getElementById('graficoGastos');
    const bsModal = new bootstrap.Modal(modalElement);
    
    const q = query(collection(db, "Gastos"), where("IdPlan", "==", idPlan));
    const snapshot = await getDocs(q);
    const agrupados = {};
    let total = 0;

    snapshot.forEach(docSnap => {
        const g = docSnap.data();
        const cat = g.TipoGasto || "Otros";
        const imp = Number(g.GastoNumerico) || 0;
        agrupados[cat] = (agrupados[cat] || 0) + imp;
        total += imp;
    });

    if (total === 0) return alert("Sin gastos registrados.");

    bsModal.show();
    modalElement.addEventListener('shown.bs.modal', () => {
        if (miGrafico) miGrafico.destroy();
        miGrafico = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(agrupados),
                datasets: [{
                    data: Object.values(agrupados),
                    backgroundColor: ['#dc3545', '#0dcaf0', '#20c997', '#ffc107', '#fd7e14']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
        document.getElementById('resumenTexto').innerHTML = `Total Gastado: <b>${total.toFixed(2)} €</b>`;
    }, { once: true });
}