(() => {
  const API = "/api/admin";
  const icon = (name) => `/_admin/assets/icons/${name}.svg`;
  const state = {
    token: localStorage.getItem("luoda_admin_token") || "",
    user: JSON.parse(localStorage.getItem("luoda_admin_user") || "{}"),
    page: "overview",
    cache: {},
    captchaId: ""
  };

  const modules = [
    { key: "overview", title: "总览", icon: "home" },
    { key: "config", title: "服务器配置", icon: "secure_relay" },
    { key: "peers", title: "设备管理", icon: "display" },
    { key: "users", title: "用户管理", icon: "secure" },
    { key: "groups", title: "用户分组", icon: "folder" },
    { key: "deviceGroups", title: "设备分组", icon: "folder" },
    { key: "tags", title: "标签管理", icon: "file" },
    { key: "audit", title: "审计日志", icon: "search" },
    { key: "connRecords", title: "连接记录", icon: "transfer" },
    { key: "tokens", title: "登录令牌", icon: "transfer" },
    { key: "commands", title: "服务器指令", icon: "refresh" }
  ];

  const $ = (s) => document.querySelector(s);
  const content = () => $("#content");
  const notice = () => $("#notice");

  function showNotice(msg, error = false) {
    const el = notice();
    el.textContent = msg;
    el.className = `notice${error ? " error" : ""}`;
    clearTimeout(showNotice.timer);
    showNotice.timer = setTimeout(() => el.classList.add("hidden"), 4200);
  }

  async function request(path, opts = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
    if (state.token) headers["api-token"] = state.token;
    const res = await fetch(API + path, Object.assign({}, opts, { headers }));
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || res.statusText);
    if (data.code !== undefined && data.code !== 0) throw new Error(data.message || "请求失败");
    return data.data;
  }

  function normalizeList(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.list)) return data.list;
    if (Array.isArray(data.data)) return data.data;
    for (const key of ["users", "peers", "groups", "tags", "records", "logs", "items"]) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  }

  function fmtTime(value) {
    if (!value) return "-";
    const number = Number(value);
    const date = new Date(number > 1e12 ? number : number * 1000);
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleString();
  }

  function setView(isAuthed) {
    document.querySelector('[data-view="login"]').classList.toggle("hidden", isAuthed);
    document.querySelector('[data-view="dashboard"]').classList.toggle("hidden", !isAuthed);
  }

  function renderNav() {
    $("#nav").innerHTML = modules.map((item) => `
      <button class="nav-item ${state.page === item.key ? "active" : ""}" data-page="${item.key}">
        <span class="ui-icon" style="--icon: url(${icon(item.icon)})"></span><span>${item.title}</span>
      </button>`).join("");
    document.querySelectorAll(".nav-item").forEach((btn) => btn.onclick = () => go(btn.dataset.page));
  }

  async function loadBoot() {
    const cfg = await request("/config/admin").catch(() => null);
    if (cfg?.title) {
      document.title = cfg.title;
      $("#loginTitle").textContent = cfg.title;
    }
    if (cfg?.hello) showNotice(cfg.hello);
  }

  async function login(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      username: form.get("username"),
      password: form.get("password"),
      platform: navigator.platform || "web-admin",
      captcha: form.get("captcha") || "",
      captcha_id: state.captchaId || ""
    };
    try {
      const data = await request("/login", { method: "POST", body: JSON.stringify(payload) });
      state.token = data.token;
      state.user = data;
      localStorage.setItem("luoda_admin_token", state.token);
      localStorage.setItem("luoda_admin_user", JSON.stringify(data));
      $("#loginMessage").textContent = "";
      setView(true);
      await bootDashboard();
    } catch (err) {
      $("#loginMessage").textContent = err.message;
      await loadCaptcha();
    }
  }

  async function loadCaptcha() {
    try {
      const data = await request("/captcha");
      if (data?.captcha?.b64) {
        state.captchaId = data.captcha.id;
        $("#captchaImage").src = data.captcha.b64;
        $("#captchaBox").classList.remove("hidden");
      }
    } catch (_) {}
  }

  async function logout() {
    await request("/logout", { method: "POST", body: "{}" }).catch(() => null);
    localStorage.removeItem("luoda_admin_token");
    localStorage.removeItem("luoda_admin_user");
    state.token = "";
    setView(false);
  }

  async function bootDashboard() {
    renderNav();
    $("#logoutBtn").onclick = logout;
    $("#refreshBtn").onclick = () => go(state.page, true);
    await loadBoot();
    await go(state.page || "overview", true);
  }

  async function go(page, force = false) {
    state.page = page;
    renderNav();
    const mod = modules.find((x) => x.key === page);
    $("#pageTitle").textContent = mod?.title || "总览";
    content().innerHTML = `<div class="panel"><div class="empty">正在加载...</div></div>`;
    try {
      if (page === "overview") await renderOverview(force);
      if (page === "config") await renderConfig(force);
      if (page === "peers") await renderList("设备管理", "display", "/peer/list", peerColumns(), peerToolbar);
      if (page === "users") await renderUserList();
      if (page === "groups") await renderCrudList("用户分组", "folder", "/group", [{ k: "id", t: "ID" }, { k: "name", t: "名称" }, { k: "type", t: "类型" }], ["name", "type"]);
      if (page === "deviceGroups") await renderCrudList("设备分组", "folder", "/device_group", [{ k: "id", t: "ID" }, { k: "name", t: "名称" }], ["name"]);
      if (page === "tags") await renderCrudList("标签管理", "file", "/tag", [{ k: "id", t: "ID" }, { k: "name", t: "名称" }], ["name"]);
      if (page === "audit") await renderAudit();
      if (page === "connRecords") await renderConnRecords();
      if (page === "tokens") await renderList("登录令牌", "transfer", "/user_token/list", tokenColumns());
      if (page === "commands") await renderCommands();
    } catch (err) {
      content().innerHTML = `<div class="notice error">${esc(err.message)}</div>`;
    }
  }

  async function renderOverview() {
    const [server, app, peers, users, groups] = await Promise.all([
      request("/config/server"), request("/config/app"), request("/peer/list?page=1&page_size=5").catch(() => null),
      request("/user/list?page=1&page_size=5").catch(() => null), request("/group/list?page=1&page_size=5").catch(() => null)
    ]);
    const peerList = normalizeList(peers);
    const userList = normalizeList(users);
    const groupList = normalizeList(groups);
    content().innerHTML = `
      <div class="cards">
        ${statCard("中继服务器", server.relay_server || "未配置", "secure_relay")}
        ${statCard("ID 服务器", server.id_server || "未配置", "secure")}
        ${statCard("设备", peers?.total ?? peerList.length, "display")}
        ${statCard("用户", users?.total ?? userList.length, "home")}
      </div>
      <div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(${icon("file")})"></span>关键配置</div></div>
        <div class="panel-body"><div class="form-grid">
          ${infoField("API 地址", server.api_server)}${infoField("公钥 Key", server.key)}${infoField("WebClient", app.web_client === 1 ? "启用" : "关闭")}${infoField("分组数量", groupList.length)}
        </div></div></div>
      <div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(${icon("display")})"></span>最近设备</div></div>${table(peerColumns().slice(0,5), peerList)}</div>`;
  }

  function statCard(label, value, iconName) {
    return `<div class="card"><div class="card-head"><span class="card-label">${esc(label)}</span><span class="card-icon"><span class="ui-icon" style="--icon: url(${icon(iconName)})"></span></span></div><div class="card-value">${esc(value)}</div></div>`;
  }
  function infoField(label, value) { return `<label>${esc(label)}<input readonly value="${esc(value || "-")}" /></label>`; }

  async function renderConfig() {
    const [server, app, admin] = await Promise.all([request("/config/server"), request("/config/app"), request("/config/admin")]);
    content().innerHTML = `
      <div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(${icon("secure_relay")})"></span>中继服务器连接配置</div><button class="secondary-btn" id="copyConfig">复制客户端配置</button></div>
        <div class="panel-body"><div class="form-grid">
          ${infoField("ID Server", server.id_server)}${infoField("Relay Server", server.relay_server)}${infoField("API Server", server.api_server)}${infoField("WebClient", app.web_client === 1 ? "启用" : "关闭")}
          <label class="wide">客户端 Key<textarea readonly>${esc(server.key || "")}</textarea></label>
        </div></div></div>
      <div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(${icon("secure")})"></span>密钥保护说明</div></div>
        <div class="panel-body"><div class="code-box">必须保持 /data/id_ed25519 与 /data/id_ed25519.pub 不变。当前客户端公钥应与 server-keys/id_ed25519.pub 说明一致，避免原有客户端出现 KEY 不匹配。</div></div></div>`;
    $("#copyConfig").onclick = async () => {
      await navigator.clipboard.writeText(`ID Server: ${server.id_server}\nRelay Server: ${server.relay_server}\nAPI Server: ${server.api_server}\nKey: ${server.key}`);
      showNotice("客户端配置已复制");
    };
  }

  async function renderList(title, iconName, path, columns, toolbar) {
    const panelId = `panel-${Date.now()}`;
    content().innerHTML = `<div class="panel" id="${panelId}"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(${icon(iconName)})"></span>${title}</div><div class="panel-actions"></div></div><div class="panel-body"><div class="empty">加载中...</div></div></div>`;
    const panel = $("#" + panelId);
    if (toolbar) panel.querySelector(".panel-actions").innerHTML = toolbar();
    const query = new URLSearchParams({ page: "1", page_size: "50" });
    const data = await request(path + (path.includes("?") ? "&" : "?") + query.toString());
    panel.querySelector(".panel-body").innerHTML = table(columns, normalizeList(data));
  }

  function table(columns, rows) {
    if (!rows.length) return `<div class="empty">暂无数据</div>`;
    return `<div class="table-wrap"><table><thead><tr>${columns.map(c => `<th>${esc(c.t)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(c => `<td>${c.render ? c.render(row) : esc(row[c.k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function peerColumns() { return [
    { k: "id", t: "设备 ID" }, { k: "hostname", t: "主机名" }, { k: "username", t: "用户" },
    { k: "os", t: "系统", render: r => osBadge(r.os) }, { k: "last_online_ip", t: "IP" }, { k: "last_online_time", t: "最后在线", render: r => fmtTime(r.last_online_time) }
  ]; }
  function userColumns() { return [
    { k: "id", t: "ID" }, { k: "username", t: "账号" }, { k: "nickname", t: "昵称" }, { k: "email", t: "邮箱" },
    { k: "is_admin", t: "权限", render: r => r.is_admin ? `<span class="badge ok">管理员</span>` : `<span class="badge">用户</span>` },
    { k: "status", t: "状态", render: r => Number(r.status) === 1 ? `<span class="badge ok">启用</span>` : `<span class="badge danger">禁用</span>` }
  ]; }
  function tokenColumns() { return [{ k: "id", t: "ID" }, { k: "user_id", t: "用户ID" }, { k: "uuid", t: "UUID" }, { k: "created_at", t: "创建时间", render: r => fmtTime(r.created_at) }]; }
  function osBadge(os) {
    const key = String(os || "").toLowerCase();
    const name = key.includes("win") ? "win" : key.includes("linux") ? "linux" : key.includes("mac") ? "mac" : key.includes("android") ? "android" : "display";
    return `<span class="badge"><span class="ui-icon inline-icon" style="--icon: url(${icon(name)})"></span>${esc(os || "未知")}</span>`;
  }
  function peerToolbar() { return `<span class="badge ok">支持搜索与批量管理接口</span>`; }
  function userToolbar() { return '<span class="badge ok">支持账号、权限和状态管理</span>'; }
  function userFormToolbar() { return '<button class="secondary-btn" id="createUserBtn">新增用户</button>'; }

  async function renderUserList() {
    const data = await request("/user/list?page=1&page_size=100");
    const list = normalizeList(data);
    content().innerHTML = '<div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(/_admin/assets/icons/secure.svg)"></span>用户管理</div><div class="panel-actions">' + userFormToolbar() + '</div></div><div class="panel-body">' + table(userColumns().concat([{t:"操作", render:r=>'<div class="row-actions"><button class="secondary-btn" data-edit-user='' + esc(JSON.stringify(r)) + ''>编辑</button><button class="secondary-btn" data-pwd-user="' + r.id + '">改密</button><button class="danger-btn" data-del-user="' + r.id + '">删除</button></div>'}]), list) + '</div></div><div id="userForm"></div>';
    document.querySelectorAll("[data-edit-user]").forEach(btn => btn.onclick = () => showUserForm("编辑用户", JSON.parse(btn.dataset.editUser)));
    document.querySelectorAll("[data-pwd-user]").forEach(btn => btn.onclick = () => showPwdForm(btn.dataset.pwdUser));
    document.querySelectorAll("[data-del-user]").forEach(btn => btn.onclick = async () => { if (confirm("确认删除用户？")) { await request("/user/delete", {method:"POST", body:JSON.stringify({id:Number(btn.dataset.delUser)})}); showNotice("已删除"); renderUserList(); } });
    document.querySelectorAll("#createUserBtn").forEach(btn => btn.onclick = () => showUserForm("新增用户", {}));
  }
  function showUserForm(title, row) {
    const isEdit = !!row.id;
    document.getElementById("userForm").innerHTML = '<div class="panel"><div class="panel-header"><div class="panel-title">' + title + '</div></div><div class="panel-body"><form id="userFormInner" class="form-grid">' +
      '<label>用户名<input name="username" value="' + esc(row.username || "") + '" required /></label>' +
      '<label>昵称<input name="nickname" value="' + esc(row.nickname || "") + '" /></label>' +
      '<label>邮箱<input name="email" type="email" value="' + esc(row.email || "") + '" /></label>' +
      (isEdit ? '' : '<label>密码<input name="password" type="password" required /></label>') +
      '<label>用户组ID<input name="group_id" type="number" value="' + (row.group_id || 1) + '" /></label>' +
      '<label>管理员<select name="is_admin"><option value="true"' + (row.is_admin ? ' selected' : '') + '>是</option><option value="false"' + (!row.is_admin ? ' selected' : '') + '>否</option></select></label>' +
      '<label>状态<select name="status"><option value="1"' + (row.status == 1 ? ' selected' : '') + '>启用</option><option value="0"' + (row.status == 0 ? ' selected' : '') + '>禁用</option></select></label>' +
      (isEdit ? '<input type="hidden" name="id" value="' + row.id + '" />' : '') +
      '<button class="primary-btn wide">保存</button></form></div></div>';
    document.getElementById("userFormInner").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const payload = {};
      for (const [k, v] of fd.entries()) { if (v) payload[k] = v; }
      payload.group_id = Number(payload.group_id || 1);
      payload.is_admin = payload.is_admin === "true";
      payload.status = Number(payload.status || 1);
      if (isEdit) { await request("/user/update", {method:"POST", body:JSON.stringify(payload)}); }
      else { await request("/user/create", {method:"POST", body:JSON.stringify(payload)}); }
      showNotice("已保存"); renderUserList();
    };
  }
  function showPwdForm(userId) {
    document.getElementById("userForm").innerHTML = '<div class="panel"><div class="panel-header"><div class="panel-title">修改密码</div></div><div class="panel-body"><form id="pwdFormInner" class="form-grid">' +
      '<input type="hidden" name="id" value="' + userId + '" />' +
      '<label class="wide">新密码<input name="password" type="password" required minlength="4" maxlength="32" /></label>' +
      '<button class="primary-btn wide">确认修改</button></form></div></div>';
    document.getElementById("pwdFormInner").onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      await request("/user/changePwd", {method:"POST", body:JSON.stringify({id:Number(fd.get("id")), password:fd.get("password")})});
      showNotice("密码已修改"); renderUserList();
    };
  }
  async function renderCrudList(title, iconName, base, columns, fields) {
    const data = await request(`${base}/list?page=1&page_size=100`);
    content().innerHTML = `<div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(${icon(iconName)})"></span>${title}</div><button class="primary-btn" id="createBtn">新增</button></div><div class="panel-body">${table(columns.concat([{t:"操作", render:r=>`<div class="row-actions"><button class="secondary-btn" data-edit='${esc(JSON.stringify(r))}'>编辑</button><button class="danger-btn" data-del="${r.id}">删除</button></div>`}]), normalizeList(data))}</div></div><div id="crudForm"></div>`;
    $("#createBtn").onclick = () => showCrudForm(title, base, fields, {});
    document.querySelectorAll("[data-edit]").forEach(btn => btn.onclick = () => showCrudForm(title, base, fields, JSON.parse(btn.dataset.edit)));
    document.querySelectorAll("[data-del]").forEach(btn => btn.onclick = async () => { if (confirm("确认删除？")) { await request(`${base}/delete`, {method:"POST", body: JSON.stringify({id:Number(btn.dataset.del)})}); showNotice("已删除"); go(state.page, true); } });
  }
  function showCrudForm(title, base, fields, row) {
    $("#crudForm").innerHTML = `<div class="panel"><div class="panel-header"><div class="panel-title">${row.id ? "编辑" : "新增"}${title}</div></div><div class="panel-body"><form id="form" class="form-grid">${fields.map(f=>`<label>${f}<input name="${f}" value="${esc(row[f] || "")}" required /></label>`).join("")}<button class="primary-btn wide">保存</button></form></div></div>`;
    $("#form").onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const payload = Object.fromEntries(fd.entries()); if (row.id) payload.id = row.id; if (payload.type !== undefined) payload.type = Number(payload.type || 0); await request(`${base}/${row.id ? "update" : "create"}`, {method:"POST", body:JSON.stringify(payload)}); showNotice("已保存"); go(state.page, true); };
  }

  async function renderAudit() {
    content().innerHTML = `<div class="cards"><button class="card" id="connAudit"><span class="card-label">连接审计</span><span class="card-value">查看</span></button><button class="card" id="fileAudit"><span class="card-label">文件审计</span><span class="card-value">查看</span></button></div><div id="auditPanel"></div>`;
    $("#connAudit").onclick = async () => $("#auditPanel").innerHTML = table([{k:"id",t:"ID"},{k:"peer_id",t:"设备"},{k:"user_id",t:"用户"},{k:"created_at",t:"时间",render:r=>fmtTime(r.created_at)}], normalizeList(await request("/audit_conn/list?page=1&page_size=50")));
    $("#fileAudit").onclick = async () => $("#auditPanel").innerHTML = table([{k:"id",t:"ID"},{k:"peer_id",t:"设备"},{k:"path",t:"路径"},{k:"created_at",t:"时间",render:r=>fmtTime(r.created_at)}], normalizeList(await request("/audit_file/list?page=1&page_size=50")));
  }

  async function renderConnRecords() {
    const data = await request("/audit_conn/list?page=1&page_size=100");
    content().innerHTML = '<div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(/_admin/assets/icons/transfer.svg)"></span>连接记录</div><div class="panel-actions"><span class="badge">A=发起端 B=被连接端</span></div></div><div class="panel-body">' + table([
      {k:"from_name",t:"发起端(A)"},
      {k:"from_peer",t:"A 设备ID"},
      {k:"ip",t:"IP 地址"},
      {k:"peer_id",t:"被连接端(B)"},
      {k:"action",t:"操作",render:r=>{const v=String(r.action||"");return v==="new"?"<span class=\"badge ok\">建立</span>":v==="close"?"<span class=\"badge warn\">关闭</span>":"<span class=\"badge\">"+esc(v)+"</span>"}},
      {k:"created_at",t:"开始时间",render:r=>fmtTime(r.created_at)},
      {k:"close_time",t:"结束时间",render:r=>r.close_time?fmtTime(r.close_time):'<span class="badge ok">进行中</span>'},
      {k:"session_id",t:"会话ID"}
    ], normalizeList(data)) + '</div></div>';
  }
  async function renderCommands() {
    const data = await request("/LUODA/cmdList").catch(() => null);
    content().innerHTML = `<div class="panel"><div class="panel-header"><div class="panel-title"><span class="ui-icon inline-icon" style="--icon: url(${icon("refresh")})"></span>服务器指令</div><span class="badge warn">谨慎执行</span></div><div class="panel-body">${table([{k:"id",t:"ID"},{k:"name",t:"名称"},{k:"cmd",t:"命令"},{k:"created_at",t:"创建时间",render:r=>fmtTime(r.created_at)}], normalizeList(data))}</div></div>`;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    $("#loginForm").onsubmit = login;
    $("#captchaImage").onclick = loadCaptcha;
    await loadBoot();
    if (state.token) { setView(true); await bootDashboard(); } else { setView(false); }
  });
})();
