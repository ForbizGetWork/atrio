#!/usr/bin/env python3
"""
Script de Teste - Conexão com Supabase

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

# Tentar importar supabase
try:
    from supabase import create_client, Client
    print("✅ Biblioteca supabase-py instalada")
except ImportError:
    print("❌ Erro: supabase-py não está instalado")
    print("   Execute: pip install -r requirements.txt")
    exit(1)

# Configurações
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SCHEMA_NAME = 'public'
TABLE_NAME = 'audit_log'
DETAILS_COLUMN = 'details'

def test_connection():
    """Testa conexão com Supabase"""
    print("=" * 60)
    print("🧪 TESTE DE CONEXÃO - SUPABASE")
    print("=" * 60)
    print()
    
    # 1. Validar variáveis de ambiente
    print("1️⃣ Validando variáveis de ambiente...")
    
    if not SUPABASE_URL:
        print("❌ SUPABASE_URL não configurada no .env")
        return False
    
    if not SUPABASE_KEY:
        print("❌ SUPABASE_KEY não configurada no .env")
        return False
    
    print(f"   ✅ SUPABASE_URL: {SUPABASE_URL}")
    print(f"   ✅ SUPABASE_KEY: {SUPABASE_KEY[:20]}...")
    print()
    
    # 2. Conectar no Supabase
    print("2️⃣ Conectando no Supabase...")
    
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("   ✅ Conexão estabelecida")
    except Exception as e:
        print(f"   ❌ Erro ao conectar: {e}")
        return False
    
    print()
    
    # 3. Testar acesso à tabela
    print(f"3️⃣ Testando acesso à tabela '{SCHEMA_NAME}.{TABLE_NAME}'...")
    
    try:
        # Buscar apenas 1 registro para teste
        response = supabase.table(TABLE_NAME).select(DETAILS_COLUMN).limit(1).execute()
        
        if not response.data:
            print(f"   ⚠️ Tabela existe mas está vazia")
            print(f"   💡 Aguarde o ETL do Tiago popular a tabela")
            return True  # Conexão OK, tabela só está vazia
        
        print(f"   ✅ Tabela acessível ({len(response.data)} registro encontrado)")
        
    except Exception as e:
        print(f"   ❌ Erro ao acessar tabela: {e}")
        print(f"   💡 Verifique se a tabela '{TABLE_NAME}' existe no schema '{SCHEMA_NAME}'")
        return False
    
    print()
    
    # 4. Validar estrutura do registro
    print(f"4️⃣ Validando estrutura do registro...")
    
    try:
        record = response.data[0]
        details = record.get(DETAILS_COLUMN)
        
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
        response = supabase.table(TABLE_NAME).select(DETAILS_COLUMN, count='exact').execute()
        total = response.count if hasattr(response, 'count') else len(response.data)
        
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


if __name__ == '__main__':
    try:
        success = test_connection()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️ Teste cancelado pelo usuário")
        exit(1)
    except Exception as e:
        print(f"\n\n❌ Erro inesperado: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
