"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive, ArrowDownRight, ArrowUpRight, Bookmark, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Command, FileImage, FileText, FolderOpen, Grid2X2,
  ImagePlus, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings,
  Sparkles, Star, Tag, Trash2, X, Copy, Pencil, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Item = {
  id: string; user_id: string; kind: "note" | "prompt"; title: string; content: string;
  category: string; tags: string[]; image_path: string | null; is_favorite: boolean;
  is_archived: boolean; created_at: string; updated_at: string;
};

const nav = [
  { id: "home", label: "Beranda", icon: LayoutDashboard },
  { id: "all", label: "Semua catatan", icon: FileText },
  { id: "prompts", label: "Prompt AI", icon: Sparkles },
  { id: "favorites", label: "Favorit", icon: Star },
  { id: "archive", label: "Arsip", icon: Archive },
  { id: "gallery", label: "Galeri gambar", icon: FileImage }
];

const blank = { title: "", content: "", category: "Umum", tags: "", kind: "note" as "note" | "prompt" };

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const loadItems = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.from("max_note_items").select("*").order("updated_at", { ascending: false });
    if (error) setNotice(error.message);
    else setItems((data || []) as Item[]);
    setLoading(false);
  }, [session, supabase]);

  useEffect(() => { if (session) void loadItems(); }, [session, loadItems]);

  const visible = useMemo(() => {
    let list = items;
    if (section === "all") list = list.filter(x => x.kind === "note" && !x.is_archived);
    if (section === "prompts") list = list.filter(x => x.kind === "prompt" && !x.is_archived);
    if (section === "favorites") list = list.filter(x => x.is_favorite && !x.is_archived);
    if (section === "archive") list = list.filter(x => x.is_archived);
    if (section === "gallery") list = list.filter(x => !!x.image_path && !x.is_archived);
    if (section === "home") list = list.filter(x => !x.is_archived).slice(0, 6);
    const q = query.trim().toLowerCase();
    return q ? list.filter(x => (x.title + " " + x.content + " " + x.category + " " + x.tags.join(" ")).toLowerCase().includes(q)) : list;
  }, [items, query, section]);

  const stats = useMemo(() => ({
    notes: items.filter(x => x.kind === "note" && !x.is_archived).length,
    prompts: items.filter(x => x.kind === "prompt" && !x.is_archived).length,
    favorites: items.filter(x => x.is_favorite && !x.is_archived).length,
    archived: items.filter(x => x.is_archived).length
  }), [items]);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setAuthError("");
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (result.error) setAuthError(result.error.message);
    else if (authMode === "signup" && !result.data.session) setAuthError("Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.");
    setBusy(false);
  }

  function openNew(kind: "note" | "prompt" = "note") {
    setEditing(null); setForm({ ...blank, kind }); setEditor(true);
  }
  function openEdit(item: Item) {
    setEditing(item);
    setForm({ title: item.title, content: item.content, category: item.category, tags: item.tags.join(", "), kind: item.kind });
    setEditor(true);
  }
  async function saveItem(e: React.FormEvent) {
    e.preventDefault(); if (!session?.user?.id) return;
    setSaving(true);
    const payload = {
      user_id: session.user.id, kind: form.kind, title: form.title.trim() || "Tanpa judul",
      content: form.content, category: form.category.trim() || "Umum",
      tags: form.tags.split(",").map(x => x.trim()).filter(Boolean), updated_at: new Date().toISOString()
    };
    const result = editing
      ? await supabase.from("max_note_items").update(payload).eq("id", editing.id)
      : await supabase.from("max_note_items").insert(payload);
    if (result.error) setNotice(result.error.message);
    else { setEditor(false); setNotice("Tersimpan"); await loadItems(); }
    setSaving(false);
  }
  async function toggleField(item: Item, field: "is_favorite" | "is_archived") {
    const { error } = await supabase.from("max_note_items").update({ [field]: !item[field], updated_at: new Date().toISOString() }).eq("id", item.id);
    if (error) setNotice(error.message); else await loadItems();
  }
  async function deleteItem(item: Item) {
    if (!window.confirm("Hapus catatan ini secara permanen?")) return;
    const { error } = await supabase.from("max_note_items").delete().eq("id", item.id);
    if (error) setNotice(error.message); else { setNotice("Catatan dihapus"); await loadItems(); }
  }
  async function uploadImage(file?: File) {
    if (!file || !session?.user?.id) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setNotice("Gunakan JPG, PNG, WEBP, atau GIF maksimal 10 MB."); return;
    }
    setImageBusy(true);
    const path = session.user.id + "/" + crypto.randomUUID() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const upload = await supabase.storage.from("max-note-media").upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) setNotice(upload.error.message);
    else {
      const { error } = await supabase.from("max_note_items").insert({
        user_id: session.user.id, kind: "note", title: file.name, content: "Gambar yang diunggah",
        category: "Galeri", image_path: path
      });
      if (error) setNotice(error.message); else { setNotice("Gambar berhasil diunggah"); await loadItems(); }
    }
    setImageBusy(false);
  }
  async function copyText(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice("Berhasil disalin"); }
    catch { setNotice("Clipboard tidak tersedia di browser ini."); }
  }

  if (!authReady) return <div className="boot"><div className="boot-mark">M.</div><span>Menyiapkan ruang kerja...</span></div>;

  if (!session) return (
    <main className="auth-screen">
      <div className="auth-left">
        <div className="brand"><span className="brand-mark">M.</span><span>MAX NOTE<span className="brand-dot">.</span></span></div>
        <div className="auth-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL KNOWLEDGE SPACE</div>
          <h1>Semua ide.<br /><em>Satu ruang.</em></h1>
          <p>Tempat menyimpan pemikiran, merapikan catatan, dan mengoleksi prompt AI terbaikmu.</p>
          <div className="auth-art"><div className="art-sheet sheet-back">IDEA / 001</div><div className="art-sheet sheet-front"><span>MAKE</span><strong>IT<br/>CLEAR.</strong><small>NOTES · PROMPTS · IDEAS</small></div><div className="art-stamp">M<br/>N</div></div>
        </div>
        <div className="auth-foot">© 2026 MAX NOTE — BUILT FOR THINKERS</div>
      </div>
      <div className="auth-right">
        <form className="auth-form" onSubmit={authenticate}>
          <div className="mobile-brand brand"><span className="brand-mark">M.</span><span>MAX NOTE<span className="brand-dot">.</span></span></div>
          <span className="form-kicker">WELCOME {authMode === "login" ? "BACK" : "ABOARD"}</span>
          <h2>{authMode === "login" ? "Masuk ke ruangmu." : "Buat ruang baru."}</h2>
          <p className="muted">{authMode === "login" ? "Lanjutkan menyimpan ide-ide terbaikmu." : "Daftarkan akun untuk mulai menyimpan catatan."}</p>
          <label>Email address<input type="email" autoComplete="email" placeholder="nama@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="Minimal 6 karakter" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required /></label>
          {authError && <div className="auth-error">{authError}</div>}
          <button className="button button-dark button-full" disabled={busy}>{busy ? "Memproses..." : authMode === "login" ? "Masuk ke Max Note" : "Buat akun"} <ArrowUpRight size={17}/></button>
          <div className="auth-switch">{authMode === "login" ? "Belum punya akun?" : "Sudah punya akun?"} <button type="button" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthError(""); }}>{authMode === "login" ? "Daftar sekarang" : "Masuk"}</button></div>
          <div className="secure-note"><span/> SESSION TERLINDUNGI OLEH SUPABASE AUTH</div>
        </form>
      </div>
    </main>
  );

  const title = nav.find(n => n.id === section)?.label || "Beranda";
  const dateLabel = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return (
    <main className="workspace">
      <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
        <div className="side-top"><div className="brand"><span className="brand-mark">M.</span>{!collapsed && <span>MAX NOTE<span className="brand-dot">.</span></span>}</div><button className="icon-button side-collapse" onClick={() => setCollapsed(!collapsed)} title="Lipat sidebar">{collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button></div>
        {!collapsed && <div className="workspace-label">WORKSPACE <span>PERSONAL</span></div>}
        <nav className="side-nav">{nav.map(n => <button key={n.id} className={section === n.id ? "nav-link active" : "nav-link"} onClick={() => setSection(n.id)} title={collapsed ? n.label : undefined}><n.icon size={18}/>{!collapsed && <span>{n.label}</span>}{!collapsed && section === n.id && <span className="nav-dot"/>}</button>)}</nav>
        {!collapsed && <div className="side-bottom"><div className="side-quote"><span>“</span><p>Ideas are easy.<br/>Execution is everything.</p><small>— JOHN DOE</small></div><button className="nav-link" onClick={() => setNotice("Pengaturan akun tersedia melalui Supabase Auth.")}><Settings size={18}/><span>Pengaturan</span></button><div className="profile"><div className="avatar">{(session.user.email || "M").slice(0,1).toUpperCase()}</div><div className="profile-meta"><b>{session.user.email?.split("@")[0]}</b><small>Personal workspace</small></div><button className="icon-button" onClick={() => supabase.auth.signOut()} title="Keluar"><LogOut size={17}/></button></div></div>}
        {collapsed && <button className="nav-link collapsed-logout" onClick={() => supabase.auth.signOut()} title="Keluar"><LogOut size={18}/></button>}
      </aside>
      <section className="main-area">
        <header className="topbar"><div className="crumb"><span>WORKSPACE</span><ChevronRight size={14}/><b>{title}</b></div><div className="top-actions"><div className="top-date">{dateLabel}</div><button className="top-search" onClick={() => document.getElementById("global-search")?.focus()}><Search size={16}/><span>Cari sesuatu...</span><kbd>⌘ K</kbd></button><div className="avatar top-avatar">{(session.user.email || "M").slice(0,1).toUpperCase()}</div></div></header>
        <div className="content">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"/>{section === "home" ? "YOUR CREATIVE SPACE" : "COLLECTION / " + section.toUpperCase()}</div><h1>{section === "home" ? <>Selamat datang,<br/><em>pemikir.</em></> : title + "."}</h1><p>{section === "home" ? "Rapikan ide. Simpan inspirasi. Bangun sesuatu yang berarti." : "Semua yang kamu simpan, tertata dalam satu tempat."}</p></div><div className="heading-actions"><button className="button button-light" onClick={() => openNew("prompt")}><Sparkles size={16}/> Prompt AI</button><button className="button button-dark" onClick={() => openNew("note")}><Plus size={17}/> Catatan baru</button></div></div>
          <div className="stats-grid">
            <div className="stat-card stat-feature"><div className="stat-top"><span>TOTAL CATATAN</span><FileText size={18}/></div><strong>{stats.notes}</strong><small>Semua pemikiran tersimpan</small><div className="stat-line"><i style={{width: "72%"}}/></div></div>
            <div className="stat-card"><div className="stat-top"><span>PROMPT AI</span><Sparkles size={18}/></div><strong>{stats.prompts}</strong><small>Koleksi prompt andalan</small><div className="stat-bottom"><span className="stat-mini">↗</span> Siap digunakan kembali</div></div>
            <div className="stat-card"><div className="stat-top"><span>FAVORIT</span><Star size={18}/></div><strong>{stats.favorites}</strong><small>Yang paling penting</small><div className="stat-bottom"><span className="stat-mini">✦</span> Akses cepat</div></div>
            <div className="stat-card"><div className="stat-top"><span>DIARSIPKAN</span><Archive size={18}/></div><strong>{stats.archived}</strong><small>Disimpan untuk nanti</small><div className="stat-bottom"><span className="stat-mini">↘</span> Tetap aman</div></div>
          </div>
          <div className="section-toolbar"><div><h2>{section === "home" ? "Baru-baru ini" : section === "gallery" ? "Galeri visual" : "Koleksi kamu"} <span>{visible.length.toString().padStart(2,"0")}</span></h2><p>{section === "home" ? "Lanjutkan dari tempat terakhir kamu berhenti." : "Pilih item untuk melihat dan mengelola isinya."}</p></div><div className="toolbar-right"><div className="search-field"><Search size={16}/><input id="global-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari catatan atau prompt..."/></div>{section === "home" && <button className="text-button" onClick={() => setSection("all")}>Lihat semua <ArrowUpRight size={15}/></button>}</div></div>
          {loading ? <div className="empty-state">Memuat koleksi...</div> : visible.length === 0 ? <div className="empty-state"><div className="empty-icon"><FolderOpen size={24}/></div><h3>Belum ada yang tersimpan.</h3><p>Mulai dengan membuat catatan atau menyimpan prompt AI pertamamu.</p><button className="button button-dark" onClick={() => openNew(section === "prompts" ? "prompt" : "note")}><Plus size={16}/> Buat sekarang</button></div> : (
            <div className={section === "gallery" ? "notes-grid gallery-grid" : "notes-grid"}>
              {visible.map((item, i) => <motion.article layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.035}} className={"note-card " + (item.kind === "prompt" ? "prompt-card" : "")} key={item.id}>
                <div className="note-card-top"><span className="note-type">{item.kind === "prompt" ? <><Sparkles size={12}/> PROMPT</> : <><FileText size={12}/> CATATAN</>}</span><div className="note-card-actions"><button className={item.is_favorite ? "mini-action chosen" : "mini-action"} onClick={() => toggleField(item,"is_favorite")} title="Favorit"><Star size={15} fill={item.is_favorite ? "currentColor" : "none"}/></button><button className="mini-action" onClick={() => openEdit(item)} title="Edit"><Pencil size={15}/></button><button className="mini-action" onClick={() => toggleField(item,"is_archived")} title={item.is_archived ? "Pulihkan" : "Arsip"}>{item.is_archived ? <ArrowUpRight size={15}/> : <Archive size={15}/>}</button></div></div>
                {item.image_path && <ImagePreview path={item.image_path} supabase={supabase}/>}
                <button className="note-main" onClick={() => openEdit(item)}><span className="note-category">{item.category.toUpperCase()}</span><h3>{item.title}</h3><p>{item.content || "Tidak ada isi tambahan."}</p></button>
                <div className="note-card-foot"><div className="tag-list">{item.tags.slice(0,2).map(t => <span key={t}>#{t}</span>)}</div><time>{new Date(item.updated_at).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}</time></div>
                {item.kind === "prompt" && <button className="copy-prompt" onClick={() => copyText(item.content)}><Copy size={14}/> Salin prompt</button>}
              </motion.article>)}
            </div>
          )}
          <footer className="main-footer"><span>MAX NOTE © 2026</span><span>THINK CLEAR. KEEP CREATING.</span></footer>
        </div>
      </section>
      <AnimatePresence>{editor && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setEditor(false); }}><motion.form initial={{opacity:0,y:16,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:10}} className="editor-modal" onSubmit={saveItem}>
        <div className="modal-head"><div><span className="form-kicker">{editing ? "EDIT COLLECTION" : "NEW ENTRY"}</span><h2>{editing ? "Perbarui item." : "Tangkap idemu."}</h2></div><button type="button" className="icon-button" onClick={() => setEditor(false)}><X size={20}/></button></div>
        <div className="kind-switch"><button type="button" className={form.kind === "note" ? "selected" : ""} onClick={() => setForm({...form,kind:"note"})}><FileText size={15}/> Catatan</button><button type="button" className={form.kind === "prompt" ? "selected" : ""} onClick={() => setForm({...form,kind:"prompt"})}><Sparkles size={15}/> Prompt AI</button></div>
        <label>Judul<input autoFocus value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Beri judul yang mudah diingat..." required/></label>
        <label>Isi<textarea rows={7} value={form.content} onChange={e => setForm({...form,content:e.target.value})} placeholder={form.kind === "prompt" ? "Tulis prompt AI kamu di sini..." : "Mulai tulis ide kamu..."} /></label>
        <div className="form-row"><label>Kategori<input value={form.category} onChange={e => setForm({...form,category:e.target.value})} placeholder="Umum"/></label><label>Tag <small>(pisahkan koma)</small><input value={form.tags} onChange={e => setForm({...form,tags:e.target.value})} placeholder="coding, ai, ide"/></label></div>
        <div className="modal-foot"><button type="button" className="button button-light" onClick={() => setEditor(false)}>Batal</button><button className="button button-dark" disabled={saving}>{saving ? "Menyimpan..." : <><Check size={16}/> Simpan item</>}</button></div>
      </motion.form></div>}</AnimatePresence>
      <label className="upload-fab" title="Unggah gambar"><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => void uploadImage(e.target.files?.[0])} disabled={imageBusy}/>{imageBusy ? <span className="spinner"/> : <ImagePlus size={19}/>}</label>
      <AnimatePresence>{notice && <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}} className="toast">{notice}<button onClick={() => setNotice("")}><X size={14}/></button></motion.div>}</AnimatePresence>
    </main>
  );
}

function ImagePreview({ path, supabase }: { path: string; supabase: ReturnType<typeof createClient> }) {
  const [url, setUrl] = useState("");
  useEffect(() => { let active = true; supabase.storage.from("max-note-media").createSignedUrl(path, 3600).then(({data}) => { if (active) setUrl(data?.signedUrl || ""); }); return () => { active = false; }; }, [path, supabase]);
  return url ? <img className="note-image" src={url} alt="Lampiran catatan"/> : <div className="image-placeholder"><FileImage size={22}/></div>;
}
