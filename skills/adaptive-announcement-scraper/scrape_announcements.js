const { chromium } = require('playwright');

async function scrape() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const results = [];
  
  // 网站配置
  const sites = [
    { name: '厦门市人力资源和社会保障局', url: 'http://hrss.xm.gov.cn/xygk/tzgg/', altUrls: ['http://hrss.xm.gov.cn/xxgk/tzgg/', 'http://hrss.xm.gov.cn/tzgg/'] },
    { name: '厦门科学技术局', url: 'http://sti.xm.gov.cn/', altUrls: ['http://sti.xm.gov.cn/xxgk/tzgg/', 'http://sti.xm.gov.cn/tzgg/'] },
    { name: '福建省科技厅', url: 'http://kjt.fujian.gov.cn/', altUrls: ['http://kjt.fujian.gov.cn/xxgk/tzgg/', 'http://kjt.fujian.gov.cn/tzgg/'] }
  ];
  
  for (const site of sites) {
    console.log(`\n=== 正在抓取: ${site.name} ===`);
    let data = null;
    let triedUrls = [site.url, ...site.altUrls];
    
    for (const url of triedUrls) {
      try {
        console.log(`尝试: ${url}`);
        const page = await context.newPage();
        await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
        
        // 等待页面加载
        await page.waitForTimeout(2000);
        
        // 提取公告列表 - 尝试多种选择器
        const announcements = await page.evaluate(() => {
          const items = [];
          
          // 常见的选择器模式
          const selectors = [
            'a[href*="info"]', 'a[href*="detail"]', 'a[href*="article"]',
            '.article-list a', '.news-list a', '.notice-list a',
            '.list-item a', 'tr a', '.title a'
          ];
          
          // 获取所有链接
          const links = document.querySelectorAll('a');
          links.forEach(link => {
            const text = link.textContent?.trim();
            const href = link.href;
            // 过滤有效链接
            if (text && text.length > 3 && href && href.startsWith('http') && !href.includes('javascript')) {
              // 尝试找父元素获取日期
              let date = '';
              const parent = link.closest('tr') || link.closest('li') || link.closest('div') || link.parentElement;
              if (parent) {
                const dateText = parent.textContent?.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/);
                if (dateText) date = dateText[1].replace(/[年月]/g, '-').replace(/日$/, '');
              }
              items.push({ title: text, href: href, date: date });
            }
          });
          
          return items.slice(0, 10); // 获取更多以备筛选
        });
        
        // 按日期排序并取最新5条
        const validAnnouncements = announcements
          .filter(a => a.date)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5);
        
        if (validAnnouncements.length > 0) {
          data = validAnnouncements;
          console.log(`成功获取 ${data.length} 条公告`);
          break;
        } else {
          console.log(`未找到有效公告，尝试其他选择器...`);
          // 再尝试另一种方式
          const announcements2 = await page.evaluate(() => {
            const items = [];
            const rows = document.querySelectorAll('tr, li, .list-item, .article-item');
            rows.forEach(row => {
              const link = row.querySelector('a');
              const text = link?.textContent?.trim();
              const href = link?.href;
              if (text && text.length > 3 && href && href.startsWith('http')) {
                const dateMatch = row.textContent?.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/);
                const date = dateMatch ? dateMatch[1].replace(/[年月]/g, '-').replace(/日$/, '') : '';
                items.push({ title: text, href: href, date });
              }
            });
            return items;
          });
          
          const valid2 = announcements2.filter(a => a.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
          if (valid2.length > 0) {
            data = valid2;
            console.log(`成功获取 ${data.length} 条公告`);
            break;
          }
        }
        
        await page.close();
      } catch (e) {
        console.log(`失败: ${e.message}`);
      }
    }
    
    if (data) {
      results.push({ site: site.name, announcements: data });
    } else {
      results.push({ site: site.name, announcements: [], error: '无法获取公告' });
    }
  }
  
  await browser.close();
  
  // 输出结果
  console.log('\n\n=== 最终结果 ===\n');
  for (const r of results) {
    console.log(`\n## ${r.site}`);
    if (r.announcements.length > 0) {
      r.announcements.forEach((a, i) => {
        console.log(`${i+1}. ${a.title} | ${a.date} | ${a.href}`);
      });
    } else {
      console.log(r.error || '无公告');
    }
  }
  
  return results;
}

scrape().then(results => {
  console.log('\n--- JSON OUTPUT ---');
  console.log(JSON.stringify(results, null, 2));
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
