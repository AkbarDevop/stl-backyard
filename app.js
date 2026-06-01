const DEFAULT_PLAN = {
  group: "friends",
  budget: "free",
  vibes: ["music"],
  area: "any"
};

const PLAN_STORAGE_KEY = "stl-backyard-plan";
const plannerSteps = ["group", "budget", "vibe", "area", "results"];
const plannerStepLabels = {
  group: "Step 1 of 5",
  budget: "Step 2 of 5",
  vibe: "Step 3 of 5",
  area: "Step 4 of 5",
  results: "Step 5 of 5"
};

const state = {
  events: [],
  filteredEvents: [],
  selectedTags: new Set(),
  activeNeighborhood: "all",
  activePlanFilter: null,
  planPicks: [],
  currentPlannerStep: 0,
  plannerReturnFocus: null
};

const els = {
  plannerModal: document.querySelector("#planner-modal"),
  plannerForm: document.querySelector("#planner-form"),
  plannerBack: document.querySelector("#planner-back"),
  plannerNext: document.querySelector("#planner-next"),
  plannerProgressBar: document.querySelector("#planner-progress-bar"),
  plannerStepLabel: document.querySelector("#planner-step-label"),
  planChip: document.querySelector("#plan-chip"),
  planSummary: document.querySelector("#plan-summary"),
  planPicks: document.querySelector("#plan-picks"),
  applyPlan: document.querySelector("#apply-plan"),
  sharePlan: document.querySelector("#share-plan"),
  resetPlan: document.querySelector("#reset-plan"),
  shareStatus: document.querySelector("#share-status"),
  activePlanNote: document.querySelector("#active-plan-note"),
  activePlanText: document.querySelector("#active-plan-text"),
  clearPlanFilter: document.querySelector("#clear-plan-filter"),
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
  hidden: document.querySelector("#hidden-list"),
  closePlanner: document.querySelector("#close-planner"),
  openPlannerLinks: document.querySelectorAll("[data-open-planner]")
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

const budgetLabels = {
  free: "Free first",
  under15: "Under $15",
  any: "Any budget"
};

const groupProfiles = {
  solo: {
    label: "solo",
    tags: ["solo"],
    categories: ["museums", "outdoors", "arts"]
  },
  date: {
    label: "date",
    tags: ["date night"],
    categories: ["music", "arts", "food", "movies", "outdoors"]
  },
  friends: {
    label: "friends",
    tags: ["music heads", "food curious", "after work", "community"],
    categories: ["music", "food", "sports", "community", "movies"]
  },
  family: {
    label: "family",
    tags: ["families", "kids"],
    categories: ["museums", "outdoors", "movies", "community", "arts"]
  }
};

const areaProfiles = {
  downtown: {
    label: "Downtown",
    summaryLabel: "downtown by the Arch and stadiums",
    neighborhoods: ["Downtown", "Laclede's Landing"]
  },
  "forest-park": {
    label: "Forest Park",
    summaryLabel: "around Forest Park",
    neighborhoods: ["Forest Park", "Central West End"]
  },
  "south-city": {
    label: "Tower Grove/South City",
    summaryLabel: "Tower Grove and South City",
    neighborhoods: ["Tower Grove", "South City", "Shaw", "Cherokee", "Soulard", "The Grove"]
  },
  "grand-center": {
    label: "Grand Center",
    summaryLabel: "Grand Center",
    neighborhoods: ["Grand Center"]
  },
  any: {
    label: "Any area",
    summaryLabel: "across the whole backyard",
    neighborhoods: []
  }
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
    loadSavedPlan();
    bindEvents();
    updatePlan();
    renderPlannerStep();
    applyFilters();
  } catch (error) {
    els.resultCount.textContent = "Could not load event data.";
    els.emptyState.hidden = false;
    els.emptyState.textContent =
      "Open this site through a static server or deploy it so data/events.json can load.";
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
  els.plannerForm.addEventListener("change", () => {
    clearShareStatus();
    updatePlan();
    savePlanPreferences();
  });

  els.applyPlan.addEventListener("click", applyPlanToFilters);
  els.sharePlan.addEventListener("click", shareCurrentPlan);
  els.resetPlan.addEventListener("click", resetPlanner);
  els.closePlanner.addEventListener("click", closeOnboardingModal);
  els.plannerBack.addEventListener("click", () => setPlannerStep(state.currentPlannerStep - 1));
  els.plannerNext.addEventListener("click", () => setPlannerStep(state.currentPlannerStep + 1));

  els.plannerModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-planner]")) {
      closeOnboardingModal();
    }
  });

  els.openPlannerLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openOnboardingModal(event.currentTarget);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("onboarding-open")) return;

    if (event.key === "Escape") {
      closeOnboardingModal();
      return;
    }

    if (event.key === "Tab") {
      trapPlannerFocus(event);
    }
  });

  els.filters.addEventListener("input", applyFilters);
  els.filters.addEventListener("change", applyFilters);

  els.reset.addEventListener("click", resetDirectoryFilters);
  els.clearPlanFilter.addEventListener("click", () => {
    state.activePlanFilter = null;
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
    if (document.body.classList.contains("onboarding-open")) {
      closeOnboardingModal();
    }
    focusEvent(mini.dataset.focusEvent);
  });
}

function openOnboardingModal(trigger) {
  state.plannerReturnFocus = trigger || document.activeElement;
  setPlannerStep(0, { focus: false });
  els.plannerModal.hidden = false;
  document.body.classList.add("onboarding-open");
  window.setTimeout(focusCurrentPlannerStep, 40);
}

function closeOnboardingModal() {
  document.body.classList.remove("onboarding-open");
  els.plannerModal.hidden = true;
  state.plannerReturnFocus?.focus?.({ preventScroll: true });
  state.plannerReturnFocus = null;
}

function setPlannerStep(stepIndex, { focus = true } = {}) {
  state.currentPlannerStep = Math.max(0, Math.min(stepIndex, plannerSteps.length - 1));
  renderPlannerStep();
  if (focus && document.body.classList.contains("onboarding-open")) {
    window.setTimeout(focusCurrentPlannerStep, 20);
  }
}

function renderPlannerStep() {
  const activeStep = plannerSteps[state.currentPlannerStep];

  document.querySelectorAll(".onboarding-step").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.step === activeStep);
  });

  updateStepper();
  updatePlannerControls();
}

function updatePlannerControls() {
  const activeStep = plannerSteps[state.currentPlannerStep];
  const isResultsStep = activeStep === "results";

  els.plannerBack.disabled = state.currentPlannerStep === 0;
  els.plannerNext.hidden = isResultsStep;
  els.applyPlan.hidden = !isResultsStep;
  els.plannerNext.textContent = activeStep === "area" ? "See picks" : "Next";
  els.plannerStepLabel.textContent = plannerStepLabels[activeStep];
  els.plannerProgressBar.style.width = `${((state.currentPlannerStep + 1) / plannerSteps.length) * 100}%`;
}

function focusCurrentPlannerStep() {
  const activeStep = plannerSteps[state.currentPlannerStep];
  const activePanel = document.querySelector(".onboarding-step.is-active");
  const target =
    activeStep === "results" ? els.applyPlan :
    activePanel?.querySelector("input:checked, input, button, a") ||
    (els.applyPlan.hidden ? els.plannerNext : els.applyPlan);
  target?.focus({ preventScroll: true });
}

function trapPlannerFocus(event) {
  const focusable = getPlannerFocusableElements();
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function getPlannerFocusableElements() {
  return [...els.plannerModal.querySelectorAll("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.disabled && !element.hidden && element.offsetParent !== null);
}

function loadSavedPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || "null");
    if (!saved) return;
    setRadioValue("group", saved.group || DEFAULT_PLAN.group);
    setRadioValue("budget", saved.budget || DEFAULT_PLAN.budget);
    setRadioValue("area", saved.area || DEFAULT_PLAN.area);
    setCheckboxValues("vibe", Array.isArray(saved.vibes) ? saved.vibes : DEFAULT_PLAN.vibes);
  } catch {
    localStorage.removeItem(PLAN_STORAGE_KEY);
  }
}

function savePlanPreferences() {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(getPlanPreferences()));
  } catch {
    // Storage is optional; the planner still works without it.
  }
}

function setRadioValue(name, value) {
  const input = els.plannerForm.querySelector(`input[name="${name}"][value="${CSS.escape(value)}"]`);
  if (input) input.checked = true;
}

function setCheckboxValues(name, values) {
  els.plannerForm.querySelectorAll(`input[name="${name}"]`).forEach((input) => {
    input.checked = values.includes(input.value);
  });
}

function updatePlan() {
  updateChoiceStates();
  updateStepper();

  const preferences = getPlanPreferences();
  const picks = buildPlanRecommendations(preferences);
  state.planPicks = picks;

  els.planChip.textContent = `${budgetLabels[preferences.budget]} / ${areaProfiles[preferences.area].label}`;
  els.planSummary.textContent = getPlanSummary(preferences);
  renderPlanPicks(picks);
}

function updateChoiceStates() {
  document.querySelectorAll(".choice-card, .choice-pill").forEach((choice) => {
    const input = choice.querySelector("input");
    choice.classList.toggle("is-selected", Boolean(input && input.checked));
  });
}

function updateStepper() {
  document.querySelectorAll("[data-step-indicator]").forEach((step) => {
    const key = step.dataset.stepIndicator;
    const index = plannerSteps.indexOf(key);
    step.classList.toggle("is-complete", index >= 0 && index < state.currentPlannerStep);
    step.classList.toggle("is-active", index === state.currentPlannerStep);
  });
}

function getPlanPreferences() {
  const data = new FormData(els.plannerForm);
  const group = data.get("group") || DEFAULT_PLAN.group;
  const budget = data.get("budget") || DEFAULT_PLAN.budget;
  const area = data.get("area") || DEFAULT_PLAN.area;
  const vibes = data.getAll("vibe");

  return {
    group,
    budget,
    area,
    vibes,
    neighborhoods: areaProfiles[area]?.neighborhoods || []
  };
}

function buildPlanRecommendations(preferences) {
  const today = startOfDay(new Date());
  const futureEvents = state.events.filter((event) => startOfDay(event.end) >= today);
  const source = futureEvents.length >= 3 ? futureEvents : state.events;
  let candidates = source.filter((event) => {
    return matchesPlanBudget(event, preferences) && matchesPlanArea(event, preferences);
  });

  if (candidates.length < 3) {
    candidates = source.filter((event) => matchesPlanBudget(event, preferences));
  }

  if (candidates.length < 3) {
    candidates = source;
  }

  return candidates
    .map((event) => ({ event, score: scorePlanEvent(event, preferences, today) }))
    .sort((a, b) => {
      return b.score - a.score || a.event.start - b.event.start || a.event.title.localeCompare(b.event.title);
    })
    .slice(0, 3)
    .map(({ event }) => event);
}

function scorePlanEvent(event, preferences, today) {
  const group = groupProfiles[preferences.group] || groupProfiles[DEFAULT_PLAN.group];
  const tags = new Set(event.goodFor || []);
  let score = 0;

  if (preferences.vibes.includes(event.category)) score += 12;
  preferences.vibes.forEach((vibe) => {
    if (tags.has(vibe)) score += 3;
  });

  group.tags.forEach((tag) => {
    if (tags.has(tag)) score += 7;
  });

  if (group.categories.includes(event.category)) score += 3;
  if (matchesPlanArea(event, preferences)) score += 5;
  if (matchesPlanBudget(event, preferences)) score += 4;
  if (event.featured) score += 2;
  if (event.hiddenGem) score += 1;
  if (event.status === "source-confirmed") score += 1;

  const daysAway = Math.round((startOfDay(event.start) - today) / 86400000);
  if (daysAway >= 0 && daysAway <= 14) score += 2;
  if (daysAway > 45) score -= 0.75;

  return score;
}

function matchesPlanBudget(event, preferences) {
  if (preferences.budget === "free") return event.priceMin === 0;
  if (preferences.budget === "under15") return event.priceMin <= 15;
  return true;
}

function matchesPlanArea(event, preferences) {
  if (!preferences.neighborhoods.length) return true;
  return preferences.neighborhoods.includes(event.neighborhood);
}

function matchesPlanVibe(event, preferences) {
  if (!preferences.vibes.length) return true;
  const tags = new Set(event.goodFor || []);
  return preferences.vibes.includes(event.category) || preferences.vibes.some((vibe) => tags.has(vibe));
}

function getPlanSummary(preferences) {
  const group = groupProfiles[preferences.group]?.label || "your group";
  const budget = budgetLabels[preferences.budget].toLowerCase();
  const vibe = preferences.vibes.length
    ? preferences.vibes.map((item) => categoryLabels[item] || toTitle(item)).join(", ")
    : "open-vibe";
  const area = areaProfiles[preferences.area].summaryLabel;

  return `For ${group}, ${budget}, ${vibe.toLowerCase()}, ${area}. Starter picks are source-linked where possible.`;
}

function renderPlanPicks(picks) {
  els.planPicks.innerHTML = "";

  if (picks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "event-desc";
    empty.textContent = "No starter picks match yet. Try another area or budget.";
    els.planPicks.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  picks.forEach((event, index) => {
    const item = document.createElement("article");
    item.className = "plan-pick";
    item.innerHTML = `
      <div class="plan-pick-number">${index + 1}</div>
      <div class="plan-pick-body">
        <button type="button" data-focus-event="${escapeAttribute(event.id)}">${escapeHtml(event.title)}</button>
        <span>${formatDateRange(event)} / ${escapeHtml(event.neighborhood)} / ${escapeHtml(event.priceLabel)}</span>
        <small>${escapeHtml(event.whyGo)}</small>
      </div>
    `;
    fragment.append(item);
  });

  els.planPicks.append(fragment);
}

function applyPlanToFilters() {
  const preferences = getPlanPreferences();
  state.activePlanFilter = clonePlanPreferences(preferences);
  state.selectedTags.clear();
  savePlanPreferences();
  closeOnboardingModal();

  els.search.value = "";
  els.price.value = preferences.budget === "free" ? "free" : preferences.budget === "under15" ? "under15" : "all";
  els.category.value = preferences.vibes.length === 1 ? preferences.vibes[0] : "all";
  els.neighborhood.value = getSingleNeighborhoodValue(preferences);
  els.dateFilter.value = "all";

  document.querySelectorAll(".tag-button").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });

  applyFilters();
  document.querySelector("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function clonePlanPreferences(preferences) {
  return {
    group: preferences.group,
    budget: preferences.budget,
    area: preferences.area,
    vibes: [...preferences.vibes],
    neighborhoods: [...preferences.neighborhoods]
  };
}

function getSingleNeighborhoodValue(preferences) {
  if (preferences.neighborhoods.length !== 1) return "all";
  const neighborhood = preferences.neighborhoods[0];
  return [...els.neighborhood.options].some((option) => option.value === neighborhood) ? neighborhood : "all";
}

async function shareCurrentPlan() {
  const text = getPlanShareText();
  clearShareStatus();

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Your STL Backyard plan",
        text
      });
      els.shareStatus.textContent = "Plan shared.";
      return;
    }

    await copyText(text);
    els.shareStatus.textContent = "Plan copied.";
  } catch (error) {
    if (error.name === "AbortError") return;
    try {
      await copyText(text);
      els.shareStatus.textContent = "Plan copied.";
    } catch {
      els.shareStatus.textContent = "Copy failed.";
    }
  }
}

function getPlanShareText() {
  const preferences = getPlanPreferences();
  const summary = getPlanSummary(preferences);
  const picks = state.planPicks
    .map((event, index) => {
      return `${index + 1}. ${event.title} - ${formatDateRange(event)}, ${event.time} at ${event.venue} (${event.neighborhood}). ${event.priceLabel}. ${event.link}`;
    })
    .join("\n");

  return `Your STL Backyard plan\n${summary}\n\n${picks}\n\nStarter data: verify details before you go.`;
}

function resetPlanner() {
  els.plannerForm.reset();
  state.activePlanFilter = null;
  localStorage.removeItem(PLAN_STORAGE_KEY);
  setPlannerStep(0, { focus: document.body.classList.contains("onboarding-open") });
  clearShareStatus();
  updatePlan();
  applyFilters();
}

function clearShareStatus() {
  els.shareStatus.textContent = "";
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
        matchesAppliedPlan(event) &&
        matchesQuery(event, query) &&
        matchesCategory(event, category) &&
        matchesPrice(event, price) &&
        matchesNeighborhood(event, neighborhood) &&
        matchesDate(event, dateFilter) &&
        matchesTags(event)
      );
    })
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));

  renderActivePlanNote();
  renderEvents(state.filteredEvents);
  renderCuratedSections();
  renderPins();
  renderMapSummary();
}

function matchesAppliedPlan(event) {
  if (!state.activePlanFilter) return true;
  return (
    matchesPlanBudget(event, state.activePlanFilter) &&
    matchesPlanArea(event, state.activePlanFilter) &&
    matchesPlanVibe(event, state.activePlanFilter)
  );
}

function renderActivePlanNote() {
  if (!state.activePlanFilter) {
    els.activePlanNote.hidden = true;
    els.activePlanText.textContent = "";
    return;
  }

  const preferences = state.activePlanFilter;
  const group = groupProfiles[preferences.group]?.label || "your group";
  const vibe = preferences.vibes.length
    ? preferences.vibes.map((item) => categoryLabels[item] || toTitle(item)).join(", ")
    : "all vibes";

  els.activePlanText.textContent =
    `Plan filter active: ${group}, ${budgetLabels[preferences.budget]}, ${vibe}, ${areaProfiles[preferences.area].label}`;
  els.activePlanNote.hidden = false;
}

function resetDirectoryFilters() {
  els.filters.reset();
  state.selectedTags.clear();
  state.activeNeighborhood = "all";
  state.activePlanFilter = null;
  els.neighborhood.value = "all";
  document.querySelectorAll(".tag-button").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  applyFilters();
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
      <div class="card-badges">
        <span class="status-badge">${event.status === "source-confirmed" ? "Source-linked" : "Verify details"}</span>
        ${event.featured ? '<span class="feature-badge">Backyard pick</span>' : ""}
      </div>
    </div>
    <div>
      <div class="meta-row">
        <span>${formatDateRange(event)}</span>
        <span class="meta-dot"></span>
        <span>${escapeHtml(event.time)}</span>
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
      <a href="${escapeAttribute(event.link)}" target="_blank" rel="noreferrer">Official/source</a>
      <button class="copy-button" type="button" data-copy="${escapeAttribute(event.id)}" aria-label="Copy ${escapeAttribute(event.title)} blurb">Copy blurb</button>
    </div>
    <p class="source-row">Source: <a href="${escapeAttribute(event.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(event.sourceName)}</a></p>
  `;

  article.querySelector(".copy-button").addEventListener("click", async (clickEvent) => {
    const button = clickEvent.currentTarget;
    const text =
      `${event.title} - ${formatDateRange(event)}, ${event.time} at ${event.venue} (${event.neighborhood}). ${event.priceLabel}. ${event.link}`;
    try {
      await copyText(text);
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
      <button type="button" data-focus-event="${escapeAttribute(event.id)}">${escapeHtml(event.title)}</button>
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
    pin.className = `pin${isActiveMapNeighborhood(neighborhood) ? " active" : ""}`;
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

function isActiveMapNeighborhood(neighborhood) {
  if (state.activeNeighborhood === neighborhood) return true;
  if (!state.activePlanFilter || state.activePlanFilter.area === "any") return false;
  return state.activePlanFilter.neighborhoods.includes(neighborhood);
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
      <small>${count} ${count === 1 ? "pick" : "picks"}</small>
    `;
    els.mapSummary.append(row);
  });
}

function setNeighborhood(neighborhood) {
  els.neighborhood.value = neighborhood;
  state.activeNeighborhood = neighborhood;
  state.activePlanFilter = null;
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
  state.activePlanFilter = null;
  document.querySelectorAll(".tag-button").forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  applyFilters();

  const card = document.getElementById(`event-${id}`);
  if (!card) return;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.animate(
    [
      { boxShadow: "0 0 0 0 rgba(229, 179, 59, 0.0)" },
      { boxShadow: "0 0 0 8px rgba(229, 179, 59, 0.45)" },
      { boxShadow: "6px 6px 0 rgba(24, 33, 31, 0.08)" }
    ],
    { duration: 1200, easing: "ease-out" }
  );
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-999px";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy command failed");
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
