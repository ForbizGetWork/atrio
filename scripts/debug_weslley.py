import os
import json
import psycopg2
from dotenv import load_dotenv

# Carregar variáveis do arquivo .env
load_dotenv()

# Configurações do Banco de Dados
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_NAME = os.getenv("DB_NAME")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# Configurações da Tabela
SCHEMA_NAME = "public"
TABLE_NAME = "audit_log"
DETAILS_COLUMN = "details"

def debug_weslley():
    print("SEARCHING FOR WESLLEY...")
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            dbname=DB_NAME,
            password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        # Buscar registro específico pelo conteúdo do JSON
        # Usando ILIKE para buscar texto dentro da coluna details (convertida para texto)
        query = f"""
            SELECT id, message, created_at
            FROM {SCHEMA_NAME}.{TABLE_NAME}
            WHERE {DETAILS_COLUMN}::text ILIKE '%Weslley%'
            ORDER BY id DESC
            LIMIT 5
        """
        
        print("Executing query...")
        cursor.execute(query)
        rows = cursor.fetchall()
        
        print(f"Found {len(rows)} records:")
        for row in rows:
            print(f"ID: {row[0]}, Message: {row[1]}, Created: {row[2]}")
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_weslley()
