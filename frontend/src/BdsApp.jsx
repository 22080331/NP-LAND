import React, { useState, useMemo, useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, resolveUrl } from "./api";

/* =========================================================
   HỆ THỐNG QUẢN LÝ BĐS — tông xanh lá · lọc theo thôn Đông Anh
   · thẻ vị trí (bản đồ) · tab Bản đồ · font Be Vietnam Pro
   ========================================================= */

// ⬇️ DANH SÁCH THÔN — anh gửi danh sách thôn chính xác của xã Đông Anh
//    để thay vào đây (đây là danh sách mẫu để chạy thử).
const KHU_VUC = [
  "Cầu Cả", "Cổ Loa", "Cổ Vân", "Cường Nỗ", "Dục Nội",
  "Dục Tú", "Đa Vang", "Đản Mỗ", "Đông Anh", "Đông Hội",
  "Đông Ngàn", "Đông Trù", "Đồng Dầu", "Gia Lương", "Hồng Lạc",
  "Hội Phụ", "Hưng Sơn", "Lộc Hà", "Lợi Đà", "Lực Canh",
  "Lý Nhân", "Mai Hiên", "Mai Lâm", "Mạch Tràng", "Oai Nỗ",
  "Phúc Hậu", "Thái Bình", "Thục Vương", "Thượng Lộc", "Thượng Oai",
  "Thượng Thư", "Uy Nỗ", "Uy Sơn", "Việt Hùng", "Xuân Canh", "Xuân Trạch",
];

const DONG_ANH = { lat: 21.135, lng: 105.83 }; // tâm khu vực để canh bản đồ

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
:root{
  --brand:#15528F; --brand-d:#0E3D6E; --brand-t:#E8F0F9;
  --gold:#B08A28; --gold-d:#8C6D1F;
  --ink:#14202E; --muted:#5A6B7E; --faint:#93A2B3;
  --bg:#F3F6FA; --card:#FFFFFF; --line:#E2E9F1;
  --ok:#2E9E5A; --warn:#C6892A; --off:#96A0AC; --info:#7C5CD6;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
.bds{max-width:440px;margin:0 auto;min-height:100%;background:var(--bg);color:var(--ink);
  font-family:'Be Vietnam Pro',ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  position:relative;padding-bottom:74px;-webkit-font-smoothing:antialiased}
.num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
.mlabel{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--faint)}
svg.ic{width:18px;height:18px;stroke:currentColor;stroke-width:1.7;fill:none;
  stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}

.top{position:sticky;top:0;z-index:20;background:linear-gradient(160deg,#134073,#0C2E56);
  padding:12px 16px 10px;display:flex;flex-direction:column;align-items:center;gap:7px}
.top .mark{width:46px;height:46px;display:grid;place-items:center;
  filter:drop-shadow(0 2px 8px rgba(0,0,0,.4))}
.top .mark img{width:100%;height:100%;object-fit:contain;display:block}
.top .sub{font-size:11px;font-weight:600;color:#AFC4E0;letter-spacing:.5px}
.top .me{margin-left:auto;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.16);
  color:#fff;display:grid;place-items:center;font-weight:800;font-size:13px;border:1px solid rgba(255,255,255,.22)}

/* khối tìm kiếm + lọc nằm trong nền navy, liền mạch với header */
.search{padding:2px 16px 10px;background:#0C2E56}
.search .box{display:flex;align-items:center;gap:9px;background:rgba(255,255,255,.13);
  border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:0 12px;transition:background .15s}
.search .box:focus-within{background:#fff;border-color:#fff}
.search .box svg{color:#AFC4E0}
.search .box:focus-within svg{color:var(--faint)}
.search input{flex:1;border:0;outline:none;padding:11px 0;font-size:16px;background:none;font-family:inherit;color:#fff}
.search .box:focus-within input{color:var(--ink)}
.search input::placeholder{color:#9FB6D6}
.search .box:focus-within input::placeholder{color:var(--faint)}

.filters{display:flex;align-items:center;gap:7px;padding:0 16px 14px;overflow-x:auto;scrollbar-width:none;
  background:#0C2E56;border-radius:0 0 20px 20px}
.filters::-webkit-scrollbar{display:none}
.chip{white-space:nowrap;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.10);color:#D5E1F2;
  padding:6px 12px;border-radius:18px;font-size:12.5px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px}
.chip.on{background:#E3B93C;color:#1E2C3F;border-color:#E3B93C;font-weight:700}
.chip .dot{width:7px;height:7px;border-radius:50%}
.chip.on .dot{outline:2px solid rgba(30,44,63,.25)}

.selrow{display:flex;gap:8px;padding:12px 16px 0}
.sel{flex:1;position:relative}
.sel select{width:100%;border:1px solid var(--line);background:var(--card);border-radius:11px;
  padding:10px 28px 10px 12px;font-size:13.5px;font-weight:600;color:var(--ink);outline:none;font-family:inherit;
  -webkit-appearance:none;appearance:none;box-shadow:0 1px 3px rgba(20,32,46,.05);
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235A6B7E' stroke-width='2.5' stroke-linecap='round'><path d='M6 9l6 6 6-6'/></svg>");
  background-repeat:no-repeat;background-position:right 10px center}
.sel select:focus{border-color:var(--brand)}
.cnt{font-size:12px;color:var(--faint);font-weight:600;padding:12px 16px 2px}

.list{padding:10px 16px 16px;display:flex;flex-direction:column;gap:12px}
.card{background:var(--card);border-radius:16px;border:1px solid var(--line);display:flex;
  overflow:hidden;cursor:pointer;transition:transform .08s;box-shadow:0 2px 8px rgba(20,32,46,.06)}
.card:active{transform:scale(.985)}
.card .thumb{width:112px;flex:0 0 112px;min-height:112px;background:var(--brand-t);position:relative;
  background-size:cover;background-position:center;display:grid;place-items:center;color:#A9BDD6}
.card .stpill{position:absolute;top:7px;left:7px;display:flex;align-items:center;gap:5px;white-space:nowrap;
  background:rgba(255,255,255,.95);padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;color:var(--ink);
  box-shadow:0 1px 4px rgba(20,32,46,.15)}
.card .stpill .dot{width:6px;height:6px;border-radius:50%}
.card .body{padding:11px 13px;flex:1;min-width:0;display:flex;flex-direction:column}
.card .ttl{font-size:14px;font-weight:700;line-height:1.32;margin:0 0 5px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .meta{font-size:12px;color:var(--muted);margin:0;display:flex;align-items:center;gap:5px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .meta svg{width:13px;height:13px;color:var(--faint)}
.card .tagrow{display:flex;align-items:center;gap:8px;margin-top:6px;min-width:0}
.card .tag{display:inline-flex;align-items:center;gap:5px;color:var(--faint);font-size:11.5px;font-weight:600;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.card .tag svg{color:var(--faint);flex:0 0 auto}
.card .tago{margin-left:auto;font-size:10.5px;color:var(--faint);white-space:nowrap;flex:0 0 auto}
.stpill.tap{cursor:pointer}
.stpill.tap svg{color:var(--faint)}
.strow{display:flex;align-items:center;gap:11px;padding:13px 4px;border-top:1px solid var(--line);
  font-size:14.5px;font-weight:700;color:var(--ink);cursor:pointer}
.strow:first-of-type{border-top:0}
.strow .dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto}
.strow .grow{flex:1}
.strow.on{color:var(--brand-d)}
.card .price{font-size:17px;font-weight:800;color:var(--gold-d);margin-top:auto;padding-top:8px;
  display:flex;align-items:center;gap:5px;min-width:0}
.card .price small{font-size:11px;color:var(--faint);font-weight:600}
.card .poster{margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;
  color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .pav{width:18px;height:18px;border-radius:50%;background:var(--brand-t);color:var(--brand-d);
  display:grid;place-items:center;font-size:9.5px;font-weight:800;flex:0 0 auto}

.nav{position:fixed;bottom:0;left:0;right:0;max-width:440px;margin:0 auto;background:var(--card);
  border-top:1px solid var(--line);display:flex;align-items:center;z-index:30;padding:6px 0 8px}
.nav button{flex:1;border:0;background:none;padding:6px 0;font-size:11px;font-weight:600;color:var(--faint);
  display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:inherit}
.nav button.on{color:var(--brand)}
.nav .fab{flex:0 0 auto}
.nav .fab .plus{width:54px;height:54px;border-radius:50%;background:linear-gradient(150deg,#E9C34A,#C9992B);
  color:#1E2C3F;display:grid;place-items:center;margin-top:-24px;box-shadow:0 6px 16px rgba(201,153,43,.45);
  border:3px solid var(--card)}
.nav .fab .plus svg{width:26px;height:26px;stroke-width:2.2}

.hero{height:210px;background:var(--brand-t);background-size:cover;background-position:center;position:relative;
  display:grid;place-items:center;color:#A9BDD6}
.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(to top,rgba(12,32,58,.55),transparent 55%)}
.hero .rnd{position:absolute;top:12px;width:36px;height:36px;border-radius:50%;
  background:rgba(255,255,255,.92);color:var(--ink);border:0;display:grid;place-items:center;cursor:pointer;z-index:2}
.hero .back{left:12px}
.hero .stpill{position:absolute;bottom:12px;left:12px;display:flex;align-items:center;gap:6px;z-index:2;
  background:rgba(255,255,255,.94);padding:5px 11px;border-radius:20px;font-size:12px;font-weight:700}
.hero .stpill .dot{width:7px;height:7px;border-radius:50%}
.dhead{padding:14px 16px 0}
.dhead .ttl{font-size:20px;font-weight:800;line-height:1.3;margin:0 0 6px}
.dhead .price{font-size:26px;font-weight:900;color:var(--gold-d)}
.dhead .price small{font-size:14px;color:var(--faint);font-weight:600}
.sec{background:var(--card);margin:12px 16px 0;border-radius:14px;padding:15px;border:1px solid var(--line)}
.sec .mlabel{margin:0 0 12px}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.kv .k{font-size:11px;color:var(--muted);margin-bottom:2px;font-weight:600}
.kv .v{font-size:14px;font-weight:700}
.desc{font-size:14px;line-height:1.62;color:#2B3949;white-space:pre-wrap}
.lockbox{display:flex;gap:11px;align-items:flex-start;background:var(--brand-t);border-radius:11px;
  padding:12px;margin-bottom:8px}
.lockbox .lockic{width:34px;height:34px;border-radius:9px;background:#fff;color:var(--brand-d);
  display:grid;place-items:center;flex:0 0 auto}
.lockbox .lt{font-size:13px;font-weight:700}
.lockbox .ls{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.55}
.lockbox .ls b{color:var(--brand-d)}
.person{display:flex;align-items:center;gap:11px;padding:11px 0;border-top:1px solid var(--line)}
.person:first-of-type{border-top:0;padding-top:0}
.person .av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:14px;color:#fff}
.person .role{font-size:11px;color:var(--faint);font-weight:600}
.person .nm{font-size:14px;font-weight:700}
.person .call{margin-left:auto;display:flex;align-items:center;gap:6px;text-decoration:none;
  border:1px solid var(--brand);color:var(--brand-d);padding:7px 12px;border-radius:9px;font-size:12px;font-weight:700}
.person .call svg{width:15px;height:15px}

.mapwrap{border:1px solid var(--line);border-radius:11px;overflow:hidden;height:190px;background:var(--brand-t);
  position:relative;z-index:0}
.mapwrap iframe{width:100%;height:100%;border:0;display:block}
.mapbtn{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;
  border:1px solid var(--brand);color:var(--brand-d);border-radius:10px;padding:11px;font-weight:700;
  font-size:13px;text-decoration:none;background:var(--card)}
.mapbtn svg{width:15px;height:15px}

.actionbar{position:fixed;bottom:0;left:0;right:0;max-width:440px;margin:0 auto;background:var(--card);
  border-top:1px solid var(--line);padding:12px 16px calc(12px + env(safe-area-inset-bottom));display:flex;gap:10px;z-index:40}
.actionbar .primary{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;border:0;
  background:var(--brand);color:#fff;padding:14px;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit}
.actionbar .ghost{width:52px;border:1px solid var(--line);background:var(--card);border-radius:12px;
  display:grid;place-items:center;color:var(--muted);cursor:pointer}

/* tab Bản đồ */
.mapview .bigmap{height:300px;background:var(--brand-t)}
.mapview .bigmap iframe{width:100%;height:100%;border:0;display:block}
.mapstrip{padding:12px 16px 16px;display:flex;flex-direction:column;gap:10px}
.mrow{display:flex;align-items:center;gap:11px;background:var(--card);border:1px solid var(--line);
  border-radius:12px;padding:11px;cursor:pointer}
.mrow.on{border-color:var(--brand);box-shadow:0 0 0 1px var(--brand)}
.mrow .pin{width:34px;height:34px;border-radius:9px;background:var(--brand-t);color:var(--brand-d);display:grid;place-items:center}
.mrow .t{font-size:13px;font-weight:700;line-height:1.3;margin:0}
.mrow .m{font-size:11px;color:var(--muted);margin:2px 0 0}
.mrow .go{margin-left:auto;color:var(--faint)}

/* form */
.form{padding:14px 16px 24px}
.form h2{font-size:20px;font-weight:800;margin:0 0 14px}
.groupt{font-size:12px;font-weight:800;color:var(--brand-d);letter-spacing:.3px;margin:20px 0 10px}
.ai{background:var(--brand-t);border-radius:14px;padding:15px;margin-bottom:8px}
.ai .h{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;color:var(--brand-d);margin:0 0 3px}
.ai .s{font-size:12px;color:var(--muted);margin:0 0 11px;line-height:1.5}
.ai textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:12px;font-size:16px;
  min-height:88px;resize:vertical;outline:none;font-family:inherit;background:#fff;color:var(--ink)}
.ai textarea:focus{border-color:var(--brand)}
.ai .btn{width:100%;margin-top:10px;border:0;background:var(--brand);color:#fff;padding:12px;border-radius:10px;
  font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit}
.ai .btn:disabled{opacity:.55}
.err{color:#C0492A;font-size:12px;margin-top:9px;font-weight:600}
.spin{width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.field{margin-bottom:13px}
.field label{display:block;font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px}
.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:11px 12px;
  font-size:16px;background:var(--card);outline:none;font-family:inherit;color:var(--ink)}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--brand)}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.imgpick{border:1px dashed var(--line);border-radius:10px;padding:16px;text-align:center;cursor:pointer;color:var(--muted);
  font-size:13px;font-weight:600}
.imgpick svg{width:22px;height:22px;color:var(--faint);margin-bottom:4px}
.imgbtns{display:flex;gap:9px}
.imgbtns .imgpick{flex:1;padding:14px 8px}
.imgbtns .imgpick:first-child{border-color:var(--brand);color:var(--brand-d);border-style:solid;background:var(--brand-t)}
.imgbtns .imgpick:first-child svg{color:var(--brand)}
.save{width:100%;border:0;background:var(--brand);color:#fff;padding:15px;border-radius:12px;font-size:15px;
  font-weight:800;cursor:pointer;margin-top:14px;box-shadow:0 5px 14px rgba(21,82,143,.3);font-family:inherit}
.cancel{width:100%;border:1px solid var(--line);background:var(--card);color:var(--muted);padding:13px;
  font-weight:700;cursor:pointer;margin-top:10px;font-family:inherit;border-radius:12px;font-size:14px}

.ov{position:fixed;inset:0;background:rgba(21,32,25,.5);z-index:60;display:flex;align-items:flex-end;justify-content:center}
.sheet{background:var(--bg);width:100%;max-width:440px;border-radius:18px 18px 0 0;padding:8px 16px 24px;max-height:88%;overflow-y:auto}
.sheet .grab{width:38px;height:4px;background:var(--line);border-radius:3px;margin:6px auto 12px}
.sheet h3{margin:0 0 12px;font-size:16px;font-weight:800}
.chan{display:flex;gap:10px;margin-bottom:14px}
.chan button{flex:1;border:1px solid var(--line);background:var(--card);border-radius:12px;padding:14px 8px;
  display:flex;flex-direction:column;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--ink);cursor:pointer;font-family:inherit}
.chan button.on{border-color:var(--brand);background:var(--brand-t)}
.prev{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px;font-size:13px;
  line-height:1.6;white-space:pre-wrap;margin-bottom:12px;color:#2B3949}
.cp{width:100%;border:0;background:var(--ink);color:#fff;padding:14px;border-radius:12px;font-weight:800;font-size:14px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;font-family:inherit}
.empty{text-align:center;padding:64px 30px;color:var(--muted)}
.empty svg{width:38px;height:38px;color:var(--faint);margin-bottom:12px}

.tp{position:relative}
.tp .cur{display:flex;align-items:center;gap:8px;width:100%;border:1px solid var(--line);background:var(--card);
  border-radius:11px;padding:10px 12px;font-size:13.5px;font-weight:600;color:var(--ink);cursor:pointer;text-align:left;
  font-family:inherit;box-shadow:0 1px 3px rgba(20,32,46,.05)}
.tp .cur.ph{color:var(--faint);font-weight:500}
.tp .cur .cv{margin-left:auto;color:var(--faint)}
.tp .backdrop{position:fixed;inset:0;z-index:65}
.tp .panel{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:70;background:var(--card);
  border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px rgba(21,32,25,.16);overflow:hidden}
.tp .si{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line)}
.tp .si input{flex:1;border:0;outline:none;font-size:16px;font-family:inherit;background:none;color:var(--ink)}
.tp .si svg{color:var(--faint)}
.tp .items{max-height:236px;overflow-y:auto}
.tp .opt{padding:11px 14px;font-size:14px;cursor:pointer;display:flex;align-items:center;gap:8px}
.tp .opt:active{background:var(--brand-t)}
.tp .opt.sel{color:var(--brand-d);font-weight:700;background:var(--brand-t)}
.tp .opt.none{color:var(--muted)}
.tp .opt .ck{margin-left:auto;color:var(--brand)}
.tp .nomatch{padding:16px;text-align:center;color:var(--faint);font-size:13px}

/* gallery ảnh ở trang chi tiết */
.gallery{display:flex;gap:8px;padding:10px 16px 0;overflow-x:auto;scrollbar-width:none}
.gallery::-webkit-scrollbar{display:none}
.gthumb{flex:0 0 64px;height:64px;border-radius:9px;background-size:cover;background-position:center;
  cursor:pointer;border:2px solid transparent;opacity:.7}
.gthumb.on{border-color:var(--brand);opacity:1}

/* lưới ảnh trong form */
.imgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.imgcell{position:relative;padding-top:75%;border-radius:10px;background-size:cover;background-position:center;border:1px solid var(--line)}
.imgdel{position:absolute;top:5px;right:5px;width:24px;height:24px;border:0;border-radius:50%;
  background:rgba(21,32,25,.72);color:#fff;display:grid;place-items:center;cursor:pointer}
.imgpick .spin{margin-right:8px}

/* form wizard 3 bước */
.wizard{padding:0 0 130px}
.wizhead{display:flex;align-items:center;gap:8px;padding:14px 16px 4px}
.wizx{width:36px;height:36px;border:0;border-radius:50%;background:var(--card);color:var(--muted);
  display:grid;place-items:center;cursor:pointer;border:1px solid var(--line)}
.wiztitle{flex:1;text-align:center;font-size:17px;font-weight:800;color:var(--ink)}
.stepper{display:flex;gap:6px;padding:12px 16px 4px}
.stp{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;position:relative;padding:2px 0 8px}
.stp:after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;border-radius:3px;background:var(--line)}
.stp.on:after{background:var(--brand)}
.stp.done:after{background:var(--ok)}
.stp .dot{width:26px;height:26px;border-radius:50%;background:var(--card);border:1.5px solid var(--line);
  color:var(--faint);display:grid;place-items:center;font-size:12px;font-weight:800}
.stp.on .dot{background:var(--brand);border-color:var(--brand);color:#fff}
.stp.done .dot{background:var(--ok);border-color:var(--ok);color:#fff}
.stp .lb{font-size:10.5px;font-weight:700;color:var(--faint);white-space:nowrap}
.stp.on .lb{color:var(--brand-d)}
.stp.done .lb{color:var(--ok)}
.wizbody{padding:12px 16px 0}
.wizbar{position:fixed;bottom:0;left:0;right:0;max-width:440px;margin:0 auto;background:var(--card);
  border-top:1px solid var(--line);padding:10px 16px calc(12px + env(safe-area-inset-bottom));z-index:40}
.wizerr{color:#C43D2B;font-size:12.5px;font-weight:600;margin-bottom:8px;text-align:center}
.wizbtns{display:flex;gap:10px}
.wback{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1px solid var(--line);
  background:var(--card);color:var(--muted);padding:13px;border-radius:12px;font-size:14px;font-weight:700;
  cursor:pointer;font-family:inherit}
.wnext{flex:2;display:flex;align-items:center;justify-content:center;gap:6px;border:0;
  background:var(--brand);color:#fff;padding:13px;border-radius:12px;font-size:15px;font-weight:800;
  cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(21,82,143,.3)}

/* ô giá thông minh + nháp */
.pricebox{display:flex;gap:8px;align-items:stretch}
.pricebox input{flex:1;min-width:0}
.unitsw{display:flex;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:var(--card);flex:0 0 auto}
.unitsw button{border:0;background:none;padding:0 14px;font-weight:700;font-family:inherit;
  color:var(--muted);cursor:pointer;font-size:14px}
.unitsw button.on{background:var(--brand);color:#fff}
.pricewords{font-size:12.5px;font-weight:700;color:var(--gold-d);margin-top:6px}
.ppm2{border:1px dashed var(--line);border-radius:10px;padding:12px;font-size:14px;
  color:var(--muted);background:var(--bg);font-weight:600}
.draftbar{display:flex;align-items:center;gap:9px;background:#FBF3DC;border:1px solid #E8D9A8;
  border-radius:11px;padding:10px 12px;margin-bottom:12px;font-size:12.5px;font-weight:600;color:#6B5616}
.draftbar .grow{flex:1;min-width:0}
.draftbar button{border:0;background:var(--brand);color:#fff;border-radius:8px;padding:7px 11px;
  font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;flex:0 0 auto}
.draftbar button.dim{background:none;color:var(--muted);border:1px solid var(--line)}
.bds.dark .draftbar{background:#3A3220;border-color:#5C4D23;color:#E8D9A8}

/* ghim vị trí trên bản đồ */
.mappick{position:relative;z-index:0}
.mapbox{height:235px;border-radius:12px;border:1px solid var(--line);overflow:hidden;
  position:relative;z-index:0;background:var(--brand-t)}
.mapbox .leaflet-container{font-family:inherit}
.npin{width:26px;height:26px;background:linear-gradient(150deg,#E9C34A,#C9992B);border:3px solid #fff;
  border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,.4);
  position:absolute;left:2px;top:2px}
.npin-dot{position:absolute;left:12px;top:12px;width:6px;height:6px;border-radius:50%;background:#fff;z-index:1}
.satbtn{position:absolute;top:9px;right:9px;z-index:5;border:0;border-radius:9px;padding:7px 12px;
  background:rgba(255,255,255,.95);color:var(--ink);font-size:12px;font-weight:700;cursor:pointer;
  font-family:inherit;box-shadow:0 1px 6px rgba(0,0,0,.28)}
.bds.dark .satbtn{background:rgba(24,38,64,.95)}
.maprow{display:flex;gap:8px;margin-top:9px}
.gpsbtn{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:10px;
  background:var(--brand);color:#fff;padding:11px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}
.gpsbtn:disabled{opacity:.65}
.clearpin{display:flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:10px;
  background:var(--card);color:var(--muted);padding:11px 13px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:inherit}
.maphint{font-size:12px;color:var(--muted);margin-top:8px;line-height:1.5}
.maphint b{color:var(--brand-d)}

/* màn đăng nhập */
.login{min-height:100vh;background:linear-gradient(168deg,#16467E 0%,#0D3260 45%,#081F3F 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:36px 24px;position:relative;overflow:hidden}
.ldeco{position:absolute;border-radius:50%;pointer-events:none}
.ldeco.d1{width:340px;height:340px;top:-120px;right:-110px;background:radial-gradient(circle,rgba(233,195,74,.14),transparent 68%)}
.ldeco.d2{width:420px;height:420px;bottom:-180px;left:-160px;background:radial-gradient(circle,rgba(61,124,196,.22),transparent 68%)}
.ldeco.d3{width:200px;height:200px;top:34%;left:-90px;background:radial-gradient(circle,rgba(233,195,74,.08),transparent 70%)}
.lhero{text-align:center;margin-bottom:26px;position:relative}
.llogo{width:128px;height:128px;object-fit:contain;display:block;margin:0 auto 10px;
  filter:drop-shadow(0 10px 28px rgba(0,0,0,.45))}
.ltag{font-size:12.5px;font-weight:600;color:#AFC4E0;letter-spacing:.6px}
.lcard{width:100%;max-width:350px;background:rgba(233,240,250,.14);border-radius:20px;padding:24px 22px 22px;
  box-shadow:0 18px 50px rgba(4,12,26,.3);position:relative;
  border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.lhead{font-size:19px;font-weight:800;color:#F2F6FC}
.lsub{font-size:12.5px;color:#A9BEDC;margin:3px 0 18px}
.lfield{display:flex;align-items:center;gap:10px;border:1.5px solid rgba(255,255,255,.2);border-radius:12px;
  padding:0 13px;margin-bottom:12px;background:rgba(255,255,255,.09);transition:border-color .15s,background .15s}
.lfield:focus-within{border-color:rgba(233,195,74,.75);background:rgba(255,255,255,.15)}
.lfield .lic{color:#8FA6C6;display:grid;place-items:center}
.lfield:focus-within .lic{color:#E9C34A}
.lfield input{flex:1;border:0;outline:none;padding:13px 0;font-size:16px;background:none;
  font-family:inherit;color:#F2F6FC}
.lfield input::placeholder{color:#8FA6C6}
.lerr{color:#F2A090;font-size:12.5px;font-weight:600;margin:-2px 0 10px;text-align:center}
.lbtn{width:100%;border:0;border-radius:12px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;
  font-family:inherit;color:#1E2C3F;background:linear-gradient(150deg,#EDCB5B,#C9992B);
  box-shadow:0 6px 18px rgba(201,153,43,.28);display:flex;align-items:center;justify-content:center;gap:8px;margin-top:4px}
.lbtn:disabled{opacity:.7}
.lfoot{margin-top:26px;font-size:11px;color:#7E95B5;letter-spacing:.4px;position:relative}

/* hộp xác nhận trong app */
.cfm{background:var(--card);border-radius:18px;padding:22px 20px 18px;width:calc(100% - 56px);max-width:330px;
  box-shadow:0 18px 50px rgba(10,20,35,.35);animation:cfmin .16s ease-out}
@keyframes cfmin{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}
.cfmt{font-size:16.5px;font-weight:800;color:var(--ink);text-align:center}
.cfmm{font-size:13.5px;color:var(--muted);line-height:1.55;text-align:center;margin:8px 0 18px}
.cfmb{display:flex;gap:10px}
.cfmb .wback,.cfmb .wnext{padding:12px}
.cfmdanger{background:#C43D2B;box-shadow:0 4px 12px rgba(196,61,43,.3)}

/* trang tổng quan */
.stgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sttile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:13px 14px;
  box-shadow:0 1px 4px rgba(20,32,46,.05)}
.sttile .stv{font-size:22px;font-weight:900;color:var(--ink);letter-spacing:-.3px}
.sttile.big .stv{color:var(--brand-d)}
.sttile.gold .stv{color:var(--gold-d)}
.sttile .stl{font-size:11.5px;color:var(--muted);font-weight:600;margin-top:3px;display:flex;align-items:center;gap:5px}
.sttile .stl .dot{width:7px;height:7px;border-radius:50%;flex:0 0 auto}
.statcard{padding:14px}
.statcard .mlabel{margin:0 0 12px}
.brow{display:flex;align-items:center;gap:9px;margin-top:9px}
.brow:first-of-type{margin-top:0}
.bname{font-size:13px;font-weight:700;color:var(--ink);width:88px;flex:0 0 auto;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.btrack{flex:1;height:8px;border-radius:6px;background:var(--bg);overflow:hidden}
.bfill{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,#3D7CC4,#15528F);min-width:8px}
.bfill.gold{background:linear-gradient(90deg,#E9C34A,#C9992B)}
.bnum{font-size:12.5px;font-weight:800;color:var(--muted);width:22px;text-align:right;flex:0 0 auto}
.srcsplit{display:flex;gap:6px}
.srcseg{background:var(--brand-t);border-radius:10px;padding:11px 12px;min-width:86px}
.srcseg:nth-child(2){background:#FBF3DC}
.bds.dark .srcseg:nth-child(2){background:#3A3220}
.srcn{font-size:19px;font-weight:900;color:var(--brand-d)}
.srcseg:nth-child(2) .srcn{color:var(--gold-d)}
.srcl{font-size:11.5px;font-weight:700;color:var(--muted);margin-top:1px}

/* trang cài đặt */
.setprofile{display:flex;align-items:center;gap:14px;padding:20px 16px 6px}
.bigav{width:56px;height:56px;border-radius:50%;background:linear-gradient(150deg,#15528F,#0C2E56);color:#fff;
  display:grid;place-items:center;font-weight:800;font-size:22px}
.setname{font-size:18px;font-weight:800}
.setsub{font-size:12px;color:var(--muted);margin-top:2px}
.setcard{background:var(--card);border:1px solid var(--line);border-radius:14px;margin:14px 16px 0;overflow:hidden}
.setrow{display:flex;align-items:center;gap:12px;padding:13px 14px;border-top:1px solid var(--line);
  font-size:14px;font-weight:700;color:var(--ink)}
.setrow:first-child{border-top:0}
.setrow .sic{width:34px;height:34px;border-radius:9px;background:var(--brand-t);color:var(--brand-d);
  display:grid;place-items:center;flex:0 0 auto}
.setrow .grow{flex:1;min-width:0}
.shint{font-size:11.5px;color:var(--faint);font-weight:500;margin-top:1px}
.setrow.danger{color:#C43D2B}
.setrow.danger .sic{background:#FCEBE7;color:#C43D2B}
.pwform{padding:4px 14px 14px;display:flex;flex-direction:column;gap:9px}
.pwform input{border:1px solid var(--line);border-radius:10px;padding:11px 12px;font-size:16px;
  font-family:inherit;background:var(--bg);color:var(--ink);outline:none}
.pwform input:focus{border-color:var(--brand)}
.pwbtn{border:0;background:var(--brand);color:#fff;padding:12px;border-radius:10px;font-size:14px;
  font-weight:800;cursor:pointer;font-family:inherit}
.pwbtn:disabled{opacity:.6}
.setmsg{padding:0 14px 13px;font-size:12.5px;font-weight:600;color:#C43D2B}
.setmsg.ok{color:var(--ok)}
.setver{text-align:center;font-size:11px;color:var(--faint);margin-top:22px;padding:0 24px;line-height:1.6}
.rolechip{display:inline-block;background:linear-gradient(150deg,#EDCB5B,#C9992B);color:#1E2C3F;
  font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:8px;vertical-align:2px;margin-left:4px;
  text-transform:uppercase;letter-spacing:.4px}
.mact{width:32px;height:32px;border-radius:9px;border:1px solid var(--line);background:var(--card);
  color:var(--muted);display:grid;place-items:center;cursor:pointer}
.mact.danger{color:#C43D2B;border-color:#F0CFC8}
.bds.dark .mact.danger{border-color:#5A2E28}

.tgl{width:46px;height:26px;border-radius:20px;background:var(--line);border:0;position:relative;
  cursor:pointer;flex:0 0 auto;transition:background .15s;padding:0}
.tgl span{position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;
  transition:left .15s;box-shadow:0 1px 3px rgba(0,0,0,.25)}
.tgl.on{background:var(--brand)}
.tgl.on span{left:23px}

/* giao diện tối */
.bds.dark{
  --bg:#0F1826; --card:#182640; --line:#263954; --ink:#E9EFF8; --muted:#A3B4CB; --faint:#748AA6;
  --brand:#3D7CC4; --brand-d:#8FB8E4; --brand-t:#1E3050; --gold-d:#E0BA55; --gold:#E0BA55;
}
.bds.dark .search .box:focus-within{background:#0F1826;border-color:#3D7CC4}
.bds.dark .search .box:focus-within input{color:var(--ink)}
.bds.dark .ai textarea{background:var(--bg)}
.bds.dark .desc,.bds.dark .prev{color:var(--ink)}
.bds.dark .stpill,.bds.dark .hero .stpill{background:rgba(24,38,64,.94);color:var(--ink)}
.bds.dark .hero .rnd{background:rgba(24,38,64,.92);color:var(--ink)}
.bds.dark .mrow.on{box-shadow:0 0 0 1px var(--brand)}
.bds.dark .cp{background:#E0BA55;color:#1B2A3E}
.bds.dark .setrow.danger .sic{background:#3A2320}

/* desktop: căn giữa khung điện thoại + nền 2 bên */
@media (min-width:700px){
  html,body{background:radial-gradient(1200px 700px at 50% 0%,#132B4C,#080F1C 75%) fixed #080F1C}
  .bds{margin:24px auto;min-height:calc(100vh - 48px);border:1px solid rgba(255,255,255,.09);
    border-radius:22px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,.55)}
  .top{border-radius:22px 22px 0 0}
  .nav,.actionbar,.wizbar{border-radius:0 0 22px 22px}
}
`;

const P = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14",
  plus: "M12 5v14M5 12h14",
  back: "M15 18l-6-6 6-6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  pin: "M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  phone: "M4 5c0 8.3 6.7 15 15 15a2 2 0 0 0 2-2v-2.3a1 1 0 0 0-.8-1l-3.6-.8a1 1 0 0 0-1 .3l-1 1.2a12 12 0 0 1-5.2-5.2l1.2-1a1 1 0 0 0 .3-1L9.3 4.8a1 1 0 0 0-1-.8H6a2 2 0 0 0-2 2Z",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14",
  doc: "M6 2h8l4 4v16H6ZM14 2v4h4",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9Z",
  image: "M4 5h16v14H4zM8 11l-4 5M20 15l-5-6-4 5-2-2-2 3M9 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  check: "M20 6 9 17l-5-5",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  chev: "M9 6l6 6-6 6",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z",
  lock: "M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5zM12 15v2.5",
  gear: "M5 21v-6M5 11V3M12 21v-10M12 7V3M19 21v-4M19 13V3M2.5 15h5M9.5 9h5M16.5 17h5",
  bell: "M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2ZM10 21h4",
  moon: "M21 13A8.5 8.5 0 1 1 11 3a7 7 0 0 0 10 10Z",
  out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  chart: "M3 3v18h18M8 17v-6M13 17V7M18 17v-4",
  user: "M20 21a8 8 0 1 0-16 0M12 13a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z",
  cam: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-3h6l2 3h3a2 2 0 0 1 2 2ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6",
  x: "M6 6l12 12M18 6L6 18",
};
const Icon = ({ n, size }) => (
  <svg className="ic" viewBox="0 0 24 24" style={size ? { width: size, height: size } : undefined}>
    {(P[n] || "").split("M").filter(Boolean).map((d, i) => <path key={i} d={"M" + d} />)}
  </svg>
);

const STATUS = {
  dang_ban: { label: "Đang bán", c: "var(--ok)" },
  coc: { label: "Cọc", c: "var(--warn)" },
  da_ban: { label: "Đã bán", c: "var(--off)" },
  quan_tam: { label: "Quan tâm", c: "var(--info)" },
};
const TYPES = ["đất", "nhà", "căn hộ", "shop", "văn phòng"];
const SOURCE = ["chính chủ", "qua cò"];
const PRICE_RANGES = [
  { label: "Mức giá", min: 0, max: Infinity },
  { label: "Dưới 1 tỷ", min: 0, max: 1e9 },
  { label: "1 – 2 tỷ", min: 1e9, max: 2e9 },
  { label: "2 – 3 tỷ", min: 2e9, max: 3e9 },
  { label: "3 – 5 tỷ", min: 3e9, max: 5e9 },
  { label: "5 – 10 tỷ", min: 5e9, max: 10e9 },
  { label: "Trên 10 tỷ", min: 10e9, max: Infinity },
];
const SORTS = { new: "Mới nhất", price_asc: "Giá thấp → cao", price_desc: "Giá cao → thấp", area_desc: "Diện tích lớn" };

const timeAgo = (iso) => {
  if (!iso) return "";
  const t = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z").getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 3600) return "vừa đăng";
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} ngày trước`;
  if (s < 30 * 86400) return `${Math.floor(s / 604800)} tuần trước`;
  if (s < 365 * 86400) return `${Math.floor(s / 2592000)} tháng trước`;
  return `${Math.floor(s / 31536000)} năm trước`;
};
const LEGAL = ["sổ đỏ", "sổ hồng", "sổ chung", "vi bằng", "chưa có"];
const LAND = ["thổ cư", "thổ cư một phần", "nông nghiệp"];

const fmtPrice = (v) => (!v ? "—" : v >= 1e9 ? (v / 1e9).toFixed(v % 1e9 === 0 ? 0 : 1) + " tỷ" : Math.round(v / 1e6) + " tr");
const fmtPriceWords = (v) => {
  v = Number(v) || 0;
  if (!v) return "";
  const ty = Math.floor(v / 1e9), tr = Math.round((v % 1e9) / 1e6);
  if (ty && tr) return `${ty} tỷ ${tr} triệu`;
  if (ty) return `${ty} tỷ`;
  if (tr) return `${tr} triệu`;
  return `${v.toLocaleString("vi-VN")} đồng`;
};
const fmtM2 = (v) => (v ? Math.round(v / 1e6) + " tr/m²" : "");
const initials = (n) => { const w = (n || "?").trim().split(" "); return (w[w.length - 1][0] || "?").toUpperCase(); };
const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
const osmSrc = (lat, lng) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - 0.012).toFixed(4)}%2C${(lat - 0.008).toFixed(4)}%2C${(lng + 0.012).toFixed(4)}%2C${(lat + 0.008).toFixed(4)}&layer=mapnik&marker=${lat}%2C${lng}`;
const gmapLink = (p) =>
  p.lat && p.lng
    ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((p.address || "") + " Đông Anh Hà Nội")}`;

const SEED = [
  { id: "1", title: "Đất thổ cư thôn Cổ Loa, ngõ ô tô 90m²", type: "đất", area: 90, frontage: 5, direction: "đông nam",
    khu: "Cổ Loa", address: "Ngõ 12, thôn Cổ Loa, Đông Anh", lat: 21.1197, lng: 105.8788,
    price: 4500000000, price_per_m2: 50000000, legal: "sổ đỏ", land: "thổ cư",
    planning: "không dính quy hoạch", division: "đã tách thửa", status: "dang_ban", posted_by: "Nam",
    desc: "Đất thổ cư 100%, ngõ ô tô tránh, gần khu di tích Cổ Loa. Sổ đỏ chính chủ, sẵn sàng giao dịch.",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400",
    contacts: [{ type: "đầu chủ", name: "Anh Tuấn", phone: "0903123456" }] },
  { id: "2", title: "Đất mặt đường liên thôn Uy Nỗ 120m²", type: "đất", area: 120, frontage: 6, direction: "tây",
    khu: "Uy Nỗ", address: "Đường liên thôn Uy Nỗ, Đông Anh", lat: 21.1452, lng: 105.8501,
    price: 7200000000, price_per_m2: 60000000, legal: "sổ đỏ", land: "thổ cư",
    planning: "không dính quy hoạch", division: "đã tách thửa", status: "coc", posted_by: "Hương",
    desc: "Mặt đường kinh doanh, vuông vắn, tiện xây nhà hoặc mở cửa hàng.",
    img: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400",
    contacts: [{ type: "đầu chủ", name: "Chị Lan", phone: "0912987654" }, { type: "khách quan tâm", name: "Anh Minh", phone: "0987000111" }] },
  { id: "3", title: "Đất dịch vụ thôn Đông Hội 75m²", type: "đất", area: 75, frontage: 4, direction: "nam",
    khu: "Đông Hội", address: "Khu dịch vụ thôn Đông Hội, Đông Anh", lat: 21.1108, lng: 105.8712,
    price: 3000000000, price_per_m2: 40000000, legal: "sổ đỏ", land: "thổ cư",
    planning: "không dính quy hoạch", division: "đã tách thửa", status: "quan_tam", posted_by: "Nam",
    desc: "Đất khu dịch vụ, hạ tầng hoàn thiện, đường rộng 8m. Phù hợp đầu tư.",
    img: "", contacts: [{ type: "đầu chủ", name: "Anh Phúc", phone: "0938222333" }] },
  { id: "4", title: "Đất vườn thôn Việt Hùng 200m² (60m² thổ cư)", type: "đất", area: 200, frontage: 7, direction: "đông",
    khu: "Việt Hùng", address: "Thôn Việt Hùng, Đông Anh", lat: 21.1553, lng: 105.8447,
    price: 5000000000, price_per_m2: 25000000, legal: "sổ đỏ", land: "thổ cư một phần",
    planning: "không dính quy hoạch", division: "đã tách thửa", status: "dang_ban", posted_by: "Nam",
    desc: "Lô đất rộng có 60m² thổ cư, còn lại đất trồng cây. Thích hợp làm nhà vườn.",
    img: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400",
    contacts: [{ type: "đầu chủ", name: "Bác Hùng", phone: "0977111222" }] },
];

function ThonPicker({ value, onChange, allowAll, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = KHU_VUC.filter((k) => norm(k).includes(norm(q)));
  const pick = (v) => { onChange(v); setOpen(false); setQ(""); };
  return (
    <div className="tp">
      <button type="button" className={"cur" + (!value ? " ph" : "")} onClick={() => setOpen(true)}>
        {value || placeholder}
        <span className="cv"><Icon n="chev" size={16} /></span>
      </button>
      {open && (
        <>
          <div className="backdrop" onClick={() => { setOpen(false); setQ(""); }} />
          <div className="panel">
            <div className="si"><Icon n="search" size={16} />
              <input autoFocus placeholder="Gõ tên thôn…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <div className="items">
              {allowAll && <div className={"opt none" + (!value ? " sel" : "")} onClick={() => pick("")}>Tất cả thôn</div>}
              {list.map((k) => (
                <div key={k} className={"opt" + (value === k ? " sel" : "")} onClick={() => pick(k)}>
                  {k}{value === k && <span className="ck"><Icon n="check" size={15} /></span>}
                </div>
              ))}
              {list.length === 0 && <div className="nomatch">Không có thôn khớp</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LoginView({ onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!u || !p) { setErr("Nhập tài khoản và mật khẩu"); return; }
    setLoading(true); setErr("");
    try {
      const r = await api.login(u, p);
      if (r.token) {
        localStorage.setItem("token", r.token);
        localStorage.setItem("uname", r.user?.name || u);
        onLogin(r.user?.name || u);
      } else setErr(r.error || "Đăng nhập thất bại");
    } catch (e) { setErr("Không kết nối được máy chủ (đã chạy backend chưa?)"); }
    finally { setLoading(false); }
  };
  return (
    <div className="login">
      <div className="ldeco d1" /><div className="ldeco d2" /><div className="ldeco d3" />
      <div className="lhero">
        <img src="/logo.png" alt="Nguyên Phát" className="llogo" />
        <div className="ltag">Kho bất động sản nội bộ · Đông Anh</div>
      </div>
      <div className="lcard">
        <div className="lhead">Đăng nhập</div>
        <div className="lsub">Dành cho thành viên văn phòng</div>
        <div className="lfield">
          <span className="lic"><Icon n="user" size={17} /></span>
          <input placeholder="SĐT hoặc tài khoản" value={u} autoFocus autoCapitalize="none"
            onChange={(e) => setU(e.target.value)} />
        </div>
        <div className="lfield">
          <span className="lic"><Icon n="lock" size={17} /></span>
          <input type="password" placeholder="Mật khẩu" value={p}
            onChange={(e) => setP(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
        {err && <div className="lerr">{err}</div>}
        <button className="lbtn" onClick={submit} disabled={loading}>
          {loading ? <><span className="spin" style={{ borderColor: "rgba(30,44,63,.25)", borderTopColor: "#1E2C3F" }} />Đang đăng nhập…</> : "Đăng nhập"}
        </button>
      </div>
      <div className="lfoot">© Văn phòng BĐS Nguyên Phát</div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("token"));
  const [user, setUser] = useState(localStorage.getItem("uname") || "Nam");
  const [role, setRole] = useState(localStorage.getItem("role") || "");
  const [view, setView] = useState("list");
  const [props, setProps] = useState([]);

  useEffect(() => {
    if (!authed) return;
    api.me().then((r) => {
      if (r.user) { setRole(r.user.role); localStorage.setItem("role", r.user.role); }
    }).catch(() => {});
  }, [authed]);
  const [dark, setDark] = useState(localStorage.getItem("theme") === "dark");
  const toggleDark = (v) => { setDark(v); localStorage.setItem("theme", v ? "dark" : "light"); };
  const [confirm, setConfirm] = useState(null); // {title, message, okLabel, onOk}
  const logout = () => setConfirm({
    title: "Đăng xuất", message: "Bạn muốn đăng xuất khỏi NP Land?", okLabel: "Đăng xuất",
    onOk: () => {
      localStorage.removeItem("token"); localStorage.removeItem("uname");
      setAuthed(false); setView("list");
    },
  });

  const reload = () => api.list().then((r) => setProps(r.properties || [])).catch(() => {});
  useEffect(() => { if (authed) reload(); }, [authed]);
  // tự làm mới khi quay lại app (đổi tab trình duyệt / mở lại điện thoại)
  useEffect(() => {
    if (!authed) return;
    const onWake = () => { if (document.visibilityState === "visible") reload(); };
    window.addEventListener("focus", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => { window.removeEventListener("focus", onWake); document.removeEventListener("visibilitychange", onWake); };
  }, [authed]);
  // tự làm mới khi chuyển về các tab xem dữ liệu
  useEffect(() => {
    if (authed && (view === "list" || view === "map" || view === "stats")) reload();
  }, [view]); // eslint-disable-line
  const [sel, setSel] = useState(null);
  const [editing, setEditing] = useState(null); // tin đang sửa (null = thêm mới)
  const [fStatus, setFStatus] = useState(null);
  const [fType, setFType] = useState("");
  const [fKhu, setFKhu] = useState("");
  const [fSource, setFSource] = useState("");
  const [fPrice, setFPrice] = useState(0);
  const [fSort, setFSort] = useState("new");
  const [q, setQ] = useState("");
  // Tin khớp SĐT liên hệ (đầu chủ/khách) — tra qua server vì contact bị ẩn phía client với người không đăng tin
  const [phoneIds, setPhoneIds] = useState(() => new Set());
  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) { setPhoneIds(new Set()); return; }
    const t = setTimeout(() => {
      api.list({ q: query }).then((r) => setPhoneIds(new Set((r.properties || []).map((p) => p.id)))).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    const pr = PRICE_RANGES[fPrice] || PRICE_RANGES[0];
    const arr = props.filter((p) => {
      if (fStatus && p.status !== fStatus) return false;
      if (fType && p.type !== fType) return false;
      if (fKhu && p.khu !== fKhu) return false;
      if (fSource && p.source !== fSource) return false;
      if (fPrice > 0 && !((p.price || 0) >= pr.min && (p.price || 0) < pr.max)) return false;
      if (q) {
        const textMatch = (p.title + " " + p.address + " " + (p.khu || "") + " " + (p.desc || "")).toLowerCase().includes(q.toLowerCase());
        if (!textMatch && !phoneIds.has(p.id)) return false;
      }
      return true;
    });
    const by = {
      new: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
      price_asc: (a, b) => (a.price || 0) - (b.price || 0),
      price_desc: (a, b) => (b.price || 0) - (a.price || 0),
      area_desc: (a, b) => (b.area || 0) - (a.area || 0),
    };
    return arr.sort(by[fSort] || by.new);
  }, [props, fStatus, fType, fKhu, fSource, fPrice, fSort, q, phoneIds]);

  const open = (p) => { setSel(p); setView("detail"); };
  const startAdd = () => { setEditing(null); setView("add"); };
  const startEdit = (p) => { setEditing(p); setView("add"); };

  const saveProp = async (p) => {
    try {
      if (editing) {
        const r = await api.update(editing.id, p);
        if (r.property) {
          setProps(props.map((x) => (x.id === editing.id ? r.property : x)));
          setSel(r.property);
          setEditing(null);
          setView("detail");
          return;
        }
      } else {
        const r = await api.create(p);
        if (r.property) setProps([r.property, ...props]);
      }
    } catch (e) { /* ignore */ }
    setEditing(null);
    setView("list");
  };

  const quickStatus = async (p, status) => {
    try {
      const r = await api.update(p.id, { status });
      if (r.property) {
        setProps((ps) => ps.map((x) => (x.id === p.id ? r.property : x)));
        setSel(r.property);
      }
    } catch (e) { /* ignore */ }
  };

  const deleteProp = (p) => setConfirm({
    title: "Xoá tin", message: `Xoá "${p.title}" khỏi kho? Hành động này không hoàn tác được.`, okLabel: "Xoá tin",
    onOk: async () => {
      try { await api.remove(p.id); } catch (e) { /* ignore */ }
      setProps(props.filter((x) => x.id !== p.id));
      setView("list");
    },
  });

  if (!authed)
    return (
      <div className={"bds" + (dark ? " dark" : "")}><style>{STYLES}</style>
        <LoginView onLogin={(name) => { setUser(name); setAuthed(true); }} />
      </div>
    );

  return (
    <div className={"bds" + (dark ? " dark" : "")}>
      <style>{STYLES}</style>

      {view !== "detail" && (
        <div className="top">
          <div className="mark"><img src="/logo-mark.png" alt="Nguyên Phát" /></div>
          <div className="sub">Quản lý &amp; lưu trữ</div>
        </div>
      )}

      {view === "list" && (
        <List items={filtered} total={props.length} q={q} setQ={setQ}
          fStatus={fStatus} setFStatus={setFStatus} fType={fType} setFType={setFType}
          fKhu={fKhu} setFKhu={setFKhu} fSource={fSource} setFSource={setFSource}
          fPrice={fPrice} setFPrice={setFPrice} fSort={fSort} setFSort={setFSort} onOpen={open} />
      )}
      {view === "map" && <MapView items={props} onOpen={open} />}
      {view === "stats" && <StatsView items={props} user={user} />}
      {view === "settings" && <SettingsView user={user} isAdmin={role === "admin"} onMembers={() => setView("members")} dark={dark} onDark={toggleDark} onLogout={logout} />}
      {view === "members" && role === "admin" && <MembersView onBack={() => setView("settings")} confirm={setConfirm} />}
      {view === "detail" && sel && <Detail p={sel} onBack={() => setView("list")} onEdit={() => startEdit(sel)} onDelete={() => deleteProp(sel)} onStatus={(st) => quickStatus(sel, st)} />}
      {view === "add" && <AddForm initial={editing} onSave={saveProp} onCancel={() => { setEditing(null); setView(editing ? "detail" : "list"); }} />}

      {confirm && (
        <div className="ov" style={{ alignItems: "center" }} onClick={() => setConfirm(null)}>
          <div className="cfm" onClick={(e) => e.stopPropagation()}>
            <div className="cfmt">{confirm.title}</div>
            <div className="cfmm">{confirm.message}</div>
            <div className="cfmb">
              <button className="wback" onClick={() => setConfirm(null)}>Huỷ</button>
              <button className="wnext cfmdanger" onClick={() => { const fn = confirm.onOk; setConfirm(null); fn(); }}>{confirm.okLabel || "Đồng ý"}</button>
            </div>
          </div>
        </div>
      )}

      {(view === "list" || view === "map" || view === "stats" || view === "settings" || view === "members") && (
        <div className="nav">
          <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
            <Icon n="home" />Danh sách
          </button>
          <button className={view === "map" ? "on" : ""} onClick={() => setView("map")}>
            <Icon n="map" />Bản đồ
          </button>
          <div className="fab"><button className="plus" onClick={startAdd}><Icon n="plus" /></button></div>
          <button className={view === "stats" ? "on" : ""} onClick={() => setView("stats")}>
            <Icon n="chart" />Tổng quan
          </button>
          <button className={view === "settings" || view === "members" ? "on" : ""} onClick={() => setView("settings")}>
            <Icon n="gear" />Cài đặt
          </button>
        </div>
      )}
    </div>
  );
}

function List({ items, total, q, setQ, fStatus, setFStatus, fType, setFType, fKhu, setFKhu, fSource, setFSource, fPrice, setFPrice, fSort, setFSort, onOpen }) {
  return (
    <>
      <div className="search">
        <div className="box">
          <Icon n="search" size={17} />
          <input placeholder="Tìm tiêu đề, địa chỉ, thôn, SĐT…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="filters">
        <span className={"chip" + (!fStatus ? " on" : "")} onClick={() => setFStatus(null)}>Tất cả</span>
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} className={"chip" + (fStatus === k ? " on" : "")} onClick={() => setFStatus(fStatus === k ? null : k)}>
            <span className="dot" style={{ background: v.c }} />{v.label}
          </span>
        ))}
        {SOURCE.map((s) => (
          <span key={s} className={"chip" + (fSource === s ? " on" : "")} onClick={() => setFSource(fSource === s ? "" : s)}>
            {s === "chính chủ" ? "Chính chủ" : "Qua cò"}
          </span>
        ))}
      </div>

      <div className="selrow">
        <div className="sel">
          <ThonPicker value={fKhu} onChange={setFKhu} allowAll placeholder="Khu vực (thôn)" />
        </div>
        <div className="sel">
          <select value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">Loại hình</option>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="selrow">
        <div className="sel">
          <select value={fPrice} onChange={(e) => setFPrice(Number(e.target.value))}>
            {PRICE_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
          </select>
        </div>
        <div className="sel">
          <select value={fSort} onChange={(e) => setFSort(e.target.value)}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="cnt num">{items.length} / {total} tin</div>

      {items.length === 0 ? (
        <div className="empty"><Icon n="search" size={38} /><div>Không có tin nào khớp bộ lọc</div></div>
      ) : (
        <div className="list">
          {items.map((p) => {
            const st = STATUS[p.status];
            return (
              <div className="card" key={p.id} onClick={() => onOpen(p)}>
                <div className="thumb" style={p.img ? { backgroundImage: `url(${resolveUrl(p.img)})` } : {}}>
                  {!p.img && <Icon n="home" size={26} />}
                  <span className="stpill"><span className="dot" style={{ background: st.c }} />{st.label}</span>
                </div>
                <div className="body">
                  <p className="ttl">{p.title}</p>
                  <p className="meta"><Icon n="pin" />{p.khu ? `${p.khu} · ` : ""}{p.area}m²{p.frontage ? ` · MT ${p.frontage}m` : ""}</p>
                  <div className="tagrow">
                    {(p.legal || p.source) && <span className="tag"><Icon n="doc" size={12} />{[p.legal, p.land, p.source].filter(Boolean).join(" · ")}</span>}
                    {p.created_at && <span className="tago">{timeAgo(p.created_at)}</span>}
                  </div>
                  <div className="price num">{fmtPrice(p.price)} <small>· {fmtM2(p.price_per_m2)}</small>
                    {p.posted_by && <span className="poster"><span className="pav">{initials(p.posted_by)}</span>{p.posted_by}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function MapView({ items, onOpen }) {
  const geo = items.filter((p) => p.lat && p.lng);
  const [sel, setSel] = useState(geo[0] || null);
  const center = sel || DONG_ANH;
  return (
    <div className="mapview">
      <div className="bigmap">
        <iframe title="bản đồ Đông Anh" src={osmSrc(center.lat, center.lng)} loading="lazy" />
      </div>
      <div className="cnt num">{geo.length} tin có toạ độ · chạm để xem trên bản đồ</div>
      <div className="mapstrip">
        {geo.map((p) => {
          const st = STATUS[p.status];
          return (
            <div key={p.id} className={"mrow" + (sel?.id === p.id ? " on" : "")} onClick={() => setSel(p)}>
              <div className="pin"><Icon n="pin" size={18} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p className="t" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</p>
                <p className="m"><span style={{ color: st.c, fontWeight: 700 }}>●</span> {st.label} · {p.khu} · {fmtPrice(p.price)}</p>
              </div>
              <button className="go" onClick={(e) => { e.stopPropagation(); onOpen(p); }}><Icon n="chev" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Toggle = ({ on, onChange }) => (
  <button type="button" className={"tgl" + (on ? " on" : "")} onClick={() => onChange(!on)} aria-pressed={on}><span /></button>
);

function StatsView({ items, user }) {
  const total = items.length;
  const totalValue = items.filter((p) => p.status !== "da_ban").reduce((s, p) => s + (p.price || 0), 0);
  const mine = items.filter((p) => p.posted_by === user).length;

  const byStatus = Object.keys(STATUS).map((k) => ({ k, ...STATUS[k], n: items.filter((p) => p.status === k).length }));
  const countBy = (fn) => {
    const m = {};
    items.forEach((p) => { const key = fn(p); if (key) m[key] = (m[key] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const byKhu = countBy((p) => p.khu).slice(0, 6);
  const byUser = countBy((p) => p.posted_by);
  const bySource = countBy((p) => p.source);
  const maxKhu = byKhu[0]?.[1] || 1;
  const maxUser = byUser[0]?.[1] || 1;

  return (
    <div style={{ padding: "14px 16px 20px" }}>
      <div className="stgrid">
        <div className="sttile big">
          <div className="stv num">{total}</div>
          <div className="stl">Tin trong kho</div>
        </div>
        <div className="sttile big gold">
          <div className="stv num">{fmtPrice(totalValue)}</div>
          <div className="stl">Tổng giá trị đang giao dịch</div>
        </div>
        {byStatus.map((s) => (
          <div key={s.k} className="sttile">
            <div className="stv num" style={{ color: s.c }}>{s.n}</div>
            <div className="stl"><span className="dot" style={{ background: s.c }} />{s.label}</div>
          </div>
        ))}
      </div>

      {byKhu.length > 0 && (
        <div className="setcard statcard">
          <p className="mlabel">Theo thôn</p>
          {byKhu.map(([khu, n]) => (
            <div key={khu} className="brow">
              <span className="bname">{khu}</span>
              <span className="btrack"><span className="bfill" style={{ width: `${(n / maxKhu) * 100}%` }} /></span>
              <span className="bnum num">{n}</span>
            </div>
          ))}
        </div>
      )}

      {byUser.length > 0 && (
        <div className="setcard statcard">
          <p className="mlabel">Theo thành viên</p>
          {byUser.map(([name, n]) => (
            <div key={name} className="brow">
              <span className="pav" style={{ width: 22, height: 22, fontSize: 10.5 }}>{initials(name)}</span>
              <span className="bname">{name}{name === user ? " (bạn)" : ""}</span>
              <span className="btrack"><span className="bfill gold" style={{ width: `${(n / maxUser) * 100}%` }} /></span>
              <span className="bnum num">{n}</span>
            </div>
          ))}
        </div>
      )}

      {bySource.length > 0 && (
        <div className="setcard statcard">
          <p className="mlabel">Nguồn tin</p>
          <div className="srcsplit">
            {bySource.map(([s, n]) => (
              <div key={s} className="srcseg" style={{ flex: n }}>
                <div className="srcn num">{n}</div>
                <div className="srcl">{s}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="setver">Bạn đã đăng {mine} tin · dữ liệu cập nhật trực tiếp</div>
    </div>
  );
}

function MembersView({ onBack, confirm }) {
  const [users, setUsers] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [nm, setNm] = useState(""); const [un, setUn] = useState(""); const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(null); // {ok, text}
  const [saving, setSaving] = useState(false);
  const [resetFor, setResetFor] = useState(null); const [resetPw, setResetPw] = useState("");

  const load = () => api.listUsers().then((r) => setUsers(r.users || [])).catch(() => setUsers([]));
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!nm.trim() || !un.trim() || !pw) { setMsg({ ok: false, text: "Nhập đủ tên, tài khoản và mật khẩu" }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await api.createUser({ name: nm.trim(), username: un.trim(), password: pw });
      if (r.user) {
        setMsg({ ok: true, text: `Đã tạo tài khoản "${r.user.username}" cho ${r.user.name}` });
        setNm(""); setUn(""); setPw(""); setShowAdd(false); load();
      } else setMsg({ ok: false, text: r.error || "Không tạo được tài khoản" });
    } catch (e) { setMsg({ ok: false, text: "Không kết nối được máy chủ" }); }
    finally { setSaving(false); }
  };

  const del = (u) => confirm({
    title: "Xoá thành viên",
    message: `Xoá tài khoản "${u.name}" (@${u.username})? ${u.posts > 0 ? `${u.posts} tin người này đã đăng vẫn giữ trong kho.` : ""}`,
    okLabel: "Xoá tài khoản",
    onOk: async () => {
      const r = await api.deleteUser(u.id);
      setMsg(r.ok ? { ok: true, text: `Đã xoá ${u.name}` } : { ok: false, text: r.error || "Không xoá được" });
      load();
    },
  });

  const doReset = async (u) => {
    if (resetPw.length < 4) { setMsg({ ok: false, text: "Mật khẩu mới tối thiểu 4 ký tự" }); return; }
    const r = await api.resetUserPassword(u.id, resetPw);
    setMsg(r.ok ? { ok: true, text: `Đã đặt lại mật khẩu cho ${u.name}` } : { ok: false, text: r.error || "Lỗi" });
    setResetFor(null); setResetPw("");
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="wizhead" style={{ paddingBottom: 0 }}>
        <button className="wizx" onClick={onBack}><Icon n="back" size={19} /></button>
        <div className="wiztitle">Thành viên văn phòng</div>
        <div style={{ width: 36 }} />
      </div>

      {msg && <div className={"setmsg" + (msg.ok ? " ok" : "")} style={{ padding: "10px 16px 0", textAlign: "center" }}>{msg.text}</div>}

      <div className="setcard">
        {users === null && <div className="setrow" style={{ color: "var(--faint)" }}>Đang tải…</div>}
        {users && users.map((u) => (
          <React.Fragment key={u.id}>
            <div className="setrow">
              <span className="bigav" style={{ width: 38, height: 38, fontSize: 15 }}>{initials(u.name)}</span>
              <div className="grow">
                {u.name} {u.role === "admin" && <span className="rolechip">Quản trị</span>}
                <div className="shint">@{u.username} · {u.posts} tin đã đăng</div>
              </div>
              {u.role !== "admin" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="mact" title="Đặt lại mật khẩu" onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setResetPw(""); setMsg(null); }}><Icon n="lock" size={15} /></button>
                  <button className="mact danger" title="Xoá thành viên" onClick={() => del(u)}><Icon n="trash" size={15} /></button>
                </div>
              )}
            </div>
            {resetFor === u.id && (
              <div className="pwform" style={{ paddingTop: 0 }}>
                <input type="password" placeholder={`Mật khẩu mới cho ${u.name}`} value={resetPw} onChange={(e) => setResetPw(e.target.value)} autoFocus />
                <button className="pwbtn" onClick={() => doReset(u)}>Đặt lại mật khẩu</button>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="setcard">
        {!showAdd ? (
          <div className="setrow" style={{ cursor: "pointer", color: "var(--brand-d)" }} onClick={() => { setShowAdd(true); setMsg(null); }}>
            <span className="sic"><Icon n="plus" size={17} /></span>
            <div className="grow">Thêm thành viên mới</div>
          </div>
        ) : (
          <div className="pwform" style={{ paddingTop: 14 }}>
            <input placeholder="Tên hiển thị (VD: Hương)" value={nm} onChange={(e) => setNm(e.target.value)} autoFocus />
            <input placeholder="SĐT làm tài khoản (VD: 0912345678)" inputMode="tel" value={un} autoCapitalize="none" onChange={(e) => setUn(e.target.value)} />
            <input type="password" placeholder="Mật khẩu ban đầu" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button className="pwbtn" onClick={add} disabled={saving}>{saving ? "Đang tạo…" : "Tạo tài khoản"}</button>
            <button className="cancel" style={{ marginTop: 0 }} onClick={() => setShowAdd(false)}>Huỷ</button>
          </div>
        )}
      </div>

      <div className="setver">Thành viên mới đăng nhập bằng tài khoản anh vừa tạo, sau đó tự đổi mật khẩu trong Cài đặt</div>
    </div>
  );
}

function SettingsView({ user, isAdmin, onMembers, dark, onDark, onLogout }) {
  const [notif, setNotif] = useState(localStorage.getItem("notif") !== "off");
  const toggleNotif = (v) => { setNotif(v); localStorage.setItem("notif", v ? "on" : "off"); };
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState(""); const [pw1, setPw1] = useState(""); const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState(null); // {ok, text}
  const [saving, setSaving] = useState(false);

  const submitPw = async () => {
    if (!oldPw || !pw1) { setMsg({ ok: false, text: "Nhập đủ mật khẩu cũ và mới" }); return; }
    if (pw1 !== pw2) { setMsg({ ok: false, text: "Mật khẩu mới nhập lại chưa khớp" }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await api.changePassword(oldPw, pw1);
      if (r.ok) { setMsg({ ok: true, text: "Đã đổi mật khẩu thành công" }); setOldPw(""); setPw1(""); setPw2(""); setPwOpen(false); }
      else setMsg({ ok: false, text: r.error || "Không đổi được mật khẩu" });
    } catch (e) { setMsg({ ok: false, text: "Không kết nối được máy chủ" }); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ paddingBottom: 20 }}>
      <div className="setprofile">
        <div className="bigav">{initials(user)}</div>
        <div>
          <div className="setname">{user} {isAdmin && <span className="rolechip">Quản trị</span>}</div>
          <div className="setsub">Thành viên NP Land</div>
        </div>
      </div>

      {isAdmin && (
        <div className="setcard">
          <div className="setrow" style={{ cursor: "pointer" }} onClick={onMembers}>
            <span className="sic"><Icon n="user" size={17} /></span>
            <div className="grow">Quản lý thành viên<div className="shint">Tạo tài khoản cho anh em văn phòng</div></div>
            <span style={{ color: "var(--faint)" }}><Icon n="chev" size={16} /></span>
          </div>
        </div>
      )}

      <div className="setcard">
        <div className="setrow">
          <span className="sic"><Icon n="bell" size={17} /></span>
          <div className="grow">Thông báo<div className="shint">Báo khi có tin mới trong kho</div></div>
          <Toggle on={notif} onChange={toggleNotif} />
        </div>
        <div className="setrow">
          <span className="sic"><Icon n="moon" size={17} /></span>
          <div className="grow">Giao diện tối<div className="shint">Dịu mắt khi dùng ban đêm</div></div>
          <Toggle on={dark} onChange={onDark} />
        </div>
        <div className="setrow" style={{ cursor: "pointer" }} onClick={() => { setPwOpen(!pwOpen); setMsg(null); }}>
          <span className="sic"><Icon n="lock" size={17} /></span>
          <div className="grow">Đổi mật khẩu</div>
          <span style={{ color: "var(--faint)", transform: pwOpen ? "rotate(90deg)" : "none", transition: "transform .15s" }}><Icon n="chev" size={16} /></span>
        </div>
        {pwOpen && (
          <div className="pwform">
            <input type="password" placeholder="Mật khẩu hiện tại" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
            <input type="password" placeholder="Mật khẩu mới" value={pw1} onChange={(e) => setPw1(e.target.value)} />
            <input type="password" placeholder="Nhập lại mật khẩu mới" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <button className="pwbtn" onClick={submitPw} disabled={saving}>{saving ? "Đang lưu…" : "Xác nhận đổi"}</button>
          </div>
        )}
        {msg && <div className={"setmsg" + (msg.ok ? " ok" : "")}>{msg.text}</div>}
      </div>

      <div className="setcard">
        <div className="setrow danger" style={{ cursor: "pointer" }} onClick={onLogout}>
          <span className="sic"><Icon n="out" size={17} /></span>
          <div className="grow">Đăng xuất</div>
        </div>
      </div>

      <div className="setver">NP Land · Nguyên Phát · v1.0</div>
    </div>
  );
}

function Detail({ p, onBack, onEdit, onDelete, onStatus }) {
  const [sheet, setSheet] = useState(false);
  const [stSheet, setStSheet] = useState(false);
  const gallery = ((p.imgs && p.imgs.length ? p.imgs : (p.img ? [p.img] : [])) || []).map(resolveUrl);
  const [cur, setCur] = useState(0);
  const st = STATUS[p.status];
  const owner = p.contacts?.find((c) => c.type === "đầu chủ");
  const interested = p.contacts?.filter((c) => c.type === "khách quan tâm") || [];
  const hero = gallery[cur];

  return (
    <div style={{ paddingBottom: 84 }}>
      <div className="hero" style={hero ? { backgroundImage: `url(${hero})` } : {}}>
        {!hero && <Icon n="home" size={40} />}
        <button className="rnd back" onClick={onBack}><Icon n="back" /></button>
        {p.can_edit && (
          <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 8, zIndex: 2 }}>
            <button className="rnd" style={{ position: "static" }} title="Sửa tin" onClick={onEdit}><Icon n="edit" /></button>
            <button className="rnd" style={{ position: "static" }} title="Xoá tin" onClick={onDelete}><Icon n="trash" /></button>
          </div>
        )}
        <span className={"stpill" + (p.can_edit ? " tap" : "")}
          onClick={() => p.can_edit && setStSheet(true)}>
          <span className="dot" style={{ background: st.c }} />{st.label}
          {p.can_edit && <Icon n="chev" size={12} />}
        </span>
      </div>
      {gallery.length > 1 && (
        <div className="gallery">
          {gallery.map((u, i) => (
            <div key={i} className={"gthumb" + (i === cur ? " on" : "")} style={{ backgroundImage: `url(${u})` }} onClick={() => setCur(i)} />
          ))}
        </div>
      )}

      <div className="dhead">
        <h2 className="ttl">{p.title}</h2>
        <div className="price num">{fmtPrice(p.price)} <small>· {fmtM2(p.price_per_m2)}</small></div>
      </div>

      <div className="sec">
        <p className="mlabel">Thông tin</p>
        <div className="kv">
          <div><div className="k">Loại hình</div><div className="v">{p.type}</div></div>
          <div><div className="k">Diện tích</div><div className="v num">{p.area} m²</div></div>
          {p.khu && <div><div className="k">Khu vực</div><div className="v">{p.khu}</div></div>}
          {p.frontage && <div><div className="k">Mặt tiền</div><div className="v num">{p.frontage} m</div></div>}
          {p.direction && <div><div className="k">Hướng</div><div className="v">{p.direction}</div></div>}
          <div style={{ gridColumn: "1/3" }}><div className="k">Địa chỉ</div><div className="v">{p.address}</div></div>
        </div>
      </div>

      <div className="sec">
        <p className="mlabel">Pháp lý</p>
        <div className="kv">
          <div><div className="k">Giấy tờ</div><div className="v">{p.legal || "—"}</div></div>
          <div><div className="k">Loại đất</div><div className="v">{p.land || "—"}</div></div>
          <div><div className="k">Quy hoạch</div><div className="v">{p.planning || "—"}</div></div>
          <div><div className="k">Tình trạng</div><div className="v">{p.division || "—"}</div></div>
          <div><div className="k">Nguồn tin</div><div className="v">{p.source || "—"}</div></div>
        </div>
      </div>

      {p.desc && <div className="sec"><p className="mlabel">Mô tả</p><div className="desc">{p.desc}</div></div>}

      <div className="sec">
        <p className="mlabel">Liên hệ</p>
        {!p.can_edit && (
          <div className="lockbox">
            <span className="lockic"><Icon n="lock" size={17} /></span>
            <div>
              <div className="lt">Thông tin chính chủ được giữ riêng</div>
              <div className="ls">Muốn biết SĐT/tên {p.source === "qua cò" ? "môi giới" : "chính chủ"}, hỏi trực tiếp <b>{p.posted_by}</b> — người đăng tin này.</div>
            </div>
          </div>
        )}
        {owner && (
          <div className="person">
            <div className="av" style={{ background: "var(--brand)" }}>{initials(owner.name)}</div>
            <div><div className="role">{p.source === "qua cò" ? "Môi giới (cò)" : "Chính chủ (F0)"}</div><div className="nm">{owner.name}</div></div>
            <a className="call" href={`tel:${owner.phone}`}><Icon n="phone" />{owner.phone}</a>
          </div>
        )}
        {interested.map((c, i) => (
          <div className="person" key={i}>
            <div className="av" style={{ background: "var(--info)" }}>{initials(c.name)}</div>
            <div><div className="role">Khách quan tâm</div><div className="nm">{c.name}</div></div>
            <a className="call" href={`tel:${c.phone}`} style={{ borderColor: "var(--info)", color: "var(--info)" }}><Icon n="phone" />{c.phone}</a>
          </div>
        ))}
        <div className="person">
          <div className="av" style={{ background: "var(--off)" }}>{initials(p.posted_by)}</div>
          <div><div className="role">Người đăng tin{p.created_at ? ` · ${timeAgo(p.created_at)}` : ""}</div><div className="nm">{p.posted_by || "—"}</div></div>
        </div>
      </div>

      {/* Thẻ vị trí ở cuối */}
      <div className="sec">
        <p className="mlabel">Vị trí</p>
        <div className="mapwrap">
          {p.lat && p.lng
            ? <StaticMap lat={p.lat} lng={p.lng} />
            : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "var(--faint)", fontSize: 13, padding: 16, textAlign: "center" }}>
                Chưa có toạ độ — mở Google Maps theo địa chỉ
              </div>}
        </div>
        <div className="v" style={{ marginTop: 10 }}>{p.address}</div>
        <a className="mapbtn" href={gmapLink(p)} target="_blank" rel="noreferrer"><Icon n="pin" />Chỉ đường Google Maps</a>
      </div>

      <div className="actionbar">
        <button className="ghost" onClick={onBack}><Icon n="back" /></button>
        <button className="primary" onClick={() => setSheet(true)}><Icon n="share" />Chia sẻ tin</button>
      </div>

      {sheet && <ShareSheet p={p} owner={owner} onClose={() => setSheet(false)} />}

      {stSheet && (
        <div className="ov" onClick={() => setStSheet(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <h3>Đổi trạng thái tin</h3>
            {Object.entries(STATUS).map(([k, v]) => (
              <div key={k} className={"strow" + (p.status === k ? " on" : "")}
                onClick={() => { setStSheet(false); if (k !== p.status) onStatus(k); }}>
                <span className="dot" style={{ background: v.c }} />
                <span className="grow">{v.label}</span>
                {p.status === k && <span style={{ color: "var(--brand)" }}><Icon n="check" size={17} /></span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function buildShare(p, owner, platform) {
  const price = fmtPrice(p.price), perM2 = fmtM2(p.price_per_m2), phone = owner?.phone || "Liên hệ";
  if (platform === "zalo")
    return `🏠 ${p.title.toUpperCase()}
📍 ${p.address}${p.khu ? ` (thôn ${p.khu})` : ""}
📐 ${p.area}m²${p.frontage ? ` · MT ${p.frontage}m` : ""}${p.direction ? ` · Hướng ${p.direction}` : ""}
📜 ${p.legal || "N/A"}${p.land ? ` · ${p.land}` : ""}${p.source === "chính chủ" ? " · ✅ chính chủ" : ""}
💰 ${price}${perM2 ? ` (${perM2})` : ""}

${p.desc || ""}

📞 ${phone}`;
  return `🏠 BÁN ${p.type.toUpperCase()} ${p.area}M²${p.khu ? ` – THÔN ${p.khu.toUpperCase()}` : ""}

📍 ${p.address}
📐 ${p.area}m²${p.frontage ? `, mặt tiền ${p.frontage}m` : ""}
📜 ${p.legal || "N/A"}
💰 Giá chỉ ${price}${perM2 ? ` (${perM2})` : ""}

${p.desc || ""}

☎️ ${phone}
#datdonganh #${(p.khu || "donganh").replace(/\s/g, "")} #bandat`;
}

function ShareSheet({ p, owner, onClose }) {
  const [chan, setChan] = useState("zalo");
  const [copied, setCopied] = useState(false);
  const txt = buildShare(p, owner, chan);
  const copy = () => navigator.clipboard?.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  return (
    <div className="ov" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <h3>Chia sẻ tin</h3>
        <div className="chan">
          <button className={chan === "zalo" ? "on" : ""} onClick={() => setChan("zalo")}><Icon n="share" size={22} />Zalo</button>
          <button className={chan === "facebook" ? "on" : ""} onClick={() => setChan("facebook")}><Icon n="share" size={22} />Facebook</button>
        </div>
        <div className="prev">{txt}</div>
        <button className="cp" onClick={copy}><Icon n={copied ? "check" : "copy"} size={16} />{copied ? "Đã copy nội dung" : "Copy nội dung"}</button>
      </div>
    </div>
  );
}

const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const SAT_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const PIN_ICON = L.divIcon({
  className: "npin-wrap",
  html: '<div class="npin"></div><div class="npin-dot"></div>',
  iconSize: [30, 42], iconAnchor: [15, 40],
});

function MapPicker({ lat, lng, onPick }) {
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [sat, setSat] = useState(false);
  const layersRef = useRef(null);

  const toggleSat = () => {
    const ly = layersRef.current; if (!ly || !mapRef.current) return;
    if (sat) { mapRef.current.removeLayer(ly.sat); ly.osm.addTo(mapRef.current); }
    else { mapRef.current.removeLayer(ly.osm); ly.sat.addTo(mapRef.current); }
    setSat(!sat);
  };

  const placeMarker = (la, ln) => {
    if (!mapRef.current) return;
    if (!markerRef.current) {
      markerRef.current = L.marker([la, ln], { icon: PIN_ICON, draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onPickRef.current(p.lat, p.lng);
      });
    } else markerRef.current.setLatLng([la, ln]);
  };

  useEffect(() => {
    const map = L.map(boxRef.current, { attributionControl: false })
      .setView([lat || DONG_ANH.lat, lng || DONG_ANH.lng], lat ? 17 : 13);
    const osm = L.tileLayer(OSM_URL, { maxZoom: 19 });
    const satl = L.tileLayer(SAT_URL, { maxZoom: 19 });
    osm.addTo(map);
    layersRef.current = { osm, sat: satl };
    mapRef.current = map;
    if (lat && lng) placeMarker(lat, lng);
    map.on("click", (e) => {
      placeMarker(e.latlng.lat, e.latlng.lng);
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });
    setTimeout(() => map.invalidateSize(), 120);
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line

  const locate = () => {
    if (!navigator.geolocation) { setGeoErr("Thiết bị không hỗ trợ định vị"); return; }
    setLocating(true); setGeoErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude, ln = pos.coords.longitude;
        placeMarker(la, ln);
        mapRef.current?.setView([la, ln], 18);
        onPickRef.current(la, ln);
        setLocating(false);
      },
      () => { setGeoErr("Không lấy được vị trí — kiểm tra quyền định vị của trình duyệt"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };
  const clearPin = () => {
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    onPickRef.current(null, null);
  };

  return (
    <div className="mappick">
      <div ref={boxRef} className="mapbox" />
      <button type="button" className="satbtn" onClick={toggleSat}>{sat ? "Bản đồ" : "Vệ tinh"}</button>
      <div className="maprow">
        <button type="button" className="gpsbtn" onClick={locate} disabled={locating}>
          {locating ? <span className="spin" style={{ borderColor: "rgba(255,255,255,.35)", borderTopColor: "#fff" }} /> : <Icon n="pin" size={15} />}
          {locating ? "Đang định vị…" : "Lấy vị trí hiện tại"}
        </button>
        {lat && lng ? (
          <button type="button" className="clearpin" onClick={clearPin}><Icon n="x" size={13} />Xoá ghim</button>
        ) : null}
      </div>
      <div className="maphint">
        {lat && lng
          ? <>📍 Đã ghim: <b className="num">{Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</b> — kéo ghim để tinh chỉnh</>
          : "Chạm vào bản đồ để ghim đúng vị trí lô đất, hoặc bấm nút GPS khi đang đứng tại đất"}
      </div>
      {geoErr && <div className="maphint" style={{ color: "#C43D2B" }}>{geoErr}</div>}
    </div>
  );
}

function PriceField({ label, value, onChange }) {
  const [unit, setUnit] = useState(1e9);
  const [amt, setAmt] = useState("");
  // đồng bộ khi giá bị đổi từ ngoài (AI bóc tách / mở tin sửa)
  useEffect(() => {
    const cur = Math.round((parseFloat(amt) || 0) * unit);
    const v = Number(value) || 0;
    if (Math.abs(cur - v) > 0.5) {
      if (!v) { setAmt(""); return; }
      const u = v >= 1e9 ? 1e9 : 1e6;
      setUnit(u);
      setAmt(String(parseFloat((v / u).toFixed(3))));
    }
  }, [value]); // eslint-disable-line
  const upd = (a, u) => { setAmt(a); setUnit(u); onChange(Math.round((parseFloat(a) || 0) * u)); };
  return (
    <div className="field">
      <label>{label}</label>
      <div className="pricebox">
        <input type="number" inputMode="decimal" step="0.1" placeholder="VD: 4.5" value={amt}
          onChange={(e) => upd(e.target.value, unit)} />
        <div className="unitsw">
          <button type="button" className={unit === 1e9 ? "on" : ""} onClick={() => upd(amt, 1e9)}>tỷ</button>
          <button type="button" className={unit === 1e6 ? "on" : ""} onClick={() => upd(amt, 1e6)}>triệu</button>
        </div>
      </div>
      {Number(value) > 0 && <div className="pricewords">= {fmtPriceWords(value)}</div>}
    </div>
  );
}

function StaticMap({ lat, lng }) {
  const boxRef = useRef(null);
  const layersRef = useRef(null);
  const [sat, setSat] = useState(false);

  useEffect(() => {
    const map = L.map(boxRef.current, { attributionControl: false, scrollWheelZoom: false })
      .setView([lat, lng], 17);
    const osm = L.tileLayer(OSM_URL, { maxZoom: 19 });
    const satl = L.tileLayer(SAT_URL, { maxZoom: 19 });
    osm.addTo(map);
    L.marker([lat, lng], { icon: PIN_ICON }).addTo(map);
    layersRef.current = { map, osm, sat: satl };
    setTimeout(() => map.invalidateSize(), 120);
    return () => map.remove();
  }, [lat, lng]);

  const toggle = () => {
    const ly = layersRef.current; if (!ly) return;
    if (sat) { ly.map.removeLayer(ly.sat); ly.osm.addTo(ly.map); }
    else { ly.map.removeLayer(ly.osm); ly.sat.addTo(ly.map); }
    setSat(!sat);
  };

  return (
    <>
      <div ref={boxRef} className="mapbox" style={{ height: "100%", border: 0, borderRadius: 0 }} />
      <button type="button" className="satbtn" onClick={toggle}>{sat ? "Bản đồ" : "Vệ tinh"}</button>
    </>
  );
}

const DRAFT_KEY = "np_draft";
const PREFS_KEY = "np_prefs";
const readJSON = (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } };

function AddForm({ initial, onSave, onCancel }) {
  const prefs = readJSON(PREFS_KEY) || {};
  const empty = { title: "", type: "đất", area: "", frontage: "", direction: "",
    khu: prefs.khu || "", address: "",
    price: "", price_per_m2: "",
    legal: prefs.legal || "sổ đỏ", land: prefs.land !== undefined ? prefs.land : "thổ cư",
    planning: "", division: "",
    source: prefs.source || "chính chủ", status: "dang_ban", lat: null, lng: null,
    desc: "", imgs: [], ownerName: "", ownerPhone: "" };
  const fromInitial = () => {
    if (!initial) return empty;
    const owner = initial.contacts?.find((c) => c.type === "đầu chủ");
    return { ...empty, ...initial,
      area: initial.area ?? "", frontage: initial.frontage ?? "", price: initial.price ?? "",
      price_per_m2: initial.price_per_m2 ?? "",
      imgs: (initial.imgs && initial.imgs.length ? initial.imgs : (initial.img ? [initial.img] : [])).map(resolveUrl),
      ownerName: owner?.name || "", ownerPhone: owner?.phone || "" };
  };
  const [f, setF] = useState(fromInitial);
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef();
  const camRef = useRef();
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isEdit = !!initial;
  const recalc = (price, area) => { const pr = Number(price), ar = Number(area); if (pr && ar) set("price_per_m2", Math.round(pr / ar)); };

  const aiParse = async () => {
    if (!raw.trim()) { setErr("Dán tin vào ô trên trước nhé"); return; }
    setLoading(true); setErr("");
    try {
      const r = await api.aiParse(raw);
      if (r.error) throw new Error(r.error);
      const p = r.parsed || {};
      const price = Number(p.price) || "", area = Number(p.area) || "";
      setF((s) => ({ ...s,
        title: p.title || s.title, type: TYPES.includes(p.type) ? p.type : s.type,
        area: area || s.area, frontage: p.frontage ?? s.frontage, direction: p.direction || s.direction,
        khu: KHU_VUC.includes(p.khu) ? p.khu : s.khu, address: p.address || s.address, price: price || s.price,
        price_per_m2: price && area ? Math.round(price / area) : s.price_per_m2,
        legal: LEGAL.includes(p.legal) ? p.legal : s.legal, land: LAND.includes(p.land) ? p.land : s.land,
        source: SOURCE.includes(p.source) ? p.source : s.source,
        planning: p.planning || s.planning, division: p.division || s.division, desc: p.desc || s.desc,
        ownerPhone: p.ownerPhone || s.ownerPhone }));
    } catch (e) { setErr("Không phân tích được. Thử dán rõ hơn hoặc nhập tay bên dưới."); }
    finally { setLoading(false); }
  };

  const pickImg = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true); setErr("");
    try {
      for (const file of files) {
        const r = await api.upload(file);
        if (r.url) setF((s) => ({ ...s, imgs: [...s.imgs, r.url] }));
        else throw new Error(r.error || "upload lỗi");
      }
    } catch (e) { setErr("Tải ảnh thất bại. Kiểm tra kết nối máy chủ."); }
    finally { setUploading(false); }
  };
  const removeImg = (i) => setF((s) => ({ ...s, imgs: s.imgs.filter((_, idx) => idx !== i) }));

  const [step, setStep] = useState(0);
  const STEPS = ["Cơ bản", "Vị trí & Pháp lý", "Liên hệ & Ảnh"];

  // --- tự lưu nháp (chỉ khi thêm mới) ---
  const [draftInfo, setDraftInfo] = useState(() => {
    if (initial) return null;
    const d = readJSON(DRAFT_KEY);
    return d && d.f && (d.f.title || d.f.area || (d.f.imgs || []).length || d.raw) ? d : null;
  });
  useEffect(() => {
    if (isEdit) return;
    if (f.title || f.area || (f.imgs && f.imgs.length) || raw)
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ f, raw, step, t: Date.now() }));
  }, [f, raw, step]); // eslint-disable-line
  const restoreDraft = () => {
    setF({ ...empty, ...draftInfo.f });
    setRaw(draftInfo.raw || "");
    setStep(draftInfo.step || 0);
    setDraftInfo(null);
  };
  const discardDraft = () => { localStorage.removeItem(DRAFT_KEY); setDraftInfo(null); };

  const buildPayload = () => {
    const contacts = [];
    if (f.ownerName || f.ownerPhone) contacts.push({ type: "đầu chủ", name: f.ownerName || "Đầu chủ", phone: f.ownerPhone });
    return { ...f, area: Number(f.area) || 0, frontage: f.frontage ? Number(f.frontage) : null,
      price: Number(f.price) || 0, price_per_m2: Number(f.price_per_m2) || 0, imgs: f.imgs, contacts };
  };
  const next = () => {
    if (step === 0 && (!f.title || !f.area)) { setErr("Cần nhập Tiêu đề và Diện tích trước khi tiếp tục"); return; }
    setErr(""); setStep((s) => Math.min(2, s + 1));
  };
  const prev = () => { setErr(""); setStep((s) => Math.max(0, s - 1)); };
  const goStep = (i) => {
    if (i > 0 && (!f.title || !f.area)) { setStep(0); setErr("Cần nhập Tiêu đề và Diện tích trước"); return; }
    setErr(""); setStep(i);
  };
  const submit = () => {
    if (!f.title || !f.area) { setStep(0); setErr("Cần nhập Tiêu đề và Diện tích"); return; }
    // nhớ lựa chọn hay dùng cho lần nhập sau + xoá nháp
    localStorage.setItem(PREFS_KEY, JSON.stringify({ khu: f.khu, source: f.source, legal: f.legal, land: f.land }));
    localStorage.removeItem(DRAFT_KEY);
    onSave(buildPayload());
  };

  return (
    <div className="form wizard">
      <div className="wizhead">
        <button className="wizx" onClick={onCancel} title="Đóng"><Icon n="x" size={20} /></button>
        <div className="wiztitle">{isEdit ? "Sửa tin" : "Thêm tin mới"}</div>
        <div style={{ width: 36 }} />
      </div>

      <div className="stepper">
        {STEPS.map((label, i) => (
          <div key={i} className={"stp" + (i === step ? " on" : "") + (i < step ? " done" : "")}
            onClick={() => goStep(i)}>
            <span className="dot">{i < step ? <Icon n="check" size={14} /> : i + 1}</span>
            <span className="lb">{label}</span>
          </div>
        ))}
      </div>

      <div className="wizbody">
        {draftInfo && (
          <div className="draftbar">
            <div className="grow">Có tin nhập dở {(() => { const a = timeAgo(new Date(draftInfo.t).toISOString()); return a === "vừa đăng" ? "vừa xong" : a; })()}</div>
            <button type="button" onClick={restoreDraft}>Khôi phục</button>
            <button type="button" className="dim" onClick={discardDraft}>Bỏ</button>
          </div>
        )}
        {step === 0 && (
          <>
            <div className="ai">
              <p className="h"><Icon n="sparkle" size={18} />AI bóc tách tin</p>
              <p className="s">Dán nguyên tin từ Zalo/Facebook — Claude tự điền hết các bước bên dưới.</p>
              <textarea placeholder='VD: "Bán đất thổ cư 90m2 ngõ ô tô thôn Cổ Loa Đông Anh, mặt tiền 5m hướng đông nam, sổ đỏ, giá 4.5 tỷ, LH 0903123456"'
                value={raw} onChange={(e) => setRaw(e.target.value)} />
              <button className="btn" onClick={aiParse} disabled={loading}>
                {loading ? <><span className="spin" />Đang phân tích…</> : <><Icon n="sparkle" size={16} />Phân tích bằng AI</>}
              </button>
            </div>
            <div className="field"><label>Tiêu đề *</label>
              <input value={f.title} placeholder="VD: Đất thổ cư thôn Cổ Loa 90m²" onChange={(e) => set("title", e.target.value)} /></div>
            <div className="r2">
              <div className="field"><label>Loại hình</label>
                <select value={f.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>Trạng thái</label>
                <select value={f.status} onChange={(e) => set("status", e.target.value)}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            </div>
            <div className="field"><label>Diện tích (m²) *</label>
              <input type="number" inputMode="decimal" value={f.area} onChange={(e) => { set("area", e.target.value); recalc(f.price, e.target.value); }} /></div>
            <PriceField label="Giá bán" value={f.price} onChange={(v) => { set("price", v); recalc(v, f.area); }} />
            <div className="field"><label>Giá/m² (tự tính)</label>
              <div className="ppm2 num">{Number(f.price_per_m2) > 0 ? fmtM2(Number(f.price_per_m2)) : "tự tính khi có giá và diện tích"}</div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="field"><label>Khu vực (thôn)</label>
              <ThonPicker value={f.khu} onChange={(v) => set("khu", v)} placeholder="— chọn thôn —" /></div>
            <div className="field"><label>Địa chỉ chi tiết</label>
              <input value={f.address} placeholder="VD: Ngõ 12, thôn Cổ Loa" onChange={(e) => set("address", e.target.value)} /></div>
            <div className="field"><label>Ghim vị trí lô đất</label>
              <MapPicker lat={f.lat} lng={f.lng} onPick={(la, ln) => setF((s) => ({ ...s, lat: la, lng: ln }))} /></div>
            <div className="r2">
              <div className="field"><label>Mặt tiền (m)</label>
                <input type="number" inputMode="decimal" value={f.frontage || ""} onChange={(e) => set("frontage", e.target.value)} /></div>
              <div className="field"><label>Hướng</label><input value={f.direction} placeholder="đông nam…" onChange={(e) => set("direction", e.target.value)} /></div>
            </div>
            <div className="r2">
              <div className="field"><label>Giấy tờ</label>
                <select value={f.legal} onChange={(e) => set("legal", e.target.value)}>{LEGAL.map((t) => <option key={t}>{t}</option>)}</select></div>
              <div className="field"><label>Loại đất</label>
                <select value={f.land} onChange={(e) => set("land", e.target.value)}><option value="">—</option>{LAND.map((t) => <option key={t}>{t}</option>)}</select></div>
            </div>
            <div className="r2">
              <div className="field"><label>Quy hoạch</label><input value={f.planning} placeholder="không dính…" onChange={(e) => set("planning", e.target.value)} /></div>
              <div className="field"><label>Tình trạng</label><input value={f.division} placeholder="đã tách thửa…" onChange={(e) => set("division", e.target.value)} /></div>
            </div>
            <div className="field"><label>Nguồn tin</label>
              <select value={f.source} onChange={(e) => set("source", e.target.value)}>
                {SOURCE.map((s) => <option key={s}>{s}</option>)}</select></div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="r2">
              <div className="field"><label>{f.source === "qua cò" ? "Tên cò / môi giới" : "Tên chính chủ"}</label><input value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} /></div>
              <div className="field"><label>{f.source === "qua cò" ? "SĐT cò" : "SĐT chính chủ"}</label><input type="tel" inputMode="tel" value={f.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} /></div>
            </div>
            <div className="field"><label>Mô tả</label><textarea value={f.desc} style={{ minHeight: 92 }} placeholder="Ghi chú thêm về lô đất, ngõ, tiện ích…" onChange={(e) => set("desc", e.target.value)} /></div>
            <div className="field"><label>Hình ảnh {f.imgs.length > 0 && `(${f.imgs.length})`}</label>
              {f.imgs.length > 0 && (
                <div className="imgrid">
                  {f.imgs.map((u, i) => (
                    <div key={i} className="imgcell" style={{ backgroundImage: `url(${u})` }}>
                      <button type="button" className="imgdel" onClick={() => removeImg(i)}><Icon n="x" size={13} /></button>
                    </div>
                  ))}
                </div>
              )}
              {uploading ? (
                <div className="imgpick"><span className="spin" style={{ borderTopColor: "var(--brand)", borderColor: "var(--line)" }} />Đang tải ảnh…</div>
              ) : (
                <div className="imgbtns">
                  <div className="imgpick" onClick={() => camRef.current?.click()}>
                    <Icon n="cam" /><div>Chụp ảnh</div>
                  </div>
                  <div className="imgpick" onClick={() => fileRef.current?.click()}>
                    <Icon n="image" /><div>Chọn từ thư viện</div>
                  </div>
                </div>
              )}
              <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={pickImg} />
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={pickImg} />
            </div>
          </>
        )}
      </div>

      <div className="wizbar">
        {err && <div className="wizerr">{err}</div>}
        <div className="wizbtns">
          {step > 0
            ? <button className="wback" onClick={prev}><Icon n="back" size={17} />Quay lại</button>
            : <button className="wback" onClick={onCancel}>Huỷ</button>}
          {step < 2
            ? <button className="wnext" onClick={next}>Tiếp tục<Icon n="chev" size={17} /></button>
            : <button className="wnext" onClick={submit}><Icon n="check" size={17} />{isEdit ? "Lưu thay đổi" : "Lưu tin"}</button>}
        </div>
      </div>
    </div>
  );
}
