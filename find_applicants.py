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

# Buscar registros que parecem ter dados de candidatos
# Filtrar por source ou type que indique candidatos
cursor.execute("""
    SELECT source, type, COUNT(*) as total
    FROM public.audit_log
    GROUP BY source, type
    ORDER BY total DESC
    LIMIT 20
""")

groups = cursor.fetchall()

print("=" * 60)
print("TIPOS DE REGISTROS NO AUDIT_LOG:")
print("=" * 60)
for group in groups:
    print(f"  • {group['source']:50} | {group['type']:10} | {group['total']} registros")

# Buscar um registro que tenha dados de candidato com externalId
print("\n" + "=" * 60)
print("BUSCANDO REGISTRO COM ESTRUTURA DE CANDIDATO...")
print("=" * 60)

# Tentar diferentes filtros
filters = [
    "source LIKE '%applicant%'",
    "source LIKE '%candidat%'",
    "source LIKE '%Senior%'",
    "details::text LIKE '%externalId%'",
    "details::text LIKE '%branchOffice%'"
]

for filter_condition in filters:
    cursor.execute(f"""
        SELECT id, source, type, details
        FROM public.audit_log
        WHERE {filter_condition}
        LIMIT 1
    """)
    
    row = cursor.fetchone()
    if row:
        print(f"\n✅ Encontrado com filtro: {filter_condition}")
        print(f"   Source: {row['source']}")
        print(f"   Type: {row['type']}")
        print("\n   Payload (primeiros 1000 caracteres):")
        print("   " + "-" * 56)
        payload_str = json.dumps(row['details'], indent=2, ensure_ascii=False)
        print("   " + payload_str[:1000].replace("\n", "\n   "))
        if len(payload_str) > 1000:
            print("   ...")
        print("   " + "-" * 56)
        break

cursor.close()
conn.close()
