const I18N_DICT = {
  "ja-JP": {
    searchBtn: "検索",
    placeholder: "商品名、ブランド、カテゴリ、スペックで検索...",
    qePrefix: "⚡ 拡張検索 (QE):",
    allCategory: "すべての商品",
    demoQueriesLabel: "💡 おすすめ検索ワード:",
    facetsTitle: "AIダイナミックファセット",
    clearFilters: "リセット",
    totalResults: (n) => `検索結果 <strong>${n}</strong>件`,
    qeApplied: "⚡ Query Expansion 適用中",
    sortRelevance: "🎯 AI関連度順 (おすすめ順)",
    sortPriceAsc: "💰 価格が安い順",
    sortPriceDesc: "💎 価格が高い順",
    sortRatingDesc: "⭐ 評価が高い順",
    tileNavTitle: "✨ AIおすすめ属性タイル (Tile Navigation)",
    variantBadge: (n) => `+${n} バリエーション`,
    emptyResults: "条件に一致する商品が見つかりませんでした。検索ワードや絞り込み条件を変更してください。"
  },
  "en-US": {
    searchBtn: "Search",
    placeholder: "Search by product name, brand, category, or spec...",
    qePrefix: "⚡ Query Expansion:",
    allCategory: "All Products",
    demoQueriesLabel: "💡 Suggested Queries:",
    facetsTitle: "AI Dynamic Facets",
    clearFilters: "Reset",
    totalResults: (n) => `<strong>${n}</strong> Results Found`,
    qeApplied: "⚡ Query Expansion Applied",
    sortRelevance: "🎯 AI Relevance (Default)",
    sortPriceAsc: "💰 Price: Low to High",
    sortPriceDesc: "💎 Price: High to Low",
    sortRatingDesc: "⭐ Customer Rating",
    tileNavTitle: "✨ AI Visual Attribute Tiles (Tile Navigation)",
    variantBadge: (n) => `+${n} Options`,
    emptyResults: "No products matched your search criteria. Try adjusting your keywords or filters."
  },
  "ko-KR": {
    searchBtn: "검색",
    placeholder: "상품명, 브랜드, 카테고리, 속성으로 검색해보세요...",
    qePrefix: "⚡ QE 확장:",
    allCategory: "전체 상품",
    demoQueriesLabel: "💡 시연 추천 검색어:",
    facetsTitle: "AI 다이내믹 필터",
    clearFilters: "초기화",
    totalResults: (n) => `검색 결과 <strong>${n}</strong>건`,
    qeApplied: "⚡ Query Expansion 적용됨",
    sortRelevance: "🎯 AI 관련도순 (기본)",
    sortPriceAsc: "💰 낮은 가격순",
    sortPriceDesc: "💎 높은 가격순",
    sortRatingDesc: "⭐ 평점 높은순",
    tileNavTitle: "✨ AI 추천 속성 타일 (Tile Navigation)",
    variantBadge: (n) => `+${n} 옵션`,
    emptyResults: "조건에 맞는 상품이 없습니다. 검색어나 필터를 변경해보세요."
  }
};

class AICSDemoApp {
  constructor() {
    this.brandConfig = {};
    this.currentLang = "ja-JP";
    this.currentQuery = "";
    this.selectedCategory = "";
    this.activeFilters = {}; // key -> Set of values
    this.sortBy = "";
    this.searchMode = "auto";
    this.queryExpansion = true;
    this.lastSearchData = null;

    this.init();
  }

  normalizeIsoLang(code) {
    const c = (code || "ja-JP").trim();
    if (c.toLowerCase().startsWith("en")) return "en-US";
    if (c.toLowerCase().startsWith("ko")) return "ko-KR";
    return "ja-JP";
  }

  t() {
    return I18N_DICT[this.currentLang] || I18N_DICT["ja-JP"];
  }

  async init() {
    await this.loadBrandTheme();
    this.bindEvents();
    await this.executeSearch();
  }

  applyLanguageUI() {
    const dict = this.t();
    document.documentElement.lang = this.currentLang.split("-")[0];

    document.getElementById("searchBtnText").textContent = dict.searchBtn;
    const searchInput = document.getElementById("searchInput");
    if (!this.brandConfig.search_placeholder || this.currentLang !== this.normalizeIsoLang(this.brandConfig.language_code)) {
      searchInput.placeholder = dict.placeholder;
    } else {
      searchInput.placeholder = this.brandConfig.search_placeholder;
    }

    document.getElementById("qeLabelPrefix").textContent = dict.qePrefix;
    document.getElementById("demoQueriesLabel").textContent = dict.demoQueriesLabel;
    document.getElementById("facetsSidebarTitle").textContent = dict.facetsTitle;
    document.getElementById("clearFiltersBtn").textContent = dict.clearFilters;
    document.getElementById("qeStatusBadge").textContent = dict.qeApplied;
    document.getElementById("tileNavTitle").textContent = dict.tileNavTitle;

    document.getElementById("sortOptRelevance").textContent = dict.sortRelevance;
    document.getElementById("sortOptPriceAsc").textContent = dict.sortPriceAsc;
    document.getElementById("sortOptPriceDesc").textContent = dict.sortPriceDesc;
    document.getElementById("sortOptRatingDesc").textContent = dict.sortRatingDesc;

    const allTab = document.getElementById("allCategoryTab");
    if (allTab) allTab.textContent = dict.allCategory;

    if (this.lastSearchData) {
      this.renderResults(this.lastSearchData);
    }
  }

  async loadBrandTheme() {
    try {
      const res = await fetch("/api/v1/brand-config");
      const cfg = await res.json();
      this.brandConfig = cfg;

      // Determine active ISO language code (default ja-JP from brand config)
      this.currentLang = this.normalizeIsoLang(cfg.language_code || "ja-JP");

      // Apply CSS variables & dynamic customer brand design traits
      const root = document.documentElement;
      if (cfg.primary_color) {
        root.style.setProperty("--brand-primary", cfg.primary_color);
        // Auto-compute contrast text color for brand badge if not explicitly specified
        const hex = cfg.primary_color.replace("#", "");
        if (hex.length === 6) {
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const autoText = lum > 0.62 ? "#111111" : "#ffffff";
          root.style.setProperty("--brand-badge-text", cfg.badge_text_color || autoText);
        }
      }
      if (cfg.secondary_color) root.style.setProperty("--brand-secondary", cfg.secondary_color);
      if (cfg.accent_color) root.style.setProperty("--brand-accent", cfg.accent_color);
      if (cfg.header_bg) root.style.setProperty("--header-bg", cfg.header_bg);
      if (cfg.price_color) root.style.setProperty("--price-color", cfg.price_color);
      if (cfg.search_radius) root.style.setProperty("--search-radius", cfg.search_radius);

      // Update Header Logo / Badge
      document.getElementById("pageTitle").textContent = `${cfg.brand_name || "AICS"} | AI Commerce Search`;
      const logoImg = document.getElementById("brandLogoImg");
      const badgeEl = document.getElementById("brandBadge");
      badgeEl.textContent = cfg.brand_name || "BRAND";
      if (cfg.logo_url && logoImg) {
        logoImg.src = cfg.logo_url;
        logoImg.style.display = "block";
        logoImg.onerror = () => {
          logoImg.style.display = "none";
        };
      }
      document.getElementById("brandTitle").textContent = cfg.display_title || "AIコマース検索デモ";
      document.getElementById("brandSubtitle").textContent = cfg.subtitle || "Powered by Google Cloud AI Commerce Search";

      // Render Category Tabs
      const catContainer = document.getElementById("categoryTabsContainer");
      const cats = cfg.categories || [];
      const dict = this.t();
      catContainer.innerHTML = `<button class="cat-tab active" data-category="" id="allCategoryTab">${dict.allCategory}</button>` +
        cats.map(c => `<button class="cat-tab" data-category="${c}">${c}</button>`).join("");

      catContainer.querySelectorAll(".cat-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          catContainer.querySelectorAll(".cat-tab").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.selectedCategory = btn.getAttribute("data-category") || "";
          this.executeSearch();
        });
      });

      // Render Demo Query Chips
      const demoContainer = document.getElementById("demoQueriesContainer");
      const queries = cfg.demo_queries || [];
      demoContainer.innerHTML = queries.map(q =>
        `<button class="demo-chip" data-query="${q}">${q}</button>`
      ).join("");

      demoContainer.querySelectorAll(".demo-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const q = chip.getAttribute("data-query");
          document.getElementById("searchInput").value = q;
          this.currentQuery = q;
          this.executeSearch();
        });
      });

      this.applyLanguageUI();
    } catch (e) {
      console.error("Failed to load brand config:", e);
    }
  }

  bindEvents() {
    const searchForm = document.getElementById("searchForm");
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.currentQuery = document.getElementById("searchInput").value.trim();
      this.executeSearch();
    });

    const qeCheckbox = document.getElementById("qeCheckbox");
    qeCheckbox.addEventListener("change", () => {
      this.queryExpansion = qeCheckbox.checked;
      document.getElementById("qeStateText").textContent = this.queryExpansion ? "ON" : "OFF";
      this.executeSearch();
    });

    const sortSelect = document.getElementById("sortSelect");
    sortSelect.addEventListener("change", () => {
      this.sortBy = sortSelect.value;
      this.executeSearch();
    });

    const clearBtn = document.getElementById("clearFiltersBtn");
    clearBtn.addEventListener("click", () => {
      this.activeFilters = {};
      this.selectedCategory = "";
      document.querySelectorAll(".cat-tab").forEach((b, i) => b.classList.toggle("active", i === 0));
      this.executeSearch();
    });
  }

  buildFilterString() {
    const parts = [];
    if (this.selectedCategory) {
      parts.push(`categories:ANY("${this.selectedCategory}")`);
    }
    for (const [key, valSet] of Object.entries(this.activeFilters)) {
      if (valSet && valSet.size > 0) {
        const quoted = Array.from(valSet).map(v => `"${v}"`).join(",");
        parts.push(`${key}:ANY(${quoted})`);
      }
    }
    return parts.join(" AND ");
  }

  async executeSearch() {
    const filterStr = this.buildFilterString();
    const appliedTiles = [];
    for (const [key, valSet] of Object.entries(this.activeFilters)) {
      if (valSet && valSet.size > 0) {
        for (const v of valSet) {
          appliedTiles.push({
            productAttributeValue: {
              name: key,
              value: v
            }
          });
        }
      }
    }

    const payload = {
      query: this.currentQuery,
      page_size: 24,
      filter: filterStr,
      order_by: this.sortBy,
      query_expansion: this.queryExpansion,
      applied_tiles: appliedTiles
    };

    try {
      const res = await fetch("/api/v1/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      this.lastSearchData = data;
      this.renderResults(data);
      if (window.inspector) {
        window.inspector.updateSearchTrace(payload, data);
      }
    } catch (e) {
      console.error("Search failed:", e);
    }
  }

  formatCurrency(amount, currencyCode) {
    const code = (currencyCode || this.brandConfig.currency_code || "JPY").toUpperCase();
    const num = Number(amount || 0);
    if (code === "JPY") return `¥${num.toLocaleString("ja-JP")}`;
    if (code === "KRW") return `₩${num.toLocaleString("ko-KR")}`;
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  }

  renderResults(data) {
    const dict = this.t();
    document.getElementById("totalResultsText").innerHTML = dict.totalResults((data.total_size || 0).toLocaleString());
    document.getElementById("latencyBadge").textContent = `${data.execution_ms || 0} ms`;

    const engineBadge = document.getElementById("engineBadge");
    engineBadge.textContent = "☁️ AI COMMERCE SEARCH (RETAIL API)";
    engineBadge.className = "engine-badge badge-retail";

    const qeBadge = document.getElementById("qeStatusBadge");
    const qeInfo = data.query_expansion_info || {};
    qeBadge.style.display = qeInfo.expandedQuery ? "inline-block" : "none";

    // Render Tile Navigation
    const tileSection = document.getElementById("tileNavSection");
    const tileContainer = document.getElementById("tileNavContainer");
    const tiles = data.tiles || [];
    if (tiles.length > 0) {
      tileSection.style.display = "block";
      tileContainer.innerHTML = tiles.map(t => {
        const isActive = this.activeFilters[t.attribute_key]?.has(t.attribute_value);
        return `
          <div class="tile-card ${isActive ? 'active' : ''}" data-key="${t.attribute_key}" data-val="${t.attribute_value}">
            <img src="${t.image_url}" alt="${t.display_label}" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=200&q=80'" />
            <span>${t.display_label}</span>
          </div>
        `;
      }).join("");

      tileContainer.querySelectorAll(".tile-card").forEach(card => {
        card.addEventListener("click", () => {
          const k = card.getAttribute("data-key");
          const v = card.getAttribute("data-val");
          this.toggleFilter(k, v);
        });
      });
    } else {
      tileSection.style.display = "none";
    }

    // Render Facets Sidebar
    this.renderFacets(data.facets || []);

    // Render Product Grid
    const grid = document.getElementById("productGrid");
    const products = data.products || [];
    if (products.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:60px; color:#6b7280;">${dict.emptyResults}</div>`;
      return;
    }

    grid.innerHTML = products.map(p => {
      const priceFormatted = this.formatCurrency(p.price, p.currency_code);
      const origFormatted = p.original_price > p.price ? this.formatCurrency(p.original_price, p.currency_code) : "";
      const discountHtml = p.discount_rate > 0 ? `<div class="discount-badge">${p.discount_rate}% OFF</div>` : "";
      const tierHtml = p.variant_count > 0 ? `<div class="tier-badge">${dict.variantBadge(p.variant_count)}</div>` : "";

      const variantPills = (p.variant_options || []).map(opt =>
        `<span class="variant-pill">${opt}</span>`
      ).join("");

      return `
        <article class="product-card">
          <a href="${p.pdp_url}" target="_blank" style="text-decoration:none; color:inherit;">
            <div class="card-img-wrap">
              <img src="${p.image_url}" alt="${p.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'" />
              ${discountHtml}
              ${tierHtml}
            </div>
          </a>
          <div class="card-body">
            <div class="card-brand">${p.brand}</div>
            <div class="card-title" title="${p.title}">${p.title}</div>
            <div class="card-price-row">
              <span class="card-price">${priceFormatted}</span>
              ${origFormatted ? `<span class="card-orig-price">${origFormatted}</span>` : ""}
            </div>
            <div class="card-rating">★ ${p.rating.toFixed(1)} (${p.rating_count})</div>
            ${variantPills ? `<div class="card-variants-box">${variantPills}</div>` : ""}
          </div>
        </article>
      `;
    }).join("");
  }

  renderFacets(facets) {
    const container = document.getElementById("facetsContainer");
    const hasActive = Object.values(this.activeFilters).some(s => s && s.size > 0) || Boolean(this.selectedCategory);
    document.getElementById("clearFiltersBtn").style.display = hasActive ? "inline-block" : "none";

    container.innerHTML = facets.map(group => {
      const optionsHtml = (group.values || []).map(item => {
        const checked = this.activeFilters[group.key]?.has(item.value) ? "checked" : "";
        return `
          <div class="facet-option">
            <label>
              <input type="checkbox" data-key="${group.key}" data-val="${item.value}" ${checked} />
              <span>${item.value}</span>
            </label>
            <span class="facet-count">${item.count}</span>
          </div>
        `;
      }).join("");

      return `
        <div class="facet-group">
          <div class="facet-group-title">${group.display_name}</div>
          ${optionsHtml}
        </div>
      `;
    }).join("");

    container.querySelectorAll("input[type='checkbox']").forEach(chk => {
      chk.addEventListener("change", () => {
        const k = chk.getAttribute("data-key");
        const v = chk.getAttribute("data-val");
        this.toggleFilter(k, v);
      });
    });
  }

  toggleFilter(key, val) {
    if (!this.activeFilters[key]) {
      this.activeFilters[key] = new Set();
    }
    if (this.activeFilters[key].has(val)) {
      this.activeFilters[key].delete(val);
    } else {
      this.activeFilters[key].add(val);
    }
    this.executeSearch();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  window.demoApp = new AICSDemoApp();
});
