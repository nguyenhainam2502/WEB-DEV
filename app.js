/***** Mock dữ liệu thành phố & POI *****/
const CITIES = [
  {
    id: "danang",
    name: "Đà Nẵng",
    tags: ["bien", "am_thuc", "nghi_duong"],
    avgCostPerDay: 900000,
    pois: [
      { name: "Bãi biển Mỹ Khê", type: "sightseeing", lat: 16.0646, lon: 108.2428 },
      { name: "Bánh tráng cuốn thịt heo Trần", type: "foodie", lat: 16.0737, lon: 108.2227 },
      { name: "Cầu Rồng", type: "sightseeing", lat: 16.0615, lon: 108.2273 },
      { name: "Bà Nà Hills (cần di chuyển)", type: "relax", lat: 15.9955, lon: 107.9962 }
    ]
  },
  {
    id: "dalat",
    name: "Đà Lạt",
    tags: ["sinh_thai", "nghi_duong", "van_hoa"],
    avgCostPerDay: 800000,
    pois: [
      { name: "Hồ Xuân Hương", type: "relax", lat: 11.9416, lon: 108.4419 },
      { name: "Chợ Đà Lạt", type: "foodie", lat: 11.9465, lon: 108.4419 },
      { name: "Langbiang", type: "sightseeing", lat: 12.0168, lon: 108.4555 }
    ]
  },
  {
    id: "hanoi",
    name: "Hà Nội",
    tags: ["van_hoa", "am_thuc"],
    avgCostPerDay: 1000000,
    pois: [
      { name: "Hồ Gươm", type: "sightseeing", lat: 21.0288, lon: 105.8522 },
      { name: "Phố cổ", type: "sightseeing", lat: 21.0352, lon: 105.852 },
      { name: "Bún chả Hàng Quạt", type: "foodie", lat: 21.0333, lon: 105.8463 }
    ]
  }
];

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

/***** DOM refs *****/
// Entry (màn hình đầu tiên)
const entrySection = document.getElementById("entry");
const entryForm = document.getElementById("entryForm");
// ENTRY: click card → chuyển thẳng sang bước kế tiếp
document.querySelectorAll(".entry__option").forEach(btn => {
  btn.addEventListener("click", () => {
    const entryMode = btn.dataset.mode; // "has" | "no"

    // đồng bộ radio trong form planner
    const plannerMode = plannerForm.elements["mode"];
    [...plannerMode].forEach(r => r.checked = (r.value === entryMode));

    // toggle UI: "has" → hiện tỉnh/thành ; "no" → hiện style
    const has = entryMode === "has";
    destRow.hidden = !has;
    styleRow.hidden = has;

    // ẩn ENTRY, hiện PLAN, ẩn ITINERARY
    entrySection.hidden = true;
    planSection.hidden = false;
    itinerarySection.hidden = true;

    // cuộn tới form
    planSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});


// Planner + itinerary
const destSelect = document.getElementById("destination");
const plannerForm = document.getElementById("plannerForm");
const itineraryList = document.getElementById("itineraryList");
const summaryDiv = document.getElementById("summary");
const safetyDiv = document.getElementById("safety");
const trafficDiv = document.getElementById("traffic");
const destRow = document.getElementById("destRow");
const styleRow = document.getElementById("styleRow");
const feedbackForm = document.getElementById("feedbackForm");
const fbSaved = document.getElementById("fbSaved");

// Sections (để ẩn/hiện)
const planSection = document.getElementById("plan");
const itinerarySection = document.getElementById("itinerary");

// Nearby
const nearbyBtn = document.getElementById("locateBtn");
const nearbyList = document.getElementById("nearbyList");

/***** Init *****/
function loadDestinations() {
  destSelect.innerHTML = CITIES.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
}
loadDestinations();

/***** STEP 0: Entry flow *****/
entryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  // đọc lựa chọn ở màn hình đầu
  const entryMode = entryForm.elements["entryMode"].value; // "has" | "no"

  // đồng bộ vào radio của form planner
  const plannerMode = plannerForm.elements["mode"];
  [...plannerMode].forEach(r => r.checked = (r.value === entryMode));

  // toggle UI: nếu "has" → hiện chọn tỉnh; nếu "no" → hiện chọn style
  const has = entryMode === "has";
  destRow.hidden = !has;
  styleRow.hidden = has;

  // Ẩn entry, hiện form kế hoạch + cuộn đến form
  entrySection.hidden = true;
  planSection.hidden = false;
  itinerarySection.hidden = true; // vẫn ẩn phần đề xuất cho đến khi tạo lịch trình

  // scroll mượt tới form
  document.getElementById("plan").scrollIntoView({ behavior: "smooth", block: "start" });
});

/***** Toggle giữa 2 chế độ ngay trong form planner (nếu user đổi ý) *****/
plannerForm.elements["mode"].forEach(r => {
  r.addEventListener("change", () => {
    const has = plannerForm.elements["mode"].value === "has";
    destRow.hidden = !has;
    styleRow.hidden = has;
  });
});

/***** Core: chọn thành phố nếu user chưa có đích *****/
function pickCityByStyle(checkedStyles, budgetPerPersonPerDay) {
  let best = null, bestScore = -1;
  for (const c of CITIES) {
    let score = 0;
    checkedStyles.forEach(st => { if (c.tags.includes(st)) score += 1; });
    if (budgetPerPersonPerDay >= c.avgCostPerDay * 0.7 && budgetPerPersonPerDay <= c.avgCostPerDay * 1.5) {
      score += 1;
    }
    score += (getCityAffinity(c.id) || 0);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best || CITIES[0];
}

/***** Tạo lịch trình theo mục đích *****/
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

function groupPOIsByType(pois) {
  const g = {};
  for (const p of pois) {
    if (!g[p.type]) g[p.type] = [];
    g[p.type].push(p);
  }
  return g;
}
function pickPOI(poiByType, purpose) {
  const list = poiByType[purpose] || poiByType["sightseeing"] || [];
  if (!list.length) return null;
  return randFrom(list);
}

/***** Traffic (ước lượng) *****/
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

/***** Safety tips *****/
function renderSafety() {
  safetyDiv.innerHTML = `
    <h3>Gợi ý an toàn</h3>
    <ul>${SAFETY_TIPS.map(t => `<li>${t}</li>`).join("")}</ul>
  `;
}

/***** Render itinerary *****/
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
        ${day.blocks.map(b =>
          `<li><b>${b.time}</b> — <i>${labelPurpose(b.purpose)}</i>: ${b.activity} @ <b>${b.place}</b></li>`
        ).join("")}
      </ul>
    </li>`
  ).join("");

  const t = estimateTraffic();
  trafficDiv.innerHTML = `<b>Lưu lượng xe (ước tính): ${t.label}</b> — ${t.hint}`;
  renderSafety();

  // hiện phần đề xuất sau khi tạo
  itinerarySection.hidden = false;
}

function labelPurpose(p) {
  return p === "sightseeing" ? "Tham quan" : p === "relax" ? "Nghỉ dưỡng" : "Ăn uống";
}
function suggestTimeSlot(p) {
  if (p === "sightseeing") return "Sáng";
  if (p === "foodie") return "Trưa";
  return "Chiều/Tối";
}
function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function formatVND(n) { return n.toLocaleString("vi-VN") + "đ"; }

/***** Feedback learning (localStorage) *****/
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
function getCityAffinity(cityId) {
  const all = JSON.parse(localStorage.getItem("tp_feedback") || "{}");
  const c = all[cityId];
  if (!c || c.count === 0) return 0;
  const avg = c.total / c.count; // 1..5
  return (avg - 3) / 4;
}

/***** Geolocation + gợi ý gần tôi *****/
nearbyBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Trình duyệt không hỗ trợ định vị.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => showNearby(pos.coords.latitude, pos.coords.longitude),
    (err) => alert("Không lấy được vị trí: " + err.message),
    { enableHighAccuracy: true, timeout: 8000 }
  );
});

function showNearby(lat, lon) {
  const allPOI = CITIES.flatMap(c => c.pois.map(p => ({ ...p, cityId: c.id, cityName: c.name })));
  const within = allPOI
    .map(p => ({ ...p, dist: haversine(lat, lon, p.lat, p.lon) }))
    .filter(p => p.dist <= 15)
    .sort((a,b) => a.dist - b.dist)
    .slice(0, 10);

  if (!within.length) {
    nearbyList.innerHTML = `<li>Không thấy điểm nổi bật trong bán kính 15km (dữ liệu demo).</li>`;
    return;
  }
  nearbyList.innerHTML = within.map(p => `
    <li>
      <b>${p.name}</b> — ${p.cityName} • ${p.type}<br/>
      <span class="muted">${p.dist.toFixed(1)} km</span>
    </li>
  `).join("");
}

// km
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/***** Submit form → tạo lịch trình *****/
plannerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const budget = Number(document.getElementById("budget").value || 0);
  const people = Number(document.getElementById("people").value || 1);
  const days = Number(document.getElementById("days").value || 1);
  const purposes = [...document.querySelectorAll(".purpose:checked")].map(i => i.value);
  if (!purposes.length) { alert("Chọn ít nhất 1 mục đích."); return; }

  let city;
  const mode = plannerForm.elements["mode"].value;
  if (mode === "has") {
    const id = destSelect.value;
    city = CITIES.find(c => c.id === id);
  } else {
    const styles = [...styleRow.querySelectorAll("input:checked")].map(i => i.value);
    if (!styles.length) { alert("Chọn ít nhất 1 hình thức du lịch."); return; }
    const perPersonPerDay = budget / (people * days || 1);
    city = pickCityByStyle(styles, perPersonPerDay);
    destSelect.value = city.id; // phản chiếu ra UI
  }

  const plan = generateItinerary(city, days, purposes);
  renderItinerary(city, budget, people, days, purposes, plan);

  // gắn cityId cho feedback
  feedbackForm.dataset.cityId = city.id;

  // cuộn xuống phần lịch trình
  document.getElementById("itinerary").scrollIntoView({ behavior: "smooth", block: "start" });
});

/***** Save feedback *****/
feedbackForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const cityId = feedbackForm.dataset.cityId;
  if (!cityId) { alert("Hãy tạo lịch trình trước."); return; }
  const score = document.getElementById("fbScore").value;
  const note = document.getElementById("fbNote").value;
  saveFeedback(cityId, score, note);
  fbSaved.textContent = "Đã lưu phản hồi. Lần sau sẽ ưu tiên gợi ý phù hợp hơn.";
  document.getElementById("fbNote").value = "";
});
// ---- Auto format số tiền trong ô ngân sách ----
const budgetInput = document.getElementById("budget");

if (budgetInput) {
  budgetInput.addEventListener("input", (e) => {
    // Giữ vị trí con trỏ
    const cursor = e.target.selectionStart;
    const value = e.target.value.replace(/\D/g, ""); // bỏ ký tự không phải số
    if (!value) {
      e.target.value = "";
      return;
    }
    // Format theo kiểu Việt Nam
    const formatted = Number(value).toLocaleString("vi-VN");
    e.target.value = formatted;
    // Đưa con trỏ về cuối
    e.target.setSelectionRange(formatted.length, formatted.length);
  });

  // Khi submit cần chuyển về số nguyên để tính toán
  plannerForm.addEventListener("submit", () => {
    const raw = budgetInput.value.replace(/\D/g, ""); // "4,000,000" -> "4000000"
    budgetInput.value = raw;
  });
}
