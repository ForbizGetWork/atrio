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

# Buscar um candidato com sucesso
cursor.execute("""
    SELECT id, source, type, details
    FROM public.audit_log
    WHERE source LIKE '%Create applicant from Recrutei to Senior%'
    AND type = 'SUCCESS'
    LIMIT 1
""")

row = cursor.fetchone()

if row:
    print("=" * 60)
    print("CANDIDATO ENCONTRADO (SUCCESS):")
    print("=" * 60)
    print(f"Source: {row['source']}")
    print(f"Type: {row['type']}")
    print("\nPayload completo:")
    print("=" * 60)
    print(json.dumps(row['details'], indent=2, ensure_ascii=False))
else:
    print("Nenhum candidato SUCCESS encontrado")

# Contar total de candidatos SUCCESS
cursor.execute("""
    SELECT COUNT(*) as total
    FROM public.audit_log
    WHERE source LIKE '%Create applicant from Recrutei to Senior%'
    AND type = 'SUCCESS'
""")

count = cursor.fetchone()
print(f"\n\n📊 Total de candidatos SUCCESS: {count['total']}")

cursor.close()
conn.close()
