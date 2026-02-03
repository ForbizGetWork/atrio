import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_NAME = os.getenv("DB_NAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")

def debug_specific_record():
    # ID tentado ler da imagem (pode estar errado, mas vou tentar buscar pelo nome Weslley com filtro exato)
    print("SEARCHING SPECIFIC WESLLEY RECORD...")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            dbname=DB_NAME,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        # Buscar APENAS registros com "Weslley" E "Candidato vinculado"
        query = """
            SELECT id, message, details, created_at
            FROM public.audit_log
            WHERE details::text ILIKE '%Weslley%' 
            AND message = 'Candidato vinculado'
            ORDER BY created_at DESC
            LIMIT 1
        """
        
        cursor.execute(query)
        row = cursor.fetchone()
        
        if row:
            print(f"✅ FOUND RECORD:")
            print(f"ID: {row[0]}")
            print(f"Message: {row[1]}")
            print(f"Created: {row[3]}")
            
            details = row[2]
            body = details.get('body', {})
            
            branch = body.get('branchOffice', {})
            head = body.get('headOffice', {})
            
            print(f"\n--- STRUCTURE CHECK ---")
            print(f"Branch ExternalID: {branch.get('externalId')}")
            print(f"Head ExternalID: {head.get('externalId')}")
            
            if not branch.get('externalId') and not head.get('externalId'):
                print("❌ FAIL: No externalId found in JSON!")
            else:
                print("✅ SUCCESS: externalId found!")
                
            print("\n--- FULL JSON ---")
            print(json.dumps(details, indent=2))
        else:
            print("❌ No record found for Weslley with message 'Candidato vinculado'")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_specific_record()
