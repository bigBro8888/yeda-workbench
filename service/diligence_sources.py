"""Public disclosure lookups and licensed QCC connectors for the local workbench."""
import hashlib
import json
import os
import re
import time
import threading
from datetime import date
from html.parser import HTMLParser
from http.client import HTTPSConnection, HTTPException
from urllib.parse import parse_qs, urlencode, urlsplit
from urllib.request import Request, urlopen


class SourceError(ValueError):
    pass


CN = "https://www.cninfo.com.cn/new/"
EM = "https://xinsanban.eastmoney.com"
MAX_FILE = 25 * 1024 * 1024
_reader = threading.Lock()
_text_pause_until = 0.0


def remote_json(url, params, post=False, headers=None):
    data = urlencode(params).encode()
    req = Request(url if post else url + "?" + data.decode(), data if post else None, headers or {})
    try:
        with urlopen(req, timeout=14) as response:
            return json.loads(response.read(5_000_000))
    except (OSError, ValueError) as exc:
        raise SourceError("数据源暂时未返回有效结果，可重试或打开来源网站核对。") from exc


def report_period(title, issuer):
    # Anchor to the report title: exclude board resolutions, summaries and notices about reports.
    name = re.sub(r"^.*?[:：]", "", title).strip().replace(" ", "")
    if name.startswith(issuer):
        name = name[len(issuer):]
    name = re.sub(r"^(?:[^关于《》]{1,50})?(?:股份有限公司|有限公司)", "", name)
    m = re.fullmatch(r"(20\d{2})年?(年度|半年度|中期|第一季度|第三季度|一季度|三季度|1季度|3季度)报告(?:全文)?(?:[（(](?:修订|更正|更新|调整)[^（）()]*[）)])*", name)
    return m.group(1) + " " + m.group(2) if m else ""


def reports(market, code, year):
    if market not in ("neeq", "listed") or not re.fullmatch(r"\d{6}", code):
        raise SourceError("请选择市场并填写六位证券代码。")
    if not isinstance(year, int) or not 2000 <= year <= date.today().year:
        raise SourceError("请选择有效的披露年份。")
    begin, end = f"{year}-01-01", f"{year}-12-31"
    items, seen = [], set()
    if market == "listed":
        choices = remote_json(CN + "information/topSearch/query", {"keyWord": code, "maxNum": 20}, True)
        issuer = next((x for x in choices if x.get("code") == code and x.get("category") == "A股"), None)
        if not issuer:
            return {"items": [], "partial": False}
    for page in range(1, 11):
        if market == "neeq":
            result = remote_json(EM + "/api/gg/list", dict(page_index=page, type=1, begin=begin, end=end, securitycodes=code, content="", sortRule=1))
            if not result.get("re") or not isinstance(result.get("result"), list):
                raise SourceError("新三板公告目录暂不可用，请到全国股转系统复核。")
            batch = result["result"]
            more = page * 20 < int(result.get("total") or 0)
        else:
            params = dict(pageNum=page, pageSize=30, column="szse", tabName="fulltext",
                          stock=code + "," + issuer["orgId"], seDate=begin + "~" + end,
                          category="category_ndbg_szsh;category_bndbg_szsh;category_yjdbg_szsh;category_sjdbg_szsh")
            result = remote_json(CN + "hisAnnouncement/query", params, True)
            if "announcements" not in result:
                raise SourceError("巨潮资讯暂未返回公告目录。")
            batch = result["announcements"] or []
            more = bool(result.get("hasMore"))
        for entry in batch:
            if market == "neeq":
                security = next((s for s in entry.get("codes", []) if s.get("stock_code") == code), None)
                aid = entry.get("art_code", "")
                if not security or not re.fullmatch(r"AN\d+", aid):
                    continue
                name, title, day = security["short_name"], entry["title"], entry["notice_date"][:10]
                source = "东方财富新三板 · Choice"
                link = EM + "/Article/NoticeContent?id=" + aid
                pdf = "https://pdf.dfcfw.com/pdf/H2_" + aid + "_1.pdf"
            else:
                path = entry.get("adjunctUrl") or ""
                if entry.get("secCode") != code or not re.fullmatch(r"finalpage/\d{4}-\d{2}-\d{2}/\d+\.pdf", path, re.I):
                    continue
                name, title = entry["secName"], re.sub(r"<[^>]+>", "", entry["announcementTitle"])
                day, aid = path.split("/")[1], str(entry["announcementId"])
                source = "巨潮资讯"
                pdf = link = "https://static.cninfo.com.cn/" + path
            period = report_period(title, name)
            if not period or not begin <= day <= end or aid in seen:
                continue
            seen.add(aid)
            items.append(dict(id=market+"-"+aid, code=code, issuer=name, title=title, day=day,
                              period=period, source=source, link=link, pdf=pdf))
        if not batch or not more:
            return {"items": items, "partial": False}
    return {"items": items, "partial": True}


def original_pdf(url):
    try:
        with urlopen(url, timeout=18) as response:
            prefix = response.read(5)
            if prefix != b"%PDF-":
                return None
            content = prefix + response.read(MAX_FILE)
            if len(content) <= MAX_FILE and b"%%EOF" in content[-4096:]:
                return content
    except OSError:
        pass
    return None


class NoticePage(HTMLParser):
    """Read the published announcement body and its numbered page links."""
    def __init__(self, aid):
        super().__init__()
        self.aid = aid
        self.body = self.pre = False
        self.parts, self.pages, self.active = [], set(), None

    def handle_starttag(self, name, attrs):
        a = dict(attrs)
        if name == "div" and a.get("id") == "ContentBody":
            self.body = True
        if name == "pre" and self.body:
            self.pre = True
        if name == "a":
            u = urlsplit(a.get("href") or "")
            params = parse_qs(u.query)
            n = params.get("pageIndex", [""])[0]
            if u.path == "/Article/NoticeContent" and params.get("id") == [self.aid] and n.isdigit():
                self.pages.add(int(n))
                if "active" in a.get("class","").split():
                    self.active = int(n)

    def handle_endtag(self, name):
        if name == "pre":
            self.pre = False
        if name == "div":
            self.body = False

    def handle_data(self, text):
        if self.pre:
            self.parts.append(text)


def published_text(meta):
    global _text_pause_until
    aid = meta["id"].removeprefix("neeq-")
    if not re.fullmatch(r"AN\d+", aid) or time.monotonic() < _text_pause_until or not _reader.acquire(blocking=False):
        return None, 0
    chunks, last = [], 1
    conn = HTTPSConnection("xinsanban.eastmoney.com", timeout=7)
    started = time.monotonic()
    try:
        page = 1
        while page <= last:
            if time.monotonic() - started > 60:
                return None, 0
            conn.request("GET", "/Article/NoticeContent?" + urlencode(dict(id=aid,pageIndex=page)))
            response = conn.getresponse()
            if response.status in (403,429):
                _text_pause_until = time.monotonic() + 3600
            if response.status != 200:
                return None, 0
            parser = NoticePage(aid)
            parser.feed(response.read(800_000).decode("utf-8-sig"))
            text = "".join(parser.parts).strip()
            if (parser.pages and parser.active != page) or not text or text in chunks:
                return None, 0
            if page == 1:
                last = max(parser.pages or {1})
                if last > 90 or meta["code"] not in text:
                    return None, 0
            elif last != max(parser.pages or {0}):
                return None, 0
            chunks.append(text)
            page += 1
            if page <= last:
                time.sleep(.65)
        header = f'{meta["title"]}\n{meta["issuer"]} · {meta["code"]}\n{meta["source"]} · {meta["day"]}\n{meta["link"]}\n已收齐网页公告正文 {last} 页\n\n'
        return (header+"\n\n".join(chunks)).encode("utf-8-sig"), last
    except (OSError, HTTPException, UnicodeError, ValueError):
        return None, 0
    finally:
        conn.close()
        _reader.release()


QCC = {"工商登记": ("ECIV4/GetBasicDetailsByName", "keyword"), "上游供应商": ("Supplier/GetList", "searchKey"),
       "下游客户": ("Customer/GetList", "searchKey")}


def peers(industry, keyword):
    if not re.fullmatch("[A-S]", industry) or len(keyword)>50:
        raise SourceError("请选择行业，可按证券简称或代码进一步筛选。")
    params=dict(SHOWTYPE="JSON",CATALOGID="1110",TABKEY="tab1",PAGENO=1,selectHylb=industry,txtDMorJC=keyword)
    batch=remote_json("https://www.szse.cn/api/report/ShowReport/data",params)
    if not isinstance(batch,list) or not batch or "data" not in batch[0]:
        raise SourceError("深交所名录暂不可用。")
    rows=[]
    for row in batch[0]["data"]:
        code,sector=row["agdm"],row["sshymc"]
        if re.fullmatch(r"\d{6}",code) and sector.startswith(industry+" "):
            rows.append(dict(code=code,name=re.sub(r"<[^>]+>","",row["agjc"]),sector=sector,
                             board=row["bk"],link="https://www.szse.cn/market/product/stock/list/index.html"))
    return dict(rows=rows, asof=batch[0]["metadata"]["subname"].strip())


def company(kind, term):
    if kind not in QCC or not 2 <= len(term) <= 160:
        raise SourceError("请输入企业全称或统一社会信用代码。")
    key, secret = os.getenv("QCC_APP_KEY"), os.getenv("QCC_SECRET_KEY")
    if not key or not secret:
        raise SourceError("企查查 API 待授权。可用下方企查查网页查询，再将核对结果登记为项目证据。")
    path, param = QCC[kind]
    stamp = str(int(time.time()))
    token = hashlib.md5((key + stamp + secret).encode()).hexdigest().upper()
    params = {"key": key, param: term}
    if kind != "工商登记":
        params.update(pageIndex=1, pageSize=50)
    data = remote_json("https://api.qichacha.com/" + path, params, headers={"Token": token, "Timespan": stamp})
    if str(data.get("Status")) != "200":
        raise SourceError("企查查未返回可用数据（状态 " + str(data.get("Status", "未知"))[:12] + "），请核对主体名称及接口授权。")
    result = data.get("Result") or {}
    if kind == "工商登记":
        fields = [("企业名称","Name"),("统一社会信用代码","CreditCode"),("登记状态","Status"),("法定代表人","OperName"),("注册资本","RegistCapi"),("成立日期","StartDate"),("经营范围","Scope")]
        return {"fields": [[label, result.get(key)] for label,key in fields if result.get(key)]}
    supplier = kind == "上游供应商"
    rows = result.get("DistributorList" if supplier else "ClientList") or []
    return {"rows": [dict(name=r.get("Name"), year=r.get("Year"), amount=r.get("PurchaseAmount" if supplier else "SalesAmount"),
                          percent=r.get("PurchasePercent" if supplier else "SalesPercent"), source=r.get("Source")) for r in rows[:50]]}
