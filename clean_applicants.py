#!/usr/bin/env python3
"""
Script para limpar e otimizar applicants.json
Remove campos desnecessários para reduzir tamanho
"""

import json
from pathlib import Path

PROJECT_DIR = Path(__file__).parent
input_file = PROJECT_DIR / 'applicants.json'
output_file = PROJECT_DIR / 'applicants_clean.json'

# Carregar dados
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"📊 Candidatos originais: {len(data)}")
print(f"📦 Tamanho original: {len(json.dumps(data))/1024/1024:.2f} MB")

# Limpar dados - manter apenas campos essenciais
cleaned = []

for applicant in data:
    # Campos essenciais para o visualizador
    clean_item = {
        "applicant": applicant.get("applicant"),
        "vacancy_title": applicant.get("vacancy_title"),
        "senior_vacancy_id": applicant.get("senior_vacancy_id"),
        "recrutei_vacancy_id": applicant.get("recrutei_vacancy_id"),
        "body": {}
    }
    
    # Extrair apenas branchOffice e headOffice (essenciais para RBAC)
    body = applicant.get("body", {})
    
    if "branchOffice" in body:
        clean_item["body"]["branchOffice"] = body["branchOffice"]
    
    if "headOffice" in body:
        clean_item["body"]["headOffice"] = body["headOffice"]
    
    # Adicionar dados básicos do talento (nome, email, cidade)
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
    
    cleaned.append(clean_item)

# Salvar versão limpa
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(cleaned, f, ensure_ascii=False, indent=2)

cleaned_size = len(json.dumps(cleaned))/1024/1024
print(f"\n✅ Candidatos limpos: {len(cleaned)}")
print(f"📦 Tamanho limpo: {cleaned_size:.2f} MB")
print(f"📉 Redução: {((1 - cleaned_size/(len(json.dumps(data))/1024/1024))*100):.1f}%")
print(f"\n✅ Salvo em: {output_file}")
