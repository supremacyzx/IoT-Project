import sqlite3
from werkzeug.security import generate_password_hash

# Pfad zur Datenbank (wie in deinem Backend verwendet)
DATABASE = 'local.db'

# Benutzername und Passwort
username = 'root'
password = 'secureOrSomething'

# Passwort hashen
hashed_password = generate_password_hash(password)

# Verbindung zur Datenbank herstellen und Nutzer einfügen
conn = sqlite3.connect(DATABASE)
cursor = conn.cursor()

try:
    cursor.execute('INSERT INTO users (username, password) VALUES (?, ?)',
                   (username, hashed_password))
    conn.commit()
    print(f'✅ Benutzer "{username}" erfolgreich erstellt.')
except sqlite3.IntegrityError:
    print(f'⚠️ Benutzer "{username}" existiert bereits.')
finally:
    conn.close()
