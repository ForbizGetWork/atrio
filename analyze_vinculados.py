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

# Buscar registros com "Candidato vinculado"
cursor.execute("""
    SELECT COUNT(*) as total
    FROM public.audit_log
    WHERE message = 'Candidato vinculado'
""")

count = cursor.fetchone()
print(f"📊 Total de 'Candidato vinculado': {count['total']}")

# Buscar os 3 mais recentes
cursor.execute("""
    SELECT id, source, type, message, details, created_at
    FROM public.audit_log
    WHERE message = 'Candidato vinculado'
    ORDER BY created_at DESC
    LIMIT 3
""")

rows = cursor.fetchall()

for idx, row in enumerate(rows, 1):
    print(f"\n{'=' * 60}")
    print(f"CANDIDATO {idx} (Criado em: {row['created_at']}):")
    print('=' * 60)
    
    details = row['details']
    
    # Verificar campos principais
    applicant = details.get('applicant', 'N/A')
    vacancy_title = details.get('vacancy_title', 'N/A')
    
    print(f"Candidato: {applicant}")
    print(f"Vaga: {vacancy_title}")
    
    # Verificar se tem body com branchOffice/headOffice
    if 'body' in details:
        body = details['body']
        
        if 'branchOffice' in body and body['branchOffice']:
            branch = body['branchOffice']
            external_id = branch.get('externalId', 'N/A')
            name = branch.get('name', 'N/A')
            print(f"\n✅ BranchOffice:")
            print(f"   Nome: {name}")
            print(f"   ExternalId: {external_id}")
        else:
            print("\n❌ BranchOffice: AUSENTE")
        
        if 'headOffice' in body and body['headOffice']:
            head = body['headOffice']
            external_id = head.get('externalId', 'N/A')
            name = head.get('name', 'N/A')
            print(f"\n✅ HeadOffice:")
            print(f"   Nome: {name}")
            print(f"   ExternalId: {external_id}")
        else:
            print("\n❌ HeadOffice: AUSENTE")
    else:
        print("\n❌ Campo 'body' AUSENTE no payload")
    
    # Mostrar payload completo do primeiro
    if idx == 1:
        print(f"\n{'=' * 60}")
        print("PAYLOAD COMPLETO (primeiro registro):")
        print('=' * 60)
        print(json.dumps(details, indent=2, ensure_ascii=False)[:2000])
        print("...")

cursor.close()
conn.close()
