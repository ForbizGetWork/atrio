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

# Ver estrutura da tabela dadosoperacionais_admissoes
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dadosoperacionais_admissoes'
    ORDER BY ordinal_position
""")

columns = cursor.fetchall()

print("=" * 60)
print("COLUNAS DA TABELA dadosoperacionais_admissoes:")
print("=" * 60)
for col in columns:
    print(f"  • {col['column_name']:30} ({col['data_type']})")

# Ver um registro de exemplo
cursor.execute('SELECT * FROM public.dadosoperacionais_admissoes LIMIT 1')
row = cursor.fetchone()

print("\n" + "=" * 60)
print("EXEMPLO DE REGISTRO:")
print("=" * 60)
print(json.dumps(dict(row), indent=2, ensure_ascii=False, default=str))

cursor.close()
conn.close()
