#!/usr/bin/env python3
import re

def sort_link_section(content):
    """Sort links within each link-grid div alphabetically"""
    
    # Pattern to find link-grid sections
    grid_pattern = r'<div class="link-grid">(.*?)</div>'
    
    def sort_links(match):
        grid_content = match.group(1)
        # Extract individual links
        link_pattern = r'(\s*<a href="[^"]*"[^>]*>.*?</a>)'
        links = re.findall(link_pattern, grid_content, re.DOTALL)
        
        # Sort links alphabetically by the visible text
        def get_sort_key(link):
            # Extract text after the flag emoji
            text_match = re.search(r'>([^<]+)<', link)
            if text_match:
                text = text_match.group(1)
                # Remove emojis and clean the text for sorting
                text = re.sub(r'[\U0001F1E0-\U0001F1FF\U0001F300-\U0001F9FF]+', '', text)
                text = text.strip()
                return text.lower()
            return ''
        
        sorted_links = sorted(links, key=get_sort_key)
        
        return '<div class="link-grid">' + '\n'.join(sorted_links) + '\n</div>'
    
    # Replace each link-grid with sorted version
    sorted_content = re.sub(grid_pattern, sort_links, content, flags=re.DOTALL)
    
    return sorted_content

# Read the file
with open('content/me/links/_index.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Sort the links
sorted_content = sort_link_section(content)

# Write back
with open('content/me/links/_index.md', 'w', encoding='utf-8') as f:
    f.write(sorted_content)

print("Links sorted alphabetically within each category!")