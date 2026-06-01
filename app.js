const state = {
  events: [],
  filteredEvents: [],
  selectedTags: new Set(),
  activeNeighborhood: "all"
};

const els = {
  filters: document.querySelector("#filters"),
  search: document.querySelector("#search"),
  category: document.querySelector("#category"),
  price: document.querySelector("#price"),
  neighborhood: document.querySelector("#neighborhood"),
  dateFilter: document.querySelector("#date-filter"),
  reset: document.querySelector("#reset-filters"),
  tagFilter: document.querySelector("#tag-filter"),
  eventList: document.querySelector("#event-list"),
  resultCount: document.querySelector("#result-count"),
  emptyState: document.querySelector("#empty-state"),
  map: document.querySelector("#stl-map"),
  mapSummary: document.querySelector("#map-summary"),
  thisWeek: document.querySelector("#this-week-list"),
  free: document.querySelector("#free-list"),
  cheap: document.querySelector("#cheap-list"),
  hidden: document.querySelector("#hidden-list")
};

const categoryLabels = {
  music: "Music",
  outdoors: "Outdoors",
  museums: "Museums",
  movies: "Movies",
  sports: "Sports",
  food: "Food",
  arts: "Arts",
  community: "Community"
};

const mapZones = [
  { name: "North City", x: 16, y: 11 },
  { name: "Grand Center", x: 36, y: 24 },
  { name: "Central West End", x: 25, y: 35 },
  { name: "Forest Park", x: 16, y: 45 },
  { name: "Downtown", x: 70, y: 36 },
  { name: "Soulard", x: 66, y: 56 },
  { name: "Tower Grove", x: 44, y: 64 },
  { name: "Shaw", x: 34, y: 58 },
  { name: "Cherokee", x: 54, y: 73 },
  { name: "Maplewood", x: 10, y: 72 },
  { name: "Kirkwood", x: 6, y: 84 }
];

const pinPositions = {
  "Forest Park": { x: 22, y: 44 },
  Shaw: { x: 38, y: 58 },
  Downtown: { x: 72, y: 40 },
  "Grand Center": { x: 40, y: 28 },
  "Tower Grove": { x: 48, y: 66 },
  Soulard: { x: 66, y: 58 },
  Kirkwood: { x: 12, y: 84 },
  Maplewood: { x: 14, y: 72 },
  Cherokee: { x: 56, y: 74 },
  "Central West End": { x: 28, y: 35 },
  "The Grove": { x: 36, y: 48 },
  "North City": { x: 18, y: 18 },
  "South City": { x: 52, y: 82 },
  "Laclede's Landing": { x: 80, y: 32 }
};

init();

async function init() {
  try {
    const response = await fetch("data/events.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load events: ${response.status}`);
    }
    const data = await response.json();
    state.events = data.events.map(normalizeEvent);
    buildFilters();
    buildMap();
    bindEvents();
    applyFilters();
  } catch (error) {
    els.resultCount.textContent = "Could not load event data.";
    els.emptyState.hidden = false;
    els.emptyState.textContent = "Open this site through a static server or deploy it so data/events.json can load.";
    console.error(error);
  }
}

function normalizeEvent(event) {
  return {
    ...event,
    start: parseLocalDate(event.startDate),
    end: parseLocalDate(event.endDate || event.startDate),
    searchable: [
      event.title,
      event.category,
      event.neighborhood,
      event.venue,
      event.whyGo,
      event.description,
      ...(event.goodFor || [])
    ]
      .join(" ")
      .toLowerCase()
  };
}

function buildFilters() {
  const categories = unique(state.events.map((event) => event.category)).sort();
  const neighborhoods = unique(state.events.map((event) => event.neighborhood)).sort();
  const tags = unique(state.events.flatMap((event) => event.goodFor || [])).sort();

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = categoryLabels[category] || toTitle(category);
    els.category.append(option);
  });

  neighborhoods.forEach((neighborhood) => {
    const option = document.createElement("option");
    option.value = neighborhood;
    option.textContent = neighborhood;
    els.neighborhood.append(option);
  });

  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-button";
    button.textContent = toTitle(tag);
    button.setAttribute("aria-pressed", "false");
    button.dataset.tag = tag;
    els.tagFilter.append(button);
  });
}

function buildMap() {
  mapZones.forEach((zone) => {
    const div = document.createElement("div");
    div.className = "map-zone";
    div.textContent = zone.name;
    div.style.left = `${zone.x}%`;
    div.style.top = `${zone.y}%`;
    els.map.append(div);
  });
}

function bindEvents() {
  els.filters.addEventListener("input", applyFilters);
  els.filters.addEventListener("change", applyFilters);

  els.reset.addEventListener("click", () => {
    els.filters.reset();
    state.selectedTags.clear();
    state.activeNeighborhood = "all";
    els.neighborhood.value = "all";
    document.querySelectorAll(".tag-button").forEach((button) => {
      button.setAttribute("aria-pressed", "false");
    });
    applyFilters();
  });

  els.tagFilter.addEventListener("click", (event) => {
    const button = event.target.closest(".tag-button");
    if (!button) return;
    const tag = button.dataset.tag;
    if (state.selectedTags.has(tag)) {
      state.selectedTags.delete(tag);
      button.setAttribute("aria-pressed", "false");
    } else {
      state.selectedTags.add(tag);
      button.setAttribute("aria-pressed", "true");
    }
    applyFilters();
  });

  els.map.addEventListener("click", (event) => {
    const pin = event.target.closest(".pin");
    if (!pin) return;
    setNeighborhood(pin.dataset.neighborhood);
  });

  els.mapSummary.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-neighborhood]");
    if (!button) return;
    setNeighborhood(button.dataset.neighborhood);
  });

  document.addEventListener("click", (event) => {
    const mini = event.target.closest("[data-focus-event]");
    if (!mini) return;
    focusEvent(mini.dataset.focusEvent);
  });
}

function applyFilters() {
  const query = els.search.value.trim().toLowerCase();
  const category = els.category.value;
  const price = els.price.value;
  const neighborhood = els.neighborhood.value;
  const dateFilter = els.dateFilter.value;
  state.activeNeighborhood = neighborhood;

  state.filteredEvents = state.events
    .filter((event) => {
      return (
        matchesQuery(event, query) &&
        matchesCategory(event, category) &&
        matchesPrice(event, price) &&
        matchesNeighborhood(event, neighborhood) &&
        matchesDate(event, dateFilter) &&
        matchesTags(event)
      );
    })
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));

  renderEvents(state.filteredEvents);
  renderCuratedSections();
  renderPins();
  renderMapSummary();
}

function matchesQuery(event, query) {
  return !query || event.searchable.includes(query);
}

function matchesCategory(event, category) {
  return category === "all" || event.category === category;
}

function matchesPrice(event, price) {
  if (price === "all") return true;
  if (price === "free") return event.priceMin === 0;
  if (price === "under15") return event.priceMin <= 15;
  if (price === "paid") return event.priceMax > 0 || event.priceMin > 0;
  return true;
}

function matchesNeighborhood(event, neighborhood) {
  return neighborhood === "all" || event.neighborhood === neighborhood;
}

function matchesDate(event, dateFilter) {
  if (dateFilter === "all") return true;

  const today = startOfDay(new Date());
  const thisWeekEnd = addDays(today, 6);
  const eventStart = startOfDay(event.start);
  const eventEnd = startOfDay(event.end);

  if (dateFilter === "today") {
    return eventStart <= today && eventEnd >= today;
  }

  if (dateFilter === "this-week") {
    return eventEnd >= today && eventStart <= thisWeekEnd;
  }

  if (dateFilter === "weekend") {
    return [0, 6].includes(eventStart.getDay()) || [0, 6].includes(eventEnd.getDay());
  }

  const monthMap = { june: 5, july: 6, august: 7 };
  return eventStart.getMonth() === monthMap[dateFilter] || eventEnd.getMonth() === monthMap[dateFilter];
}

function matchesTags(event) {
  if (state.selectedTags.size === 0) return true;
  const tags = new Set(event.goodFor || []);
  return [...state.selectedTags].every((tag) => tags.has(tag));
}

function renderEvents(events) {
  els.eventList.innerHTML = "";
  els.resultCount.textContent = `${events.length} ${events.length === 1 ? "event" : "events"}`;
  els.emptyState.hidden = events.length !== 0;

  const fragment = document.createDocumentFragment();
  events.forEach((event) => fragment.append(createEventCard(event)));
  els.eventList.append(fragment);
}

function createEventCard(event) {
  const article = document.createElement("article");
  article.className = `event-card${event.featured ? " featured" : ""}`;
  article.id = `event-${event.id}`;

  article.innerHTML = `
    <div class="card-topline">
      <div class="date-badge">
        <span>${formatMonth(event.start)}</span>
        <strong>${event.start.getDate()}</strong>
      </div>
      <span class="status-badge">${event.status === "source-confirmed" ? "Source-linked" : "Verify details"}</span>
    </div>
    <div>
      <div class="meta-row">
        <span>${formatDateRange(event)}</span>
        <span class="meta-dot"></span>
        <span>${event.time}</span>
      </div>
      <h3>${escapeHtml(event.title)}</h3>
    </div>
    <div class="meta-row">
      <span>${escapeHtml(event.venue)}</span>
      <span class="meta-dot"></span>
      <span>${escapeHtml(event.neighborhood)}</span>
    </div>
    <div class="meta-row">
      <span class="category-badge">${categoryLabels[event.category] || toTitle(event.category)}</span>
      <span class="price-badge">${escapeHtml(event.priceLabel)}</span>
    </div>
    <p class="event-why">${escapeHtml(event.whyGo)}</p>
    <p class="event-desc">${escapeHtml(event.description)}</p>
    <div class="good-tags">
      ${(event.goodFor || []).map((tag) => `<span>${escapeHtml(toTitle(tag))}</span>`).join("")}
    </div>
    <div class="card-actions">
      <a href="${event.link}" target="_blank" rel="noreferrer">Official/source</a>
      <button class="copy-button" type="button" data-copy="${event.id}">Copy blurb</button>
    </div>
    <p class="source-row">Source: <a href="${event.sourceUrl}" target="_blank" rel="noreferrer">${escapeHtml(event.sourceName)}</a></p>
  `;

  article.querySelector(".copy-button").addEventListener("click", async (clickEvent) => {
    const button = clickEvent.currentTarget;
    const text = `${event.title} - ${formatDateRange(event)}, ${event.time} at ${event.venue} (${event.neighborhood}). ${event.priceLabel}. ${event.link}`;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy blurb";
      }, 1400);
    } catch {
      button.textContent = "Copy failed";
      window.setTimeout(() => {
        button.textContent = "Copy blurb";
      }, 1400);
    }
  });

  return article;
}

function renderCuratedSections() {
  const upcoming = [...state.events].sort((a, b) => a.start - b.start);
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 6);

  renderMiniList(
    els.thisWeek,
    upcoming.filter((event) => startOfDay(event.end) >= today && startOfDay(event.start) <= weekEnd).slice(0, 5)
  );
  renderMiniList(
    els.free,
    upcoming.filter((event) => event.priceMin === 0).slice(0, 5)
  );
  renderMiniList(
    els.cheap,
    upcoming.filter((event) => event.priceMin > 0 && event.priceMin <= 15).slice(0, 5)
  );
  renderMiniList(
    els.hidden,
    upcoming.filter((event) => event.hiddenGem).slice(0, 5)
  );
}

function renderMiniList(container, events) {
  container.innerHTML = "";

  if (events.length === 0) {
    const empty = document.createElement("p");
    empty.className = "event-desc";
    empty.textContent = "No picks in this slice yet.";
    container.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  events.forEach((event) => {
    const item = document.createElement("div");
    item.className = "mini-event";
    item.innerHTML = `
      <button type="button" data-focus-event="${event.id}">${escapeHtml(event.title)}</button>
      <small>${formatDateRange(event)} / ${escapeHtml(event.neighborhood)} / ${escapeHtml(event.priceLabel)}</small>
    `;
    fragment.append(item);
  });
  container.append(fragment);
}

function renderPins() {
  els.map.querySelectorAll(".pin, .pin-label").forEach((node) => node.remove());

  const counts = countBy(state.filteredEvents, (event) => event.neighborhood);
  Object.entries(counts).forEach(([neighborhood, count]) => {
    const position = pinPositions[neighborhood] || { x: 50, y: 50 };
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = `pin${state.activeNeighborhood === neighborhood ? " active" : ""}`;
    pin.style.left = `${position.x}%`;
    pin.style.top = `${position.y}%`;
    pin.dataset.neighborhood = neighborhood;
    pin.setAttribute("aria-label", `${neighborhood}, ${count} events`);
    pin.innerHTML = `<span>${count}</span>`;

    const label = document.createElement("div");
    label.className = "pin-label";
    label.style.left = `${position.x}%`;
    label.style.top = `${position.y}%`;
    label.textContent = neighborhood;

    els.map.append(pin, label);
  });
}

function renderMapSummary() {
  const counts = countBy(state.filteredEvents, (event) => event.neighborhood);
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  els.mapSummary.innerHTML = "";

  if (rows.length === 0) {
    els.mapSummary.textContent = "No neighborhoods match the current filters.";
    return;
  }

  rows.slice(0, 8).forEach(([neighborhood, count]) => {
    const row = document.createElement("div");
    row.className = "summary-row";
    row.innerHTML = `
      <button type="button" data-neighborhood="${escapeAttribute(neighborhood)}">${escapeHtml(neighborhood)}</button>
      <small>${count}</small>
    `;
    els.mapSummary.append(row);
  });
}

function setNeighborhood(neighborhood) {
  els.neighborhood.value = neighborhood;
  state.activeNeighborhood = neighborhood;
  applyFilters();
  document.querySelector("#events").scrollIntoView({ behavior: "smooth", block: "start" });
}

function focusEvent(id) {
  els.search.value = "";
  els.category.value = "all";
  els.price.value = "all";
  els.neighborhood.value = "all";
  els.dateFilter.value = "all";
  state.selectedTags.clear();
  document.querySelectorAll(".tag-button").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  applyFilters();

  const card = document.querySelector(`#event-${CSS.escape(id)}`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.animate(
    [
      { boxShadow: "0 0 0 0 rgba(226, 170, 53, 0.0)" },
      { boxShadow: "0 0 0 8px rgba(226, 170, 53, 0.45)" },
      { boxShadow: "6px 6px 0 rgba(24, 33, 31, 0.08)" }
    ],
    { duration: 1200, easing: "ease-out" }
  );
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatMonth(date) {
  return date.toLocaleDateString(undefined, { month: "short" });
}

function formatDateRange(event) {
  const options = { month: "short", day: "numeric" };
  if (event.startDate === (event.endDate || event.startDate)) {
    return event.start.toLocaleDateString(undefined, options);
  }
  return `${event.start.toLocaleDateString(undefined, options)}-${event.end.toLocaleDateString(undefined, options)}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function toTitle(value) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
