import { 
    collection, getDocs, addDoc, doc, getDoc, query, where, deleteDoc, updateDoc, increment 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { db } from "./firebase.js";

// --- VARIABLES Y FUNCIONES GLOBALES ---
let planesSeleccionados = [];

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
            const btnBatch = document.getElementById("btnEliminarVarios");
            if (btnBatch) btnBatch.style.display = "none";
            cargarPlanes(); 
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    }
};

// --- LÓGICA DE CARGA SEGÚN PÁGINA ---
document.addEventListener("DOMContentLoaded", async function() {
    if (window.location.pathname.includes("plan.html")) {
        const idPlan = localStorage.getItem("id_plan_actual");
        if (idPlan) {
            await obtenerDatosDelPlan(idPlan);
            await cargarGastosDelPlan(idPlan);
            await cargarAhorrosDelPlan(idPlan);
            configurarModalYFormularioNuevoGasto(idPlan);
            configurarModalYFormularioNuevoAhorro(idPlan);
        }
    } else {
        cargarPlanes();
        configurarModalPrincipal();
    }
});

// --- FUNCIONES DE DETALLE ---

async function obtenerDatosDelPlan(id) {
    try {
        const docRef = doc(db, "Planes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const datos = docSnap.data();
            const titulo = document.getElementById("tituloPlan");
            if (titulo) titulo.innerText = "Viendo el Plan: " + (datos.Nombre || "Sin nombre");
        }
    } catch (error) { console.error("Error al obtener el plan:", error); }
}

async function cargarGastosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaGastosPorPlan tbody");
    if (!tablaBody) return;
    tablaBody.innerHTML = ""; 
    try {
        const q = query(collection(db, "Gastos"), where("IdPlan", "==", idPlan));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            tablaBody.innerHTML = `<tr><td colspan="3">No hay gastos.</td></tr>`;
            return;
        }
        snapshot.forEach(docSnap => {
            const gasto = docSnap.data();
            const fila = document.createElement("tr");
            fila.innerHTML = `<td>${gasto.NombreGasto}</td><td>${gasto.TipoGasto}</td><td>${gasto.GastoNumerico} €</td>`;
            tablaBody.appendChild(fila);
        });
    } catch (e) { console.error(e); }
}

async function cargarAhorrosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaAhorrosPorPlan tbody");
    if (!tablaBody) return;
    tablaBody.innerHTML = ""; 
    try {
        const q = query(collection(db, "Ahorros"), where("IdPlan", "==", idPlan));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            tablaBody.innerHTML = `<tr><td colspan="3">No hay ahorros.</td></tr>`;
            return;
        }
        snapshot.forEach(docSnap => {
            const ahorro = docSnap.data();
            const fila = document.createElement("tr");
            fila.innerHTML = `<td>${ahorro.Apunte}</td><td>${ahorro.Dinero_ahorrado} €</td><td>${ahorro.Fecha_creacion}</td>`;
            tablaBody.appendChild(fila);
        });
    } catch (e) { console.error(e); }
}

// --- CONFIGURACIÓN DE MODALES (GASTOS Y AHORROS) ---

function configurarModalYFormularioNuevoGasto(idPlan) {
    const btn = document.getElementById('btAbrirModalCrearGasto');
    const modal = document.getElementById('modalFormGasto');
    const cerrar = document.getElementById('cerrarFormGasto');
    const form = document.getElementById('formGasto');

    if (btn) btn.onclick = () => modal.showModal();
    if (cerrar) cerrar.onclick = () => modal.close();

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const valor = Number(form.GastoNumerico.value);
            const nuevoGasto = {
                NombreGasto: form.NombreGasto.value,
                TipoGasto: form.TipoGasto.value,
                GastoNumerico: valor,
                IdPlan: idPlan,
                fechaCreacion: new Date()
            };
            try {
                await addDoc(collection(db, "Gastos"), nuevoGasto);
                await updateDoc(doc(db, "Planes", idPlan), {
                    PresupuestoPlan: increment(-valor)
                });
                modal.close();
                form.reset();
                alert("¡Gasto registrado!");
                obtenerDatosDelPlan(idPlan);
                cargarGastosDelPlan(idPlan);
            } catch (err) { console.error(err); }
        };
    }
}

function configurarModalYFormularioNuevoAhorro(idPlan) {
    const btn = document.getElementById('btAbrirModalCrearAhorro');
    const modal = document.getElementById('modalFormAhorro');
    const cerrar = document.getElementById('cerrarFormAhorro');
    const form = document.getElementById('formAhorro');

    if (btn) btn.onclick = () => modal.showModal();
    if (cerrar) cerrar.onclick = () => modal.close();

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const nuevoAhorro = {
                Apunte: form.Apunte.value,
                Dinero_ahorrado: Number(form.Dinero_ahorrado.value),
                Fecha_creacion: form.Fecha_creacion.value,
                IdPlan: idPlan
            };
            try {
                await addDoc(collection(db, "Ahorros"), nuevoAhorro);
                modal.close();
                form.reset();
                alert("¡Ahorro guardado!");
                cargarAhorrosDelPlan(idPlan);
            } catch (err) { console.error(err); }
        };
    }
}

// --- FUNCIONES PÁGINA PRINCIPAL ---

async function cargarPlanes() {
    const tablaBody = document.getElementById("cuerpoTabla");
    if (!tablaBody) return;
    try {
        const snapshot = await getDocs(collection(db, "Planes"));
        tablaBody.innerHTML = ""; 
        snapshot.forEach(docSnap => {
            const plan = docSnap.data();
            const id = docSnap.id; 
            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${plan.Nombre || ""}</td>
                <td>${plan.ObjetivoDinero || 0} €</td>
                <td>${plan.GastoMax || 0} €</td>
                <td>${plan.FechaFinal || "-"}</td>
                <td>${plan.PresupuestoPlan || 0} €</td>
                <td><button class="btn btn-info btn-sm" onclick="entrarAlPlan('${id}')">ENTRAR</button></td>
                <td><input type="checkbox" onchange="gestionarSeleccionPlan('${id}', this)"></td>
            `;
            tablaBody.appendChild(fila);
        });
    } catch (e) { console.error(e); }
}

function configurarModalPrincipal() {
    const modal = document.getElementById('modalForm');
    const form = document.getElementById('formPlan');
    document.getElementById('btAbrirModalCrearPlan')?.addEventListener('click', () => modal.showModal());
    document.getElementById('cerrarForm')?.addEventListener('click', () => modal.close());
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevo = {
            Nombre: form.NombrePlan.value,
            FechaFinal: form.FechaPlan.value,
            GastoMax: Number(form.GastoMaxPlan.value),
            ObjetivoDinero: Number(form.DineroNecesario.value),
            PresupuestoPlan: Number(form.PresupuestoPlan.value),
            fechaCreacion: new Date()
        };
        await addDoc(collection(db, "Planes"), nuevo);
        modal.close();
        form.reset();
        cargarPlanes();
    });
}