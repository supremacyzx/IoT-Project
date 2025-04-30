# Flask-Sock Implementation with Native WebSockets

# main.py
import os
from flask import Flask, jsonify, request, make_response, render_template, send_from_directory
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_cors import CORS
import sqlite3
import random
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
import json
from flask_sock import Sock
import time
from functools import wraps
from collections import defaultdict

# Define the database path
DATABASE = 'app.db'  # Update with your actual database path

# Helper Vars for Limiter
failed_attempts = defaultdict(int)
block_until = defaultdict(float)

# Active WebSocket connections
active_connections = set()

# Flask app setup
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
sock = Sock(app)

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'grp5-secret-key-boys')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 12)))
jwt = JWTManager(app)

# Serve static files
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

# Serve the WebSocket client page
@app.route('/')
def index():
    return render_template('index.html')

# WebSocket connection handler
@sock.route('/ws')
def ws(ws):
    # Add this connection to the active connections set
    active_connections.add(ws)
    
    try:
        # Send a welcome message
        ws.send(json.dumps({
            'type': 'info',
            'message': 'Connected to server',
            'timestamp': datetime.now().isoformat()
        }))
        
        # Keep the connection open and listen for messages
        while True:
            try:
                data = ws.receive()
                # Try to parse as JSON
                try:
                    message = json.loads(data)
                    # Process the message based on its type
                    if message.get('type') == 'echo':
                        ws.send(json.dumps({
                            'type': 'echo_response',
                            'original': message,
                            'timestamp': datetime.now().isoformat()
                        }))
                    elif message.get('type') == 'broadcast':
                        # Broadcast to all other clients
                        broadcast_message({
                            'type': 'broadcast',
                            'from': 'user',
                            'content': message.get('content', ''),
                            'timestamp': datetime.now().isoformat()
                        }, exclude=ws)
                    elif message.get('type') == 'heartbeat':
                        # Respond to heartbeat
                        ws.send(json.dumps({
                            'type': 'heartbeat_ack',
                            'timestamp': datetime.now().isoformat()
                        }))
                    else:
                        # Default echo for unknown message types
                        ws.send(json.dumps({
                            'type': 'ack',
                            'received': message,
                            'timestamp': datetime.now().isoformat()
                        }))
                except json.JSONDecodeError:
                    # If not JSON, echo as plain text
                    ws.send(data)
            except Exception as e:
                print(f"Error processing message: {e}")
                break
    except Exception as e:
        print(f"WebSocket connection error: {e}")
    finally:
        # Remove from active connections when disconnected
        if ws in active_connections:
            active_connections.remove(ws)

# Helper function to broadcast a message to all connected clients
def broadcast_message(message, exclude=None):
    """
    Broadcast a message to all connected WebSocket clients
    :param message: The message to broadcast (will be converted to JSON)
    :param exclude: Optional WebSocket connection to exclude from broadcast
    """
    dead_connections = set()
    
    for client in active_connections:
        if exclude is not None and client == exclude:
            continue
            
        try:
            client.send(json.dumps(message) if isinstance(message, dict) else message)
        except Exception:
            # Mark dead connections for removal
            dead_connections.add(client)
    
    # Remove dead connections
    active_connections.difference_update(dead_connections)

# Database helper function
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Rate limiting decorator
def login_rate_limiter(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        ip = request.remote_addr
        current_time = time.time()
        
        # Check if IP is currently blocked
        if ip in block_until and block_until[ip] > current_time:
            remaining_time = int(block_until[ip] - current_time)
            return make_response(
                jsonify({
                    'message': f'Too many failed login attempts. Please try again after {remaining_time} seconds.',
                    'blocked_until': block_until[ip]
                }),
                429
            )
        
        # If the block has expired, reset the counter
        if ip in block_until and block_until[ip] <= current_time:
            failed_attempts[ip] = 0
            block_until.pop(ip)
        
        return f(*args, **kwargs)
    return decorated_function

# Login route with rate limiting
@app.route('/login', methods=['POST'])
@login_rate_limiter
def login():
    auth = request.json
    ip = request.remote_addr
    
    if not auth or not auth.get('username') or not auth.get('password'):
        return make_response(
            jsonify({'message': 'Could not verify', 'WWW-Authenticate': 'Basic realm="Login required!"'}),
            401
        )
    
    try:
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', 
                            (auth.get('username'),)).fetchone()
        conn.close()
        
        if not user:
            # Increment failed attempt count
            failed_attempts[ip] += 1
            
            # If reached limit, block the IP
            if failed_attempts[ip] >= 10:
                block_until[ip] = time.time() + (5 * 60)  # 5 minutes block
                failed_attempts[ip] = 0
                return make_response(
                    jsonify({
                        'message': 'Too many failed login attempts. Please try again after 5 minutes.',
                        'blocked_until': block_until[ip]
                    }),
                    429
                )
            
            return make_response(
                jsonify({
                    'message': 'User not found',
                    'attempts_remaining': 10 - failed_attempts[ip]
                }),
                401
            )
        
        # Check password (assuming passwords are hashed)
        if check_password_hash(user['password'], auth.get('password')):
            # Reset failed attempts on successful login
            if ip in failed_attempts:
                failed_attempts[ip] = 0
                
            access_token = create_access_token(identity=auth.get('username'))
            
            # Broadcast login event (excluding sensitive info)
            broadcast_message({
                'type': 'user_event',
                'event': 'login',
                'username': auth.get('username'),
                'timestamp': datetime.now().isoformat()
            })
            
            return jsonify({'access_token': access_token})
        
        # Increment failed attempt count for invalid password
        failed_attempts[ip] += 1
        
        # If reached limit, block the IP
        if failed_attempts[ip] >= 10:
            block_until[ip] = time.time() + (5 * 60)  # 5 minutes block
            failed_attempts[ip] = 0
            return make_response(
                jsonify({
                    'message': 'Too many failed login attempts. Please try again after 5 minutes.',
                    'blocked_until': block_until[ip]
                }),
                429
            )
        
        return make_response(
            jsonify({
                'message': 'Invalid credentials',
                'attempts_remaining': 10 - failed_attempts[ip]
            }),
            401
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'active_connections': len(active_connections)
    })

# API endpoint to send a message to all websocket clients
@app.route('/api/broadcast', methods=['POST'])
@jwt_required()
def api_broadcast():
    current_user = get_jwt_identity()
    data = request.json
    
    if not data or not data.get('message'):
        return jsonify({'error': 'No message provided'}), 400
        
    # Broadcast the message to all connected clients
    broadcast_message({
        'type': 'server_broadcast',
        'from': current_user,
        'message': data.get('message'),
        'timestamp': datetime.now().isoformat()
    })
    
    return jsonify({'success': True, 'message': 'Broadcast sent'})

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)