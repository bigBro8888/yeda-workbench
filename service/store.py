"""SQLite workspace, credentials and auditable workflow transitions."""
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
import uuid
from contextlib import closing, contextmanager
from datetime import datetime
from pathlib import Path

ROLES = ("管理员", "经办人", "审批人", "财务", "只读")
LOCKED = {"审批中", "审批通过"}
WORKFLOW_MODULES = {"自管基金", "参股基金", "直投项目管理"}
APPROVAL_SECTIONS = set("基金立项 尽职调查 风控预审 基金投决 协议签订 国资备案 项目交割 储备项目 项目立项 项目尽调 项目决策 项目出资 部分退出 全部退出 退出决策 退出计划 用印管理 公司三会 委派人员 一般事项 重大风险事项 重要事项决策 缴款通知 注资缴款 基金分配 基金管理费".split())


class Problem(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def require(condition, message, status=400):
    if not condition:
        raise Problem(status, message)


def timestamp():
    return datetime.now().astimezone().isoformat(timespec="seconds")


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False)


@contextmanager
def connect(directory):
    with closing(sqlite3.connect(directory / "workspace.sqlite3", timeout=15)) as conn:
        conn.row_factory = sqlite3.Row
        with conn:
            yield conn


def initialize(directory):
    directory.mkdir(parents=True, exist_ok=True)
    with connect(directory) as con:
        con.execute("pragma journal_mode=wal")
        con.executescript("""
        create table if not exists users(name text primary key, salt blob, digest blob, role text not null);
        create table if not exists sessions(token text primary key, actor text not null, expires integer not null);
        create table if not exists workspace(id integer primary key, rev integer not null, body text not null);
        create table if not exists audit(id integer primary key, actor text, event text, subject text, at text);
        create table if not exists files(id text primary key, owner text, name text, mime text, content blob not null);
        create table if not exists attempts(origin text primary key, since integer, failures integer);
        create table if not exists runs(id integer primary key, kind text, subject text, status text, detail text, at text);
        """)
        template = Path(__file__).with_name("schema.json").read_text(encoding="utf8")
        con.execute("insert or ignore into workspace values(1,0,?)", (template,))


def create_account(con, name, password, role):
    require(isinstance(name,str) and 1 <= len(name.strip()) <= 64, "请输入有效的用户名")
    require(isinstance(password,str) and 10 <= len(password) <= 256, "密码长度须为 10 至 256 个字符")
    require(role in ROLES, "请选择有效角色")
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 600000)
    try:
        con.execute("insert into users values(?,?,?,?)", (name.strip(), salt, digest, role))
    except sqlite3.IntegrityError:
        raise Problem(409, "该用户名已存在") from None


def authenticate(con, name, password):
    row = con.execute("select * from users where name=?", (name,)).fetchone()
    require(isinstance(password,str) and len(password) <= 256, "用户名或密码有误", 401)
    result = hashlib.pbkdf2_hmac("sha256", password.encode(), row["salt"] if row else bytes(16), 600000)
    require(row and hmac.compare_digest(result,row["digest"]), "用户名或密码有误", 401)


def state(con):
    row = con.execute("select rev,body from workspace where id=1").fetchone()
    return {"revision":row["rev"], "data":json.loads(row["body"])}


def note_rows(data):
    for owner, groups in data["notes"].items():
        if owner == "daily":
            continue
        require(isinstance(groups,dict), "事项结构无效")
        for section, entries in groups.items():
            require(isinstance(entries,list), "事项列表无效")
            seen = set()
            for entry in entries:
                require(isinstance(entry,dict), "无效事项")
                if section == "变更记录":
                    continue
                key = entry.get("id")
                require(isinstance(key,str) and key and key not in seen, "事项编号重复或缺失")
                seen.add(key)
                yield (owner,section,key),entry


def checked_save(con, user, old, new):
    require(user["role"] in ("经办人","管理员"), "当前角色无业务编辑权限", 403)
    require(isinstance(new,dict) and old.keys()==new.keys(), "业务模块结构有误")
    for k,v in old.items():
        require(type(new[k]) is type(v), "业务模块类型有误")
        if isinstance(v,list):
            ids=[r.get("id") for r in new[k] if isinstance(r,dict)]
            require(len(ids)==len(new[k]) and all(isinstance(i,str) and i for i in ids) and len(set(ids))==len(ids), "业务记录编号错误")
    require(old["notes"].get("daily",[])==new["notes"].get("daily",[]),"待办须通过审批操作变更",403)
    if user["role"]!="管理员":
        for module in ("基础配置管理","业务流程配置管理","文件分类配置"):
            require(old.get(module)==new.get(module),"仅管理员可修改系统配置",403)
        for key in set(old["settings"])|set(new["settings"]):
            if key not in ("localDialogs","industryMonitor","reportTemplates"):
                require(old["settings"].get(key)==new["settings"].get(key),"仅管理员可修改系统配置",403)
    schedule = new["settings"].get("disclosureSchedule")
    if schedule is not None:
        require(isinstance(schedule, dict) and isinstance(schedule.get("targets"), list), "无效调度配置")
        targets = schedule["targets"]
        require(type(schedule.get("enabled")) is bool and type(schedule.get("email")) is bool, "调度开关无效")
        require(len(targets) <= 30 and (targets or not schedule["enabled"]), "请核对采集目标数量")
        require(isinstance(schedule.get("at"), str) and re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", schedule["at"]), "调度时间无效")
        for target in targets:
            require(isinstance(target, dict) and target.get("market") in ("listed", "neeq") and isinstance(target.get("code"), str) and re.fullmatch(r"[0-9]{6}", target["code"]), "采集市场或证券代码无效")
    for key in ("receipts","disclosures"):
        require(old["settings"].get(key)==new["settings"].get(key),"请通过对应业务操作更新记录",403)
    prior=dict(note_rows(old))
    following=dict(note_rows(new))
    for key,row in prior.items():
        if row.get("receiptId"):require(row==following.get(key),"核销流水不可直接修改",403)
    for key in prior.keys()|following.keys():
        a,b=prior.get(key,{}),following.get(key,{})
        if b.get("receiptId"):
            require(a == b, "核销流水须由财务确认生成", 403)
        if a.get("状态") in LOCKED or b.get("状态") in LOCKED:
            require(a==b,"审批状态及锁定记录须由审批流程变更",403)
            if a:
                for module in WORKFLOW_MODULES:
                    if any(r["id"]==key[0] for r in old[module]):
                        require(any(r["id"]==key[0] for r in new[module]),"不可移除含已提交事项的业务主体",409)
    return new


def workflow(db, user, body):
    daily=db["notes"].setdefault("daily",[])
    actor=user["name"]
    if body["action"]=="submit":
        module,owner,section=body["module"],body["owner"],body["section"]
        require(user["role"] in ("经办人","管理员"),"当前角色无提交权限",403)
        require(module in WORKFLOW_MODULES and section in APPROVAL_SECTIONS and any(r["id"]==owner for r in db[module]),"无效业务对象")
        entries=db["notes"].get(owner,{}).get(section,[])
        row=next((r for r in entries if r["id"]==body["entry"]),None)
        require(row and row.get("状态") in ("草稿","已退回"),"只有草稿或退回事项可提交",409)
        task={"id":uuid.uuid4().hex,"objectId":owner,"sub":section,"module":module,"entryId":row["id"],"person":actor,
              "name":next((row[k] for k in ("事项名称","风险内容","合同名称","用印事项名称") if row.get(k)),section),"date":timestamp(),"type":"我的待办","stage":"审批中"}
        scope="直投项目" if module=="直投项目管理" else module
        if db["settings"].get(scope+"开启审批流程")=="否":
            task.update(type="我的已办",stage="审批通过",reviewer="系统（免审批）")
        daily.insert(0,task)
    else:
        require(user["role"] in ("审批人","管理员"),"当前角色无审批权限",403)
        task=next((t for t in daily if t["id"]==body["task"] and t["type"]=="我的待办"),None)
        require(task,"该待办已处理或不存在",409)
        require(task["person"]!=actor,"提交人不能审批自己的申请",403)
        entries=db["notes"][task["objectId"]][task["sub"]]
        row=next((r for r in entries if r["id"]==task["entryId"]),None)
        require(row and row.get("状态")=="审批中","事项状态已变更",409)
        task.update(stage="审批通过" if body["action"]=="approve" else "已退回",type="我的已办",reviewer=actor,reviewedAt=timestamp())
    row["状态"]=task["stage"]
    db["notes"][task["objectId"]].setdefault("变更记录",[]).insert(0,{"操作":task["name"]+" · "+task["stage"],"填写人":actor,"填写时间":timestamp()})
    return task


def confirm_receipt(db,user,body):
    from datetime import date
    from decimal import Decimal, InvalidOperation
    require(user["role"] in ("财务","管理员"),"请由财务人员登记回单",403)
    rules={"缴款通知":("收款","本期应缴金额（万元）"),"基金管理费":("付款","本期应付管理费（万元）"),"基金分配":("付款","本期分配总金额（万元）"),"注资缴款":("付款","付款金额（万元）")}
    owner,section=body["owner"],body["section"]
    require(section in rules and any(f["id"]==owner for m in ("自管基金","参股基金") for f in db[m]),"无效资金事项")
    row=next((n for n in db["notes"].get(owner,{}).get(section,[]) if n.get("id")==body["entry"]),None)
    require(row and row.get("状态")=="审批通过","该事项须先通过审批",409)
    require(not any(j["entryId"]==row["id"] and j["person"]==user["name"] for j in db["notes"].get("daily",[])),"经办人与财务确认人须为不同成员",403)
    direction,field=rules[section]
    try:amount=Decimal(str(row.get(field)))
    except InvalidOperation:raise Problem(400,"审批事项缺少有效金额") from None
    require(amount.is_finite() and 0<amount<Decimal("1e15"),"审批事项金额无效")
    bank_ref=body["reference"].strip()
    require(1<=len(bank_ref)<=100,"请填写回单编号")
    date.fromisoformat(body["date"])
    receipts=db["settings"].setdefault("receipts",[])
    require(not any(r["entry"]==row["id"] or r["reference"]==bank_ref for r in receipts),"事项或回单已登记",409)
    receipt={"id":uuid.uuid4().hex,"owner":owner,"section":section,"entry":row["id"],"amount":str(amount),"date":body["date"],"direction":direction,"reference":bank_ref,"actor":user["name"],"at":timestamp()}
    receipts.append(receipt)
    db["notes"][owner].setdefault("现金流",[]).insert(0,{"id":receipt["id"],"发生时间":receipt["date"],"类型":direction,"发生金额（万元）":str(amount),"往来单位":row.get("投资人名称") or row.get("投资人") or row.get("出资主体"),"业务类型":section,"备注":"回单 "+bank_ref,"receiptId":receipt["id"]})
    return receipt


def commit(con, data, actor, event, subject):
    con.execute("update workspace set rev=rev+1,body=? where id=1",(encoded(data),))
    con.execute("insert into audit(actor,event,subject,at) values(?,?,?,?)",(actor,event,subject,timestamp()))
