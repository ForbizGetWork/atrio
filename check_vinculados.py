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

# Buscar registros com "Candidato Vinculado"
cursor.execute("""
    SELECT COUNT(*) as total
    FROM public.audit_log
    WHERE message = 'Candidato Vinculado'
""")

count = cursor.fetchone()
print(f"📊 Total de registros 'Candidato Vinculado': {count['total']}")

# Buscar um exemplo
cursor.execute("""
    SELECT id, source, type, message, details, created_at
    FROM public.audit_log
    WHERE message = 'Candidato Vinculado'
    ORDER BY created_at DESC
    LIMIT 1
""")

row = cursor.fetchone()

if row:
    print("\n" + "=" * 60)
    print("CANDIDATO VINCULADO (MAIS RECENTE):")
    print("=" * 60)
    print(f"ID: {row['id']}")
    print(f"Created: {row['created_at']}")
    print(f"Source: {row['source']}")
    print(f"Type: {row['type']}")
    print(f"Message: {row['message']}")
    
    details = row['details']
    
    # Verificar se tem branchOffice e headOffice
    has_branch = 'branchOffice' in str(details)
    has_head = 'headOffice' in str(details)
    has_external_id = 'externalId' in str(details)
    
    print(f"\n✅ Tem branchOffice: {has_branch}")
    print(f"✅ Tem headOffice: {has_head}")
    print(f"✅ Tem externalId: {has_external_id}")
    
    print("\n" + "=" * 60)
    print("PAYLOAD COMPLETO:")
    print("=" * 60)
    print(json.dumps(details, indent=2, ensure_ascii=False))
    
    # Verificar estrutura específica
    if 'body' in details:
        body = details['body']
        if 'branchOffice' in body:
            print("\n" + "=" * 60)
            print("✅ BRANCH OFFICE ENCONTRADO:")
            print("=" * 60)
            print(json.dumps(body['branchOffice'], indent=2, ensure_ascii=False))
        
        if 'headOffice' in body:
            print("\n" + "=" * 60)
            print("✅ HEAD OFFICE ENCONTRADO:")
            print("=" * 60)
            print(json.dumps(body['headOffice'], indent=2, ensure_ascii=False))
else:
    print("\n❌ Nenhum registro 'Candidato Vinculado' encontrado")

cursor.close()
conn.close()
