#!/usr/bin/env python3
"""
OCA Saints Scraper

Scrapes the OCA "Lives of all saints commemorated on <date>" page
and outputs structured JSON for that day's saints.
"""

import json
import logging
import sys
from datetime import date, datetime
from typing import List, Dict, Tuple, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, Tag

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stderr,
)

BASE_SITE = "https://www.oca.org"
BASE_IMAGES = "https://images.oca.org"


def build_oca_url(date_obj: date) -> str:
    return f"{BASE_SITE}/saints/all-lives/{date_obj.year}/{date_obj.month:02d}/{date_obj.day:02d}"


def fetch_html(url: str) -> str:
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.text
    except requests.exceptions.RequestException as e:
        logging.error("Error fetching %s: %s", url, e)
        raise


def extract_rank_and_short(name: str) -> Tuple[Optional[str], Optional[str]]:
    known_ranks = [
        "Equal-to-the-Apostles",
        "Holy Apostles of the Seventy",
        "Venerable",
        "Hieromartyr",
        "Greatmartyr",
        "Protomartyr",
        "Martyrs",
        "Martyr",
        "Apostles",
        "Apostle",
        "Righteous",
        "Confessor",
        "Blessed",
        "Saints",
        "Saint",
        "Holy",
    ]
    name_stripped = name.strip()
    lower = name_stripped.lower()
    for rank in sorted(known_ranks, key=len, reverse=True):
        rl = rank.lower()
        if lower.startswith(rl + " "):
            return rank, name_stripped[len(rank) + 1 :].strip()
        if lower.startswith(rl + ":"):
            return rank, name_stripped[len(rank) + 1 :].strip()
    return None, name_stripped


def find_icon_url(anchor_context: Tag) -> Optional[str]:
    """
    Starting from the saint's heading, walk forward until the next heading.
    Look for an <a> or <img> whose href/src contains '/icons/'.
    """
    for sib in anchor_context.next_siblings:
        if isinstance(sib, Tag) and sib.name in ("h1", "h2", "h3"):
            break

        if not isinstance(sib, Tag):
            continue

        # direct <img> or <a>
        if sib.name == "img":
            src = sib.get("src", "")
            if "/icons/" in src:
                return urljoin(BASE_IMAGES if src.startswith("/") else BASE_SITE, src)

        if sib.name == "a":
            href = sib.get("href", "")
            if "/icons/" in href:
                return urljoin(BASE_IMAGES if href.startswith("/") else BASE_SITE, href)

        # nested tags
        for tag in sib.find_all(["a", "img"]):
            href_or_src = tag.get("href") or tag.get("src") or ""
            if "/icons/" in href_or_src:
                return urljoin(
                    BASE_IMAGES if href_or_src.startswith("/") else BASE_SITE,
                    href_or_src,
                )

    return None


def find_summary(heading: Tag) -> Optional[str]:
    """
    First <p> after heading whose text is not literally 'Image'.
    """
    p = heading.find_next("p")
    while p:
        text = p.get_text(strip=True)
        if text and text.lower() != "image":
            return text
        p = p.find_next("p")
    return None


def parse_saints(html: str, date_obj: date) -> List[Dict]:
    saints: List[Dict] = []
    try:
        soup = BeautifulSoup(html, "html.parser")

        # All saint sections are the H2s after the main page title.
        for h2 in soup.find_all("h2"):
            title = h2.get_text(strip=True)
            if not title:
                continue
            if "Lives of all saints commemorated" in title:
                continue  # page title, not a saint

            # Name + optional link to full bio
            name = title
            link = h2.find("a", href=True)
            bio_url = urljoin(BASE_SITE, link["href"]) if link else None

            rank, short = extract_rank_and_short(name)
            summary = find_summary(h2)
            icon_url = find_icon_url(h2)

            saint = {
                "name": name,
                "short_title": short or name,
                "icon_url": icon_url,
                "bio_url": bio_url,
                "summary": summary,
                "rank_or_type": rank,
                "source_date": date_obj.isoformat(),
                "source_site": "oca.org",
            }
            saints.append(saint)

        if not saints:
            logging.warning("No saints parsed. Page structure may have changed.")

    except Exception as e:
        logging.warning("Error parsing HTML: %s", e)

    return saints


def main() -> None:
    if len(sys.argv) > 1:
        try:
            date_obj = date.fromisoformat(sys.argv[1])
        except ValueError:
            logging.error("Invalid date format. Use YYYY-MM-DD.")
            sys.exit(1)
    else:
        date_obj = date.today()

    url = build_oca_url(date_obj)
    logging.info("Fetching saints for %s from %s", date_obj.isoformat(), url)

    try:
        html = fetch_html(url)
    except Exception:
        sys.exit(1)

    saints = parse_saints(html, date_obj)

    output = {
        "date": date_obj.isoformat(),
        "source": "oca.org",
        "calendar": "new",
        "saints": saints,
        "scraped_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
    }

    json_str = json.dumps(output, indent=2, ensure_ascii=False)
    print(json_str)

    filename = f"oca_saints_{date_obj.isoformat()}.json"
    try:
        with open(filename, "w", encoding="utf-8") as f:
            f.write(json_str)
    except Exception as e:
        logging.error("Error writing %s: %s", filename, e)
        sys.exit(1)

    logging.info("Scraped %d saints for %s", len(saints), date_obj.isoformat())


if __name__ == "__main__":
    main()

