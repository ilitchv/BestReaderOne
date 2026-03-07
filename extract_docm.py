import zipfile
import xml.etree.ElementTree as ET
import json
import os

def get_docx_text(path):
    with zipfile.ZipFile(path) as docx:
        tree = ET.XML(docx.read('word/document.xml'))
    WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    PARA = WORD_NAMESPACE + 'p'
    TEXT = WORD_NAMESPACE + 't'
    
    paragraphs = []
    for paragraph in tree.iter(PARA):
        texts = [node.text
                 for node in paragraph.iter(TEXT)
                 if node.text]
        if texts:
            paragraphs.append("".join(texts))
    return '\n'.join(paragraphs)

try:
    text = get_docx_text(r"C:\Users\Admin\Desktop\Manual Summary Beast Read.docm")
    out_path = r"C:\Users\Admin\Desktop\SniperStrategyProject\public\sniper\manual_heuristic.txt"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS")
except Exception as e:
    print(f"FAILED: {e}")
