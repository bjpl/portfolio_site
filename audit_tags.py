#!/usr/bin/env python3
"""
Audit tags for consistency, completeness, and edge cases.
"""

import re
from collections import Counter, defaultdict

def audit_tags(filepath):
    """Audit all tags in the links file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all links with tags
    link_pattern = r'<a href="([^"]+)"[^>]*data-tags="([^"]*)"[^>]*>([^<]+)</a>'
    links = re.findall(link_pattern, content)
    
    print(f"📊 Total links with tags: {len(links)}\n")
    
    # Analyze tags
    all_tags = []
    tag_frequency = Counter()
    links_without_tags = []
    links_with_empty_tags = []
    special_char_tags = []
    duplicate_tags_in_link = []
    missing_basic_tags = []
    
    for url, tags, text in links:
        if not tags:
            links_with_empty_tags.append((url, text))
            continue
            
        tag_list = tags.split()
        all_tags.extend(tag_list)
        
        # Check for duplicates within single link
        if len(tag_list) != len(set(tag_list)):
            duplicate_tags_in_link.append((url, text, tag_list))
        
        # Check for special characters
        for tag in tag_list:
            if not re.match(r'^[a-z0-9-]+$', tag):
                special_char_tags.append((url, text, tag))
        
        # Check for basic required tags
        has_location = any(tag in ['mexico', 'colombia', 'venezuela', 'usa', 'canada', 'brazil', 'argentina', 'chile', 'peru'] for tag in tag_list)
        has_type = any(tag in ['embassy', 'consulate', 'museum', 'restaurant', 'government', 'cultural', 'education', 'travel'] for tag in tag_list)
        
        if not has_location and not has_type:
            missing_basic_tags.append((url, text, tag_list))
        
        # Count tag frequency
        for tag in tag_list:
            tag_frequency[tag] += 1
    
    # Find links without any tags attribute
    all_links = re.findall(r'<a href="([^"]+)"[^>]*>([^<]+)</a>', content)
    for url, text in all_links:
        if 'data-tags=' not in content[content.find(f'href="{url}"'):content.find('>', content.find(f'href="{url}"'))]:
            links_without_tags.append((url, text))
    
    # Report findings
    print("🔍 AUDIT RESULTS:\n")
    
    if links_without_tags:
        print(f"❌ Links WITHOUT data-tags attribute: {len(links_without_tags)}")
        for url, text in links_without_tags[:5]:
            print(f"   - {text[:50]}: {url}")
        print()
    
    if links_with_empty_tags:
        print(f"⚠️ Links with EMPTY tags: {len(links_with_empty_tags)}")
        for url, text in links_with_empty_tags[:5]:
            print(f"   - {text[:50]}: {url}")
        print()
    
    if special_char_tags:
        print(f"⚠️ Tags with SPECIAL CHARACTERS: {len(special_char_tags)}")
        for url, text, tag in special_char_tags[:5]:
            print(f"   - {text[:30]}: '{tag}'")
        print()
    
    if duplicate_tags_in_link:
        print(f"⚠️ Links with DUPLICATE tags: {len(duplicate_tags_in_link)}")
        for url, text, tags in duplicate_tags_in_link[:3]:
            dupes = [tag for tag in tags if tags.count(tag) > 1]
            print(f"   - {text[:30]}: {set(dupes)}")
        print()
    
    if missing_basic_tags:
        print(f"⚠️ Links MISSING basic location/type tags: {len(missing_basic_tags)}")
        for url, text, tags in missing_basic_tags[:5]:
            print(f"   - {text[:50]}")
            print(f"     Current tags: {' '.join(tags[:5])}")
        print()
    
    # Most common tags
    print("📈 TOP 20 MOST COMMON TAGS:")
    for tag, count in tag_frequency.most_common(20):
        print(f"   {tag}: {count}")
    print()
    
    # Least common tags (potential typos)
    print("📉 RARE TAGS (potential typos or outliers):")
    rare_tags = [tag for tag, count in tag_frequency.items() if count == 1][:20]
    for tag in rare_tags:
        print(f"   {tag}")
    print()
    
    # Tag statistics
    print("📊 TAG STATISTICS:")
    print(f"   Total unique tags: {len(set(all_tags))}")
    print(f"   Average tags per link: {len(all_tags) / len(links):.1f}")
    print(f"   Most tags on single link: {max(len(tags.split()) for _, tags, _ in links if tags)}")
    print(f"   Least tags on single link: {min(len(tags.split()) for _, tags, _ in links if tags)}")
    
    return links_without_tags, links_with_empty_tags, special_char_tags

def fix_edge_cases(filepath):
    """Fix identified edge cases in tags."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix common issues
    fixes_made = 0
    
    # Remove duplicate tags within each link
    def remove_duplicates(match):
        nonlocal fixes_made
        full_match = match.group(0)
        tags = match.group(1)
        tag_list = tags.split()
        unique_tags = []
        seen = set()
        for tag in tag_list:
            if tag not in seen:
                unique_tags.append(tag)
                seen.add(tag)
        if len(unique_tags) < len(tag_list):
            fixes_made += 1
            return full_match.replace(f'data-tags="{tags}"', f'data-tags="{" ".join(unique_tags)}"')
        return full_match
    
    content = re.sub(r'<a[^>]*data-tags="([^"]+)"[^>]*>[^<]+</a>', remove_duplicates, content)
    
    print(f"\n✅ Fixed {fixes_made} issues with duplicate tags")
    
    # Save fixed content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return fixes_made

if __name__ == "__main__":
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    
    print("🔍 AUDITING TAGS FOR EDGE CASES AND ISSUES...\n")
    links_without_tags, empty_tags, special_chars = audit_tags(filepath)
    
    if input("\n❓ Fix duplicate tags? (y/n): ").lower() == 'y':
        fixes = fix_edge_cases(filepath)
        print(f"✅ Completed {fixes} fixes")