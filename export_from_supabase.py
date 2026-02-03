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
from supabase import create_client, Client

# ========== CONFIGURAÇÕES ==========
# TODO: Preencher com as credenciais do Supabase
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://seu-projeto.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', 'sua-chave-aqui')

# Nome da tabela/view no Supabase (ajustar conforme ETL do Tiago)
TABLE_NAME = 'vw_applicants'  # ou o nome que o Tiago usar

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
    Busca todos os candidatos do Supabase
    
    IMPORTANTE: Ajustar a query conforme a estrutura do ETL do Tiago
    """
    print(f"📡 Buscando candidatos da tabela '{TABLE_NAME}'...")
    
    try:
        # Buscar todos os registros
        # TODO: Ajustar os campos conforme a estrutura real
        response = supabase.table(TABLE_NAME).select("*").execute()
        
        data = response.data
        print(f"✅ {len(data)} candidatos encontrados")
        
        return data
        
    except Exception as e:
        print(f"❌ Erro ao buscar dados: {e}")
        raise


def transform_data(raw_data: list) -> list:
    """
    Transforma os dados do Supabase para o formato esperado pelo visualizador
    
    IMPORTANTE: Ajustar conforme a estrutura que o ETL do Tiago salva
    """
    print("🔄 Transformando dados...")
    
    transformed = []
    
    for record in raw_data:
        # TODO: Ajustar mapeamento conforme estrutura real do Supabase
        # Este é um exemplo baseado na estrutura atual do applicants.json
        
        applicant = {
            "body": record.get("body", {}),  # Se o Tiago salvar como JSONB
            "applicant": record.get("applicant_name"),
            "vacancy_title": record.get("vacancy_title"),
            "senior_vacancy_id": record.get("senior_vacancy_id"),
            "recrutei_vacancy_id": record.get("recrutei_vacancy_id")
        }
        
        # Validar que tem os campos essenciais para RBAC
        if not applicant["body"].get("branchOffice", {}).get("externalId"):
            print(f"⚠️ Candidato sem externalId: {applicant['applicant']}")
        
        transformed.append(applicant)
    
    print(f"✅ {len(transformed)} candidatos transformados")
    return transformed


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
