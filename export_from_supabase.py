#!/usr/bin/env python3
"""
Script de Exportação Automática - Supabase → GitHub Pages

Fluxo:
1. Conecta no Supabase
2. Busca candidatos da view/tabela
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
from supabase import create_client, Client

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# ========== CONFIGURAÇÕES ==========
# Preencher com as credenciais do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://seu-projeto.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'sua-chave-aqui')

# Configuração da tabela (conforme implementação do Tiago)
SCHEMA_NAME = 'public'
TABLE_NAME = 'audit_log'
DETAILS_COLUMN = 'details'  # Coluna JSONB com os payloads dos candidatos

# Diretório do projeto
PROJECT_DIR = Path(__file__).parent


def connect_supabase() -> Client:
    """Conecta no Supabase"""
    print("🔌 Conectando no Supabase...")
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Conectado com sucesso!")
        return supabase
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        raise


def fetch_applicants(supabase: Client) -> list:
    """
    Busca todos os candidatos do Supabase (tabela audit_log, coluna details)
    
    A coluna 'details' contém o payload completo do candidato em formato JSONB
    """
    print(f"📡 Buscando candidatos de '{SCHEMA_NAME}.{TABLE_NAME}' (coluna '{DETAILS_COLUMN}')...")
    
    try:
        # Buscar todos os registros da coluna details
        # A coluna details já contém o payload completo (igual ao do Kaique)
        response = supabase.table(TABLE_NAME).select(DETAILS_COLUMN).execute()
        
        if not response.data:
            print("⚠️ Nenhum registro encontrado na tabela")
            return []
        
        # Extrair os payloads da coluna details
        applicants = []
        for record in response.data:
            details = record.get(DETAILS_COLUMN)
            
            if not details:
                print("⚠️ Registro sem dados na coluna 'details', pulando...")
                continue
            
            # O details já é o payload completo do candidato
            # Estrutura esperada (igual ao Kaique):
            # {
            #   "body": {...},
            #   "applicant": "Nome",
            #   "vacancy_title": "Título",
            #   "senior_vacancy_id": "uuid",
            #   "recrutei_vacancy_id": "id"
            # }
            
            applicants.append(details)
        
        print(f"✅ {len(applicants)} candidatos encontrados")
        return applicants
        
    except Exception as e:
        print(f"❌ Erro ao buscar dados: {e}")
        raise


def transform_data(raw_data: list) -> list:
    """
    Valida e transforma os dados do Supabase
    
    Como os dados já vêm no formato correto da coluna 'details',
    apenas validamos os campos críticos
    """
    print("🔄 Validando dados...")
    
    valid_applicants = []
    warnings = []
    
    for idx, applicant in enumerate(raw_data):
        # Validar estrutura básica
        if not isinstance(applicant, dict):
            warnings.append(f"Registro {idx}: Não é um objeto JSON válido")
            continue
        
        # Validar campos obrigatórios
        if not applicant.get("applicant"):
            warnings.append(f"Registro {idx}: Campo 'applicant' ausente")
            continue
        
        if not applicant.get("vacancy_title"):
            warnings.append(f"Registro {idx}: Campo 'vacancy_title' ausente")
            continue
        
        # Validar campo CRÍTICO para RBAC
        body = applicant.get("body", {})
        branch_external_id = body.get("branchOffice", {}).get("externalId")
        head_external_id = body.get("headOffice", {}).get("externalId")
        
        if not branch_external_id and not head_external_id:
            warnings.append(
                f"⚠️ Candidato '{applicant.get('applicant')}': "
                f"Sem externalId (branchOffice ou headOffice). "
                f"Este candidato NÃO será visível para ninguém!"
            )
        
        valid_applicants.append(applicant)
    
    # Mostrar avisos
    if warnings:
        print(f"\n⚠️ {len(warnings)} avisos encontrados:")
        for warning in warnings[:10]:  # Mostrar no máximo 10
            print(f"   • {warning}")
        if len(warnings) > 10:
            print(f"   ... e mais {len(warnings) - 10} avisos")
        print()
    
    print(f"✅ {len(valid_applicants)} candidatos válidos")
    return valid_applicants


def save_json(data: list, filepath: Path):
    """Salva dados em arquivo JSON"""
    print(f"💾 Salvando em {filepath}...")
    
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
    print("📤 Fazendo deploy no GitHub...")
    
    try:
        # Add
        subprocess.run(['git', 'add', 'applicants.json', 'applicants-data.js'], 
                      cwd=PROJECT_DIR, check=True)
        
        # Commit
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M')
        commit_msg = f"chore: Atualizar dados dos candidatos ({timestamp})"
        subprocess.run(['git', 'commit', '-m', commit_msg], 
                      cwd=PROJECT_DIR, check=True)
        
        # Push
        subprocess.run(['git', 'push', 'origin', 'main'], 
                      cwd=PROJECT_DIR, check=True)
        
        print("✅ Deploy concluído!")
        print("🌐 Aguarde ~2 minutos para GitHub Pages atualizar")
        
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Erro no Git: {e}")
        print("   (Pode ser que não houve mudanças)")


def main():
    """Função principal"""
    print("=" * 60)
    print("🚀 EXPORTAÇÃO AUTOMÁTICA - SUPABASE → GITHUB PAGES")
    print("=" * 60)
    print()
    
    try:
        # 1. Conectar no Supabase
        supabase = connect_supabase()
        
        # 2. Buscar dados
        raw_data = fetch_applicants(supabase)
        
        if not raw_data:
            print("⚠️ Nenhum dado encontrado. Abortando.")
            return
        
        # 3. Transformar dados
        applicants = transform_data(raw_data)
        
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
        raise


if __name__ == '__main__':
    main()
