import { 
    collection, getDocs, addDoc, doc, getDoc, query, where, deleteDoc, updateDoc, increment 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { db } from "./firebase.js";

// --- VARIABLES GLOBALES ---
let planesSeleccionados = [];
let miGrafico = null;

// --- NAVEGACIÓN Y GESTIÓN DE PLANES ---
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

// --- LÓGICA DE CARGA ---
document.addEventListener("DOMContentLoaded", async function() {
    const idPlan = localStorage.getItem("id_plan_actual");

    if (window.location.pathname.includes("plan.html") && idPlan) {
        // Carga inicial de datos
        await obtenerDatosDelPlan(idPlan);
        await cargarGastosDelPlan(idPlan);
        await cargarAhorrosDelPlan(idPlan);
        await cargarDesplegableCategorias();

        // Configurar formularios
        configurarModalYFormularioNuevoGasto(idPlan);
        configurarModalYFormularioNuevoAhorro(idPlan);

        // BOTÓN VER INFO - Esta es la clave
        const btnVerInfo = document.getElementById("verInfoPlan");
        if (btnVerInfo) {
            btnVerInfo.addEventListener("click", () => {
                mostrarGraficaGastos(idPlan);
            });
        }
    } else if (!window.location.pathname.includes("plan.html")) {
        cargarPlanes();
        configurarModalPrincipal();
    }
});

// --- FUNCIONES DE FIREBASE ---

async function obtenerDatosDelPlan(id) {
    try {
        const docSnap = await getDoc(doc(db, "Planes", id));
        if (docSnap.exists()) {
            const datos = docSnap.data();
            document.getElementById("tituloPlan").innerText = "Plan: " + (datos.Nombre || "Sin nombre");
        }
    } catch (error) { console.error(error); }
}

async function cargarGastosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaGastosPorPlan tbody");
    if (!tablaBody) return;
    try {
        const q = query(collection(db, "Gastos"), where("IdPlan", "==", idPlan));
        const snapshot = await getDocs(q);
        tablaBody.innerHTML = snapshot.empty ? `<tr><td colspan="3">No hay gastos.</td></tr>` : "";
        snapshot.forEach(docSnap => {
            const g = docSnap.data();
            const fila = document.createElement("tr");
            fila.innerHTML = `<td>${g.NombreGasto}</td><td>${g.TipoGasto}</td><td>${g.GastoNumerico} €</td>`;
            tablaBody.appendChild(fila);
        });
    } catch (e) { console.error(e); }
}

async function cargarAhorrosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaAhorrosPorPlan tbody");
    if (!tablaBody) return;
    try {
        const q = query(collection(db, "Ahorros"), where("IdPlan", "==", idPlan));
        const snapshot = await getDocs(q);
        tablaBody.innerHTML = snapshot.empty ? `<tr><td colspan="3">No hay ahorros.</td></tr>` : "";
        snapshot.forEach(docSnap => {
            const a = docSnap.data();
            const fila = document.createElement("tr");
            fila.innerHTML = `<td>${a.Apunte}</td><td>${a.Dinero_ahorrado} €</td><td>${a.Fecha_creacion}</td>`;
            tablaBody.appendChild(fila);
        });
    } catch (e) { console.error(e); }
}

async function cargarDesplegableCategorias() {
    const select = document.getElementById("selectTipoGasto");
    if (!select) return;
    try {
        // REVISA AQUÍ: Si en tu Firebase se llama "TiposGastos" o "TiposGASTOS"
        const snapshot = await getDocs(collection(db, "TiposGastos"));
        select.innerHTML = '<option value="" disabled selected>Selecciona una categoría...</option>';
        snapshot.forEach(docSnap => {
            const nombre = docSnap.data().NombreTipoGasto;
            if (nombre) {
                const opt = new Option(nombre, nombre);
                select.add(opt);
            }
        });
    } catch (e) { console.error("Error categorías:", e); }
}

// --- GRÁFICA ---

async function mostrarGraficaGastos(idPlan) {
    const modalElement = document.getElementById('modalGrafica');
    const canvas = document.getElementById('graficoGastos');
    const bsModal = new bootstrap.Modal(modalElement);
    
    try {
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

        // Esperar a que el modal se muestre para que Chart.js tome el tamaño correcto
        modalElement.addEventListener('shown.bs.modal', () => {
            if (miGrafico) miGrafico.destroy();
            miGrafico = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(agrupados),
                    datasets: [{
                        data: Object.values(agrupados),
                        backgroundColor: ['#0dcaf0', '#20c997', '#ffc107', '#fd7e14', '#dc3545']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
            document.getElementById('resumenTexto').innerHTML = `Total Gastado: <b>${total.toFixed(2)} €</b>`;
        }, { once: true });

    } catch (e) { console.error(e); }
}

// --- CONFIG MODALES FORMULARIOS ---

function configurarModalYFormularioNuevoGasto(idPlan) {
    const modal = document.getElementById('modalFormGasto');
    const form = document.getElementById('formGasto');
    document.getElementById('btAbrirModalCrearGasto').onclick = () => modal.showModal();
    document.getElementById('cerrarFormGasto').onclick = () => modal.close();

    form.onsubmit = async (e) => {
        e.preventDefault();
        const valor = Number(form.GastoNumerico.value);
        const nuevo = {
            NombreGasto: form.NombreGasto.value,
            TipoGasto: form.TipoGasto.value,
            GastoNumerico: valor,
            IdPlan: idPlan,
            fechaCreacion: new Date()
        };
        await addDoc(collection(db, "Gastos"), nuevo);
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

// --- PÁGINA PRINCIPAL (INDEX) ---
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
            <td><button class="btn btn-info btn-sm" onclick="entrarAlPlan('${id}')">ENTRAR</button></td>
            <td><input type="checkbox" onchange="gestionarSeleccionPlan('${id}', this)"></td>
        `;
        tablaBody.appendChild(fila);
    });
}

//FUNCION PARA CREAR PLAN E ENVIAR CORREU

function configurarModalPrincipal() {
    const modal = document.getElementById('modalForm');
    const form = document.getElementById('formPlan');

    // Abrir y cerrar modal
    document.getElementById('btAbrirModalCrearPlan')?.addEventListener('click', () => modal.showModal());
    document.getElementById('cerrarForm')?.addEventListener('click', () => modal.close());

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Extraemos los valores para usarlos tanto en Firebase como en el Email
        const nombrePlan = form.NombrePlan.value;
        const presupuesto = form.PresupuestoPlan.value;
        const fechaFinal = form.FechaPlan.value;

        try {
            // 1. Guardar en Firebase
            await addDoc(collection(db, "Planes"), {
                Nombre: nombrePlan,
                FechaFinal: fechaFinal,
                GastoMax: Number(form.GastoMaxPlan.value),
                ObjetivoDinero: Number(form.DineroNecesario.value),
                PresupuestoPlan: Number(presupuesto),
                fechaCreacion: new Date()
            });

            // 2. Enviar Notificación por EmailJS
            // SUSTITUYE ESTOS DOS IDS POR LOS TUYOS DE LA WEB DE EMAILJS
            const serviceID = 'service_lt35sn2'; 
            const templateID = 'template_2u3ervl'; 

            const templateParams = {
                nombre_plan: nombrePlan,
                presupuesto_total: presupuesto,
                fecha_limite: fechaFinal,
                // Si quieres que el correo llegue a una dirección específica fija:
                to_email: 'ribaescobaresteve@gmail.com' 
            };

            // Enviamos el correo (no usamos await aquí para no bloquear la UI si tarda)
            emailjs.send(serviceID, templateID, templateParams)
                .then(() => {
                    console.log("¡Email enviado con éxito!");
                })
                .catch((error) => {
                    console.error("Error al enviar email:", error);
                });

            // 3. Limpiar interfaz
            modal.close();
            form.reset();
            cargarPlanes();
            
            alert(`¡Plan "${nombrePlan}" creado correctamente! Se ha enviado una notificación.`);

        } catch (error) {
            console.error("Error en el proceso:", error);
            alert("Hubo un fallo al crear el plan.");
        }
    });
}