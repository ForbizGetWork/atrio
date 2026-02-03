import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
import json

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    port=os.getenv('DB_PORT'),
    user=os.getenv('DB_USER'),
    database=os.getenv('DB_NAME'),
    password=os.getenv('DB_PASSWORD')
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

# Ver estrutura
cursor.execute('SELECT id, created_at, source, type, message FROM public.audit_log LIMIT 5')
rows = cursor.fetchall()

print("=" * 60)
print("ESTRUTURA DA TABELA audit_log")
print("=" * 60)
for idx, row in enumerate(rows, 1):
    print(f"\nRegistro {idx}:")
    print(f"  Type: {row['type']}")
    print(f"  Source: {row['source']}")
    print(f"  Message: {row['message'][:80] if row['message'] else 'None'}...")

# Ver um details completo
cursor.execute('SELECT details FROM public.audit_log LIMIT 1')
row = cursor.fetchone()
details = row['details']

print("\n" + "=" * 60)
print("ESTRUTURA DO DETAILS (completo):")
print("=" * 60)
print(json.dumps(details, indent=2, ensure_ascii=False))

cursor.close()
conn.close()
