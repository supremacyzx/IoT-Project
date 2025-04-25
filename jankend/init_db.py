import sqlite3

conn = sqlite3.connect('./local.db')
cur = conn.cursor()

cur.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS dashboard_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    value TEXT
)
''')

cur.execute('''
CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT,
    value TEXT
)
''')

# Optional: add a test user
cur.execute("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)", ('admin', 'grp5123!'))

conn.commit()
conn.close()
