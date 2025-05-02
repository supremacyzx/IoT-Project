#Titel: Haupt Backend-Server
#Author: DD
#Version: 1.0
#Boilerplate und Grundkonfig erstellt durch Claude.ai Sonnet 3.7


#region :: Imports

import os
from flask import Flask, jsonify, request, make_response
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_cors import CORS
import sqlite3
import random
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
import json
from mqtt_handler import DATABASE
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import time
from functools import wraps
from collections import defaultdict
from mqtt_handler import mqtt_client
from flask_socketio import SocketIO  
from flask_sock import Sock
from mockDataGen import start_mock_sender

#endregion :: Imports

# !TODO Add native WS Support, add MockData Generator PY to emit on said WS

#region :: Environment Variables / Var Setup

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# JWT Configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'grp5-secret-key-boys')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 12)))
jwt = JWTManager(app)

#websocket setup
sock = Sock(app)

clients = []



#Helper Vars for Limiter
failed_attempts = defaultdict(int)  
block_until = defaultdict(float)

#endregion :: Environment Variables / Var Setup

#region :: Rate Limiting Setup

# Database helper functions
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def login_rate_limiter(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        ip = get_remote_address()
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

#endregion :: Rate Limiting Setup

#region :: Routes


@app.route('/testWS')
def testWS():
    return '''
        <html>
            <body>
                <script>
                    const socket = new WebSocket("ws://" + location.host + "/ws");
                    socket.onmessage = (event) => {
                        document.body.innerHTML += "<p>" + event.data + "</p>";
                    };
                    socket.onopen = () => {
                        socket.send("Hello from client!");
                    };
                </script>
                <h1>WebSocket Test</h1>
            </body>
        </html>
    '''


@sock.route('/ws')
def websocket(ws):
    clients.append(ws)
    try:
        while True:
            data = ws.receive()
            if data is None:
                break  # Client closed connection
            ws.send(f"You said: {data}")
    finally:
        clients.remove(ws)

# Modified login route with rate limiting
@app.route('/login', methods=['POST'])
@login_rate_limiter
def login():
    auth = request.json
    ip = get_remote_address()
    
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
            if failed_attempts[ip] >= 10:  # Changed from 5 to 10
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
                    'attempts_remaining': 10 - failed_attempts[ip]  # Changed from 5 to 10
                }),
                401
            )
        
        # In a real application, passwords should be hashed
        # This assumes password in DB is already hashed
        if check_password_hash(user['password'], auth.get('password')):
            # Reset failed attempts on successful login
            if ip in failed_attempts:
                failed_attempts[ip] = 0
                
            access_token = create_access_token(identity=auth.get('username'))
            return jsonify({'access_token': access_token})
        
        # Increment failed attempt count for invalid password
        failed_attempts[ip] += 1
        
        # If reached limit, block the IP
        if failed_attempts[ip] >= 10:  # Changed from 5 to 10
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
                'attempts_remaining': 10 - failed_attempts[ip]  # Changed from 5 to 10
            }),
            401
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route('/getConfig', methods=['GET'])
@jwt_required()
def get_config():
    try:
        msgID = random.randint(0,100000)
        mqtt_client.send_message("RZ/config", r'{"command":"getConfig", "msgID":' + str(msgID) + '}')
        attempts = 0
        while True:
            if attempts >= 200:
                return jsonify({'error': 'Timeout waiting for MQTT msg'}), 500
            if mqtt_client.configData:
                print(mqtt_client.configData)
                if mqtt_client.configData["msgID"] == msgID:
                    return mqtt_client.configData
            attempts += 1
            time.sleep(0.5)

    except Exception as e:
        print("Error in API: ", e)
        return jsonify({'error': str(e)}), 500


@app.route('/setConfig', methods=['POST'])
@jwt_required()
def set_config():
    try:
        configData = request.json
        msgID = random.randint(0,100000)
        
        payload = {
            "msgID": msgID,
            "command": "setConfig",
            "value": json.dumps(configData)  # Ensures it's a properly escaped JSON string
        }
        print("[MQTT] Sending: ",  str(json.dumps(payload)))
        mqtt_client.send_message("RZ/config", str(json.dumps(payload)))
        return ("OK",200)
    except Exception as e:
        print("Error in API: ", e)
        return jsonify({'error': str(e)}), 500


@app.route('/addAccessID', methods=['POST'])
@jwt_required()
def add_access_id():
    try:
        msgID = random.randint(0,100000)
        
        payload = {
            "msgID": msgID,
            "command": "addAccessId",
        }
        print("[MQTT] Sending: ",  str(json.dumps(payload)))
        mqtt_client.send_message("RZ/config", str(json.dumps(payload)))
        return ("OK",200)
    except Exception as e:
        print("Error in API: ", e)
        return jsonify({'error': str(e)}), 500


@app.route('/data', methods=['GET'])
@jwt_required()
def get_data():
    try:
        # Get query parameters for filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 100)
        
        conn = get_db_connection()
        query = 'SELECT timestamp, value FROM dashboard_data'
        params = []
        
        # Add date filters if they exist
        if start_date and end_date:
            query += ' WHERE timestamp BETWEEN ? AND ?'
            params.extend([start_date, end_date])
        elif start_date:
            query += ' WHERE timestamp >= ?'
            params.append(start_date)
        elif end_date:
            query += ' WHERE timestamp <= ?'
            params.append(end_date)
        
        # Add ordering and limit
        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)
        
        results = conn.execute(query, params).fetchall()
        
        # Process the results
        data = []
        for row in results:
            try:
                value_dict = json.loads(row['value'])
                data.append({
                    'timestamp': row['timestamp'],
                    'data': value_dict
                })
            except json.JSONDecodeError:
                # If the value isn't valid JSON, include it as a string
                data.append({
                    'timestamp': row['timestamp'],
                    'data': row['value']
                })
        
        conn.close()
        return jsonify({'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/incidents', methods=['GET'])
@jwt_required()
def get_incidents():
    try:
        # Get query parameters for filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 100)
        
        conn = get_db_connection()
        query = 'SELECT timestamp, value FROM incidents'
        params = []
        
        # Add date filters if they exist
        if start_date and end_date:
            query += ' WHERE timestamp BETWEEN ? AND ?'
            params.extend([start_date, end_date])
        elif start_date:
            query += ' WHERE timestamp >= ?'
            params.append(start_date)
        elif end_date:
            query += ' WHERE timestamp <= ?'
            params.append(end_date)
        
        # Add ordering and limit
        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)
        
        results = conn.execute(query, params).fetchall()
        
        # Process the results
        incidents = []
        for row in results:
            try:
                value_dict = json.loads(row['value'])
                incidents.append({
                    'timestamp': row['timestamp'],
                    'data': value_dict
                })
            except json.JSONDecodeError:
                # If the value isn't valid JSON, include it as a string
                incidents.append({
                    'timestamp': row['timestamp'],
                    'data': row['value']
                })
        
        conn.close()
        return jsonify({'incidents': incidents})
    except Exception as e:
        return jsonify({'error': str(e)}), 500




@app.route('/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    current_user = get_jwt_identity()
    try:
        conn = get_db_connection()
        user = conn.execute('SELECT username FROM users WHERE username = ?', 
                          (current_user,)).fetchone()
        conn.close()
        
        if user:
            return jsonify({'username': user['username'], 'message': 'Profile fetched successfully'})
        else:
            return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

#endregion :: Routes

#region :: __main__
# Main entry point for the Flask app

if __name__ == '__main__':
    # Run the app
    mqtt_client.start(clients)
    #comment out mock sender if not debugging
    #start_mock_sender(clients)
    print("MQTT client started and listening for messages")
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
    

#endregion :: __main__


# Sample AddAccessId command MQTT msg: '{"msgID":1, "command":"addAccessId"}'
# Sample Set Config command MQTT msg: '{"msgID":1, "command":"setConfig","value":"{\"pins\":{\"buzzerpin\":27}}"}'