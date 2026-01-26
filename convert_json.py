#!/usr/bin/env python3
"""
Script para converter applicants.json em applicants-data.js
Execute este script sempre que atualizar o arquivo applicants.json
"""

import json
import os
from pathlib import Path

def convert_json_to_js():
    # Caminhos dos arquivos
    script_dir = Path(__file__).parent
    json_file = script_dir / 'applicants.json'
    js_file = script_dir / 'applicants-data.js'
    
    # Verificar se o arquivo JSON existe
    if not json_file.exists():
        print(f"❌ Erro: Arquivo {json_file} não encontrado!")
        return False
    
    try:
        # Ler o arquivo JSON
        print(f"📖 Lendo {json_file}...")
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Verificar se é um array
        if not isinstance(data, list):
            print("❌ Erro: O arquivo JSON deve conter um array!")
            return False
        
        # Converter para JSON minificado (sem espaços desnecessários)
        json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        
        # Criar o conteúdo do arquivo JS
        js_content = f'const APPLICANTS_DATA = {json_str};'
        
        # Escrever o arquivo JS
        print(f"💾 Gerando {js_file}...")
        with open(js_file, 'w', encoding='utf-8') as f:
            f.write(js_content)
        
        # Estatísticas
        file_size_kb = os.path.getsize(js_file) / 1024
        print(f"✅ Conversão concluída!")
        print(f"   📊 {len(data)} candidatos processados")
        print(f"   📦 Tamanho do arquivo: {file_size_kb:.2f} KB")
        print(f"   🎯 Arquivo gerado: {js_file}")
        
        return True
        
    except json.JSONDecodeError as e:
        print(f"❌ Erro ao analisar JSON: {e}")
        return False
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
        return False

if __name__ == '__main__':
    print("🔄 Convertendo applicants.json para applicants-data.js...")
    print("")
    success = convert_json_to_js()
    print("")
    if success:
        print("✨ Pronto! Agora você pode abrir index.html no navegador.")
    else:
        print("⚠️  A conversão falhou. Verifique os erros acima.")
    exit(0 if success else 1)
