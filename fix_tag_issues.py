#!/usr/bin/env python3
"""
Fix identified tag issues:
1. Replace underscores with hyphens in tags
2. Add missing location/type tags
3. Normalize Instagram usernames
"""

import re

def fix_tag_issues(filepath):
    """Fix various tag issues."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixes_made = 0
    
    # Fix underscores in tags (should be hyphens)
    def fix_underscores(match):
        nonlocal fixes_made
        full_match = match.group(0)
        tags = match.group(1)
        if '_' in tags:
            fixes_made += 1
            fixed_tags = tags.replace('_', '-')
            return full_match.replace(f'data-tags="{tags}"', f'data-tags="{fixed_tags}"')
        return full_match
    
    content = re.sub(r'data-tags="([^"]*)"', fix_underscores, content)
    print(f"✅ Fixed {fixes_made} tags with underscores")
    
    # Add missing organization type tags based on text content
    def add_missing_types(match):
        nonlocal fixes_made
        full_match = match.group(0)
        url = match.group(1)
        tags = match.group(2) or ""
        text = match.group(3)
        
        tag_list = tags.split() if tags else []
        original_count = len(tag_list)
        
        # Check if basic type tags are missing
        has_type = any(t in tag_list for t in ['embassy', 'consulate', 'museum', 'restaurant', 'government', 'cultural', 'education', 'travel', 'food', 'media'])
        
        if not has_type:
            # Infer type from text
            text_lower = text.lower()
            if 'embassy' in text_lower or 'embajada' in text_lower:
                tag_list.append('embassy')
            elif 'consulate' in text_lower or 'consulado' in text_lower:
                tag_list.append('consulate')
            elif 'museum' in text_lower or 'museo' in text_lower:
                tag_list.append('museum')
            elif 'theater' in text_lower or 'teatro' in text_lower:
                tag_list.append('theater')
            elif 'restaurant' in text_lower or 'food' in text_lower or 'cocina' in text_lower:
                tag_list.append('food')
            elif 'cultural' in text_lower or 'cultura' in text_lower:
                tag_list.append('cultural')
            elif 'university' in text_lower or 'universidad' in text_lower:
                tag_list.append('education')
            elif 'travel' in text_lower or 'tourism' in text_lower:
                tag_list.append('travel')
            elif 'news' in text_lower or 'media' in text_lower:
                tag_list.append('media')
            elif 'ministry' in text_lower or 'ministerio' in text_lower:
                tag_list.append('government')
            
            # Add diplomatic tag for embassy/consulate
            if any(t in tag_list for t in ['embassy', 'consulate']):
                if 'diplomatic' not in tag_list:
                    tag_list.append('diplomatic')
                if 'foreign-affairs' not in tag_list:
                    tag_list.append('foreign-affairs')
                if 'international-relations' not in tag_list:
                    tag_list.append('international-relations')
        
        if len(tag_list) > original_count:
            fixes_made += 1
            new_tags = ' '.join(sorted(set(tag_list)))
            return f'<a href="{url}" target="_blank" data-tags="{new_tags}">{text}</a>'
        
        return full_match
    
    old_fixes = fixes_made
    content = re.sub(r'<a href="([^"]+)"[^>]*(?:data-tags="([^"]*)")?[^>]*>([^<]+)</a>', add_missing_types, content)
    print(f"✅ Added {fixes_made - old_fixes} missing type tags")
    
    # Fix edge case: links with no tags at all
    def add_tags_to_untagged(match):
        nonlocal fixes_made
        full_match = match.group(0)
        
        # Check if this link has data-tags
        if 'data-tags=' not in full_match:
            url = match.group(1)
            text = match.group(2)
            
            # Extract Instagram username
            username = url.replace('https://instagram.com/', '').replace('/', '').lower()
            
            # Basic tags
            tags = [username]
            
            # Infer from text
            if 'Embassy' in text or 'Embajada' in text:
                tags.extend(['embassy', 'diplomatic', 'foreign-affairs'])
            elif 'Consulate' in text or 'Consulado' in text:
                tags.extend(['consulate', 'diplomatic', 'consular-services'])
            
            fixes_made += 1
            return f'<a href="{url}" target="_blank" data-tags="{" ".join(tags)}">{text}</a>'
        
        return full_match
    
    old_fixes = fixes_made
    content = re.sub(r'<a href="([^"]+)" target="_blank">([^<]+)</a>', add_tags_to_untagged, content)
    print(f"✅ Added tags to {fixes_made - old_fixes} untagged links")
    
    # Save fixed content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return fixes_made

if __name__ == "__main__":
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    print("🔧 FIXING TAG ISSUES...\n")
    total_fixes = fix_tag_issues(filepath)
    print(f"\n✅ Total fixes applied: {total_fixes}")