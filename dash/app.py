from flask import Flask, render_template, jsonify, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos SQLite
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pedidos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
socketio = SocketIO(app)

# Modelo para guardar la configuración de la empresa (logo y color de la barra)
class Configuracion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    color_barra = db.Column(db.String(7), nullable=False, default='#10069F')  # Color por defecto
    logo_path = db.Column(db.String(200), nullable=False, default='static/uploads/default_logo.png')  # Logo por defecto

# Definir el modelo de Pedido
class Pedido(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente = db.Column(db.String(100), nullable=False)
    producto = db.Column(db.String(100), nullable=False)
    direccion = db.Column(db.String(100), nullable=False)
    estado = db.Column(db.String(50), nullable=False)
    hora = db.Column(db.String(10), nullable=False)
    retiro = db.Column(db.String(50), nullable=False)
    fecha = db.Column(db.DateTime, default=datetime.now)

# Crear la base de datos y agregar pedidos de prueba si está vacía
with app.app_context():
    db.create_all()
    if not Pedido.query.first():
        pedidos_prueba = [
            Pedido(cliente="Juan Pérez", producto="Pizza", direccion="Calle 123", estado="Pendiente", hora="15:30", retiro="Local", fecha=datetime.now()),
            Pedido(cliente="María Gómez", producto="Hamburguesa", direccion="Avenida 456", estado="Entregado", hora="14:15", retiro="Delivery", fecha=datetime.now() - timedelta(days=1)),
            Pedido(cliente="Carlos Rodríguez", producto="Ensalada", direccion="Calle 789", estado="Pendiente", hora="12:45", retiro="Local", fecha=datetime.now() - timedelta(days=7)),
            Pedido(cliente="Ana López", producto="Sushi", direccion="Calle 101", estado="Entregado", hora="13:00", retiro="Delivery", fecha=datetime.now() - timedelta(days=30)),
        ]
        db.session.bulk_save_objects(pedidos_prueba)
        db.session.commit()

    # Agregar configuración inicial si no existe
    if not Configuracion.query.first():
        configuracion_inicial = Configuracion()
        db.session.add(configuracion_inicial)
        db.session.commit()

# Ruta para servir la página principal
@app.route('/', methods=['GET', 'POST'])
def index():
    configuracion = Configuracion.query.first()
    return render_template('index.html', color_barra=configuracion.color_barra, logo_empresa=configuracion.logo_path)


# Ruta para la página de configuración
@app.route('/configuracion', methods=['GET'])
def configuracion():
    configuracion = Configuracion.query.first()
    return render_template('configuracion.html', color_barra=configuracion.color_barra, logo_empresa=configuracion.logo_path)

# Ruta para guardar la configuración
@app.route('/guardar_configuracion', methods=['POST'])
def guardar_configuracion():
    color_barra = request.form.get('color_barra')
    
    # Manejo de subida de imagen (logo)
    if 'logo_empresa' in request.files:
        file = request.files['logo_empresa']
        if file.filename != '':
            # Definir la ruta donde guardar el archivo
            logo_path = os.path.join('static', 'uploads', file.filename)

            # Verificar si la carpeta 'uploads' existe; si no, crearla
            if not os.path.exists(os.path.join('static', 'uploads')):
                os.makedirs(os.path.join('static', 'uploads'))

            # Guardar el archivo en la carpeta definida
            file.save(logo_path)

            # Actualizar la configuración en la base de datos
            configuracion = Configuracion.query.first()
            configuracion.color_barra = color_barra
            configuracion.logo_path = logo_path
            db.session.commit()
    
    return redirect(url_for('configuracion'))

# Rutas para historial
@app.route('/historial/dia')
def historial_dia():
    hoy = datetime.now().date()
    pedidos_hoy = Pedido.query.filter(db.func.date(Pedido.fecha) == hoy).all()
    return render_template('historial.html', pedidos=pedidos_hoy)

@app.route('/historial/semana')
def historial_semana():
    hace_una_semana = datetime.now() - timedelta(weeks=1)
    pedidos_semana = Pedido.query.filter(Pedido.fecha >= hace_una_semana).all()
    return render_template('historial.html', pedidos=pedidos_semana)

@app.route('/historial/mes')
def historial_mes():
    hace_un_mes = datetime.now() - timedelta(days=30)
    pedidos_mes = Pedido.query.filter(Pedido.fecha >= hace_un_mes).all()
    return render_template('historial.html', pedidos=pedidos_mes)

# Ruta para obtener pedidos actuales
@app.route('/obtener_pedidos')
def obtener_pedidos():
    pedidos = Pedido.query.all()
    pedidos_list = [{
        'id': pedido.id,
        'cliente': pedido.cliente,
        'producto': pedido.producto,
        'direccion': pedido.direccion,
        'estado': pedido.estado,
        'hora': pedido.hora,
        'retiro': pedido.retiro,
        'fecha': pedido.fecha
    } for pedido in pedidos]
    return jsonify(pedidos_list)

# Ruta para actualizar el estado de un pedido
@app.route('/actualizar_pedido', methods=['POST'])
def actualizar_pedido():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Datos inválidos'}), 400

    pedido_id = data.get('id')
    nuevo_estado = data.get('estado')

    if not pedido_id or not nuevo_estado:
        return jsonify({'error': 'Faltan datos en la solicitud'}), 400

    pedido = Pedido.query.get(pedido_id)
    if pedido:
        pedido.estado = nuevo_estado
        db.session.commit()

        socketio.emit('estado_actualizado', {
            'id': pedido.id,
            'estado': nuevo_estado
        })
        return jsonify({'mensaje': 'Estado del pedido actualizado correctamente'}), 200
    else:
        return jsonify({'error': 'Pedido no encontrado'}), 404

@app.route('/nuevo_pedido', methods=['POST'])
def nuevo_pedido():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Datos inválidos'}), 400

    cliente = data.get('cliente')
    producto = data.get('producto')
    direccion = data.get('direccion')
    retiro = data.get('retiro')

    if not cliente or not producto or not direccion or not retiro:
        return jsonify({'error': 'Faltan datos para crear el pedido'}), 400

    nuevo_pedido = Pedido(
        cliente=cliente,
        producto=producto,
        direccion=direccion,
        estado="Pendiente",  # Establecer el estado predeterminado
        hora=datetime.now().strftime('%H:%M'),
        retiro=retiro
    )
    db.session.add(nuevo_pedido)
    db.session.commit()  # Guarda el pedido en la base de datos

    # Emitir evento WebSocket para actualizar el dashboard
    socketio.emit('nuevo_pedido', {
        'id': nuevo_pedido.id,
        'cliente': nuevo_pedido.cliente,
        'producto': nuevo_pedido.producto,
        'direccion': nuevo_pedido.direccion,
        'estado': nuevo_pedido.estado,
        'hora': nuevo_pedido.hora,
        'retiro': nuevo_pedido.retiro
    })

    return jsonify({'mensaje': 'Nuevo pedido agregado correctamente'}), 201


# Ruta para obtener datos para las gráficas
@app.route('/obtener_datos_graficas')
def obtener_datos_graficas():
    productos = db.session.query(Pedido.producto, db.func.count(Pedido.producto)).group_by(Pedido.producto).all()
    zonas = db.session.query(Pedido.direccion, db.func.count(Pedido.direccion)).group_by(Pedido.direccion).all()
    horarios = db.session.query(Pedido.hora, db.func.count(Pedido.hora)).group_by(Pedido.hora).all()

    return jsonify({
        'productos': [{'nombre': producto[0], 'cantidad': producto[1]} for producto in productos],
        'zonas': [{'direccion': zona[0], 'cantidad': zona[1]} for zona in zonas],
        'horarios': [{'hora': horario[0], 'cantidad': horario[1]} for horario in horarios]
    })

@app.route('/graficas')
def graficas():
    return render_template('graficas.html')

if __name__ == '__main__':
    socketio.run(app, debug=True)
