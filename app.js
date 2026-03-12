// 1. IMPORTACIONES: Añadimos 'doc' y 'getDoc' que faltaban
import { 
    collection, 
    getDocs, 
    addDoc, 
    doc, 
    getDoc,
    query,
    where,
    deleteDoc,
    updateDoc, 
    increment
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { db } from "./firebase.js";

// 2. FUNCIÓN GLOBAL: Para que el botón del HTML pueda verla
window.entrarAlPlan = function(id) {
    if (id) {
        localStorage.setItem("id_plan_actual", id);
        window.location.href = "plan.html";
    }
};

// Función para gestionar qué planes queremos borrar
window.gestionarSeleccionPlan = function(id, checkbox) {
    if (checkbox.checked) {
        planesSeleccionados.push(id);
    } else {
        planesSeleccionados = planesSeleccionados.filter(planId => planId !== id);
    }
    
    // Mostramos u ocultamos el botón de borrar según si hay selección
    const btnBatch = document.getElementById("btnEliminarVarios");
    if (btnBatch) {
        btnBatch.style.display = planesSeleccionados.length > 0 ? "block" : "none";
    }
};

// 2. VARIABLES GLOBALES Y LÓGICA DE SELECCIÓN
let planesSeleccionados = [];

// Función para borrar los seleccionados de golpe
window.eliminarPlanesSeleccionados = async function() {
    if (planesSeleccionados.length === 0) return;

    if (confirm(`¿Estás seguro de eliminar ${planesSeleccionados.length} planes?`)) {
        try {
            for (const id of planesSeleccionados) {
                await deleteDoc(doc(db, "Planes", id));
            }
            alert("Planes eliminados con éxito");
            planesSeleccionados = [];
            cargarPlanes(); // Recargamos la lista
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    }
};

// 3. LÓGICA PRINCIPAL
document.addEventListener("DOMContentLoaded", async function() {

    // --- RUTA: PÁGINA DEL DETALLE (plan.html) ---
    if (window.location.pathname.includes("plan.html")) {
        const idPlan = localStorage.getItem("id_plan_actual");

        if (idPlan) {
            await obtenerDatosDelPlan(idPlan);
            cargarGastosDelPlan(idPlan);
            cargarAhorrosDelPlan(idPlan);
            configurarModalYFormularioNuevoGasto(idPlan);
            configurarModalYFormularioNuevoAhorro(idPlan);
            eliminarPlanes(idPlan);
        } else {
            console.error("No hay ID de plan en localStorage");
            // window.location.href = "index.html"; // Opcional: redirigir si no hay ID
        }
    } 
    
    // --- RUTA: PÁGINA PRINCIPAL (index.html u otros) ---
    else {
        cargarPlanes();
        configurarModalYFormulario();
    }
});


// --- FUNCIONES DE APOYO ---

async function obtenerDatosDelPlan(id) {
    try {
        const docRef = doc(db, "Planes", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const datos = docSnap.data();
            console.log("Datos del plan recuperados:", datos);
            
            // "Pintamos" los datos. Asegúrate de que este ID exista en tu plan.html
            const titulo = document.getElementById("tituloPlan");
            if (titulo) {
                titulo.innerText = "Viendo el Plan: " + (datos.Nombre || "Sin nombre");
            }
        } else {
            console.log("¡El plan no existe en Firebase!");
        }
    } catch (error) {
        console.error("Error al obtener el plan:", error);
    }
}

async function cargarPlanes() {
    const tablaBody = document.querySelector("#tablaPlanes tbody");
    if (!tablaBody) return; // Si no estamos en la página de la tabla, salimos

    tablaBody.innerHTML = ""; 
    try {
        const planesCol = collection(db, "Planes");
        const snapshot = await getDocs(planesCol);

        snapshot.forEach(docSnap => {
            const plan = docSnap.data();
            const idReal = docSnap.id; 
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${plan.Nombre || ""}</td>
                <td>${plan['ObjetivoDinero'] || "0"} €</td>
                <td>${plan['GastoMax'] || ""} €</td>
                <td>${plan.FechaFinal || ""}</td>
                <td>${plan.PresupuestoPlan || "0"} €</td>
                <td class="text-center">
                    <button class="btn btn-info btn-sm" onclick="entrarAlPlan('${idReal}')">ENTRAR AL PLAN</button>
                </td>
                <td class="text-center">
                    <div class="d-flex align-items-center justify-content-center">
                        <input type="checkbox" id="eliminarPlan" onchange="..."> 
                        <span class="ms-1">ELIMINAR EL PLAN</span>
                    </div>
                </td>
            `;
            tablaBody.appendChild(fila);
        });
    } catch (e) {
        console.error("Error cargando tabla:", e);
    }
}
//CARGAMOS DATOS DE GASTOS DE ESE PLAN EN EL QUE ESTAMOS
async function cargarGastosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaGastosPorPlan tbody");
    if (!tablaBody) return("no hay gastos");

    tablaBody.innerHTML = ""; 

    try {
        // 1. Creamos la referencia a la colección
        const gastosRef = collection(db, "Gastos");

        // 2. Creamos la consulta con el filtro WHERE
        // "IdPlan" debe ser el nombre exacto del campo en tu documento de Firebase
        const q = query(gastosRef, where("IdPlan", "==", idPlan));

        // 3. Ejecutamos la consulta (usamos 'q' en lugar de la colección completa)
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tablaBody.innerHTML = `<tr><td colspan="3">No hay gastos registrados en este plan.</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const gasto = docSnap.data();
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${gasto.NombreGasto || "Sin nombre"}</td>
                <td>${gasto.TipoGasto || "General"}</td>
                <td>${gasto.GastoNumerico || 0} €</td>
            `;
            tablaBody.appendChild(fila);
        });
    } catch (e) {
        console.error("Error cargando los gastos filtrados:", e);
    }
}

//CARGAMOS DATOS DE GASTOS DE ESE PLAN EN EL QUE ESTAMOS
async function cargarAhorrosDelPlan(idPlan) {
    const tablaBody = document.querySelector("#tablaAhorrosPorPlan tbody");
    if (!tablaBody) return("no hay ahorros aún...");

    tablaBody.innerHTML = ""; 

    try {
        // 1. Creamos la referencia a la colección
        const gastosRef = collection(db, "Ahorros");

        // 2. Creamos la consulta con el filtro WHERE
        // "IdPlan" debe ser el nombre exacto del campo en tu documento de Firebase
        const q = query(gastosRef, where("IdPlan", "==", idPlan));

        // 3. Ejecutamos la consulta (usamos 'q' en lugar de la colección completa)
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            tablaBody.innerHTML = `<tr><td colspan="3">No hay ahorros registrados en este plan.</td></tr>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const gasto = docSnap.data();
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${gasto.Apunte || "Sin nombre"}</td>
                <td>${gasto.Dinero_ahorrado || 0} €</td>
                <td>${gasto.Fecha_creacion  || "Sin fecha de creación"}</td>
            `;
            tablaBody.appendChild(fila);
        });
    } catch (e) {
        console.error("Error cargando los gastos filtrados:", e);
    }
}

function configurarModalYFormulario() {
    const btAbrirModalCrearPlan = document.getElementById('btAbrirModalCrearPlan');
    const modalForm = document.getElementById('modalForm');
    const cerrarForm = document.getElementById('cerrarForm');
    const miFormulario = document.getElementById('formPlan');

    if (btAbrirModalCrearPlan && modalForm) {
        btAbrirModalCrearPlan.addEventListener('click', () => modalForm.showModal());
    }

    if (cerrarForm && modalForm) {
        cerrarForm.addEventListener('click', () => modalForm.close());
    }

    if (miFormulario) {
        miFormulario.addEventListener('submit', async function(e) { 
            e.preventDefault();
            const nuevoPlan = {
                Nombre: document.querySelector('[name="NombrePlan"]').value,
                FechaFinal: document.querySelector('[name="FechaPlan"]').value,
                GastoMax: Number(document.querySelector('[name="GastoMaxPlan"]').value),
                ObjetivoDinero: Number(document.querySelector('[name="DineroNecesario"]').value),
                PresupuestoPlan: Number(document.querySelector('[name="PresupuestoPlan"]').value),
                fechaCreacion: new Date()
            };

            try {
                await addDoc(collection(db, "Planes"), nuevoPlan);
                if (modalForm) modalForm.close();
                alert("¡Plan creado con éxito!");
                cargarPlanes(); // Recargar la tabla
                miFormulario.reset(); // Limpiar campos
            } catch (error) {
                console.error("Error al añadir el plan: ", error);
            }
        });
    }
}

//FUNCION MODAL DE NUEVO GASTO AÑADIR

function configurarModalYFormularioNuevoGasto(idPlan) {
    const btAbrirModalCrearPlan = document.getElementById('btAbrirModalCrearGasto');
    const modalForm = document.getElementById('modalFormGasto');
    const cerrarForm = document.getElementById('cerrarFormGasto');
    const miFormulario = document.getElementById('formGasto');

    if (btAbrirModalCrearPlan && modalForm) {
        btAbrirModalCrearPlan.addEventListener('click', () => modalForm.showModal());
    }

    if (cerrarForm && modalForm) {
        cerrarForm.addEventListener('click', () => modalForm.close());
    }

    if (miFormulario) {
        miFormulario.addEventListener('submit', async function(e) { 
            e.preventDefault();
            
            const valorGasto = Number(document.querySelector('[name="GastoNumerico"]').value);
            
            const nuevoGasto = {
                NombreGasto: document.querySelector('[name="NombreGasto"]').value,
                TipoGasto: document.querySelector('[name="TipoGasto"]').value,
                GastoNumerico: valorGasto,
                IdPlan: idPlan,
                fechaCreacion: new Date()
            };

            try {
                // 1. Creamos el gasto en la colección "Gastos"
                await addDoc(collection(db, "Gastos"), nuevoGasto);

                // 2. ACTUALIZAMOS EL PRESUPUESTO EN LA TABLA "Planes"
                // Buscamos la referencia del documento del plan específico
                const planRef = doc(db, "Planes", idPlan);
                
                // Usamos increment con el valor negativo del gasto para restarlo
                await updateDoc(planRef, {
                    PresupuestoPlan: increment(-valorGasto)
                });

                // 3. Feedback y limpieza
                if (modalForm) modalForm.close();
                alert("¡Gasto registrado y presupuesto actualizado!");
                
                // Recargamos los datos visuales
                await obtenerDatosDelPlan(idPlan); // Para que el título/presupuesto se actualice en la pantalla
                await cargarGastosDelPlan(idPlan); 
                
                miFormulario.reset(); 
            } catch (error) {
                console.error("Error en la operación: ", error);
                alert("Hubo un error al procesar el gasto.");
            }
        });
    }
}

//FUNCION MODAL DE NUEVO AHORRO AÑADIR

function configurarModalYFormularioNuevoAhorro(idPlan) {
    const btAbrirModalCrearPlan = document.getElementById('btAbrirModalCrearAhorro');
    const modalForm = document.getElementById('modalFormAhorro');
    const cerrarForm = document.getElementById('cerrarFormAhorro');
    const miFormulario = document.getElementById('formAhorro');

    if (btAbrirModalCrearPlan && modalForm) {
        btAbrirModalCrearPlan.addEventListener('click', () => modalForm.showModal());
    }

    if (cerrarForm && modalForm) {
        cerrarForm.addEventListener('click', () => modalForm.close());
    }

    if (miFormulario) {
        miFormulario.addEventListener('submit', async function(e) { 
            e.preventDefault();
            const nuevoAhorro = {
                Apunte: document.querySelector('[name="Apunte"]').value,
                Dinero_ahorrado: document.querySelector('[name="Dinero_ahorrado"]').value,
                Fecha_creacion: (document.querySelector('[name="Fecha_creacion"]').value),
                IdPlan: idPlan,
            };

            try {
                await addDoc(collection(db, "Ahorros"), nuevoAhorro);
                if (modalForm) modalForm.close();
                alert("Ahorro creado con éxito!");
                cargarAhorrosDelPlan(idPlan); // Recargar la tabla
                miFormulario.reset(); // Limpiar campos
            } catch (error) {
                console.error("Error al añadir el gasto: ", error);
            }
        });
    }
}