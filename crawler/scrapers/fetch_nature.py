"""
洛克王国世界 BWIKI 性格数据爬取

数据来源：https://wiki.biligame.com/rocom/性格
爬取所有性格的属性增减和子性格信息。

性格共 30 种，按属性增加分为 6 大类（物攻/物防/魔攻/魔防/速度/生命），每类 5 种。

输出：
  - data/natures/nature_list.json
"""

import json
import os
import sys

import requests
from bs4 import BeautifulSoup

# ============================================================
# 配置
# ============================================================

API_URL = "https://wiki.biligame.com/rocom/api.php"
PAGE_TITLE = "性格"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "data", "natures")
JSON_OUTPUT = os.path.join(OUTPUT_DIR, "nature_list.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
}

# ============================================================
# 爬取
# ============================================================


def fetch_page_html():
    """通过 MediaWiki API 获取页面渲染后的 HTML"""
    params = {
        "action": "parse",
        "page": PAGE_TITLE,
        "prop": "text",
        "format": "json",
        "utf8": 1,
    }
    resp = requests.get(API_URL, params=params, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data["parse"]["text"]["*"]


def parse_natures(html):
    """解析性格表格数据"""
    soup = BeautifulSoup(html, "html.parser")
    natures = []

    # 查找所有表格
    tables = soup.find_all("table")

    for table in tables:
        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            if len(cells) < 4:
                continue

            # 尝试解析：主性格 | 属性增加 | 属性减少 | 子性格
            cell_texts = [cell.get_text(strip=True) for cell in cells]

            # 跳过表头
            if "主性格" in cell_texts[0] or "性格" == cell_texts[0]:
                continue

            name = cell_texts[0]
            # 过滤无效行
            if not name or len(name) > 5:
                continue

            # 属性增加/减少可能带有 ▲/▼ 标记
            stat_up = cell_texts[1].replace("▲", "").replace("↑", "").strip()
            stat_down = cell_texts[2].replace("▼", "").replace("↓", "").strip()

            # 验证是否为有效属性
            valid_stats = ["物攻", "物防", "魔攻", "魔防", "速度", "生命"]
            if stat_up not in valid_stats or stat_down not in valid_stats:
                continue

            # 子性格：可能在第4列，以换行/逗号分隔
            sub_natures_raw = cell_texts[3] if len(cell_texts) > 3 else ""
            sub_natures = []
            if sub_natures_raw:
                # 尝试多种分隔方式
                for sep in ["、", "，", ",", "\n"]:
                    if sep in sub_natures_raw:
                        sub_natures = [s.strip() for s in sub_natures_raw.split(sep) if s.strip()]
                        break
                if not sub_natures and sub_natures_raw:
                    sub_natures = [sub_natures_raw]

            nature = {
                "id": len(natures) + 1,
                "name": name,
                "stat_up": stat_up,
                "stat_down": stat_down,
                "sub_natures": sub_natures,
            }
            natures.append(nature)

    return natures


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"[性格] 获取页面: {PAGE_TITLE}")
    html = fetch_page_html()

    print("[性格] 解析数据...")
    natures = parse_natures(html)

    if not natures:
        print("[性格] WARNING: 未解析到数据，尝试备用解析...")
        # 备用：直接按文本行解析
        soup = BeautifulSoup(html, "html.parser")
        # 打印前 500 字符用于调试
        text = soup.get_text()[:500]
        print(f"[性格] 页面文本预览:\n{text}")
        sys.exit(1)

    # 输出
    output = {
        "total": len(natures),
        "natures": natures,
    }

    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[性格] 完成: {len(natures)} 种性格 -> {JSON_OUTPUT}")

    # 按属性增加分组统计
    from collections import Counter
    up_counter = Counter(n["stat_up"] for n in natures)
    print(f"[性格] 按属性增加分布: {dict(up_counter)}")


if __name__ == "__main__":
    main()
