import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST'),
    port=os.getenv('DB_PORT'),
    user=os.getenv('DB_USER'),
    database=os.getenv('DB_NAME'),
    password=os.getenv('DB_PASSWORD')
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

# Buscar todas as mensagens distintas que contenham "candidato"
cursor.execute("""
    SELECT DISTINCT message
    FROM public.audit_log
    WHERE message ILIKE '%candidat%'
    ORDER BY message
    LIMIT 50
""")

rows = cursor.fetchall()

print("=" * 60)
print("MENSAGENS COM 'CANDIDAT':")
print("=" * 60)
for row in rows:
    if row['message']:
        print(f"  • {row['message']}")

cursor.close()
conn.close()
