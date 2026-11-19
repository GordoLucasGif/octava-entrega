class Producto {
    constructor(codigo, nombre, precio, categoria, stock) {
        this.codigo = codigo;
        this.nombre = nombre;
        this.precio = precio;
        this.categoria = categoria;
        this.stock = stock;
    }

    vender(cantidad) {
        if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > this.stock) {
            return false;
        }

        this.stock -= cantidad;
        return true;
    }
}

const catalogoInicial = [
    new Producto(1, "Lápiz", 120, "Escritura", 10),
    new Producto(2, "Cuaderno", 250, "Papelería", 6),
    new Producto(3, "Lapicera", 180, "Escritura", 8),
    new Producto(4, "Carpeta", 350, "Papelería", 4),
    new Producto(5, "Goma", 90, "Accesorios", 12)
];

const costoEnvio = 500;
const claveStorage = "libreria-pre-entrega-8";

const formulario = document.querySelector("#formulario");
const buscador = document.querySelector("#buscador");
const lista = document.querySelector("#catalogo");
const resumen = document.querySelector("#resumen");
const mensaje = document.querySelector("#mensaje");
const vaciar = document.querySelector("#vaciar");
const finalizar = document.querySelector("#finalizar");

function mostrarMensaje(texto, error = false) {
    mensaje.textContent = texto;
    mensaje.classList.toggle("error", error);
}

function cargarEstado() {
    try {
        const datos = JSON.parse(localStorage.getItem(claveStorage) ?? "null");
        const catalogo = datos?.catalogo.map(({ codigo, nombre, precio, categoria, stock }) =>
            new Producto(codigo, nombre, precio, categoria, stock)
        ) ?? catalogoInicial;
        const carrito = [];

        for (const { codigo, cantidad } of datos?.carrito ?? []) {
            const producto = catalogo.find(item => item.codigo === codigo);
            if (producto) {
                carrito.push({ producto, cantidad });
            }
        }

        return { catalogo, carrito };
    } catch {
        mostrarMensaje("No se pudieron recuperar los datos guardados.", true);
        return { catalogo: catalogoInicial, carrito: [] };
    }
}

let { catalogo, carrito } = cargarEstado();
let siguienteCodigo = catalogo.reduce((mayor, producto) => Math.max(mayor, producto.codigo), 0) + 1;

function guardarYRenderizar(texto) {
    try {
        const compras = carrito.map(({ producto, cantidad }) => ({
            codigo: producto.codigo,
            cantidad
        }));
        localStorage.setItem(claveStorage, JSON.stringify({ catalogo, carrito: compras }));
        mostrarMensaje(texto);
    } catch {
        mostrarMensaje("No se pudo guardar el cambio en el navegador.", true);
    }

    renderizarCatalogo();
    renderizarCarrito();
}

function renderizarCatalogo() {
    const busqueda = buscador.value.trim().toLowerCase();
    const productos = catalogo.filter(producto => producto.nombre.toLowerCase().includes(busqueda));
    lista.innerHTML = "";

    if (productos.length === 0) {
        lista.textContent = "No se encontraron productos.";
        return;
    }

    for (const producto of productos) {
        const tarjeta = document.createElement("article");
        tarjeta.innerHTML = `
            <h3></h3>
            <p class="categoria"></p>
            <p>Precio: $${producto.precio.toFixed(2)} · Stock: ${producto.stock}</p>
            <label>Cantidad <input type="number" value="1" min="1" step="1"></label>
            <button class="comprar" type="button"></button>
            <button class="eliminar" type="button">Eliminar producto</button>
        `;

        tarjeta.querySelector("h3").textContent = producto.nombre;
        tarjeta.querySelector(".categoria").textContent = producto.categoria;

        const campoCantidad = tarjeta.querySelector("input");
        const boton = tarjeta.querySelector(".comprar");
        const agotado = producto.stock === 0;

        campoCantidad.disabled = agotado;
        boton.disabled = agotado;
        boton.textContent = agotado ? "Sin stock" : "Agregar al carrito";

        boton.addEventListener("click", () => comprar(producto, campoCantidad.valueAsNumber));
        tarjeta.querySelector(".eliminar").addEventListener("click", () => eliminarProducto(producto));
        lista.appendChild(tarjeta);
    }
}

function comprar(producto, cantidad) {
    if (!producto.vender(cantidad)) {
        mostrarMensaje("Ingresá una cantidad entera entre 1 y " + producto.stock + ".", true);
        return;
    }

    const compra = carrito.find(item => item.producto.codigo === producto.codigo);

    if (compra) {
        compra.cantidad += cantidad;
    } else {
        carrito.push({ producto, cantidad });
    }

    guardarYRenderizar("Agregaste " + cantidad + " x " + producto.nombre + " al carrito.");
}

function eliminarProducto({ codigo, nombre }) {
    catalogo = catalogo.filter(producto => producto.codigo !== codigo);
    carrito = carrito.filter(compra => compra.producto.codigo !== codigo);
    guardarYRenderizar("Eliminaste " + nombre + " del catálogo.");
}

function calcularSubtotal() {
    return carrito.reduce((suma, item) => suma + item.producto.precio * item.cantidad, 0);
}

function renderizarCarrito() {
    const vacio = carrito.length === 0;
    finalizar.disabled = vacio;
    vaciar.disabled = vacio;

    if (vacio) {
        resumen.textContent = "El carrito está vacío.";
        return;
    }

    const productos = carrito.map(item => item.cantidad + " x " + item.producto.nombre);
    const total = calcularSubtotal() + costoEnvio;

    resumen.textContent = productos.join("\n") + "\nEnvío: $" + costoEnvio +
        "\nTotal: $" + total.toFixed(2);
}

formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    const nombre = formulario.elements.nombre.value.trim();
    const categoria = formulario.elements.categoria.value.trim();
    const precio = formulario.elements.precio.valueAsNumber;
    const stock = formulario.elements.stock.valueAsNumber;

    if (!nombre || !categoria) {
        mostrarMensaje("Completá el nombre y la categoría.", true);
        return;
    }

    catalogo.push(new Producto(siguienteCodigo, nombre, precio, categoria, stock));
    siguienteCodigo++;
    formulario.reset();
    buscador.value = "";
    guardarYRenderizar("Agregaste " + nombre + " al catálogo.");
});

buscador.addEventListener("input", renderizarCatalogo);

buscador.addEventListener("keydown", evento => {
    if (evento.key === "Escape") {
        buscador.value = "";
        renderizarCatalogo();
    }
});

vaciar.addEventListener("click", () => {
    for (const { producto, cantidad } of carrito) {
        producto.stock += cantidad;
    }

    carrito.length = 0;
    guardarYRenderizar("Vaciaste el carrito. Las unidades volvieron al stock.");
});

finalizar.addEventListener("click", () => {
    const total = calcularSubtotal() + costoEnvio;
    carrito.length = 0;
    guardarYRenderizar("Compra finalizada. Total: $" + total.toFixed(2));
});

renderizarCatalogo();
renderizarCarrito();