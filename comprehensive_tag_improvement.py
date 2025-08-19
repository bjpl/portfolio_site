#!/usr/bin/env python3
"""
Comprehensive tag improvement - add missing tags for better searchability.
"""

import re
from collections import defaultdict, Counter

def comprehensive_tag_improvement(filepath):
    """Add comprehensive tags to all links."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract all links
    link_pattern = r'<a href="([^"]+)"[^>]*data-tags="([^"]*)"[^>]*>([^<]+)</a>'
    
    fixes_applied = 0
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        match = re.search(link_pattern, line)
        if match:
            url, tags, text = match.groups()
            tag_list = set(tags.split()) if tags else set()
            text_lower = text.lower()
            url_lower = url.lower()
            original_size = len(tag_list)
            
            # Add Instagram username tag
            if 'instagram.com/' in url:
                username = url.split('instagram.com/')[-1].strip('/').lower()
                if username and len(username) < 30:
                    tag_list.add(username)
            
            # Country/Region tags based on flags
            flag_mappings = {
                '🇨🇴': ['colombia', 'south-america', 'latin-america', 'andean', 'spanish-speaking'],
                '🇲🇽': ['mexico', 'north-america', 'latin-america', 'spanish-speaking', 'nafta'],
                '🇻🇪': ['venezuela', 'south-america', 'latin-america', 'spanish-speaking', 'caribbean'],
                '🇺🇸': ['usa', 'united-states', 'north-america', 'english-speaking'],
                '🇧🇷': ['brazil', 'south-america', 'latin-america', 'portuguese-speaking'],
                '🇦🇷': ['argentina', 'south-america', 'latin-america', 'spanish-speaking', 'southern-cone'],
                '🇨🇱': ['chile', 'south-america', 'latin-america', 'spanish-speaking', 'southern-cone', 'pacific'],
                '🇵🇪': ['peru', 'south-america', 'latin-america', 'spanish-speaking', 'andean', 'pacific'],
                '🇪🇨': ['ecuador', 'south-america', 'latin-america', 'spanish-speaking', 'andean'],
                '🇧🇴': ['bolivia', 'south-america', 'latin-america', 'spanish-speaking', 'andean', 'landlocked'],
                '🇵🇾': ['paraguay', 'south-america', 'latin-america', 'spanish-speaking', 'landlocked'],
                '🇺🇾': ['uruguay', 'south-america', 'latin-america', 'spanish-speaking', 'southern-cone'],
                '🇩🇴': ['dominican-republic', 'caribbean', 'latin-america', 'spanish-speaking', 'island'],
                '🇨🇺': ['cuba', 'caribbean', 'latin-america', 'spanish-speaking', 'island'],
                '🇵🇦': ['panama', 'central-america', 'latin-america', 'spanish-speaking'],
                '🇬🇹': ['guatemala', 'central-america', 'latin-america', 'spanish-speaking'],
                '🇸🇻': ['el-salvador', 'central-america', 'latin-america', 'spanish-speaking'],
                '🇪🇸': ['spain', 'europe', 'eu', 'spanish-speaking', 'iberian', 'mediterranean'],
                '🇫🇷': ['france', 'europe', 'eu', 'french-speaking', 'western-europe'],
                '🇩🇪': ['germany', 'europe', 'eu', 'german-speaking', 'central-europe'],
                '🇮🇹': ['italy', 'europe', 'eu', 'italian-speaking', 'mediterranean'],
                '🇬🇧': ['uk', 'united-kingdom', 'europe', 'english-speaking', 'british'],
                '🇨🇦': ['canada', 'north-america', 'english-speaking', 'french-speaking', 'commonwealth'],
                '🇯🇵': ['japan', 'asia', 'east-asia', 'japanese-speaking', 'pacific'],
                '🇰🇷': ['korea', 'south-korea', 'asia', 'east-asia', 'korean-speaking'],
                '🇨🇳': ['china', 'asia', 'east-asia', 'chinese-speaking'],
                '🇮🇳': ['india', 'asia', 'south-asia', 'english-speaking', 'commonwealth'],
                '🇦🇺': ['australia', 'oceania', 'english-speaking', 'commonwealth', 'pacific'],
                '🇪🇺': ['eu', 'european-union', 'europe'],
                '🇺🇳': ['un', 'united-nations', 'international', 'multilateral'],
            }
            
            for flag, flag_tags in flag_mappings.items():
                if flag in text:
                    tag_list.update(flag_tags)
            
            # City tags
            city_mappings = {
                'bogotá': ['bogota', 'capital-city', 'distrito-capital'],
                'bogota': ['bogota', 'capital-city', 'distrito-capital'],
                'medellín': ['medellin', 'antioquia', 'city-of-eternal-spring'],
                'medellin': ['medellin', 'antioquia', 'city-of-eternal-spring'],
                'cali': ['cali', 'valle-del-cauca', 'salsa-capital', 'pacific'],
                'barranquilla': ['barranquilla', 'atlantico', 'caribbean-coast', 'golden-gate'],
                'cartagena': ['cartagena', 'bolivar', 'caribbean-coast', 'unesco-heritage', 'heroic-city'],
                'bucaramanga': ['bucaramanga', 'santander', 'city-of-parks'],
                'popayán': ['popayan', 'cauca', 'white-city'],
                'popayan': ['popayan', 'cauca', 'white-city'],
                'caracas': ['caracas', 'capital-city', 'venezuela'],
                'mexico city': ['mexico-city', 'cdmx', 'capital-city', 'megalopolis'],
                'washington': ['washington-dc', 'capital-city', 'district-columbia'],
                'madrid': ['madrid', 'capital-city', 'spain'],
                'paris': ['paris', 'capital-city', 'city-of-light', 'france'],
                'rome': ['rome', 'capital-city', 'eternal-city', 'italy'],
                'london': ['london', 'capital-city', 'uk'],
                'tokyo': ['tokyo', 'capital-city', 'japan'],
                'seoul': ['seoul', 'capital-city', 'south-korea'],
            }
            
            for city, city_tags in city_mappings.items():
                if city in text_lower:
                    tag_list.update(city_tags)
            
            # Organization type tags
            if any(word in text_lower for word in ['embassy', 'embajada', 'ambassade']):
                tag_list.update(['embassy', 'diplomatic', 'foreign-affairs', 'international-relations', 'bilateral'])
            
            if any(word in text_lower for word in ['consulate', 'consulado', 'consulat']):
                tag_list.update(['consulate', 'diplomatic', 'consular-services', 'international'])
            
            if any(word in text_lower for word in ['museum', 'museo']):
                tag_list.update(['museum', 'culture', 'art', 'heritage', 'education', 'tourism'])
            
            if any(word in text_lower for word in ['university', 'universidad']):
                tag_list.update(['university', 'education', 'academic', 'higher-education', 'research'])
            
            if any(word in text_lower for word in ['ministry', 'ministerio']):
                tag_list.update(['ministry', 'government', 'public-sector', 'administration'])
            
            if any(word in text_lower for word in ['alcaldía', 'alcaldia', 'mayor']):
                tag_list.update(['municipality', 'local-government', 'city-hall', 'administration'])
            
            # Food related tags
            if any(word in text_lower for word in ['restaurant', 'restaurante', 'food', 'comida']):
                tag_list.update(['food', 'restaurant', 'dining', 'gastronomy', 'cuisine'])
            
            if any(word in text_lower for word in ['coffee', 'café', 'cafe']):
                tag_list.update(['coffee', 'cafe', 'beverages', 'dining'])
            
            if any(word in text_lower for word in ['pizza']):
                tag_list.update(['pizza', 'italian', 'fast-food', 'restaurant'])
            
            if any(word in text_lower for word in ['burger', 'hamburger']):
                tag_list.update(['burger', 'fast-food', 'american', 'restaurant'])
            
            # Cultural tags
            if any(word in text_lower for word in ['teatro', 'theatre', 'theater']):
                tag_list.update(['theater', 'culture', 'performing-arts', 'entertainment'])
            
            if any(word in text_lower for word in ['biblioteca', 'library']):
                tag_list.update(['library', 'education', 'culture', 'books', 'research'])
            
            if any(word in text_lower for word in ['archivo', 'archive']):
                tag_list.update(['archive', 'history', 'culture', 'research', 'heritage'])
            
            # Tourism tags
            if any(word in text_lower for word in ['turismo', 'tourism', 'tourist']):
                tag_list.update(['tourism', 'travel', 'visitor', 'destination'])
            
            if any(word in text_lower for word in ['hotel']):
                tag_list.update(['hotel', 'accommodation', 'hospitality', 'tourism'])
            
            # Technology tags
            if any(word in text_lower for word in ['tech', 'technology', 'digital']):
                tag_list.update(['technology', 'tech', 'innovation', 'digital'])
            
            if any(word in text_lower for word in ['ai', 'artificial intelligence']):
                tag_list.update(['ai', 'artificial-intelligence', 'technology', 'innovation'])
            
            # Update line if tags were added
            if len(tag_list) > original_size:
                new_tags = ' '.join(sorted(tag_list))
                new_line = re.sub(r'data-tags="[^"]*"', f'data-tags="{new_tags}"', line)
                new_lines.append(new_line)
                fixes_applied += 1
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    # Save updated content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))
    
    return fixes_applied

def main():
    filepath = r"C:\Users\brand\Development\Project_Workspace\portfolio_site\content\me\links\_index.md"
    
    print("🔧 COMPREHENSIVE TAG IMPROVEMENT")
    print("================================\n")
    
    fixes = comprehensive_tag_improvement(filepath)
    
    print(f"✅ Improved tags for {fixes} links")
    print(f"   - Added location tags (countries, cities, regions)")
    print(f"   - Added organization type tags")
    print(f"   - Added food and cuisine tags")
    print(f"   - Added cultural and tourism tags")
    print(f"   - Added language tags")
    print(f"   - Added Instagram username tags")

if __name__ == "__main__":
    main()