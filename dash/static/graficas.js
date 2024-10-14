document.addEventListener("DOMContentLoaded", function() {
    // Obtener los datos de la base de datos para las gráficas
    fetch('http://127.0.0.1:5000/obtener_datos_graficas')
        .then(response => response.json())
        .then(data => {
            // Productos más vendidos por delivery
            const ctxProductos = document.getElementById('productosMasVendidos').getContext('2d');
            new Chart(ctxProductos, {
                type: 'bar',
                data: {
                    labels: data.productos.map(producto => producto.nombre),
                    datasets: [{
                        label: 'Productos más vendidos por Delivery',
                        data: data.productos.map(producto => producto.cantidad),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });

            // Zonas de entrega más repetidas
            const ctxZonas = document.getElementById('zonasDeEntrega').getContext('2d');
            new Chart(ctxZonas, {
                type: 'pie',
                data: {
                    labels: data.zonas.map(zona => zona.direccion),
                    datasets: [{
                        label: 'Zonas de Entrega Más Repetidas',
                        data: data.zonas.map(zona => zona.cantidad),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.5)',
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 206, 86, 0.5)'
                        ]
                    }]
                },
                options: {
                    responsive: true
                }
            });

            // Horarios pico de pedidos por WhatsApp
            const ctxHorarios = document.getElementById('horariosPico').getContext('2d');
            new Chart(ctxHorarios, {
                type: 'line',
                data: {
                    labels: data.horarios.map(horario => horario.hora),
                    datasets: [{
                        label: 'Horarios Pico de Pedidos por WhatsApp',
                        data: data.horarios.map(horario => horario.cantidad),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            stepSize: 2  // Cambiar el salto del eje Y a 1 para reducir la cantidad de divisiones
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error al obtener los datos de las gráficas:', error);
        });
});