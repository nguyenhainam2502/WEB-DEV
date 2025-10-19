// ================== Travel Planner - app.js (full) ==================
document.addEventListener("DOMContentLoaded", () => {
  // ====== Data (load từ JSON) ======
  let CITIES = [];
  const ACTIVITIES = {
    sightseeing: ["Tham quan điểm nổi bật", "Check-in cảnh đẹp", "Bảo tàng/di tích"],
    relax: ["Cà phê/đọc sách", "Spa/onsen (nếu có)", "Đi dạo công viên"],
    foodie: ["Ăn đặc sản", "Chợ đêm/food tour", "Quán địa phương nổi tiếng"]
  };
  const SAFETY_TIPS = [
    "Luôn gọi xe qua app, kiểm tra biển số & tài xế.",
    "Không để lộ thông tin cá nhân/thẻ ngân hàng.",
    "Giữ liên lạc với người thân, chia sẻ lịch trình.",
    "Mang theo giấy tờ bản sao; bản gốc cất an toàn.",
    "Quan sát môi trường xung quanh khi rút tiền/đêm khuya."
  ];

  // ====== DOM refs ======
  const entrySection       = document.getElementById("entry");
  const destSelect         = document.getElementById("destination");
  const plannerForm        = document.getElementById("plannerForm");
  const itineraryList      = document.getElementById("itineraryList");
  const summaryDiv         = document.getElementById("summary");
  const safetyDiv          = document.getElementById("safety");
  const trafficDiv         = document.getElementById("traffic");
  const destRow            = document.getElementById("destRow");
  const styleRow           = document.getElementById("styleRow");
  const feedbackForm       = document.getElementById("feedbackForm");
  const fbSaved            = document.getElementById("fbSaved");
  const planSection        = document.getElementById("plan");
  const itinerarySection   = document.getElementById("itinerary");
  const nearbyBtn          = document.getElementById("locateBtn");
  const nearbyList         = document.getElementById("nearbyList");
  const budgetInput        = document.getElementById("budget");

  // ====== Helpers UI ======
  function loadDestinations() {
    if (!destSelect) return;
    destSelect.innerHTML = CITIES.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  }
  function showError(el, msg) { el.classList.add("error"); el.title = msg; }
  function clearError(el)     { el.classList.remove("error"); el.title = ""; }
  function labelPurpose(p)    { return p === "sightseeing" ? "Tham quan" : p === "relax" ? "Nghỉ dưỡng" : "Ăn uống"; }
  function suggestTimeSlot(p) { if (p==="sightseeing") return "Sáng"; if (p==="foodie") return "Trưa"; return "Chiều/Tối"; }
  function randFrom(arr)      { return arr[Math.floor(Math.random() * arr.length)]; }
  function formatVND(n)       { return n.toLocaleString("vi-VN") + "đ"; }

  // ====== Load JSON ======
  fetch("data/destinations.json")
    .then(r => r.json())
    .then(data => {
      CITIES = data.cities || [];
      loadDestinations();
    })
    .catch(() => alert("Không tải được dữ liệu địa điểm (destinations.json)."));

  // ====== Entry → click card là chuyển thẳng ======
  document.querySelectorAll(".entry__option").forEach(btn => {
    btn.addEventListener("click", () => {
      const entryMode = btn.dataset.mode; // "has" | "no"
      const plannerMode = plannerForm.elements["mode"];
      [...plannerMode].forEach(r => r.checked = (r.value === entryMode));

      const has = entryMode === "has";
      destRow.hidden  = !has;
      styleRow.hidden =  has ? true : false;

      entrySection.hidden = true;
      planSection.hidden = false;
      itinerarySection.hidden = true;

      planSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ====== Toggle giữa 2 chế độ trong form ======
  plannerForm.elements["mode"].forEach(r => {
    r.addEventListener("change", () => {
      const has = plannerForm.elements["mode"].value === "has";
      destRow.hidden  = !has;
      styleRow.hidden =  has ? true : false;
    });
  });

  // ====== Auto-format ngân sách khi gõ ======
  if (budgetInput) {
    budgetInput.addEventListener("input", (e) => {
      const raw = e.target.value.replace(/\D/g, "");
      e.target.value = raw ? Number(raw).toLocaleString("vi-VN") : "";
    });
  }

  // ====== Core chọn city khi chưa có đích ======
  function getCityAffinity(cityId) {
    const all = JSON.parse(localStorage.getItem("tp_feedback") || "{}");
    const c = all[cityId];
    if (!c || c.count === 0) return 0;
    const avg = c.total / c.count; // 1..5
    return (avg - 3) / 4;          // map sang -0.5..+0.5
  }
  function pickCityByStyle(checkedStyles, budgetPerPersonPerDay) {
    let best = null, bestScore = -1;
    for (const c of CITIES) {
      let score = 0;
      checkedStyles.forEach(st => { if (c.tags.includes(st)) score += 1; });
      if (budgetPerPersonPerDay >= c.avgCostPerDay * 0.7 && budgetPerPersonPerDay <= c.avgCostPerDay * 1.5) score += 1;
      score += (getCityAffinity(c.id) || 0);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best || CITIES[0];
  }

  // ====== Generate itinerary ======
  function groupPOIsByType(pois) {
    const g = {};
    for (const p of pois) { if (!g[p.type]) g[p.type] = []; g[p.type].push(p); }
    return g;
  }
  function pickPOI(poiByType, purpose) {
    const list = poiByType[purpose] || poiByType["sightseeing"] || [];
    if (!list.length) return null;
    return randFrom(list);
  }
  function generateItinerary(city, days, purposes) {
    const plan = [];
    const poiByType = groupPOIsByType(city.pois);
    for (let d = 1; d <= days; d++) {
      const dayBlocks = [];
      for (const p of purposes) {
        const spot = pickPOI(poiByType, p);
        dayBlocks.push({
          time: suggestTimeSlot(p),
          purpose: p,
          activity: randFrom(ACTIVITIES[p]) || "Hoạt động tự do",
          place: spot ? spot.name : "(Tự do khám phá)"
        });
      }
      plan.push({ day: d, blocks: dayBlocks });
    }
    return plan;
  }

  // ====== Render itinerary ======
  function estimateTraffic() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 CN - 6 Th7
    let base = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19) ? 2 : 1;
    if (day === 0 || day === 6) base += 0.5;
    const label = base >= 2 ? "Cao" : base >= 1.5 ? "Trung bình" : "Thấp";
    const hint = base >= 2 ? "Nên khởi hành sớm hơn, tránh 7–9h & 16–19h." : "Di chuyển khá thuận lợi.";
    return { label, hint };
  }
  function renderSafety() {
    safetyDiv.innerHTML = `<h3>Gợi ý an toàn</h3><ul>${SAFETY_TIPS.map(t => `<li>${t}</li>`).join("")}</ul>`;
  }
  function renderItinerary(city, budget, people, days, purposes, plan) {
    const perPersonPerDay = Math.round(budget / (people * days));
    summaryDiv.innerHTML = `
      <div class="muted">
        Điểm đến: <b>${city.name}</b> • Số ngày: <b>${days}</b> • Số người: <b>${people}</b><br/>
        Ngân sách: <b>${formatVND(budget)}</b> (~ <b>${formatVND(perPersonPerDay)}</b>/người/ngày)
        ${perPersonPerDay < city.avgCostPerDay ? " • <span style='color:#b91c1c'>Ngân sách có thể hơi chặt cho điểm đến này.</span>" : ""}
      </div>
    `;
    itineraryList.innerHTML = plan.map(day =>
      `<li class="day">
        <b>Ngày ${day.day}</b>
        <ul>
          ${day.blocks.map(b => `<li><b>${b.time}</b> — <i>${labelPurpose(b.purpose)}</i>: ${b.activity} @ <b>${b.place}</b></li>`).join("")}
        </ul>
      </li>`
    ).join("");

    const t = estimateTraffic();
    trafficDiv.innerHTML = `<b>Lưu lượng xe (ước tính): ${t.label}</b> — ${t.hint}`;
    renderSafety();
    itinerarySection.hidden = false;
  }

  // ====== Geolocation “Gần tôi” ======
  nearbyBtn?.addEventListener("click", () => {
    if (!navigator.geolocation) { alert("Trình duyệt không hỗ trợ định vị."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => showNearby(pos.coords.latitude, pos.coords.longitude),
      err => alert("Không lấy được vị trí: " + err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
  function haversine(lat1, lon1, lat2, lon2) {
    const toRad = d => d * Math.PI / 180, R = 6371;
    const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  function showNearby(lat, lon) {
    const allPOI = CITIES.flatMap(c => c.pois.map(p => ({ ...p, cityId: c.id, cityName: c.name })));
    const within = allPOI
      .map(p => ({ ...p, dist: haversine(lat, lon, p.lat, p.lon) }))
      .filter(p => p.dist <= 15)
      .sort((a,b) => a.dist - b.dist).slice(0, 10);

    if (!within.length) { nearbyList.innerHTML = `<li>Không thấy điểm nổi bật trong bán kính 15km (dữ liệu demo).</li>`; return; }
    nearbyList.innerHTML = within.map(p =>
      `<li><b>${p.name}</b> — ${p.cityName} • ${p.type}<br/><span class="muted">${p.dist.toFixed(1)} km</span></li>`
    ).join("");
  }

  // ====== Submit form → validate → tạo lịch trình ======
  plannerForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const budgetEl = document.getElementById("budget");
    const peopleEl = document.getElementById("people");
    const daysEl   = document.getElementById("days");

    [budgetEl, peopleEl, daysEl, destSelect].forEach(clearError);

    // chuyển ngân sách về số thô
    budgetEl.value = (budgetEl.value || "").replace(/\D/g, "");

    const budget = Number(budgetEl.value || 0);
    const people = Number(peopleEl.value || 0);
    const days   = Number(daysEl.value || 0);

    let hasError = false;
    if (!budget || budget < 300000) { showError(budgetEl, "Ngân sách tối thiểu nên từ 300.000đ."); hasError = true; }
    if (!people || people < 1)      { showError(peopleEl, "Số người phải ≥ 1."); hasError = true; }
    if (!days || days < 1)          { showError(daysEl,   "Số ngày phải ≥ 1."); hasError = true; }
    if (hasError) return;

    const purposes = [...document.querySelectorAll(".purpose:checked")].map(i => i.value);
    if (!purposes.length) { alert("Chọn ít nhất 1 mục đích."); return; }

    let city;
    const mode = plannerForm.elements["mode"].value;
    if (mode === "has") {
      const id = destSelect.value;
      city = CITIES.find(c => c.id === id);
      if (!city) { showError(destSelect, "Hãy chọn một tỉnh/thành."); return; }
    } else {
      const styles = [...styleRow.querySelectorAll("input:checked")].map(i => i.value);
      if (!styles.length) { alert("Chọn ít nhất 1 hình thức du lịch."); return; }
      const perPersonPerDay = budget / (people * days || 1);
      city = pickCityByStyle(styles, perPersonPerDay);
      if (city) destSelect.value = city.id;
    }

    const plan = generateItinerary(city, days, purposes);
    renderItinerary(city, budget, people, days, purposes, plan);

    feedbackForm.dataset.cityId = city.id;
    document.getElementById("itinerary").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // ====== Feedback ======
  function saveFeedback(cityId, score, note) {
    const key = "tp_feedback";
    const all = JSON.parse(localStorage.getItem(key) || "{}");
    const cur = all[cityId] || { total: 0, count: 0, notes: [] };
    cur.total += Number(score);
    cur.count += 1;
    if (note?.trim()) cur.notes.push({ note: note.trim(), at: Date.now() });
    all[cityId] = cur;
    localStorage.setItem(key, JSON.stringify(all));
  }
  feedbackForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const cityId = feedbackForm.dataset.cityId;
    if (!cityId) { alert("Hãy tạo lịch trình trước."); return; }
    const score = document.getElementById("fbScore").value;
    const note  = document.getElementById("fbNote").value;
    saveFeedback(cityId, score, note);
    fbSaved.textContent = "Đã lưu phản hồi. Lần sau sẽ ưu tiên gợi ý phù hợp hơn.";
    document.getElementById("fbNote").value = "";
  });

  // ====== Carousel quảng cáo (cột phải) ======
  const ADS_SLIDES = [
    { href: "https://banahills.sunworld.vn/",  alt: "Bà Nà Hills - Ưu đãi mùa hè",
      src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop" },
    { href: "https://vinwonders.com/",         alt: "VinWonders - Công viên chủ đề",
      src: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=1200&auto=format&fit=crop" },
    { href: "https://www.sunworld.vn/",        alt: "Sun World - Combo cáp treo",
      src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop" },
    { href: "https://www.ba-na-hills.com/",    alt: "Cầu Vàng - Check-in Đà Nẵng",
      src: "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1200&auto=format&fit=crop" },
    { href: "https://fantasea.vn/",            alt: "Combo khách sạn + vé máy bay",
      src: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=1200&auto=format&fit=crop" }
  ];
  const viewport = document.querySelector(".carousel__viewport");
  const prevBtn  = document.querySelector(".carousel__nav.prev");
  const nextBtn  = document.querySelector(".carousel__nav.next");
  const dotsBox  = document.querySelector(".carousel__dots");

  if (viewport && prevBtn && nextBtn && dotsBox) {
    viewport.innerHTML = ADS_SLIDES.map((s, i) => `
      <a class="carousel__slide ${i===0 ? "is-active": ""}" href="${s.href}" target="_blank" rel="noopener">
        <img src="${s.src}" alt="${s.alt}">
      </a>
    `).join("");
    dotsBox.innerHTML = ADS_SLIDES.map((_, i) =>
      `<li><button type="button" aria-label="Slide ${i+1}" ${i===0 ? 'aria-current="true"': ''}></button></li>`
    ).join("");

    const slides = [...viewport.querySelectorAll(".carousel__slide")];
    const dots   = [...dotsBox.querySelectorAll("button")];
    let idx = 0;
    let timer;

    const show = (i) => {
      slides[idx].classList.remove("is-active");
      dots[idx].removeAttribute("aria-current");
      idx = (i + slides.length) % slides.length;
      slides[idx].classList.add("is-active");
      dots[idx].setAttribute("aria-current", "true");
    };
    const next = () => show(idx + 1);
    const prev = () => show(idx - 1);
    const start = () => { stop(); timer = setInterval(next, 5000); };
    const stop  = () => { if (timer) clearInterval(timer); };

    nextBtn.addEventListener("click", () => { next(); start(); });
    prevBtn.addEventListener("click", () => { prev(); start(); });
    dots.forEach((b, i) => b.addEventListener("click", () => { show(i); start(); }));
    viewport.addEventListener("mouseenter", stop);
    viewport.addEventListener("mouseleave", start);

    start();
  }
});
// ================== /app.js ==================
