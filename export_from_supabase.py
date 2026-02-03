#!/usr/bin/env python3
"""
Script de Exportação Automática - PostgreSQL (Supabase) → GitHub Pages

Fluxo:
1. Conecta no PostgreSQL (Supabase) diretamente
2. Busca candidatos vinculados da tabela audit_log
3. Exporta para applicants.json
4. Converte para applicants-data.js
5. Faz commit e push para GitHub

Uso:
    python export_from_supabase.py
    
Ou agendar no cron/Task Scheduler para rodar a cada X horas
"""

import json
import os
import subprocess
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# ========== CONFIGURAÇÕES ==========
# Credenciais PostgreSQL (Supabase)
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_NAME = os.getenv('DB_NAME', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD')

# Configuração da tabela
SCHEMA_NAME = 'public'
TABLE_NAME = 'audit_log'
DETAILS_COLUMN = 'details'
MESSAGE_FILTER = 'Candidato vinculado'  # Filtro para pegar apenas candidatos vinculados

# Diretório do projeto
PROJECT_DIR = Path(__file__).parent


def connect_database():
    """Conecta no PostgreSQL (Supabase)"""
    print("🔌 Conectando no PostgreSQL (Supabase)...")
    
    # Validar credenciais
    if not DB_HOST or not DB_PASSWORD:
        raise ValueError(
            "Credenciais não configuradas! "
            "Verifique o arquivo .env (DB_HOST, DB_PASSWORD)"
        )
    
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            database=DB_NAME,
            password=DB_PASSWORD,
            connect_timeout=10
        )
        print("✅ Conectado com sucesso!")
        return conn
        
    except psycopg2.OperationalError as e:
        print(f"❌ Erro ao conectar no banco: {e}")
        print("\n💡 Dicas:")
        print("   • Verifique se DB_HOST está correto")
        print("   • Verifique se DB_PASSWORD está correto")
        print("   • Verifique se o IP está liberado no Supabase")
        raise
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        raise


def fetch_applicants(conn) -> list:
    """
    Busca candidatos vinculados do PostgreSQL (tabela audit_log)
    
    Estratégia otimizada: busca os últimos registros da tabela e filtra por message
    Isso é muito mais rápido do que scan completo em tabela sem índice
    """
    print(f"📡 Buscando candidatos vinculados de '{SCHEMA_NAME}.{TABLE_NAME}'...")
    print(f"   (Buscando registros dos últimos 15 dias, filtrando '{MESSAGE_FILTER}')")
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # ESTRATÉGIA OTIMIZADA:
        # 1. Pegar apenas os últimos 5000 registros (mais rápido)
        # 2. Filtrar por message no Python (rápido)
        # Isso evita timeout em scans completos de tabela grande sem índice
        
        query = f"""
            SELECT id, message, {DETAILS_COLUMN}, created_at
            FROM {SCHEMA_NAME}.{TABLE_NAME}
            WHERE {DETAILS_COLUMN} IS NOT NULL
            AND created_at > NOW() - INTERVAL '2 days'

        """
        
        print(f"   Executando query otimizada...")
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        
        # Ordenar em memória (Python) para aliviar o banco
        print("   Ordenando registros em memória...")
        rows.sort(key=lambda x: x['created_at'], reverse=True)
        
        print(f"   ✅ {len(rows)} registros recuperados, filtrando...")
        
        # Filtrar apenas candidatos vinculados
        applicants = []
        for row in rows:
            if row.get('message') == MESSAGE_FILTER:
                details = row.get(DETAILS_COLUMN)
                if details:
                    applicants.append(details)
        
        if not applicants:
            print("⚠️ Nenhum candidato vinculado encontrado nos últimos 10000 registros")
            return []
        
        print(f"✅ {len(applicants)} candidatos vinculados encontrados")
        return applicants
        
    except psycopg2.Error as e:
        print(f"❌ Erro ao buscar dados: {e}")
        raise
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        raise


def transform_data(raw_data: list) -> list:
    """
    Valida, transforma e limpa os dados do banco
    
    Valida campos críticos, conta quantos têm externalId e remove campos desnecessários
    para reduzir o tamanho do arquivo (~98% de redução)
    """
    print("🔄 Validando e limpando dados...")
    
    valid_applicants = []
    warnings = []
    stats = {
        'total': len(raw_data),
        'with_external_id': 0,
        'without_external_id': 0,
        'missing_fields': 0
    }
    
    for idx, applicant in enumerate(raw_data):
        # Validar estrutura básica
        if not isinstance(applicant, dict):
            warnings.append(f"Registro {idx}: Não é um objeto JSON válido")
            stats['missing_fields'] += 1
            continue
        
        # Validar campos obrigatórios
        if not applicant.get("applicant"):
            warnings.append(f"Registro {idx}: Campo 'applicant' ausente")
            stats['missing_fields'] += 1
            continue
        
        if not applicant.get("vacancy_title"):
            warnings.append(f"Registro {idx}: Campo 'vacancy_title' ausente")
            stats['missing_fields'] += 1
            continue
        
        # Validar campo CRÍTICO para RBAC
        # Estratégia resiliente: busca em raiz (snake/camel) e dentro de body
        body = applicant.get("body") or {}
        if not isinstance(body, dict): body = {} # Garantir que é dict

        branch_data = applicant.get("branch_office") or applicant.get("branchOffice") or body.get("branchOffice")
        head_data = applicant.get("head_office") or applicant.get("headOffice") or body.get("headOffice")
        
        branch_external_id = branch_data.get("externalId") if branch_data else None
        head_external_id = head_data.get("externalId") if head_data else None
        
        if branch_external_id or head_external_id:
            stats['with_external_id'] += 1
        else:
            stats['without_external_id'] += 1
            warnings.append(
                f"⚠️ Candidato '{applicant.get('applicant')}': "
                f"Sem externalId (branchOffice ou headOffice). "
                f"Este candidato NÃO será visível para ninguém!"
            )
        
        # LIMPEZA: Manter apenas campos essenciais (reduz ~98% do tamanho)
        clean_item = {
            "applicant": applicant.get("applicant"),
            "vacancy_title": applicant.get("vacancy_title"),
            "senior_vacancy_id": applicant.get("senior_vacancy_id"),
            "recrutei_vacancy_id": applicant.get("recrutei_vacancy_id"),
            # Preservar dados de estrutura na raiz para facilitar JS
            "branch_office": branch_data, 
            "head_office": head_data,
            "body": {}
        }
        
        # Adicionar dados básicos do talento
        if "talent" in body:
            talent = body["talent"]
            clean_item["body"]["talent"] = {
                "id": talent.get("id"),
                "user": {
                    "name": talent.get("user", {}).get("name"),
                    "email": talent.get("user", {}).get("email"),
                    "city": talent.get("user", {}).get("city")
                }
            }
        elif "talent" in applicant: # Talvez talent esteja na raiz também?
             # (Opcional: implementar se necessário, mas Evander tem talent no body)
             pass
        
        valid_applicants.append(clean_item)
    
    # Mostrar estatísticas
    print(f"\n📊 Estatísticas:")
    print(f"   Total processados: {stats['total']}")
    print(f"   ✅ Com externalId: {stats['with_external_id']}")
    print(f"   ⚠️ Sem externalId: {stats['without_external_id']}")
    print(f"   ❌ Campos ausentes: {stats['missing_fields']}")
    
    # Mostrar avisos (máximo 5)
    if warnings and stats['without_external_id'] > 0:
        print(f"\n⚠️ Avisos (mostrando até 5):")
        for warning in warnings[:5]:
            if "Sem externalId" in warning:
                print(f"   • {warning}")
        if len(warnings) > 5:
            print(f"   ... e mais {len(warnings) - 5} avisos")
    
    print(f"\n✅ {len(valid_applicants)} candidatos válidos e limpos")
    return valid_applicants


def save_json(data: list, filepath: Path):
    """Salva dados em arquivo JSON"""
    print(f"\n💾 Salvando em {filepath}...")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    file_size_kb = filepath.stat().st_size / 1024
    print(f"✅ Arquivo salvo ({file_size_kb:.2f} KB)")


def convert_to_js(json_file: Path, js_file: Path):
    """Converte JSON para arquivo JS"""
    print(f"🔄 Convertendo para {js_file}...")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Minificar JSON
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    
    # Adicionar timestamp e header
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
    js_content = f"""// Auto-generated applicants data
// Last updated: {timestamp}

const APPLICANTS_DATA = {json_str};
"""
    
    with open(js_file, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    file_size_kb = js_file.stat().st_size / 1024
    print(f"✅ Arquivo JS gerado ({file_size_kb:.2f} KB)")


def git_commit_and_push():
    """Faz commit e push para GitHub"""
    print("\n📤 Fazendo deploy no GitHub...")
    
    try:
        # Add
        subprocess.run(['git', 'add', 'applicants.json', 'applicants-data.js'], 
                      cwd=PROJECT_DIR, check=True, capture_output=True)
        
        # Commit
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
        commit_msg = f"chore: Atualizar dados dos candidatos ({timestamp})"
        result = subprocess.run(['git', 'commit', '-m', commit_msg], 
                              cwd=PROJECT_DIR, capture_output=True, text=True)
        
        if result.returncode != 0:
            if "nothing to commit" in result.stdout:
                print("⚠️ Nenhuma mudança detectada (dados já estão atualizados)")
                return
            else:
                print(f"⚠️ Erro no commit: {result.stderr}")
                return
        
        # Push
        subprocess.run(['git', 'push', 'origin', 'main'], 
                      cwd=PROJECT_DIR, check=True, capture_output=True)
        
        print("✅ Deploy concluído!")
        print("🌐 Aguarde ~2 minutos para GitHub Pages atualizar")
        
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Erro no Git: {e}")
        print("   Verifique se o Git está configurado corretamente")


def main():
    """Função principal"""
    print("=" * 60)
    print("🚀 EXPORTAÇÃO AUTOMÁTICA - POSTGRESQL → GITHUB PAGES")
    print("=" * 60)
    print()
    
    conn = None
    
    try:
        # 1. Conectar no PostgreSQL
        conn = connect_database()
        
        # 2. Buscar dados
        raw_data = fetch_applicants(conn)
        
        if not raw_data:
            print("\n⚠️ Nenhum dado encontrado. Abortando.")
            return
        
        # 3. Transformar dados
        applicants = transform_data(raw_data)
        
        if not applicants:
            print("\n⚠️ Nenhum candidato válido. Abortando.")
            return
        
        # 4. Salvar JSON
        json_file = PROJECT_DIR / 'applicants.json'
        save_json(applicants, json_file)
        
        # 5. Converter para JS
        js_file = PROJECT_DIR / 'applicants-data.js'
        convert_to_js(json_file, js_file)
        
        # 6. Deploy no GitHub
        git_commit_and_push()
        
        print()
        print("=" * 60)
        print("✨ EXPORTAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 60)
        print()
        print(f"📊 Total: {len(applicants)} candidatos")
        print(f"🌐 URL: https://forbizgetwork.github.io/atrio/")
        
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ ERRO: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        raise
        
    finally:
        # Fechar conexão
        if conn:
            conn.close()
            print("\n🔌 Conexão fechada")


if __name__ == '__main__':
    main()
