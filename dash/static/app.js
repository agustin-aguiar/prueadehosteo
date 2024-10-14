document.addEventListener("DOMContentLoaded", function() { 
    const filasPorPagina = 10;  // Define filasPorPagina al inicio para que esté disponible globalmente
    let paginaActual = 1;
    let dataGlobal = [];  // Mantener los datos globales para la búsqueda y filtrado

    document.addEventListener("DOMContentLoaded", function() {
        // Selecciona el botón de hamburguesa y el menú
        const mobileMenu = document.getElementById('mobile-menu');
        const navMenu = document.querySelector('.nav-menu');
    
        // Añade el evento click para mostrar/ocultar el menú
        mobileMenu.addEventListener('click', function() {
            navMenu.classList.toggle('active');  // Cambia la clase 'active'
        });
    });
    

    // Lógica para el modal de detalles del pedido
    const modal = document.getElementById("modal");
    const closeModal = document.querySelector(".close");

    // Función para cerrar el modal
    closeModal.addEventListener("click", function() {
        modal.classList.remove("active");
    });

    // Fetch para obtener los pedidos
    fetch('http://127.0.0.1:5000/obtener_pedidos')
        .then(response => response.json())
        .then(data => {
            dataGlobal = data;  // Guardar los datos para uso global en búsqueda y filtros
            const tablaPedidos = document.getElementById("pedido-list");
            tablaPedidos.innerHTML = "";

            if (data.length === 0) {
                tablaPedidos.innerHTML = "<tr><td colspan='7'>No hay pedidos disponibles</td></tr>";
            } else {
                renderPedidos(data);
                crearPaginacion(data.length);
                mostrarPagina(1);
            }
        })
        .catch(error => {
            console.error('Error al obtener los pedidos:', error);
            const tablaPedidos = document.getElementById("pedido-list");
            tablaPedidos.innerHTML = `<tr><td colspan='7'>Error al cargar los pedidos: ${error.message}</td></tr>`;
        });

    // Función para generar iframe dinámico con maps.ie
    function generarMapa(direccion) {
        let mapsUrl, linkUrl;
    
        // Si la dirección es un enlace de Google Maps con coordenadas
        if (direccion.includes("google.com/maps/search/")) {
            const urlParams = new URL(direccion).searchParams.get('query');
            
            // Si contiene coordenadas en formato de coma codificada (%2C)
            const [lat, lon] = urlParams.split(',');
    
            if (lat && lon) {
                // Generar el iframe de OpenStreetMap usando las coordenadas extraídas
                mapsUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon},${lat},${lon},${lat}&layer=mapnik&marker=${lat},${lon}`;
                linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
            }
        } else if (/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(direccion)) {
            // Si la dirección contiene coordenadas (por ejemplo, "-34.9011, -56.1645")
            const [lat, lon] = direccion.split(',');
            mapsUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon},${lat},${lon},${lat}&layer=mapnik&marker=${lat},${lon}`;
            linkUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
        } else {
            // Si es una dirección de texto, usar la búsqueda de OpenStreetMap
            mapsUrl = `https://www.openstreetmap.org/export/embed.html?search=${encodeURIComponent(direccion)}&layers=Q`;
            linkUrl = `https://www.openstreetmap.org/?search=${encodeURIComponent(direccion)}`;
        }
    
        // Devolver el iframe con el enlace a OpenStreetMap
        return `
            <div style="position: relative; width: 300px; height: 150px;">
                <iframe width="300" height="150" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" 
                    src="${mapsUrl}"></iframe>
                <a href="${linkUrl}" target="_blank" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></a>
            </div>
        `;
    }
    
    
    function renderPedidos(pedidos) {
        const tablaPedidos = document.getElementById("pedido-list");
        tablaPedidos.innerHTML = "";
    
        pedidos.forEach(pedido => {
            let fila = document.createElement("tr");
    
            fila.innerHTML = `
                <td data-label="ID Pedido">${pedido.id}</td>
                <td data-label="Cliente">${pedido.cliente}</td>
                <td data-label="Producto">${pedido.producto}</td>
                <td data-label="Dirección">${generarMapa(pedido.direccion)}</td> <!-- Mapa de previsualización con Maps.ie -->
                <td data-label="Estado">
                    <select class="estado-pedido">
                        <option value="Pendiente" ${pedido.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
                        <option value="Entregado" ${pedido.estado === "Entregado" ? "selected" : ""}>Entregado</option>
                        <option value="Entregado al Repartidor" ${pedido.estado === "Entregado al Repartidor" ? "selected" : ""}>Entregado al Repartidor</option>
                    </select>
                </td>
                <td data-label="Hora del Pedido">${pedido.hora}</td>
                <td data-label="Retiro">${pedido.retiro}</td>
            `;
    
            tablaPedidos.appendChild(fila);
        });
    }
    
    

    // Función combinada para búsqueda y filtrado
    function buscarYFiltrarPedidos() {
        const input = document.getElementById("search").value.toLowerCase();
        const estadoFiltro = document.getElementById("filtro-estado").value;
        const retiroFiltro = document.getElementById("filtro-retiro").value;
        let pedidosFiltrados = dataGlobal.filter(pedido => {
            const cliente = pedido.cliente.toLowerCase();
            const producto = pedido.producto.toLowerCase();
            const estado = pedido.estado.toLowerCase();
            const retiro = pedido.retiro.toLowerCase();

            const coincideBusqueda = cliente.includes(input) || producto.includes(input) || estado.includes(input);
            const coincideEstado = estadoFiltro === "" || estado === estadoFiltro.toLowerCase();
            const coincideRetiro = retiroFiltro === "" || retiro === retiroFiltro.toLowerCase();

            return coincideBusqueda && coincideEstado && coincideRetiro;
        });

        // Renderizar los pedidos filtrados
        renderPedidos(pedidosFiltrados);
        crearPaginacion(pedidosFiltrados.length);
        mostrarPagina(1);
    }

    // Añadir eventos a la barra de búsqueda y los filtros
    document.getElementById("search").addEventListener('keyup', buscarYFiltrarPedidos);
    document.getElementById("filtro-estado").addEventListener('change', buscarYFiltrarPedidos);
    document.getElementById("filtro-retiro").addEventListener('change', buscarYFiltrarPedidos);

    // Función para mostrar los pedidos por página
    function mostrarPagina(pagina) {
        const filas = document.querySelectorAll("#pedido-list tr");
        const inicio = (pagina - 1) * filasPorPagina;
        const fin = inicio + filasPorPagina;

        filas.forEach((fila, index) => {
            if (index >= inicio && index < fin) {
                fila.style.display = "";
            } else {
                fila.style.display = "none";
            }
        });

        paginaActual = pagina;
    }

    function crearPaginacion(totalFilas) {
        const totalPaginas = Math.ceil(totalFilas / filasPorPagina);
        const paginacion = document.getElementById("paginacion");
        paginacion.innerHTML = "";

        for (let i = 1; i <= totalPaginas; i++) {
            const boton = document.createElement("button");
            boton.innerText = i;
            boton.classList.add('btn-paginacion');
            boton.addEventListener("click", () => mostrarPagina(i));
            paginacion.appendChild(boton);
        }
    }
});
