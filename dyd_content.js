// 独阅读 VIP 正文并发代理（Surge 本地版）
// 源阅请求假链接 -> 本脚本拦截 -> $httpClient 并发拉全部段评 -> mock 响应返回正文纯文本
//
// 假链接格式: http://dyd.local/chapter?bid=<书号>&cid=<章号>

const UUID = "Gnzg4OfHHp103jx8e"
const SALT = "bG82gA8VPJZnLTk"
const API = "https://app.cddaoyue.cn"
const UA = "Duyuedu/2.5.9 (iPhone; iOS 15.0)"
const CONC = 40
const MAX_SEG = 400

// ---------- 纯 JS AES-256-CBC（零 IV, PKCS7; 与 App 同源算法） ----------
// 由独立 AES 内核文件提供（与书源 v26 弹层页同一份实现）
var SBOX = [0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16];
var RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];
var INVSBOX = (function(){var t=[],i;for(i=0;i<256;i++)t[SBOX[i]]=i;return t;})();
var B64C = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var B64L = (function(){var t=[],i;for(i=0;i<128;i++)t[i]=-1;for(i=0;i<B64C.length;i++)t[B64C.charCodeAt(i)]=i;return t;})();
function hexBytes(v){v=String(v||"").replace(/\s+/g,"");var o=[],i;for(i=0;i<v.length;i+=2)o.push(parseInt(v.substr(i,2),16));return o;}
function utf8(text){text=String(text==null?"":text);var out=[],i;
for(i=0;i<text.length;i++){var c=text.charCodeAt(i);
if(c>=0xd800&&c<=0xdbff&&i+1<text.length){var lo=text.charCodeAt(i+1);if(lo>=0xdc00&&lo<=0xdfff){c=0x10000+((c-0xd800)<<10)+(lo-0xdc00);i++;}}
if(c<0x80)out.push(c);
else if(c<0x800)out.push(0xc0|(c>>>6),0x80|(c&63));
else if(c<0x10000)out.push(0xe0|(c>>>12),0x80|((c>>>6)&63),0x80|(c&63));
else out.push(0xf0|(c>>>18),0x80|((c>>>12)&63),0x80|((c>>>6)&63),0x80|(c&63));}
return out;}
function bytesToStr(b){var out="",i=0;
while(i<b.length){var b0=b[i]&255,cp,ex;
if(b0<0x80){cp=b0;ex=0;}
else if((b0&0xe0)===0xc0){cp=b0&0x1f;ex=1;}
else if((b0&0xf0)===0xe0){cp=b0&0x0f;ex=2;}
else if((b0&0xf8)===0xf0){cp=b0&0x07;ex=3;}
else{i++;out+="\ufffd";continue;}
var ok=true,k;
for(k=1;k<=ex;k++){var bk=b[i+k];if(bk==null||(bk&0xc0)!==0x80){ok=false;break;}cp=(cp<<6)|(bk&0x3f);}
if(!ok){i++;out+="\ufffd";continue;}
i+=ex+1;
if(cp>0xffff){cp-=0x10000;out+=String.fromCharCode(0xd800+(cp>>10),0xdc00+(cp&0x3ff));}
else out+=String.fromCharCode(cp);}
return out;}
function b64(bytes){var out=[],i=0;
for(;i+2<bytes.length;i+=3){var n=((bytes[i]&255)<<16)|((bytes[i+1]&255)<<8)|(bytes[i+2]&255);
out.push(B64C.charAt(n>>>18),B64C.charAt((n>>>12)&63),B64C.charAt((n>>>6)&63),B64C.charAt(n&63));}
var rem=bytes.length-i;
if(rem===1){var m=(bytes[i]&255)<<16;out.push(B64C.charAt(m>>>18),B64C.charAt((m>>>12)&63),"==");}
else if(rem===2){var m2=((bytes[i]&255)<<16)|((bytes[i+1]&255)<<8);out.push(B64C.charAt(m2>>>18),B64C.charAt((m2>>>12)&63),B64C.charAt((m2>>>6)&63),"=");}
return out.join("");}
function unb64(v){var text=String(v||"").replace(/[^A-Za-z0-9+/]/g,""),out=[],i=0;
for(;i+3<text.length;i+=4){var n=(B64L[text.charCodeAt(i)]<<18)|(B64L[text.charCodeAt(i+1)]<<12)|(B64L[text.charCodeAt(i+2)]<<6)|B64L[text.charCodeAt(i+3)];
out.push((n>>>16)&255,(n>>>8)&255,n&255);}
var rem=text.length-i;
if(rem===2){var m=(B64L[text.charCodeAt(i)]<<18)|(B64L[text.charCodeAt(i+1)]<<12);out.push((m>>>16)&255);}
else if(rem===3){var m2=(B64L[text.charCodeAt(i)]<<18)|(B64L[text.charCodeAt(i+1)]<<12)|(B64L[text.charCodeAt(i+2)]<<6);out.push((m2>>>16)&255,(m2>>>8)&255);}
return out;}
function pkcs7(bytes,size){var out=bytes.slice(),p=size-(out.length%size),i;for(i=0;i<p;i++)out.push(p);return out;}
function expandKey(key){var nk=key.length>>2,nr=nk+6,w=[],i;
for(i=0;i<nk;i++)w.push([key[4*i],key[4*i+1],key[4*i+2],key[4*i+3]]);
for(i=nk;i<4*(nr+1);i++){var t=w[i-1].slice();
if(i%nk===0){t=[SBOX[t[1]]^RCON[i/nk-1],SBOX[t[2]],SBOX[t[3]],SBOX[t[0]]];}
else if(nk>6&&i%nk===4){t=[SBOX[t[0]],SBOX[t[1]],SBOX[t[2]],SBOX[t[3]]];}
w.push([w[i-nk][0]^t[0],w[i-nk][1]^t[1],w[i-nk][2]^t[2],w[i-nk][3]^t[3]]);}
return {w:w,nr:nr};}
function encBlock(rk,block){var s=block.slice(),w=rk.w,nr=rk.nr,round;
function ark(r){var c,rr;for(c=0;c<4;c++)for(rr=0;rr<4;rr++)s[4*c+rr]^=w[4*r+c][rr];}
ark(0);
for(round=1;round<nr;round++){var t=[],i;
for(i=0;i<16;i++)t.push(SBOX[s[i]]);
s=[];
var r2,c2;for(r2=0;r2<4;r2++)for(c2=0;c2<4;c2++)s[4*c2+r2]=t[4*((c2+r2)%4)+r2];
var c3;for(c3=0;c3<4;c3++){var a0=s[4*c3],a1=s[4*c3+1],a2=s[4*c3+2],a3=s[4*c3+3];
s[4*c3]=gm2(a0)^gm3(a1)^a2^a3;
s[4*c3+1]=a0^gm2(a1)^gm3(a2)^a3;
s[4*c3+2]=a0^a1^gm2(a2)^gm3(a3);
s[4*c3+3]=gm3(a0)^a1^a2^gm2(a3);}
ark(round);}
var t2=[],i2;for(i2=0;i2<16;i2++)t2.push(SBOX[s[i2]]);
s=[];
var r3,c4;for(r3=0;r3<4;r3++)for(c4=0;c4<4;c4++)s[4*c4+r3]=t2[4*((c4+r3)%4)+r3];
ark(nr);return s;}
function decBlock(rk,block){var s=block.slice(),w=rk.w,nr=rk.nr;
function ark(r){var c,rr;for(c=0;c<4;c++)for(rr=0;rr<4;rr++)s[4*c+rr]^=w[4*r+c][rr];}
ark(nr);
for(var round=nr-1;round>=1;round--){var t=[],r2,c2;
for(r2=0;r2<4;r2++)for(c2=0;c2<4;c2++)t[4*c2+r2]=s[4*((c2-r2+4)%4)+r2];
var t2=[],i;for(i=0;i<16;i++)t2.push(INVSBOX[t[i]]);
s=t2;ark(round);
var c3;for(c3=0;c3<4;c3++){var a0=s[4*c3],a1=s[4*c3+1],a2=s[4*c3+2],a3=s[4*c3+3];
s[4*c3]=gm14(a0)^gm11(a1)^gm13(a2)^gm9(a3);
s[4*c3+1]=gm9(a0)^gm14(a1)^gm11(a2)^gm13(a3);
s[4*c3+2]=gm13(a0)^gm9(a1)^gm14(a2)^gm11(a3);
s[4*c3+3]=gm11(a0)^gm13(a1)^gm9(a2)^gm14(a3);}}
var t3=[],r3,c4;for(r3=0;r3<4;r3++)for(c4=0;c4<4;c4++)t3[4*c4+r3]=s[4*((c4-r3+4)%4)+r3];
var t4=[],i2;for(i2=0;i2<16;i2++)t4.push(INVSBOX[t3[i2]]);
s=t4;ark(0);return s;}
function gm2(a){return ((a<<1)^(a&0x80?0x1b:0))&255;}
function gm3(a){return gm2(a)^a;}
function gm9(a){return gm2n(a,9);}
function gm11(a){return gm2n(a,11);}
function gm13(a){return gm2n(a,13);}
function gm14(a){return gm2n(a,14);}
function gm2n(a,mult){var r=0,i;for(i=0;i<4;i++){if(mult&(1<<i))r^=a;a=gm2(a);}return r&255;}
function unpad(bytes){if(!bytes.length)throw new Error("PKCS7 解填充：数据为空");
var p=bytes[bytes.length-1];if(p<1||p>16||bytes.length<p)throw new Error("PKCS7 解填充：长度非法");
for(var i=bytes.length-p;i<bytes.length;i++)if(bytes[i]!==p)throw new Error("PKCS7 解填充：内容非法");
return bytes.slice(0,bytes.length-p);}
function cbcEnc(bytes,key,iv){var rk=expandKey(key),padded=pkcs7(bytes,16),out=[],prev=iv.slice();
for(var off=0;off<padded.length;off+=16){var block=[],i;
for(i=0;i<16;i++)block.push(padded[off+i]^prev[i]);
var ct=encBlock(rk,block);out=out.concat(ct);prev=ct;}
return out;}
function cbcDec(bytes,key,iv){if(bytes.length%16||!bytes.length)throw new Error("CBC 密文长度必须是 16 的倍数");
var rk=expandKey(key),out=[],prev=iv.slice();
for(var off=0;off<bytes.length;off+=16){var block=bytes.slice(off,off+16),pt=decBlock(rk,block),i;
for(i=0;i<16;i++)out.push(pt[i]^prev[i]);
prev=block;}
return unpad(out);}
function encObj(o){return b64(cbcEnc(utf8(JSON.stringify(o)),KEYB,IV));}
function decObj(s){return JSON.parse(bytesToStr(cbcDec(unb64(String(s||"")),KEYB,IV)));}


// ---------- 密钥（独立于页面 I.key） ----------
var IV = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
var KEYB = hexBytes("10ff7d32393905ce632272e729f52045a3a8d286665003454439b27f4e6e4f1f");

// ---------- Surge 工具 ----------
function doneText(status, body, type) {
  $done({ response: { status: status || 200,
    headers: { "Content-Type": type || "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    body: String(body == null ? "" : body) } })
}

function parseQ(url) {
  const p = {}
  const m = String(url || "").match(/\?([^#]*)/)
  if (m) m[1].split("&").forEach(kv => { const i = kv.indexOf("="); if (i > 0) p[kv.slice(0,i)] = decodeURIComponent(kv.slice(i+1)) })
  return p
}

function post(path, params) {
  const body = Object.assign({ uuid: UUID, app_version: "2.5.9" }, params || {})
  const payload = "secret_content=" + encodeURIComponent(encObj(body))
  return new Promise((resolve, reject) => {
    $httpClient.post({ url: API + path, headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA }, body: payload }, (err, resp, data) => {
      if (err) return reject(err)
      const code = resp && resp.status ? Number(resp.status) : 0
      if (code >= 400) return reject(new Error("HTTP " + code))
      try { resolve(decObj(String(data||""))) } catch(e) { reject(new Error("dec: " + e.message)) }
    })
  })
}

let _auth = null
function guestAuth() {
  if (_auth) return Promise.resolve(_auth)
  return post("/signup/auto_login", {}).then(d => {
    if (!d || d.code !== 100000 || !d.data) throw new Error("guest login failed")
    const dd = d.data
    _auth = { login_token: String(dd.login_token||""), user_code: String(dd.user_code||""), account: String((dd.reader_info||{}).account||"") }
    return _auth
  })
}

function fetchSeg(bid, cid, idx, auth) {
  return post("/chapter/get_paragraph_tsukkomi_list", {
    login_token: auth.login_token, user_code: auth.user_code, account: auth.account,
    book_id: String(bid), chapter_id: String(cid), paragraph_index: String(idx), page: 0, count: 0
  }).then(d => {
    const dd = (d && d.data) || {}
    return { idx, text: String(dd.paragraph_content || ""), count: Number(dd.paragraph_tsukkomi_amount || 0) }
  }).catch(() => ({ idx, text: "", count: 0 }))
}

// 并发映射器：limit 并发跑 tasks
function pool(items, limit, fn) {
  return new Promise(resolve => {
    const out = new Array(items.length), cursor = 0, done = 0
    function worker() {
      if (cursor >= items.length) { if (done === items.length) resolve(out); return }
      const i = cursor++
      fn(items[i]).then(r => { out[i] = r }).catch(e => { out[i] = null }).finally(() => { done++; worker() })
    }
    for (let k = 0; k < Math.min(limit, items.length); k++) worker()
  })
}

(async () => {
  try {
    const q = parseQ($request.url)
    const bid = q.bid || "", cid = q.cid || ""
    if (!bid || !cid) return doneText(400, "missing bid/cid")
    const auth = await guestAuth()
    // 全并发（上限 400 段）
    const idxs = []; for (let i = 1; i <= MAX_SEG; i++) idxs.push(i)
    const res = await pool(idxs, CONC, i => fetchSeg(bid, cid, i, auth))
    // 按段号取到第一个空段
    const lines = []
    for (const r of res) {
      if (!r || !r.text) break
      lines.push(r.text)
    }
    if (!lines.length) return doneText(500, "empty chapter (blocked?)")
    doneText(200, lines.join("\n"))
  } catch (e) {
    doneText(500, "error: " + (e && e.message || e))
  }
})()
