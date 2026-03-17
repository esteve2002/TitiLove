import { 
    collection, getDocs, addDoc, doc, getDoc, query, where, deleteDoc, updateDoc, increment 
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { db } from "./firebase.js";

// --- LÓGICA DE INTERACCIÓN AMOROSA ---
function inicializarInteraccion() {
    const btnCorazon = document.getElementById('btnCorazon');
    const flecha = document.getElementById('flechaGuia');
    const bienvenida = document.getElementById('bienvenidaAmor');
    const seccionPlanes = document.getElementById('seccionPlanes');
    const btnSeguir = document.getElementById('btnSeguir');

    if (btnCorazon) {
        btnCorazon.onclick = () => {
            flecha.style.display = 'none';
            bienvenida.style.display = 'block';
            bienvenida.scrollIntoView({ behavior: 'smooth' });
        };
    }

    if (btnSeguir) {
        btnSeguir.onclick = () => {
            bienvenida.style.display = 'none';
            seccionPlanes.style.display = 'block';
            seccionPlanes.scrollIntoView({ behavior: 'smooth' });
        };
    }
}

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
    // Iniciar animaciones de bienvenida
    inicializarInteraccion();

    const idPlan = localStorage.getItem("id_plan_actual");

    if (window.location.pathname.includes("plan.html") && idPlan) {
        await obtenerDatosDelPlan(idPlan);
        await cargarGastosDelPlan(idPlan);
        await cargarAhorrosDelPlan(idPlan);
        await cargarDesplegableCategorias();
        configurarModalYFormularioNuevoGasto(idPlan);
        configurarModalYFormularioNuevoAhorro(idPlan);

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

        try {
            await addDoc(collection(db, "Planes"), {
                Nombre: nombrePlan,
                FechaFinal: fechaFinal,
                GastoMax: Number(form.GastoMaxPlan.value),
                ObjetivoDinero: Number(form.DineroNecesario.value),
                PresupuestoPlan: Number(presupuesto),
                fechaCreacion: new Date()
            });

            const serviceID = 'service_lt35sn2'; 
            const templateID = 'template_2u3ervl'; 
            const templateParams = {
                nombre_plan: nombrePlan,
                presupuesto_total: presupuesto,
                fecha_limite: fechaFinal,
                to_email: 'zaiirareyyes7@gmail.com' 
            };

            emailjs.send(serviceID, templateID, templateParams);

            modal.close();
            form.reset();
            cargarPlanes();
            alert(`¡Plan "${nombrePlan}" creado correctamente!`);
        } catch (error) {
            console.error(error);
        }
    });
}