import React, { useState, useEffect } from "react";

const DB_URL = "https://warehouse-app-bobat-default-rtdb.asia-southeast1.firebasedatabase.app";

const CATEGORIES = ["すべて", "文具", "紙類", "電子機器", "備品", "消耗品"];

const api = {
  async get(path) {
    const res = await fetch(`${DB_URL}${path}.json`);
    return res.json();
  },
  async set(path, data) {
    await fetch(`${DB_URL}${path}.json`, { method: "PUT", body: JSON.stringify(data) });
  },
  async push(path, data) {
    const res = await fetch(`${DB_URL}${path}.json`, { method: "POST", body: JSON.stringify(data) });
    return res.json();
  },
  async delete(path) {
    await fetch(`${DB_URL}${path}.json`, { method: "DELETE" });
  },
};

export default function App() {
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [tabView, setTabView] = useState("list");
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [transactionType, setTransactionType] = useState("in");
  const [transactionQty, setTransactionQty] = useState("");
  const [transactionNote, setTransactionNote] = useState("");
  const [newItem, setNewItem] = useState({ code: "", name: "", category: "文具", quantity: 0, unit: "個", minStock: 0, location: "" });
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [itemsData, historyData] = await Promise.all([
        api.get("/items"),
        api.get("/history"),
      ]);
      setItems(itemsData ? Object.entries(itemsData).map(([k, v]) => ({ ...v, firebaseKey: k })) : []);
      setHistory(historyData ? Object.entries(historyData).map(([k, v]) => ({ ...v, firebaseKey: k })).sort((a, b) => b.timestamp - a.timestamp) : []);
    } catch (e) {
      showToast("データの読み込みに失敗しました", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const filteredItems = items.filter(item => {
    const matchSearch = item.name.includes(searchQuery) || item.code.includes(searchQuery);
    const matchCat = selectedCategory === "すべて" || item.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const lowStockCount = items.filter(i => i.quantity <= i.minStock).length;

  const handleTransaction = async () => {
    const qty = parseInt(transactionQty);
    if (!qty || qty <= 0) return showToast("数量を正しく入力してください", "error");
    if (transactionType === "out" && qty > selectedItem.quantity) return showToast("在庫が不足しています", "error");
    setSaving(true);
    try {
      const newQty = transactionType === "in" ? selectedItem.quantity + qty : selectedItem.quantity - qty;
      await api.set(`/items/${selectedItem.firebaseKey}/quantity`, newQty);
      const record = {
        itemId: selectedItem.firebaseKey, itemName: selectedItem.name,
        type: transactionType, quantity: qty, note: transactionNote,
        date: new Date().toLocaleString("ja-JP"), timestamp: Date.now()
      };
      await api.push("/history", record);
      await loadData();
      const updated = items.find(i => i.firebaseKey === selectedItem.firebaseKey);
      if (updated) setSelectedItem({ ...updated, quantity: newQty });
      setTransactionQty(""); setTransactionNote("");
      showToast(transactionType === "in" ? "入庫が完了しました ✓" : "出庫が完了しました ✓");
      setView("detail");
    } catch {
      showToast("処理に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.code || !newItem.name || !newItem.location) return showToast("必須項目を入力してください", "error");
    if (items.find(i => i.code === newItem.code)) return showToast("品番が重複しています", "error");
    setSaving(true);
    try {
      const item = { ...newItem, quantity: parseInt(newItem.quantity) || 0, minStock: parseInt(newItem.minStock) || 0, createdAt: Date.now() };
      await api.push("/items", item);
      await loadData();
      setNewItem({ code: "", name: "", category: "文具", quantity: 0, unit: "個", minStock: 0, location: "" });
      showToast("品目を追加しました ✓");
      setView("list");
    } catch {
      showToast("追加に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (key) => {
    setSaving(true);
    try {
      await api.delete(`/items/${key}`);
      await loadData();
      setDeleteConfirm(null);
      showToast("品目を削除しました");
      setView("list");
    } catch {
      showToast("削除に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const s = {
    app: { fontFamily: "'Noto Sans JP', sans-serif", background: "#0f1117", minHeight: "100vh", maxWidth: 430, margin: "0 auto", color: "#e8eaf0", position: "relative" },
    header: { background: "#1a1f2e", padding: "16px 20px 12px", borderBottom: "1px solid #2a3040", position: "sticky", top: 0, zIndex: 10 },
    headerTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
    headerTitle: { fontSize: 18, fontWeight: 700, letterSpacing: "0.02em" },
    badge: { background: "#ff4757", color: "#fff", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
    syncBadge: { background: "#3d7eff20", color: "#3d7eff", borderRadius: 10, padding: "2px 8px", fontSize: 10, border: "1px solid #3d7eff30" },
    searchBar: { background: "#1e2436", border: "1px solid #2d3547", borderRadius: 10, padding: "8px 14px", color: "#e8eaf0", fontSize: 14, width: "100%", outline: "none", marginTop: 10, boxSizing: "border-box" },
    catScroll: { display: "flex", gap: 8, overflowX: "auto", padding: "10px 20px", scrollbarWidth: "none", background: "#0f1117" },
    catChip: (a) => ({ background: a ? "#3d7eff" : "#1e2436", color: a ? "#fff" : "#8892a4", border: `1px solid ${a ? "#3d7eff" : "#2d3547"}`, borderRadius: 20, padding: "5px 14px", fontSize: 12, fontWeight: a ? 700 : 400, whiteSpace: "nowrap", cursor: "pointer" }),
    list: { padding: "0 16px 100px" },
    card: (low) => ({ background: "#1a1f2e", border: `1px solid ${low ? "#ff475720" : "#2a3040"}`, borderLeft: `3px solid ${low ? "#ff4757" : "#3d7eff"}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }),
    cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
    itemName: { fontSize: 15, fontWeight: 600 },
    itemCode: { fontSize: 11, color: "#5a6478", marginTop: 2 },
    qtyBadge: (low) => ({ background: low ? "#ff475715" : "#3d7eff15", color: low ? "#ff4757" : "#3d7eff", border: `1px solid ${low ? "#ff475730" : "#3d7eff30"}`, borderRadius: 8, padding: "4px 10px", fontSize: 13, fontWeight: 700 }),
    metaRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 },
    metaTag: { background: "#252b3b", color: "#8892a4", borderRadius: 6, padding: "2px 8px", fontSize: 11 },
    fab: { position: "fixed", bottom: 80, right: 20, width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg, #3d7eff, #2563eb)", border: "none", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px #3d7eff40", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 },
    tabBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#161b29", borderTop: "1px solid #2a3040", display: "flex", padding: "8px 0 12px", zIndex: 30 },
    tab: (a) => ({ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", color: a ? "#3d7eff" : "#4a5568", fontSize: 10, fontWeight: a ? 700 : 400 }),
    detailHeader: { background: "#1a1f2e", padding: "16px 20px", borderBottom: "1px solid #2a3040", display: "flex", alignItems: "center", gap: 12 },
    backBtn: { background: "#252b3b", border: "none", color: "#8892a4", width: 36, height: 36, borderRadius: 10, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" },
    detailBody: { padding: "20px 16px 100px" },
    infoCard: { background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: 14, padding: 16, marginBottom: 14 },
    infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #252b3b" },
    bigQty: { textAlign: "center", padding: "20px 0", borderBottom: "1px solid #252b3b", marginBottom: 8 },
    bigNum: (low) => ({ fontSize: 48, fontWeight: 800, color: low ? "#ff4757" : "#3d7eff", lineHeight: 1 }),
    btnRow: { display: "flex", gap: 10, marginTop: 16 },
    btnIn: { flex: 1, background: "linear-gradient(135deg, #00c851, #00a63e)", border: "none", color: "#fff", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    btnOut: { flex: 1, background: "linear-gradient(135deg, #ff4757, #cc0022)", border: "none", color: "#fff", borderRadius: 12, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    btnDelete: { background: "#1e2436", border: "1px solid #ff475740", color: "#ff4757", borderRadius: 12, padding: "13px 20px", fontSize: 15, fontWeight: 700, cursor: "pointer" },
    txCard: { background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: 14, padding: 20, margin: "16px" },
    input: { background: "#252b3b", border: "1px solid #2d3547", borderRadius: 10, padding: "12px 14px", color: "#e8eaf0", fontSize: 15, width: "100%", outline: "none", boxSizing: "border-box" },
    label: { fontSize: 12, color: "#5a6478", marginBottom: 6, display: "block", marginTop: 14 },
    btnPrimary: (type) => ({ width: "100%", background: type === "in" ? "linear-gradient(135deg, #00c851, #00a63e)" : "linear-gradient(135deg, #ff4757, #cc0022)", border: "none", color: "#fff", borderRadius: 12, padding: "15px 0", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 20, opacity: saving ? 0.6 : 1 }),
    addCard: { background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: 14, padding: 20, margin: "16px" },
    select: { background: "#252b3b", border: "1px solid #2d3547", borderRadius: 10, padding: "12px 14px", color: "#e8eaf0", fontSize: 15, width: "100%", outline: "none" },
    histCard: { background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: 10, padding: "12px 14px", marginBottom: 8 },
    histType: (t) => ({ color: t === "in" ? "#00c851" : "#ff4757", fontWeight: 700, fontSize: 13 }),
    toast: (t) => ({ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", background: t === "error" ? "#ff4757" : "#00c851", color: "#fff", padding: "10px 24px", borderRadius: 30, fontSize: 14, fontWeight: 600, zIndex: 100, whiteSpace: "nowrap", boxShadow: "0 4px 20px #00000060" }),
    overlay: { position: "fixed", inset: 0, background: "#000000a0", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" },
    confirmBox: { background: "#1a1f2e", border: "1px solid #2a3040", borderRadius: 16, padding: 24, margin: 20 },
    sectionTitle: { fontSize: 13, color: "#5a6478", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10, marginTop: 4 },
    emptyState: { textAlign: "center", padding: "60px 20px", color: "#4a5568" },
    loadingScreen: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16, color: "#5a6478" },
  };

  if (loading) return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={s.loadingScreen}>
        <div style={{ fontSize: 48 }}>📦</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e8eaf0" }}>倉庫管理システム</div>
        <div style={{ fontSize: 13 }}>データを読み込み中...</div>
      </div>
    </div>
  );

  const isInSubView = ["detail", "transaction", "addItem"].includes(view);
  const itemHistory = selectedItem ? history.filter(h => h.itemId === selectedItem.firebaseKey) : [];

  const renderList = () => (
    <>
      <div style={s.header}>
        <div style={s.headerTop}>
          <div>
            <div style={s.headerTitle}>📦 倉庫管理システム</div>
            <div style={{ fontSize: 11, color: "#5a6478", marginTop: 2 }}>{items.length}品目 · <span style={{ color: "#3d7eff" }}>🔄 リアルタイム同期中</span></div>
          </div>
          {lowStockCount > 0 && <div style={s.badge}>⚠ {lowStockCount}件</div>}
        </div>
        <input style={s.searchBar} placeholder="🔍 品名・品番で検索..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>
      <div style={s.catScroll}>
        {CATEGORIES.map(c => <div key={c} style={s.catChip(selectedCategory === c)} onClick={() => setSelectedCategory(c)}>{c}</div>)}
      </div>
      <div style={s.list}>
        {filteredItems.length === 0
          ? <div style={s.emptyState}><div style={{ fontSize: 40 }}>📭</div><div>品目が見つかりません</div></div>
          : filteredItems.map(item => {
            const low = item.quantity <= item.minStock;
            return (
              <div key={item.firebaseKey} style={s.card(low)} onClick={() => { setSelectedItem(item); setView("detail"); }}>
                <div style={s.cardHeader}>
                  <div><div style={s.itemName}>{item.name}</div><div style={s.itemCode}>{item.code}</div></div>
                  <div style={s.qtyBadge(low)}>{item.quantity} {item.unit}</div>
                </div>
                <div style={s.metaRow}>
                  <div style={s.metaTag}>{item.category}</div>
                  <div style={s.metaTag}>📍 {item.location}</div>
                  {low && <div style={{ ...s.metaTag, color: "#ff4757", background: "#ff475715" }}>⚠ 在庫少</div>}
                </div>
              </div>
            );
          })}
      </div>
      <button style={s.fab} onClick={() => setView("addItem")}>＋</button>
    </>
  );

  const renderDetail = () => {
    const item = selectedItem;
    const low = item.quantity <= item.minStock;
    return (
      <>
        <div style={s.detailHeader}>
          <button style={s.backBtn} onClick={() => { setView("list"); loadData(); }}>←</button>
          <div><div style={{ fontSize: 15, fontWeight: 700 }}>{item.name}</div><div style={{ fontSize: 11, color: "#5a6478" }}>{item.code}</div></div>
        </div>
        <div style={s.detailBody}>
          <div style={s.infoCard}>
            <div style={s.bigQty}>
              <div style={{ fontSize: 12, color: "#5a6478", marginBottom: 4 }}>現在庫数</div>
              <div style={s.bigNum(low)}>{item.quantity}</div>
              <div style={{ fontSize: 14, color: "#5a6478", marginTop: 4 }}>{item.unit}</div>
              {low && <div style={{ marginTop: 8, fontSize: 12, color: "#ff4757", background: "#ff475715", borderRadius: 8, padding: "4px 12px", display: "inline-block" }}>⚠ 最低在庫数（{item.minStock}{item.unit}）を下回っています</div>}
            </div>
            {[["品番", item.code], ["カテゴリ", item.category], ["保管場所", item.location], ["最低在庫数", `${item.minStock} ${item.unit}`]].map(([l, v]) => (
              <div key={l} style={s.infoRow}><span style={{ fontSize: 13, color: "#5a6478" }}>{l}</span><span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span></div>
            ))}
          </div>
          <div style={s.btnRow}>
            <button style={s.btnIn} onClick={() => { setTransactionType("in"); setView("transaction"); }}>＋ 入庫</button>
            <button style={s.btnOut} onClick={() => { setTransactionType("out"); setView("transaction"); }}>－ 出庫</button>
          </div>
          {itemHistory.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={s.sectionTitle}>入出庫履歴</div>
              {itemHistory.map(h => (
                <div key={h.firebaseKey} style={s.histCard}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={s.histType(h.type)}>{h.type === "in" ? "▲ 入庫" : "▼ 出庫"} {h.quantity}{item.unit}</span>
                    <span style={{ fontSize: 11, color: "#5a6478" }}>{h.date}</span>
                  </div>
                  {h.note && <div style={{ fontSize: 12, color: "#8892a4", marginTop: 4 }}>{h.note}</div>}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <button style={s.btnDelete} onClick={() => setDeleteConfirm(item.firebaseKey)}>🗑 品目を削除</button>
          </div>
        </div>
      </>
    );
  };

  const renderTransaction = () => (
    <>
      <div style={s.detailHeader}>
        <button style={s.backBtn} onClick={() => setView("detail")}>←</button>
        <div style={{ fontSize: 15, fontWeight: 700, color: transactionType === "in" ? "#00c851" : "#ff4757" }}>
          {transactionType === "in" ? "▲ 入庫処理" : "▼ 出庫処理"}
        </div>
      </div>
      <div style={s.txCard}>
        <div style={{ fontSize: 14, color: "#8892a4", marginBottom: 16, padding: "10px 14px", background: "#252b3b", borderRadius: 10 }}>
          {selectedItem?.name} <span style={{ color: "#5a6478" }}>/ 現在庫: </span>{selectedItem?.quantity}{selectedItem?.unit}
        </div>
        <label style={s.label}>数量 *</label>
        <input style={s.input} type="number" placeholder="数量を入力" value={transactionQty} onChange={e => setTransactionQty(e.target.value)} />
        <label style={s.label}>備考</label>
        <input style={s.input} placeholder="担当者名・理由など（任意）" value={transactionNote} onChange={e => setTransactionNote(e.target.value)} />
        <button style={s.btnPrimary(transactionType)} onClick={handleTransaction} disabled={saving}>
          {saving ? "処理中..." : transactionType === "in" ? "入庫を確定する" : "出庫を確定する"}
        </button>
      </div>
    </>
  );

  const renderAddItem = () => (
    <>
      <div style={s.detailHeader}>
        <button style={s.backBtn} onClick={() => setView("list")}>←</button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>＋ 新規品目追加</div>
      </div>
      <div style={s.addCard}>
        {[["品番 *", "code", "ITM-006"], ["品名 *", "name", "例：ホチキス"], ["単位", "unit", "個"], ["初期在庫数", "quantity", "0"], ["最低在庫数", "minStock", "0"], ["保管場所 *", "location", "例：A-1-3"]].map(([label, key, ph]) => (
          <div key={key}>
            <label style={s.label}>{label}</label>
            <input style={s.input} placeholder={ph} value={newItem[key]} onChange={e => setNewItem(p => ({ ...p, [key]: e.target.value }))} type={["quantity", "minStock"].includes(key) ? "number" : "text"} />
          </div>
        ))}
        <label style={s.label}>カテゴリ</label>
        <select style={s.select} value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}>
          {CATEGORIES.filter(c => c !== "すべて").map(c => <option key={c}>{c}</option>)}
        </select>
        <button style={{ ...s.btnPrimary("in"), marginTop: 24 }} onClick={handleAddItem} disabled={saving}>
          {saving ? "追加中..." : "品目を追加する"}
        </button>
      </div>
    </>
  );

  const renderDashboard = () => {
    const lowStock = items.filter(i => i.quantity <= i.minStock);
    const catCounts = items.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {});
    return (
      <>
        <div style={s.header}>
          <div style={s.headerTop}>
            <div style={s.headerTitle}>📊 ダッシュボード</div>
            <div style={{ fontSize: 11, color: "#3d7eff" }}>🔄 同期中</div>
          </div>
        </div>
        <div style={{ padding: "16px 16px 100px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["登録品目", items.length, "🗂", "#3d7eff"], ["要補充", lowStock.length, "⚠", "#ff4757"], ["総取引数", history.length, "🔄", "#00c851"], ["カテゴリ", Object.keys(catCounts).length, "🏷", "#f59e0b"]].map(([l, v, ic, c]) => (
              <div key={l} style={{ background: "#1a1f2e", border: `1px solid ${c}20`, borderRadius: 14, padding: "16px 14px" }}>
                <div style={{ fontSize: 24 }}>{ic}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: c, lineHeight: 1.2 }}>{v}</div>
                <div style={{ fontSize: 12, color: "#5a6478", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          {lowStock.length > 0 && (
            <div>
              <div style={s.sectionTitle}>⚠ 在庫補充が必要な品目</div>
              {lowStock.map(item => (
                <div key={item.firebaseKey} style={{ ...s.histCard, borderLeft: "3px solid #ff4757", cursor: "pointer" }} onClick={() => { setSelectedItem(item); setView("detail"); }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>{item.name}</div><div style={{ fontSize: 12, color: "#5a6478" }}>{item.code}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ color: "#ff4757", fontWeight: 700 }}>{item.quantity}{item.unit}</div><div style={{ fontSize: 11, color: "#5a6478" }}>最低: {item.minStock}{item.unit}</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderHistory = () => (
    <>
      <div style={s.header}>
        <div style={s.headerTop}>
          <div style={s.headerTitle}>📋 入出庫履歴</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, color: "#5a6478" }}>{history.length}件</div>
            {history.length > 0 && (
              <button onClick={async () => {
                if (!window.confirm("全履歴を削除しますか？")) return;
                await api.delete("/history");
                await loadData();
                showToast("履歴を削除しました");
              }} style={{ background: "#ff475720", border: "1px solid #ff475740", color: "#ff4757", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                🗑 全削除
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 16px 100px" }}>
        {history.length === 0
          ? <div style={s.emptyState}><div style={{ fontSize: 40 }}>📋</div><div style={{ marginTop: 8 }}>履歴がありません</div></div>
          : history.map(h => (
            <div key={h.firebaseKey} style={s.histCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={s.histType(h.type)}>{h.type === "in" ? "▲ 入庫" : "▼ 出庫"}</span>
                <span style={{ fontSize: 11, color: "#5a6478" }}>{h.date}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{h.itemName}</div>
              <div style={{ fontSize: 13, color: "#8892a4", marginTop: 2 }}>{h.quantity} 点{h.note ? ` / ${h.note}` : ""}</div>
            </div>
          ))}
      </div>
    </>
  );

  return (
    <div style={s.app}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;600;700;800&display=swap" rel="stylesheet" />
      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
      {deleteConfirm && (
        <div style={s.overlay} onClick={() => setDeleteConfirm(null)}>
          <div style={s.confirmBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>品目を削除しますか？</div>
            <div style={{ fontSize: 13, color: "#8892a4", marginBottom: 20 }}>この操作は元に戻せません。</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ flex: 1, background: "#252b3b", border: "1px solid #2d3547", color: "#8892a4", borderRadius: 10, padding: "12px 0", fontSize: 14, cursor: "pointer" }} onClick={() => setDeleteConfirm(null)}>キャンセル</button>
              <button style={{ flex: 1, background: "#ff4757", border: "none", color: "#fff", borderRadius: 10, padding: "12px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => handleDelete(deleteConfirm)} disabled={saving}>{saving ? "削除中..." : "削除する"}</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ paddingBottom: 64 }}>
        {!isInSubView && tabView === "list" && renderList()}
        {!isInSubView && tabView === "dashboard" && renderDashboard()}
        {!isInSubView && tabView === "history" && renderHistory()}
        {view === "detail" && renderDetail()}
        {view === "transaction" && renderTransaction()}
        {view === "addItem" && renderAddItem()}
      </div>
      {!isInSubView && (
        <div style={s.tabBar}>
          {[["list", "🏠", "在庫一覧"], ["dashboard", "📊", "概要"], ["history", "📋", "履歴"]].map(([t, icon, label]) => (
            <div key={t} style={s.tab(tabView === t)} onClick={() => { setTabView(t); setView("list"); }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
