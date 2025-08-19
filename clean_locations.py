#!/usr/bin/env python3
"""
Remove location text from Instagram links to create cleaner cards.
Keeps only the organization name with the flag emoji.
"""

import re

def clean_link_text(link_html):
    """Remove city/location text from links."""
    # Pattern to match links with location text after bullet
    pattern = r'(<a[^>]+>)([^•]+)(•[^<]+)?(<\/a>)'
    
    def replace_link(match):
        opening_tag = match.group(1)
        main_text = match.group(2).strip()
        location_text = match.group(3) or ''
        closing_tag = match.group(4)
        
        # Remove the location part (everything after •)
        # Keep only the flag emoji and organization name
        return f'{opening_tag}{main_text}{closing_tag}'
    
    return re.sub(pattern, replace_link, link_html)

def process_file(filepath):
    """Process the links file and remove location text."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Process all links
    cleaned_content = clean_link_text(content)
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(cleaned_content)
    
    print(f"✅ Cleaned location text from links in {filepath}")
    
    # Count links
    all_links = re.findall(r'<a href="[^"]+" target="_blank"[^>]*>[^<]+</a>', cleaned_content)
    print(f"📊 Total links processed: {len(all_links)}")

if __name__ == "__main__":
    process_file(r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md")