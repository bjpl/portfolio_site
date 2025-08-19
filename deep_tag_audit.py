#!/usr/bin/env python3
"""
Deep audit of tag accuracy - check for missing, incorrect, and inconsistent tags.
"""

import re
from collections import defaultdict, Counter

def deep_tag_audit(filepath):
    """Perform comprehensive tag audit."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all links
    link_pattern = r'<a href="([^"]+)"[^>]*data-tags="([^"]*)"[^>]*>([^<]+)</a>'
    links = re.findall(link_pattern, content)
    
    print(f"🔍 DEEP TAG AUDIT - Analyzing {len(links)} links\n")
    
    issues = defaultdict(list)
    tag_stats = Counter()
    
    for url, tags, text in links:
        tag_list = tags.split() if tags else []
        text_lower = text.lower()
        
        # Count all tags
        for tag in tag_list:
            tag_stats[tag] += 1
        
        # 1. Check for missing geographic identifiers
        if '🇨🇴' in text:
            if 'colombia' not in tag_list:
                issues['missing_country'].append((text, 'colombia'))
            if 'south-america' not in tag_list:
                issues['missing_region'].append((text, 'south-america'))
            if 'latin-america' not in tag_list:
                issues['missing_region'].append((text, 'latin-america'))
        
        if '🇲🇽' in text:
            if 'mexico' not in tag_list:
                issues['missing_country'].append((text, 'mexico'))
            if 'north-america' not in tag_list:
                issues['missing_region'].append((text, 'north-america'))
            if 'latin-america' not in tag_list:
                issues['missing_region'].append((text, 'latin-america'))
        
        if '🇻🇪' in text:
            if 'venezuela' not in tag_list:
                issues['missing_country'].append((text, 'venezuela'))
            if 'south-america' not in tag_list:
                issues['missing_region'].append((text, 'south-america'))
        
        if '🇺🇸' in text:
            if 'usa' not in tag_list and 'united-states' not in tag_list:
                issues['missing_country'].append((text, 'usa'))
            if 'north-america' not in tag_list:
                issues['missing_region'].append((text, 'north-america'))
        
        if '🇧🇷' in text:
            if 'brazil' not in tag_list:
                issues['missing_country'].append((text, 'brazil'))
            if 'south-america' not in tag_list:
                issues['missing_region'].append((text, 'south-america'))
        
        if '🇪🇺' in text:
            if 'eu' not in tag_list and 'european-union' not in tag_list:
                issues['missing_region'].append((text, 'eu'))
            if 'europe' not in tag_list:
                issues['missing_region'].append((text, 'europe'))
        
        # 2. Check for proper embassy/consulate tagging
        if 'embassy' in text_lower or 'embajada' in text_lower:
            required = ['embassy', 'diplomatic', 'foreign-affairs', 'international-relations']
            for req in required:
                if req not in tag_list:
                    issues['missing_diplomatic'].append((text, req))
        
        if 'consulate' in text_lower or 'consulado' in text_lower:
            required = ['consulate', 'diplomatic', 'consular-services', 'international']
            for req in required:
                if req not in tag_list:
                    issues['missing_consular'].append((text, req))
        
        # 3. Check cultural organizations
        if any(word in text_lower for word in ['museum', 'museo', 'gallery', 'galeria']):
            required = ['museum', 'culture', 'art', 'heritage', 'education']
            for req in required[:3]:  # At least first 3
                if req not in tag_list:
                    issues['missing_cultural'].append((text, req))
        
        if any(word in text_lower for word in ['theater', 'theatre', 'teatro']):
            required = ['theater', 'culture', 'performing-arts', 'entertainment']
            for req in required[:3]:
                if req not in tag_list:
                    issues['missing_cultural'].append((text, req))
        
        # 4. Check government organizations
        if any(word in text_lower for word in ['ministry', 'ministerio', 'alcaldia', 'gobernacion']):
            required = ['government', 'public-sector', 'administration']
            for req in required[:2]:
                if req not in tag_list:
                    issues['missing_government'].append((text, req))
        
        # 5. Check educational institutions
        if any(word in text_lower for word in ['university', 'universidad', 'college', 'institute']):
            required = ['education', 'university', 'academic', 'higher-education']
            for req in required[:2]:
                if req not in tag_list:
                    issues['missing_education'].append((text, req))
        
        # 6. Check food/restaurant tags
        if any(word in text_lower for word in ['restaurant', 'food', 'cocina', 'cafe', 'coffee']):
            required = ['food', 'restaurant', 'dining', 'gastronomy']
            for req in required[:2]:
                if req not in tag_list:
                    issues['missing_food'].append((text, req))
        
        # 7. Check for language tags
        spanish_countries = ['mexico', 'colombia', 'venezuela', 'spain', 'argentina', 'chile', 'peru']
        if any(country in tag_list for country in spanish_countries):
            if 'spanish-speaking' not in tag_list:
                issues['missing_language'].append((text, 'spanish-speaking'))
        
        if 'brazil' in tag_list and 'portuguese-speaking' not in tag_list:
            issues['missing_language'].append((text, 'portuguese-speaking'))
        
        if any(country in tag_list for country in ['usa', 'uk', 'canada', 'australia']):
            if 'english-speaking' not in tag_list:
                issues['missing_language'].append((text, 'english-speaking'))
    
    return issues, tag_stats

def fix_missing_tags(filepath, issues):
    """Apply fixes for missing tags."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    fixes_applied = defaultdict(int)
    
    # Group fixes by link
    link_fixes = defaultdict(set)
    
    for issue_type, items in issues.items():
        for text, tag in items:
            link_fixes[text].add(tag)
    
    # Apply fixes
    for text, tags_to_add in link_fixes.items():
        # Find the link
        pattern = f'>({re.escape(text)})</a>'
        matches = list(re.finditer(pattern, content))
        
        for match in matches:
            # Find the full link tag
            start = content.rfind('<a ', 0, match.start())
            end = match.end()
            full_link = content[start:end]
            
            # Extract current tags
            tags_match = re.search(r'data-tags="([^"]*)"', full_link)
            if tags_match:
                current_tags = set(tags_match.group(1).split())
                
                # Add new tags
                updated_tags = current_tags | tags_to_add
                new_tags_str = ' '.join(sorted(updated_tags))
                
                # Replace tags
                new_link = re.sub(r'data-tags="[^"]*"', f'data-tags="{new_tags_str}"', full_link)
                
                if new_link != full_link:
                    content = content.replace(full_link, new_link)
                    for tag in tags_to_add:
                        fixes_applied[tag] += 1
    
    # Save updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return fixes_applied

def main():
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    
    # Run deep audit
    issues, tag_stats = deep_tag_audit(filepath)
    
    # Report findings
    total_issues = sum(len(items) for items in issues.values())
    print(f"📊 Found {total_issues} potential tag issues\n")
    
    if issues:
        for issue_type, items in sorted(issues.items()):
            print(f"\n{issue_type.replace('_', ' ').upper()} ({len(items)} issues):")
            # Show first 3 examples
            for text, tag in items[:3]:
                print(f"  • {text[:40]:40} needs '{tag}'")
            if len(items) > 3:
                print(f"  ... and {len(items) - 3} more")
        
        print(f"\n📈 TAG FREQUENCY (Top 10):")
        for tag, count in tag_stats.most_common(10):
            print(f"  {tag:25} : {count} uses")
        
        print(f"\n📉 RARE TAGS (Used only once):")
        rare = [tag for tag, count in tag_stats.items() if count == 1]
        for tag in rare[:10]:
            print(f"  • {tag}")
        if len(rare) > 10:
            print(f"  ... and {len(rare) - 10} more")
        
        # Apply fixes
        if input("\n❓ Apply fixes for missing tags? (y/n): ").lower() == 'y':
            fixes = fix_missing_tags(filepath, issues)
            
            print(f"\n✅ Applied {sum(fixes.values())} tag additions:")
            for tag, count in sorted(fixes.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  • Added '{tag}' to {count} links")
    else:
        print("✅ All tags appear complete and accurate!")
    
    # Final stats
    print(f"\n📊 FINAL STATISTICS:")
    print(f"  Total unique tags: {len(tag_stats)}")
    print(f"  Most common tag: {tag_stats.most_common(1)[0][0]} ({tag_stats.most_common(1)[0][1]} uses)")
    print(f"  Average tags per link: {sum(tag_stats.values()) / len(links):.1f}")

if __name__ == "__main__":
    main()