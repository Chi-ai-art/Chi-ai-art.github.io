/* =========================================================
   PROMPT GALLERY — 動作
   ふつうに触るのは data.js だけです。ここは基本そのままでOK。
   ========================================================= */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const gallery = $("gallery");
  const filters = $("filters");
  const searchInput = $("searchInput");
  const emptyMsg = $("empty");
  const modal = $("modal");
  const aboutModal = $("aboutModal");
  const toast = $("toast");

  const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

  /* ---------- 文字列をHTMLに埋めるときの保険 ---------- */
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const escapeAttr = escapeHtml;

  let activeCategory = "すべて";
  let keyword = "";
  let current = null;          // 表示中のプロンプト
  let values = {};             // 穴埋めの入力値
  let lastFocused = null;

  /* ---------- 初期表示 ---------- */
  function initSite() {
    document.title = SITE.title;
    $("brandLogo").textContent = SITE.logo;
    $("brandName").textContent = SITE.shortTitle || SITE.title;
    $("heroTitle").textContent = SITE.title;
    $("heroLead").textContent = SITE.description;
    $("aboutLead").textContent = SITE.description;

    // SNSシェア用の情報もサイト名に合わせる
    document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]')
      .forEach((m) => m.setAttribute("content", SITE.title));
    document.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]')
      .forEach((m) => m.setAttribute("content", SITE.description));

    if (SITE.author) {
      const link = SITE.authorUrl
        ? `<a href="${escapeAttr(SITE.authorUrl)}" target="_blank" rel="noopener">${escapeHtml(SITE.author)}</a>`
        : escapeHtml(SITE.author);
      $("footerAuthor").innerHTML = link;
    }

    const cats = categories();
    $("aboutCategories").innerHTML = cats
      .filter((c) => c !== "すべて")
      .map((c) => {
        const n = PROMPTS.filter((p) => p.category === c).length;
        return `<li><strong>${escapeHtml(c)}</strong>：${n}件</li>`;
      })
      .join("");
  }

  function categories() {
    const set = new Set(PROMPTS.map((p) => p.category).filter(Boolean));
    return ["すべて", ...set];
  }

  /* ---------- フィルタ ---------- */
  function renderFilters() {
    filters.innerHTML = categories()
      .map(
        (c) =>
          `<button class="filter${c === activeCategory ? " is-active" : ""}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`
      )
      .join("");
  }

  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    renderFilters();
    renderGallery();
  });

  searchInput.addEventListener("input", () => {
    keyword = searchInput.value.trim().toLowerCase();
    renderGallery();
  });

  /* ---------- 一覧 ---------- */
  function visiblePrompts() {
    return PROMPTS.filter((p) => {
      if (activeCategory !== "すべて" && p.category !== activeCategory) return false;
      if (!keyword) return true;
      const haystack = [p.title, p.summary, p.category, (p.tags || []).join(" "), p.prompt]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }

  function renderGallery() {
    const list = visiblePrompts();
    emptyMsg.hidden = list.length > 0;
    gallery.innerHTML = list.map(cardHtml).join("");
  }

  function cardHtml(p) {
    const visual = p.image
      ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)}" loading="lazy">`
      : `<span class="emoji">${escapeHtml(p.emoji || "✨")}</span>`;
    const tags = (p.tags || [])
      .slice(0, 3)
      .map((t) => `<span class="tag">${escapeHtml(t)}</span>`)
      .join("");

    return `
      <button class="card" data-id="${escapeAttr(p.id)}" type="button">
        <div class="card-visual">
          ${p.category ? `<span class="card-cat">${escapeHtml(p.category)}</span>` : ""}
          ${visual}
          <div class="card-hint">プロンプトを見る</div>
        </div>
        <div class="card-body">
          <h2 class="card-title">${escapeHtml(p.title)}</h2>
          <p class="card-summary">${escapeHtml(p.summary || "")}</p>
          ${tags ? `<div class="card-tags">${tags}</div>` : ""}
        </div>
      </button>`;
  }

  gallery.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) location.hash = card.dataset.id;
  });

  /* ---------- 詳細モーダル ---------- */
  function openPrompt(p) {
    current = p;
    values = {};

    const visual = $("modalVisual");
    if (p.image) {
      visual.className = "modal-visual has-image";
      visual.innerHTML = `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.title)}">`;
    } else {
      visual.className = "modal-visual";
      visual.innerHTML = "";
    }

    $("modalCategory").textContent = p.category || "";
    $("modalTitle").textContent = p.title;
    $("modalSummary").textContent = p.summary || "";

    const attach = $("modalAttach");
    if (p.attach) {
      attach.hidden = false;
      attach.textContent = `📎 添付するもの：${p.attach}`;
    } else {
      attach.hidden = true;
    }

    renderFillInputs(p);
    renderPromptText();
    showModal(modal);
  }

  function placeholderNames(text) {
    const names = [];
    for (const m of text.matchAll(PLACEHOLDER_RE)) {
      if (!names.includes(m[1])) names.push(m[1]);
    }
    return names;
  }

  function renderFillInputs(p) {
    const names = placeholderNames(p.prompt);
    const box = $("fill");
    const inputs = $("fillInputs");

    if (names.length === 0) {
      box.hidden = true;
      inputs.innerHTML = "";
      return;
    }

    box.hidden = false;
    // textarea にしているのは、長い文章をまるごと貼り付けたいプロンプトがあるため。
    // 1行分の高さから始まり、入力量に合わせて自動で伸びる。
    inputs.innerHTML = names
      .map(
        (n, i) => `
        <div class="fill-row">
          <label for="fill-${i}">${escapeHtml(n)}</label>
          <textarea id="fill-${i}" rows="1" data-name="${escapeAttr(n)}" placeholder="${escapeAttr(n)}を入れる" autocomplete="off"></textarea>
        </div>`
      )
      .join("");

    inputs.querySelectorAll("textarea").forEach((field) => {
      field.addEventListener("input", () => {
        values[field.dataset.name] = field.value;
        autoGrow(field);
        renderPromptText();
      });
    });
  }

  // 入力量に合わせて高さを調整する
  function autoGrow(field) {
    field.style.height = "auto";
    field.style.height = field.scrollHeight + "px";
  }

  // 表示用：未入力の {{◯◯}} はハイライトして残す
  function renderPromptText() {
    $("promptText").innerHTML = escapeHtml(current.prompt).replace(
      PLACEHOLDER_RE,
      (_, name) => {
        const v = (values[name] || "").trim();
        return v ? escapeHtml(v) : `<mark>{{${escapeHtml(name)}}}</mark>`;
      }
    );
  }

  // コピー用：未入力なら {{◯◯}} のまま残す（あとで手直しできるように）
  function resolvedPrompt() {
    return current.prompt.replace(PLACEHOLDER_RE, (full, name) => {
      const v = (values[name] || "").trim();
      return v || full;
    });
  }

  /* ---------- コピー・共有 ---------- */
  $("copyBtn").addEventListener("click", async () => {
    const ok = await copyText(resolvedPrompt());
    flashLabel("copyLabel", ok ? "コピーしました" : "コピー失敗", "コピー");
    showToast(ok ? "プロンプトをコピーしました" : "コピーできませんでした");
  });

  $("shareBtn").addEventListener("click", async () => {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: current.title, url });
        return;
      } catch (_) {
        /* キャンセル時は下のコピーへ */
      }
    }
    const ok = await copyText(url);
    flashLabel("shareLabel", ok ? "コピー済" : "失敗", "リンク");
    showToast(ok ? "このプロンプトのリンクをコピーしました" : "コピーできませんでした");
  });

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // クリップボードAPIが使えない環境（file:// など）向けの保険
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  }

  function flashLabel(id, temp, original) {
    const el = $(id);
    el.textContent = temp;
    setTimeout(() => { el.textContent = original; }, 1600);
  }

  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2000);
  }

  /* ---------- モーダル開閉 ---------- */
  function showModal(el) {
    lastFocused = document.activeElement;
    el.hidden = false;
    document.body.style.overflow = "hidden";
    el.querySelector(".modal-close").focus();
  }

  function closeModals() {
    let closed = false;
    [modal, aboutModal].forEach((el) => {
      if (!el.hidden) { el.hidden = true; closed = true; }
    });
    if (!closed) return;
    document.body.style.overflow = "";
    if (location.hash) history.pushState("", "", location.pathname + location.search);
    current = null;
    if (lastFocused) lastFocused.focus();
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModals();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModals();
  });

  $("navAbout").addEventListener("click", (e) => {
    e.preventDefault();
    showModal(aboutModal);
  });

  $("navGallery").addEventListener("click", (e) => {
    e.preventDefault();
    closeModals();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("brandLink").addEventListener("click", (e) => {
    e.preventDefault();
    closeModals();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------- URL（#p001）で直接開く ---------- */
  function syncFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) {
      if (!modal.hidden) closeModals();
      return;
    }
    const p = PROMPTS.find((x) => x.id === id);
    if (p) openPrompt(p);
  }

  window.addEventListener("hashchange", syncFromHash);

  /* ---------- 起動 ---------- */
  initSite();
  renderFilters();
  renderGallery();
  syncFromHash();
})();
