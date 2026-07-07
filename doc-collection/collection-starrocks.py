from pathlib import Path
import re

from bs4 import BeautifulSoup
import requests

doclist_path = Path(__file__).parent / "doclist-starrocks.txt"
urls = [line.strip() for line in doclist_path.read_text().splitlines() if line.strip()]

output_dir = Path(__file__).parent / "starrocks"
output_dir.mkdir(parents=True, exist_ok=True)

for url in urls:
    html = requests.get(url).text

    soup = BeautifulSoup(html, "html.parser")

    article = soup.find("article")

    title = article.find("h1").get_text(strip=True)

    content = article.get_text("\n", strip=True)

    filename = re.sub(r'[\\/*?:"<>|]', "_", title).strip() + ".txt"
    output_path = output_dir / filename

    output_path.write_text(f"{title}\n{content}", encoding="utf-8")

    print(f"Saved to {output_path}")