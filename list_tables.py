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

# Listar todas as tabelas do schema public
cursor.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
""")

tables = cursor.fetchall()

print("=" * 60)
print("TABELAS NO SCHEMA PUBLIC:")
print("=" * 60)
for table in tables:
    table_name = table['table_name']
    
    # Contar registros
    cursor.execute(f'SELECT COUNT(*) as total FROM public."{table_name}"')
    count = cursor.fetchone()['total']
    
    print(f"  • {table_name:30} ({count} registros)")

cursor.close()
conn.close()
