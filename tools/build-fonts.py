#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
钉钉进步体（DingTalk JinBuTi）字体构建脚本 —— 子集化 + 内嵌

为什么要有这个脚本：
  原版 ttf 2.0MB / 7526 字形，直接塞进网页拖慢首屏。
  这里按「站点实际用到的字符」做子集，再用 woff2 压一遍（约 200KB），
  base64 之后就 270KB 左右，可以接受。

只有一个字重（400）：站点里所有 font-weight（500 / 620 / 650…）都会落到
这一档上，并且用 font-synthesis:none 关掉浏览器合成的假粗体 ——
否则中文加粗会变成「描边糊字」，比不加粗更难看。

输出：
  1. taste-design.html        —— 替换 ▼▼ DINGTALK-FONTS ▼▼ 标记之间的 @font-face（base64 内嵌）
  2. taste-design/src/fonts/  —— woff2 文件（Next 版由 webpack 打包）

什么时候重跑：
  改了页面文案、出现新汉字时。否则新字不在子集里，会退回系统字体（不会变成豆腐块，但字形不统一）。

用法：
  /Users/chenyuan/.workbuddy/binaries/python/envs/default/bin/python tools/build-fonts.py
  （源字体目录可用环境变量 FONT_SRC 覆盖，源文件可用 FONT_FILE 覆盖）
"""
from __future__ import annotations

import base64
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_SRC = os.environ.get("FONT_SRC", "/Users/chenyuan/Downloads/钉钉进步体0111")
FONT_FILE = os.environ.get("FONT_FILE", "DingTalk JinBuTi.ttf")
OUT_NAME = "DingTalkJinBuTi.woff2"
FAMILY = "钉钉进步体"
PY = sys.executable

# 除站点用到的字之外，另外保底这些字符：
#   0x20–0x7E  ASCII 全量（英文、数字、半角标点）
#   常用中文标点 / 全角符号
EXTRA = "".join(chr(c) for c in range(0x20, 0x7F)) + (
    "　，。、；：？！“”‘’（）《》〈〉「」『』【】〔〕—…·～￥％＃＠＆＊＋－＝／＼｜"
    "①②③④⑤⑥⑦⑧⑨⑩←↑→↓↔⇒×÷±°℃€$£¥"
)


def collect_chars() -> str:
    """站点文案里出现的所有字符 = 单文件 HTML + Next 版源码。"""
    files = [os.path.join(ROOT, "taste-design.html")]
    for pat in ("taste-design/src/**/*.ts", "taste-design/src/**/*.tsx",
                "taste-design/src/**/*.json"):
        files += glob.glob(os.path.join(ROOT, pat), recursive=True)

    chars: set[str] = set()
    for path in files:
        with open(path, encoding="utf-8") as fh:
            chars |= set(fh.read())
    # 控制字符 / 代理对 / 私用区不要
    chars = {c for c in chars if c.isprintable() and not (0xE000 <= ord(c) <= 0xF8FF)}
    chars |= set(EXTRA)
    return "".join(sorted(chars))


def subset(text: str, src_ttf: str, out_woff2: str) -> int:
    cmd = [
        PY, "-m", "fontTools.subset", src_ttf,
        f"--output-file={out_woff2}",
        "--flavor=woff2",
        "--layout-features=kern,liga,clig,calt,ccmp,locl,mark,mkmk,pnum,tnum",
        "--no-hinting",            # 屏幕渲染用不到 hinting，去掉能省一大截
        "--desubroutinize",
        "--drop-tables+=DSIG",
        "--name-IDs=*",            # 保留 name 表，DevTools 里能看出是哪个字体
    ]
    # 用临时文本文件传字符集：--text 参数在字符多时会超过命令行长度限制
    tmp = out_woff2 + ".chars.txt"
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(text)
    cmd.append(f"--text-file={tmp}")
    subprocess.run(cmd, check=True, capture_output=True)
    os.remove(tmp)
    return os.path.getsize(out_woff2)


def face_block(data_uri: str) -> str:
    return (
        "@font-face{\n"
        f"  font-family:'{FAMILY}';\n"
        f"  src:url({data_uri}) format('woff2');\n"
        "  font-weight:400;font-style:normal;font-display:swap;\n"
        "}"
    )


def rewrite_html(block: str) -> None:
    path = os.path.join(ROOT, "taste-design.html")
    with open(path, encoding="utf-8") as fh:
        s = fh.read()

    start_mark = "/* ▼▼ DINGTALK-FONTS:START"
    end_mark = "/* ▲▲ DINGTALK-FONTS:END"
    i, j = s.find(start_mark), s.find(end_mark)
    if i < 0 or j < 0:
        raise SystemExit("HTML 里找不到 DINGTALK-FONTS 标记，先手工加上再跑")
    j = s.index("*/", j) + 2

    body = (
        f"{start_mark} —— 由 tools/build-fonts.py 生成，勿手改 ▼▼\n"
        "   子集化 + woff2 + base64 内嵌：换文案且出现新汉字时重跑脚本 */\n"
        + block
        + "\n"
        + f"{end_mark} */"
    )
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(s[:i] + body + s[j:])
    print(f"  → taste-design.html 已更新（{os.path.getsize(path) // 1024} KB）")


def main() -> None:
    text = collect_chars()
    cjk = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    print(f"字符集：{len(text)} 个（汉字 {cjk} 个）")

    src = os.path.join(FONT_SRC, FONT_FILE)
    if not os.path.exists(src):
        raise SystemExit(f"找不到源字体：{src}")

    out_dir = os.path.join(ROOT, "taste-design/src/fonts")
    os.makedirs(out_dir, exist_ok=True)

    tmp = os.path.join("/tmp", OUT_NAME)
    size = subset(text, src, tmp)
    with open(tmp, "rb") as fh:
        raw = fh.read()
    with open(os.path.join(out_dir, OUT_NAME), "wb") as fh:
        fh.write(raw)
    os.remove(tmp)

    print(f"  {OUT_NAME:26s} {size / 1024:6.1f} KB  (原 ttf {os.path.getsize(src) / 1048576:.1f} MB)")
    print(f"  base64 后约 {size * 4 / 3 / 1024:.0f} KB")
    rewrite_html(face_block("data:font/woff2;base64," + base64.b64encode(raw).decode()))


if __name__ == "__main__":
    main()
