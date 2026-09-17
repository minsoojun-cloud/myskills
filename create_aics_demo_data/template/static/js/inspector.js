class ArchitectureInspector {
  constructor() {
    this.drawer = document.getElementById("inspectorDrawer");
    this.openBtn = document.getElementById("openInspectorBtn");
    this.closeBtn = document.getElementById("closeInspectorBtn");

    this.layer1 = document.getElementById("inspectorLayer1");
    this.layer2 = document.getElementById("inspectorLayer2");
    this.layer3 = document.getElementById("inspectorLayer3");
    this.layer4 = document.getElementById("inspectorLayer4");

    this.initEvents();
  }

  initEvents() {
    if (this.openBtn) {
      this.openBtn.addEventListener("click", () => {
        this.drawer.classList.add("open");
        this.refreshAuthInfo();
      });
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => {
        this.drawer.classList.remove("open");
      });
    }
  }

  async refreshAuthInfo() {
    try {
      const [authRes, brandRes] = await Promise.all([
        fetch("/api/v1/token-info"),
        fetch("/api/v1/brand-config")
      ]);
      const authData = await authRes.json();
      const brandData = await brandRes.json();
      this.layer2.textContent = JSON.stringify({
        oauth2_token_status: authData,
        gcp_project_target: brandData.gcp_metadata || {}
      }, null, 2);
    } catch (e) {
      this.layer2.textContent = JSON.stringify({ error: e.message }, null, 2);
    }
  }

  updateSearchTrace(clientPayload, responseData) {
    if (this.layer1) {
      this.layer1.textContent = JSON.stringify(clientPayload, null, 2);
    }
    if (this.layer3) {
      this.layer3.textContent = JSON.stringify(responseData.raw_upstream_request || {}, null, 2);
    }
    if (this.layer4) {
      const summary = {
        engine_used: responseData.engine_used,
        execution_ms: responseData.execution_ms,
        total_size: responseData.total_size,
        query_expansion: responseData.query_expansion_info,
        facets_count: (responseData.facets || []).length,
        products_returned: (responseData.products || []).length
      };
      this.layer4.textContent = JSON.stringify(summary, null, 2);
    }
  }
}

window.inspector = new ArchitectureInspector();
