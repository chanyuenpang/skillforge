#!/usr/bin/env python3
import json
import random
from playwright.sync_api import sync_playwright

# 读取目标列表，只选政府网站
with open('/home/yankeeting/.openclaw/workspace/skills/adaptive-announcement-scraper/targets.json', 'r') as f:
    data = json.load(f)

# 过滤可能更稳定的政府网站
stable_targets = [t for t in data['targets'] if 'xm.gov.cn' in t['url'] or 'xiamen' in t['name'].lower() or '厦门' in t['name']]
if len(stable_targets) < 3:
    stable_targets = data['targets']

# 随机选3个
targets = random.sample(stable_targets, 3)

print("选中的网站:")
for t in targets:
    print(f"  - {t['name']}: {t['url']}")

results = []

def scrape_site(name, url):
    """抓取单个网站"""
    print(f"\n正在抓取: {name}")
    
    announcements = []
    structure = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            response = page.goto(url, timeout=20000, wait_until='domcontentloaded')
            if response and response.status >= 400:
                print(f"  页面返回错误: {response.status}")
                return None
            page.wait_for_timeout(3000)
            
            # 尝试查找公告区域容器
            area_patterns = [
                ('div.tzgg', 'ul li a'),
                ('div.notice', 'ul li a'),
                ('div.news', 'ul li a, div a'),
                ('div.list', 'ul li a, li a'),
                ('div.public', 'ul li a'),
                ('div.article', 'ul li a'),
                ('div.information', 'ul li a'),
                ('ul.tabs', None),  # 可能是标签页
                ('div.tabs', None),
            ]
            
            found_announcements = False
            
            for area_sel, item_sel in area_patterns:
                try:
                    area = page.query_selector(area_sel)
                    if area:
                        if item_sel:
                            items = area.query_selector_all(item_sel)
                        else:
                            items = area.query_selector_all('a')
                        
                        if items and len(items) >= 3:
                            print(f"  找到区域: {area_sel}, {len(items)} 项")
                            
                            for item in items:
                                try:
                                    title = item.inner_text().strip()
                                    href = item.get_attribute('href')
                                    
                                    # 过滤导航链接
                                    if not title or len(title) < 4:
                                        continue
                                    if title in ['首页', '信息公开', '解读回应', '办事服务', '互动交流', '网站地图']:
                                        continue
                                    if href and ('javascript' in href.lower() or '#' == href):
                                        continue
                                        
                                    announcements.append({
                                        'title': title[:100],
                                        'date': '',
                                        'link': href if href else ""
                                    })
                                except:
                                    continue
                            
                            if announcements:
                                found_announcements = True
                                break
                except:
                    continue
            
            # 如果还没找到，尝试直接搜索包含日期格式的列表项
            if not found_announcements:
                print("  尝试直接搜索列表...")
                all_lis = page.query_selector_all('li')
                for li in all_lis[:50]:
                    try:
                        # 查找链接
                        link = li.query_selector('a')
                        if not link:
                            continue
                        
                        title = link.inner_text().strip()
                        if len(title) < 5:
                            continue
                        
                        # 过滤明显是导航的
                        nav_words = ['首页', '信息公开', '关于', '联系我们', '网站地图', '登录']
                        if any(w in title for w in nav_words):
                            continue
                        
                        href = link.get_attribute('href')
                        if not href or 'javascript' in str(href).lower():
                            continue
                        
                        # 查找日期
                        date = ""
                        for ds in ['.date', '.time', 'span.date', 'span.time', 'i', 'em']:
                            de = li.query_selector(ds)
                            if de:
                                date = de.inner_text().strip()
                                break
                        
                        announcements.append({
                            'title': title[:100],
                            'date': date,
                            'link': href
                        })
                    except:
                        continue
            
            # 分析页面结构
            structure = {
                '页面标题': page.title() if page.title() else "N/A",
                '找到的公告数': len(announcements)
            }
            
            # 查找主要容器
            containers = page.query_selector_all('div[class*="list"], div[class*="news"], div[class*="notice"], div[class*="tzgg"]')
            if containers:
                structure['列表容器数'] = len(containers)
                
        except Exception as e:
            print(f"  错误: {str(e)}")
            structure = {"error": str(e)}
        
        browser.close()
    
    return {
        'name': name,
        'url': url,
        'announcements': announcements[:5],
        'structure': structure
    }

# 执行抓取
for t in targets:
    result = scrape_site(t['name'], t['url'])
    if result:
        results.append(result)

# 输出结果
print("\n\n=== 抓取结果 ===")
for r in results:
    print(f"\n{r['name']}:")
    print(f"  公告数: {len(r['announcements'])}")
    for i, a in enumerate(r['announcements'], 1):
        print(f"    {i}. {a['title'][:60]} | {a['date']}")

# 保存为JSON
with open('/home/yankeeting/.openclaw/workspace/skills/adaptive-announcement-scraper/output/2026-03-14/data.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("\n数据已保存")