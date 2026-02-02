import subprocess
import json
import re
import csv
import os
import sys

# Paths
IMAGES_DIR = r"C:\Users\Admin\Desktop\DataHorses\Datahorse-20260130T145754Z-3-001\Datahorse"
PS_SCRIPT = r"c:\Users\Admin\Desktop\SniperStrategyProject\batch_ocr.ps1"
OUTPUT_CSV = r"c:\Users\Admin\Desktop\SniperStrategyProject\ny_horses_data.csv"

def load_ocr_results():
    json_path = os.path.join(IMAGES_DIR, "ocr_results.json")
    if not os.path.exists(json_path):
        print(f"JSON file {json_path} not found.")
        return []
        
    try:
        with open(json_path, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    except Exception as e:
        print(f"JSON Parse Error: {e}")
        return []

def extract_data(ocr_data):
    rows = []
    
    for file_entry in ocr_data:
        filename = file_entry.get('FileName')
        lines = file_entry.get('Data')
        
        if not lines:
            continue

        # Sanitize coordinate types (fix lists)
        for l in lines:
            if isinstance(l['Top'], list): l['Top'] = l['Top'][0]
            if isinstance(l['Left'], list): l['Left'] = l['Left'][0]

        # Sort lines by Top (Y)
        lines.sort(key=lambda x: x['Top'])

        
        # 1. Extract Date
        date_str = None
        for line in lines:
            # Look for MM/DD/YY patterns
            # Spacing might be weird: "01 / 28 / 25"
            txt = line['Text']
            # Remove spaces for regex
            clean_txt = txt.replace(" ", "")
            m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', clean_txt)
            if m:
                month, day, year = m.groups()
                if len(year) == 2:
                    year = "20" + year
                date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                break
        
        if not date_str:
            # Try to grab from filename if OCR failed? 
            # PHOTO-2025-01-29...
            m = re.search(r'(\d{4})-(\d{2})-(\d{2})', filename)
            if m:
                date_str = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"

        # 2. Find Midday and State Labels Y-coords
        midday_y = None
        state_y = None
        
        for line in lines:
            txt_lower = line['Text'].lower()
            if "midday" in txt_lower:
                midday_y = line['Top']
            if "state" in txt_lower and "ny" not in txt_lower: # Avoid 'state' matching other things if any
                state_y = line['Top']
        
        # 3. Find target line for NY
        # It is strictly below Midday. If State exists, strictly above State.
        # If State not found, just take the one below Midday.
        
        target_line = None
        
        if midday_y:
            candidates = []
            for line in lines:
                # Filter noise labels on left
                if line['Left'] < 150:
                    continue 
                
                # Check Y
                if state_y:
                    if line['Top'] > midday_y + 20 and line['Top'] < state_y - 20:
                        candidates.append(line)
                else:
                    # Heuristic: 20px to 150px below Midday
                    if line['Top'] > midday_y + 20 and line['Top'] < midday_y + 200:
                        candidates.append(line)
            
            # Select best candidate (likely the one containing digits)
            for cand in candidates:
                if re.search(r'\d', cand['Text']):
                    target_line = cand
                    break
        
        if target_line and date_str:
            # Parse numbers
            # "573 - 4" -> 5, 7, 3, 4
            # OR "123" -> 1, 2, 3
            raw_text = target_line['Text']
            
            # CLEANING: Replace 'o' or 'O' with '0' if it looks like a number context
            # Simple approach: Replace commonly confused chars globally in the raw string
            raw_text = raw_text.replace('o', '0').replace('O', '0')
            
            # Extract digits and dashes only
            # Careful with whitespace
            # Normal format: "123" or "123 - 4" or "123-4"
            
            # Remove anything that is not digit or dash
            clean_val = re.sub(r'[^\d-]', '', raw_text)
            
            races = []
            
            if '-' in clean_val:
                parts = clean_val.split('-')
                
                main_chunk = parts[0]
                tail_chunk = "".join(parts[1:]) 
                
                for digit in main_chunk:
                    races.append(digit)
                for digit in tail_chunk:
                    races.append(digit)
            else:
                for digit in clean_val:
                    races.append(digit)
            
            rows.append({
                'Date': date_str,
                'R1': races[0] if len(races) > 0 else '',
                'R2': races[1] if len(races) > 1 else '',
                'R3': races[2] if len(races) > 2 else '',
                'R4': races[3] if len(races) > 3 else '',
                'Raw': raw_text
            })
            
    # Deduplicate by Date - Keep the one with most data if conflict?
    # Simple deduplication: dict by date
    deduped_rows = {}
    for r in rows:
        d = r['Date']
        # If exists, overwrite? Or keep first?
        # Let's keep the one that has more races populated
        if d in deduped_rows:
            existing = deduped_rows[d]
            # Count races
            count_new = sum(1 for k in ['R1','R2','R3','R4'] if r[k])
            count_ex = sum(1 for k in ['R1','R2','R3','R4'] if existing[k])
            if count_new > count_ex:
                 deduped_rows[d] = r
        else:
            deduped_rows[d] = r
            
    return list(deduped_rows.values())

def main():
    data = load_ocr_results()
    if not data:
        print("No output from OCR.")
        return

    print(f"Processed {len(data)} image records.")
    
    extracted = extract_data(data)
    extracted.sort(key=lambda x: x['Date'])
    
    # Save CSV - Excel Friendly format (comma separated is standard CSV)
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        # Excel typically likes BOM for UTF-8 to display correctly if user opens double click
        f.write('\ufeff') 
        writer = csv.DictWriter(f, fieldnames=['Date', 'R1', 'R2', 'R3', 'R4', 'Raw'])
        writer.writeheader()
        writer.writerows(extracted)
        
    print(f"Saved {len(extracted)} unique rows to {OUTPUT_CSV}")

if __name__ == '__main__':
    main()
