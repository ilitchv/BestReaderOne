import zipfile
import re
import os

docx_path = r'C:\Users\Admin\Desktop\Manual Operativo – Estrategia Venezuela2.docx'

if not os.path.exists(docx_path):
    print(f"Error: File not found at {docx_path}")
    # Try finding it with os.listdir to be sure about the name (handling potential char encoding issues with the dash)
    desktop = r'C:\Users\Admin\Desktop'
    for f in os.listdir(desktop):
        if "Manual Operativo" in f and "Venezuela2" in f:
            print(f"Found candidate: {f}")
            docx_path = os.path.join(desktop, f)
            break

try:
    with zipfile.ZipFile(docx_path) as docx:
        xml_content = docx.read('word/document.xml').decode('utf-8')
        # Simple regex to strip tags, specifically looking for <w:t> content
        # However, just finding <w:t> is better.
        # <w:t>text</w:t>
        text_parts = re.findall(r'<w:t[^>]*>(.*?)</w:t>', xml_content)
        full_text = ' '.join(text_parts)
        with open('docx_content.txt', 'w', encoding='utf-8') as f:
            f.write(full_text)
        print("Successfully wrote content to docx_content.txt")
except Exception as e:
    print(f"Error reading docx: {e}")
