"""Run the equity workspace on a local computer or behind a TLS reverse proxy."""
import argparse
import hashlib
import io
import json
import mimetypes
import os
import re
import secrets
import threading
import time
from functools import partial
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote,urlsplit

from store import (Problem,require,initialize,connect,create_account,authenticate,encoded,
                   state,checked_save,workflow,confirm_receipt,commit,timestamp)
from integrations import enabled,model_answer,stock_quote,company,collect,scheduler

ROOT=Path(__file__).resolve().parent.parent
MAX_FILE=300*1024*1024


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def send(self,code,body=b"",mime="application/json; charset=utf-8",extra=None):
        self.send_response(code)
        self.send_header("Content-Type",mime)
        self.send_header("Content-Length",str(len(body)))
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("X-Frame-Options","DENY")
        self.send_header("Cross-Origin-Resource-Policy","same-origin")
        for k,v in (extra or {}).items():self.send_header(k,v)
        self.end_headers()
        if body:self.wfile.write(body)

    def reply(self,value,code=200,extra=None):
        self.send(code,encoded(value).encode(),extra=extra)

    def incoming(self,limit):
        length=int(self.headers.get("Content-Length","0"))
        require(0<=length<=limit,"请求大小超出上限",413)
        data=self.rfile.read(length)
        require(len(data)==length,"请求未完整接收")
        return data

    def user(self,con):
        cookies=SimpleCookie()
        cookies.load(self.headers.get("Cookie",""))
        self.session_hash=hashlib.sha256((cookies["yeda_session"].value if "yeda_session" in cookies else "").encode()).hexdigest()
        row=con.execute("select name,role from users join sessions on actor=name where token=? and expires>?",(self.session_hash,time.time())).fetchone()
        return dict(row) if row else None

    def session_cookie(self,value,seconds):
        secure="; Secure" if self.server.origin.startswith("https://") else ""
        return f"yeda_session={value}; Max-Age={seconds}; HttpOnly; Path=/; SameSite=Strict"+secure

    def handle_workspace(self,method):
        resource=unquote(urlsplit(self.path).path)
        require(self.headers.get("Host")==urlsplit(self.server.origin).netloc,"主机名与服务配置不符",403)
        if method=="POST":
            require(self.headers.get("Origin")==self.server.origin and self.headers.get("X-Workspace")=="1","请求来源无效",403)
        with connect(self.server.directory) as con:
            user=self.user(con)
            if method=="GET" and resource in ("/","/index.html"):
                if not user:
                    setup=not con.execute("select 1 from users limit 1").fetchone()
                    html=(ROOT/"service"/"login.html").read_text(encoding="utf8").replace("{{ACTION}}","setup" if setup else "login").replace("{{TITLE}}","创建首位管理员" if setup else "登录团队工作区")
                else:
                    html=(ROOT/"index.html").read_text(encoding="utf8").replace('<script src="catalog.js','<script src="/session.js"></script><script src="catalog.js')
                return self.send(200,html.encode(),"text/html; charset=utf-8")
            if method=="POST" and resource in ("/api/setup","/api/login"):
                body=json.loads(self.incoming(2048))
                con.execute("begin immediate")
                if resource=="/api/setup":
                    require(not con.execute("select 1 from users limit 1").fetchone(),"管理员已创建",409)
                    require(self.server.local_setup,"首次初始化请在本机回环地址启动服务",403)
                    create_account(con,body["name"],body["password"],"管理员")
                else:
                    ip=self.client_address[0];now=int(time.time())
                    row=con.execute("select * from attempts where origin=?",(ip,)).fetchone()
                    require(not row or now-row["since"]>=300 or row["failures"]<15,"尝试过于频繁，稍后再试",429)
                    try:authenticate(con,body["name"],body["password"])
                    except Problem:
                        start=row["since"] if row and now-row["since"]<300 else now
                        failures=row["failures"]+1 if row and start==row["since"] else 1
                        con.execute("insert or replace into attempts values(?,?,?)",(ip,start,failures));con.commit();raise
                    con.execute("delete from attempts where origin=?",(ip,))
                token=secrets.token_urlsafe(32)
                con.execute("delete from sessions where expires<=?",(time.time(),))
                con.execute("insert into sessions values(?,?,?)",(hashlib.sha256(token.encode()).hexdigest(),body["name"].strip(),time.time()+28800))
                con.commit()
                return self.reply({"ok":True},extra={"Set-Cookie":self.session_cookie(token,28800)})
            if resource.startswith("/api/") or resource=="/session.js":require(user,"请登录团队工作区",401)
            if resource=="/session.js" and method=="GET":
                info={**state(con),"user":user,"services":enabled()}
                return self.send(200,("window.teamSession="+encoded(info)+";").encode(),"application/javascript")
            if resource.startswith("/api/files/"):
                return self.file_request(con,user,resource.rsplit("/",1)[1],method)
            if resource.startswith("/api/"):
                return self.api(con,user,resource,method)
            require(method=="GET","无此操作",405)
            rel=resource.lstrip("/")
            asset=(ROOT/rel).resolve()
            require(asset.is_relative_to(ROOT) and asset.is_file() and (asset.is_relative_to(ROOT/"vendor") or (asset.parent==ROOT and asset.suffix in (".js",".css"))),"无此资源",404)
            self.send(200,asset.read_bytes(),mimetypes.guess_type(str(asset))[0] or "application/octet-stream")

    def file_request(self,con,user,key,method):
        require(re.fullmatch(r"[a-zA-Z0-9-]{12,80}",key),"无效文件编号")
        if method=="GET":
            f=con.execute("select * from files where id=?",(key,)).fetchone()
            require(f,"找不到附件",404)
            from urllib.parse import quote
            return self.send(200,f["content"],"application/octet-stream",{"X-File-Name":quote(f["name"]),"Content-Disposition":"attachment"})
        require(user["role"] in ("管理员","经办人"),"无上传权限",403)
        content=self.incoming(MAX_FILE)
        name=unquote(self.headers.get("X-File-Name",""))[:255]
        require(name,"缺少文件名称")
        require(not con.execute("select 1 from files where id=?",(key,)).fetchone(),"附件编号已存在",409)
        con.execute("insert into files values(?,?,?,?,?)",(key,user["name"],name,"application/octet-stream",content))
        con.commit();self.reply({"ok":True})

    def api(self,con,user,path,method):
        if method=="GET":
            if path=="/api/state":return self.reply(state(con))
            if path=="/api/revision":return self.reply({"revision":con.execute("select rev from workspace where id=1").fetchone()[0]})
            if path=="/api/accounts":
                require(user["role"]=="管理员","无账号管理权限",403)
                return self.reply([dict(r) for r in con.execute("select name,role from users order by name")])
            if path=="/api/history":return self.reply([dict(r) for r in con.execute("select * from runs order by id desc limit 100")])
            if path=="/api/audit":
                require(user["role"]=="管理员","无审计权限",403)
                return self.reply([dict(r) for r in con.execute("select * from audit order by id desc limit 200")])
            raise Problem(404,"无此资源")
        body=json.loads(self.incoming(20*1024*1024 if path=="/api/state" else 100000))
        if path=="/api/logout":
            con.execute("delete from sessions where token=?",(self.session_hash,));con.commit()
            return self.reply({"ok":True},extra={"Set-Cookie":self.session_cookie("",0)})
        if path=="/api/accounts":
            require(user["role"]=="管理员","无账号管理权限",403)
            create_account(con,body["name"],body["password"],body["role"])
            con.execute("insert into audit(actor,event,subject,at) values(?,?,?,?)",(user["name"],"创建账号",body["name"],timestamp()))
            con.commit();return self.reply({"ok":True})
        if path=="/api/discard-file":
            con.execute("begin immediate")
            key=body["id"]
            require(isinstance(key,str) and re.fullmatch(r"[a-zA-Z0-9-]{12,80}",key),"附件编号有误")
            doc=con.execute("select body from workspace where id=1").fetchone()[0]
            if encoded(key) not in doc:
                con.execute("delete from files where id=? and owner=?",(key,user["name"]))
            con.commit();return self.reply({"ok":True})
        if path=="/api/model":return self.reply({"answer":model_answer(body["question"],body["context"])})
        if path=="/api/company":return self.reply(company(body["kind"],body["term"]))
        if path=="/api/quote":return self.reply(stock_quote(body["code"]))
        if path=="/api/collect":
            require(user["role"]=="管理员","仅管理员可启动采集",403)
            require(self.server.collect_lock.acquire(False),"采集任务正在执行",409)
            try:return self.reply({"message":collect(self.server.directory,user["name"])})
            finally:self.server.collect_lock.release()
        require(path in ("/api/state","/api/workflow","/api/receipt"),"无此资源",404)
        con.execute("begin immediate")
        current=state(con)
        require(current["revision"]==body["revision"],"其他成员已更新数据。请刷新并核对后重试。",409)
        data=current["data"]
        if path=="/api/receipt":
            receipt=confirm_receipt(data,user,body);event,subject="财务回单确认",receipt["id"]
        elif path=="/api/workflow":
            require(body["action"] in ("submit","approve","reject"),"无效操作")
            task=workflow(data,user,body)
            event,subject=task["stage"],task["entryId"]
        else:
            updated=checked_save(con,user,data,body["data"])
            event,subject="保存业务记录","、".join(k for k in data if data[k]!=updated[k])
            data=updated
        commit(con,data,user["name"],event,subject);con.commit()
        self.reply({"revision":current["revision"]+1,**({"data":data} if path!="/api/state" else {})})

    def dispatch(self,method):
        try:self.handle_workspace(method)
        except Problem as e:self.reply({"error":str(e)},e.status)
        except (ValueError,KeyError,TypeError,UnicodeError):self.reply({"error":"数据格式有误，或授权数据源暂不可用"},400)
        except (ConnectionError,BrokenPipeError):pass
        except Exception:self.reply({"error":"服务执行失败，请核对配置或稍后重试"},500)

    def do_GET(self):self.dispatch("GET")
    def do_POST(self):self.dispatch("POST")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--port",type=int,default=18773)
    parser.add_argument("--data",type=Path,default=Path(os.getenv("YEDA_DATA", (ROOT.parent.parent if ROOT.parent.name == "基金管理前端" else ROOT.parent) / "团队运行数据")))
    args=parser.parse_args()
    directory=args.data.resolve()
    require(not directory.is_relative_to(ROOT),"数据库目录必须在网站源码目录之外")
    initialize(directory)
    server=ThreadingHTTPServer(("127.0.0.1",args.port),Handler)
    server.origin=os.environ.get("YEDA_ORIGIN",f"http://127.0.0.1:{args.port}").rstrip("/")
    server.local_setup=server.origin==f"http://127.0.0.1:{args.port}"
    server.directory=directory
    server.stop=threading.Event();server.collect_lock=threading.Lock()
    threading.Thread(target=scheduler,args=(server,),daemon=True).start()
    print("团队工作区 "+server.origin,flush=True)
    try:server.serve_forever()
    finally:server.stop.set();server.server_close()


if __name__=="__main__":main()
