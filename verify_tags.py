#!/usr/bin/env python3
"""
Verify and correct tag accuracy for all links.
"""

import re
from collections import defaultdict

def verify_tags(filepath):
    """Verify tag accuracy and suggest corrections."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    corrections_needed = []
    
    # Extract all links
    link_pattern = r'<a href="([^"]+)"[^>]*data-tags="([^"]*)"[^>]*>([^<]+)</a>'
    links = re.findall(link_pattern, content)
    
    print(f"📊 Checking {len(links)} links for tag accuracy...\n")
    
    for url, tags, text in links:
        tag_list = tags.split()
        text_lower = text.lower()
        url_lower = url.lower()
        
        # Verify embassy tags
        if any(word in text_lower for word in ['embassy', 'embajada', 'ambassade']):
            if 'embassy' not in tag_list:
                corrections_needed.append((url, text, 'add', 'embassy'))
            if 'diplomatic' not in tag_list:
                corrections_needed.append((url, text, 'add', 'diplomatic'))
        
        # Verify consulate tags
        if any(word in text_lower for word in ['consulate', 'consulado', 'consulat']):
            if 'consulate' not in tag_list:
                corrections_needed.append((url, text, 'add', 'consulate'))
            if 'consular-services' not in tag_list:
                corrections_needed.append((url, text, 'add', 'consular-services'))
        
        # Verify museum tags
        if any(word in text_lower for word in ['museum', 'museo']):
            if 'museum' not in tag_list:
                corrections_needed.append((url, text, 'add', 'museum'))
            if 'culture' not in tag_list:
                corrections_needed.append((url, text, 'add', 'culture'))
        
        # Verify cultural center tags
        if 'cultural' in text_lower or 'cultura' in text_lower:
            if 'cultural' not in tag_list and 'culture' not in tag_list:
                corrections_needed.append((url, text, 'add', 'cultural'))
        
        # Verify government tags
        if any(word in text_lower for word in ['ministry', 'ministerio', 'government', 'gobierno']):
            if 'government' not in tag_list:
                corrections_needed.append((url, text, 'add', 'government'))
        
        # Verify location tags based on text
        if '🇨🇴' in text and 'colombia' not in tag_list:
            corrections_needed.append((url, text, 'add', 'colombia'))
        if '🇲🇽' in text and 'mexico' not in tag_list:
            corrections_needed.append((url, text, 'add', 'mexico'))
        if '🇻🇪' in text and 'venezuela' not in tag_list:
            corrections_needed.append((url, text, 'add', 'venezuela'))
        if '🇺🇸' in text and 'usa' not in tag_list:
            corrections_needed.append((url, text, 'add', 'usa'))
        if '🇧🇷' in text and 'brazil' not in tag_list:
            corrections_needed.append((url, text, 'add', 'brazil'))
        
        # Check for Instagram username in tags
        username = url.replace('https://instagram.com/', '').replace('/', '').lower()
        if username not in tag_list and len(username) < 30:
            corrections_needed.append((url, text, 'add', username))
    
    return corrections_needed

def apply_corrections(filepath, corrections):
    """Apply tag corrections to the file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixes_applied = defaultdict(int)
    
    for url, text, action, tag in corrections:
        # Find the link
        pattern = f'<a href="{re.escape(url)}"[^>]*data-tags="([^"]*)"[^>]*>{re.escape(text)}</a>'
        match = re.search(pattern, content)
        
        if match:
            existing_tags = match.group(1)
            tag_list = existing_tags.split() if existing_tags else []
            
            if action == 'add' and tag not in tag_list:
                tag_list.append(tag)
                new_tags = ' '.join(sorted(set(tag_list)))
                
                old_link = match.group(0)
                new_link = old_link.replace(f'data-tags="{existing_tags}"', f'data-tags="{new_tags}"')
                
                content = content.replace(old_link, new_link)
                fixes_applied[tag] += 1
    
    # Save corrected content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return fixes_applied

def main():
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    
    print("🔍 VERIFYING TAG ACCURACY...\n")
    
    # Find corrections needed
    corrections = verify_tags(filepath)
    
    if corrections:
        print(f"❗ Found {len(corrections)} tag corrections needed\n")
        
        # Group by type
        by_tag = defaultdict(list)
        for url, text, action, tag in corrections:
            by_tag[tag].append(text[:40])
        
        # Show summary
        for tag, items in sorted(by_tag.items())[:10]:
            print(f"Tag '{tag}' missing from {len(items)} links:")
            for item in items[:3]:
                print(f"  - {item}")
            if len(items) > 3:
                print(f"  ... and {len(items) - 3} more")
            print()
        
        # Apply corrections
        if input("Apply corrections? (y/n): ").lower() == 'y':
            fixes = apply_corrections(filepath, corrections)
            print(f"\n✅ Applied corrections:")
            for tag, count in sorted(fixes.items(), key=lambda x: x[1], reverse=True):
                print(f"  - Added '{tag}' to {count} links")
    else:
        print("✅ All tags appear to be accurate!")

if __name__ == "__main__":
    main()