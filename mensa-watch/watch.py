#!/usr/bin/env python3
"""JAPAN MENSA 入会テスト日程の見張り役。

https://www.mensa.jp/exam/ を定期的に読み、
「東京都在住で申し込めるテスト」に動きがあったらスマホへ通知する（ntfy.sh 経由）。

通知するとき:
  - 申し込める状態（「申し込む」ボタンが出た）になったとき … 最優先の通知
  - 新しいテスト日程が載ったとき（まだ受付前でも、心の準備のために通知）
  - それ以外の状態変化（満員→締切 など）は通知しない

使い方:
  python3 watch.py --state state.json            # 1回だけ確認
  python3 watch.py --state state.json --loop 270 # 270秒のあいだ、60秒ごとに確認
  python3 watch.py --test                        # テスト通知を1件送る
環境変数:
  NTFY_TOPIC   通知の宛先（ntfy アプリで購読する名前）。未設定なら通知せず画面に出すだけ。
  RESIDENCE    住んでいる都道府県（既定: 東京都）
  INTERVAL     確認の間隔（秒、既定: 60）
"""
import argparse
import html
import json
import os
import re
import sys
import time
import urllib.request

URL = "https://www.mensa.jp/exam/"
BASE = "https://www.mensa.jp/"
UA = "Mozilla/5.0 (compatible; personal-mensa-exam-watcher/1.0)"
CLOSED = {"満員", "締切"}


def fetch(url=URL):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


def text_of(fragment):
    t = re.sub(r"<br\s*/?>", "\n", fragment)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t).replace("　", " ")
    return "\n".join(line.strip() for line in t.splitlines() if line.strip())


def parse(page):
    """ページから試験の一覧を取り出す。"""
    exams = []
    for block in re.findall(r'<ul class="list">(.*?)</ul>', page, flags=re.S):
        pref = re.search(r'<li class="pref">(.*?)</li>', block, flags=re.S)
        date = re.search(r'<li class="date">(.*?)</li>', block, flags=re.S)
        link = re.search(r'<li class="link">(.*?)</li>', block, flags=re.S)
        if not (pref and date):
            continue
        pref_t = text_of(pref.group(1)).split("\n")[0]
        info = text_of(date.group(1))
        when = re.search(r"日時\s*：\s*(.+)", info)
        where = re.search(r"場所\s*：\s*(.+)", info)
        who = re.search(r"このテストには、(.+)", info)
        status, href = "不明", None
        if link:
            alt = re.search(r'alt="([^"]*)"', link.group(1))
            status = alt.group(1) if alt else (text_of(link.group(1)) or "不明")
            a = re.search(r'href="([^"]+)"', link.group(1))
            if a:
                href = a.group(1) if a.group(1).startswith("http") else BASE + a.group(1).lstrip("/")
        when_t = when.group(1).strip() if when else ""
        where_t = where.group(1).strip() if where else ""
        exams.append({
            "key": f"{pref_t}|{when_t}|{where_t}",
            "pref": pref_t,
            "when": when_t,
            "where": where_t,
            "who": who.group(1).strip() if who else "",
            "status": status,
            "href": href,
        })
    return exams


def eligible(exam, residence):
    who = exam["who"]
    return "全国" in who or residence in who


def can_apply(exam):
    return bool(exam["href"]) or (exam["status"] not in CLOSED and "申" in exam["status"])


def notify(title, message, priority=3, click=URL, tags=None):
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    print(f"[通知] {title}\n{message}\n")
    if not topic:
        print("  (NTFY_TOPIC が未設定なので、実際の通知は送っていません)")
        return
    body = {"topic": topic, "title": title, "message": message,
            "priority": priority, "click": click, "tags": tags or []}
    req = urllib.request.Request(
        "https://ntfy.sh/", data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": UA})
    for attempt in range(3):
        try:
            urllib.request.urlopen(req, timeout=20).read()
            return
        except Exception as e:  # 通知の失敗で見張りを止めない
            print(f"  通知の送信に失敗 ({e})、再試行します", file=sys.stderr)
            time.sleep(3)


def describe(e):
    return f"{e['when']}\n場所：{e['where']}\n状態：{e['status']}"


def check(state, residence):
    all_exams = parse(fetch())
    if not all_exams and "現在未定" not in str(all_exams):
        raise RuntimeError("日程を1件も読み取れません（ページの作りが変わった可能性）")
    exams = [e for e in all_exams if eligible(e, residence)]
    first_run = not state.get("seen")
    seen = state.setdefault("seen", {})
    opened, added = [], []
    for e in exams:
        before = seen.get(e["key"])
        now_open = can_apply(e)
        if now_open and not (before and before.get("open")):
            opened.append(e)
        elif before is None and not first_run:
            added.append(e)
        seen[e["key"]] = {"status": e["status"], "open": now_open}
    if opened:
        notify(f"【今すぐ】Mensaテスト 申込受付中！（{len(opened)}枠）",
               "\n\n".join(f"{e['pref']}\n{describe(e)}" for e in opened)
               + "\n\nタップで申込ページを開きます。",
               priority=5, click=opened[0]["href"] or URL, tags=["rotating_light"])
    if added:
        notify(f"Mensaテストの新しい日程が載りました（{len(added)}枠）",
               "\n\n".join(f"{e['pref']}\n{describe(e)}" for e in added)
               + "\n\n（まだ申し込めない状態です。受付が始まったらまた通知します）",
               priority=4, tags=["calendar"])
    print(time.strftime("%Y-%m-%d %H:%M:%S"), f"確認完了: 対象{len(exams)}件 / 申込可能",
          sum(1 for e in exams if can_apply(e)), "件")
    return exams


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--state", default="state.json")
    p.add_argument("--loop", type=int, default=0, help="この秒数のあいだ繰り返し確認する")
    p.add_argument("--test", action="store_true", help="テスト通知を送る")
    a = p.parse_args()
    residence = os.environ.get("RESIDENCE", "東京都")
    interval = int(os.environ.get("INTERVAL", "60"))

    if a.test:
        exams = [e for e in parse(fetch()) if eligible(e, residence)]
        lines = [f"・{e['pref']} {e['when']}：{e['status']}" for e in exams]
        notify("Mensa見張り：テスト通知です",
               "この通知が届けば設定は完了です。\n今、" + residence + "在住で申し込める日程:\n"
               + ("\n".join(lines) or "（なし）"), priority=3, tags=["white_check_mark"])
        return

    try:
        with open(a.state, encoding="utf-8") as f:
            state = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        state = {}

    end = time.time() + a.loop
    failures = 0
    while True:
        try:
            check(state, residence)
            failures = 0
        except Exception as e:
            failures += 1
            print(f"確認に失敗: {e}", file=sys.stderr)
        with open(a.state, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=1)
        if time.time() + interval > end:
            break
        time.sleep(interval)
    if failures >= 3:
        sys.exit(1)


if __name__ == "__main__":
    main()
