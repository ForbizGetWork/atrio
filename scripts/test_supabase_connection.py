#!/usr/bin/env python3
"""
Script de Teste - Conexão com PostgreSQL (Supabase)

Testa a conexão e busca 1 registro de exemplo da tabela audit_log
para validar que tudo está configurado corretamente.

Uso:
    python test_supabase_connection.py
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Tentar importar psycopg2
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    print("✅ Biblioteca psycopg2 instalada")
except ImportError:
    print("❌ Erro: psycopg2 não está instalado")
    print("   Execute: pip install -r requirements.txt")
    exit(1)

# Configurações
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')

SCHEMA_NAME = 'public'
TABLE_NAME = 'audit_log'
DETAILS_COLUMN = 'details'

def test_connection():
    """Testa conexão com PostgreSQL (Supabase)"""
    print("=" * 60)
    print("🧪 TESTE DE CONEXÃO - POSTGRESQL (SUPABASE)")
    print("=" * 60)
    print()
    
    conn = None
    
    try:
        # 1. Validar variáveis de ambiente
        print("1️⃣ Validando variáveis de ambiente...")
        
        if not DB_HOST:
            print("❌ DB_HOST não configurada no .env")
            return False
        
        if not DB_PASSWORD:
            print("❌ DB_PASSWORD não configurada no .env")
            return False
        
        print(f"   ✅ DB_HOST: {DB_HOST}")
        print(f"   ✅ DB_PORT: {DB_PORT}")
        print(f"   ✅ DB_USER: {DB_USER}")
        print(f"   ✅ DB_NAME: {DB_NAME}")
        print(f"   ✅ DB_PASSWORD: {'*' * 10}...")
        print()
        
        # 2. Conectar no PostgreSQL
        print("2️⃣ Conectando no PostgreSQL...")
        
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                database=DB_NAME,
                password=DB_PASSWORD,
                connect_timeout=10
            )
            print("   ✅ Conexão estabelecida")
        except psycopg2.OperationalError as e:
            print(f"   ❌ Erro ao conectar: {e}")
            print("\n   💡 Dicas:")
            print("      • Verifique se DB_HOST está correto")
            print("      • Verifique se DB_PASSWORD está correto")
            print("      • Verifique se o IP está liberado no Supabase")
            return False
        
        print()
        
        # 3. Testar acesso à tabela
        print(f"3️⃣ Testando acesso à tabela '{SCHEMA_NAME}.{TABLE_NAME}'...")
        
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # Buscar apenas 1 registro para teste
            query = f"""
                SELECT {DETAILS_COLUMN}
                FROM {SCHEMA_NAME}.{TABLE_NAME}
                WHERE {DETAILS_COLUMN} IS NOT NULL
                LIMIT 1
            """
            
            cursor.execute(query)
            row = cursor.fetchone()
            cursor.close()
            
            if not row:
                print(f"   ⚠️ Tabela existe mas está vazia ou sem dados na coluna '{DETAILS_COLUMN}'")
                print(f"   💡 Aguarde o ETL do Tiago popular a tabela")
                return True  # Conexão OK, tabela só está vazia
            
            print(f"   ✅ Tabela acessível (1 registro encontrado)")
            
        except psycopg2.Error as e:
            print(f"   ❌ Erro ao acessar tabela: {e}")
            print(f"   💡 Verifique se a tabela '{TABLE_NAME}' existe no schema '{SCHEMA_NAME}'")
            return False
        
        print()
        
        # 4. Validar estrutura do registro
        print(f"4️⃣ Validando estrutura do registro...")
        
        try:
            details = row.get(DETAILS_COLUMN)
            
            if not details:
                print(f"   ❌ Coluna '{DETAILS_COLUMN}' está vazia")
                return False
            
            print(f"   ✅ Coluna '{DETAILS_COLUMN}' contém dados")
            print()
            
            # Validar campos esperados
            print("   📋 Validando campos do payload:")
            
            required_fields = ["applicant", "vacancy_title", "body"]
            missing_fields = []
            
            for field in required_fields:
                if field in details:
                    print(f"      ✅ {field}")
                else:
                    print(f"      ❌ {field} (ausente)")
                    missing_fields.append(field)
            
            # Validar externalId (CRÍTICO para RBAC)
            body = details.get("body", {})
            branch_external_id = body.get("branchOffice", {}).get("externalId")
            head_external_id = body.get("headOffice", {}).get("externalId")
            
            if branch_external_id or head_external_id:
                print(f"      ✅ externalId encontrado")
                if branch_external_id:
                    print(f"         • branchOffice.externalId: {branch_external_id}")
                if head_external_id:
                    print(f"         • headOffice.externalId: {head_external_id}")
            else:
                print(f"      ⚠️ externalId NÃO encontrado (RBAC não funcionará!)")
            
            print()
            
            # Mostrar exemplo do payload
            print("   📄 Exemplo de payload (primeiros 500 caracteres):")
            print("   " + "-" * 56)
            payload_str = json.dumps(details, ensure_ascii=False, indent=2)
            print("   " + payload_str[:500].replace("\n", "\n   "))
            if len(payload_str) > 500:
                print("   ...")
            print("   " + "-" * 56)
            
            if missing_fields:
                print()
                print(f"   ⚠️ Campos ausentes: {', '.join(missing_fields)}")
                print(f"   💡 Verifique a implementação do ETL do Tiago")
                return False
            
        except Exception as e:
            print(f"   ❌ Erro ao validar estrutura: {e}")
            return False
        
        print()
        
        # 5. Teste de contagem total
        print("5️⃣ Contando total de registros...")
        
        try:
            cursor = conn.cursor()
            query = f"""
                SELECT COUNT(*) as total
                FROM {SCHEMA_NAME}.{TABLE_NAME}
                WHERE {DETAILS_COLUMN} IS NOT NULL
            """
            cursor.execute(query)
            result = cursor.fetchone()
            total = result[0] if result else 0
            cursor.close()
            
            print(f"   ✅ Total de candidatos na tabela: {total}")
            
        except Exception as e:
            print(f"   ⚠️ Não foi possível contar registros: {e}")
        
        print()
        print("=" * 60)
        print("✅ TESTE CONCLUÍDO COM SUCESSO!")
        print("=" * 60)
        print()
        print("🚀 Próximo passo: Rodar o script de exportação")
        print("   python export_from_supabase.py")
        print()
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        if conn:
            conn.close()
            print("🔌 Conexão fechada")


if __name__ == '__main__':
    try:
        success = test_connection()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Teste cancelado pelo usuário")
        exit(1)
