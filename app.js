(() => {
  "use strict";

  const MAX_GUESSES = 6;
  const DAY_MS = 86_400_000;
  const EPOCH = Date.UTC(2026, 0, 1);
  const FRAME_HOST = "https://framed.wtf";
  const STORAGE_KEY = "framed-local-stats-v1";
  const CATALOG_PAGE_SIZE = 50;

  const elements = {
    answerTitle: document.querySelector("#answerTitle"),
    backdrop: document.querySelector("#backdrop"),
    catalog: {
      count: document.querySelector("#catalogCount"),
      country: document.querySelector("#countryFilter"),
      era: document.querySelector("#eraFilter"),
      genre: document.querySelector("#genreFilter"),
      list: document.querySelector("#catalogList"),
      movement: document.querySelector("#movementFilter"),
      next: document.querySelector("#catalogNext"),
      page: document.querySelector("#catalogPage"),
      previous: document.querySelector("#catalogPrevious"),
    },
    challengeTitle: document.querySelector("#challengeTitle"),
    drawer: document.querySelector("#drawer"),
    frameError: document.querySelector("#frameError"),
    frameLoading: document.querySelector("#frameLoading"),
    frameStage: document.querySelector("#frameStage"),
    frameTabs: document.querySelector("#frameTabs"),
    guessForm: document.querySelector("#guessForm"),
    guessHistory: document.querySelector("#guessHistory"),
    guessInput: document.querySelector("#guessInput"),
    headerMovieCount: document.querySelector("#headerMovieCount"),
    menuButton: document.querySelector("#menuButton"),
    modeTag: document.querySelector("#modeTag"),
    movieFrame: document.querySelector("#movieFrame"),
    remainingCount: document.querySelector("#remainingCount"),
    resultEyebrow: document.querySelector("#resultEyebrow"),
    resultOverlay: document.querySelector("#resultOverlay"),
    shareButton: document.querySelector("#shareButton"),
    stats: {
      played: document.querySelector("#statPlayed"),
      wins: document.querySelector("#statWins"),
      rate: document.querySelector("#statRate"),
      streak: document.querySelector("#statStreak"),
    },
    submitButton: document.querySelector("#submitButton"),
    suggestions: document.querySelector("#suggestions"),
    toast: document.querySelector("#toast"),
  };

  const state = {
    movie: null,
    mode: "daily",
    currentFrame: 0,
    viewedFrame: 0,
    guesses: [],
    ended: false,
    selectedMovie: null,
    activeSuggestion: -1,
    suggestionResults: [],
    imageAttempt: 0,
    catalogPage: 0,
    navigationPool: null,
  };

  const normalize = (value) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  const searchableMovies = MOVIES.map((movie) => {
    const answerKeys = [...new Set([
      movie.title,
      movie.originalTitle,
      ...(movie.aliases || []),
    ].filter(Boolean).map(normalize))];
    const displayTitle = movie.year ? `${movie.title} (${movie.year})` : movie.title;
    return {
      ...movie,
      answerKeys,
      displayTitle,
      normalized: normalize(`${answerKeys.join(" ")} ${movie.year || ""}`),
    };
  });

  function getDailyIndex() {
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return ((Math.floor((todayUtc - EPOCH) / DAY_MS) % MOVIES.length) + MOVIES.length) % MOVIES.length;
  }

  function getMovieFromUrl() {
    const params = new URLSearchParams(location.search);
    const requested = Number(params.get("film"));
    if (Number.isInteger(requested) && requested >= 1 && requested <= MOVIES.length) {
      return { movie: MOVIES[requested - 1], mode: "random" };
    }
    return { movie: MOVIES[getDailyIndex()], mode: "daily" };
  }

  function setUrl(movie, mode) {
    const url = new URL(location.href);
    if (mode === "daily") url.searchParams.delete("film");
    else url.searchParams.set("film", movie.index);
    history.replaceState(null, "", url);
  }

  function frameUrl(movie, frame, alternate = false) {
    if (movie.frames?.length >= MAX_GUESSES) return movie.frames[frame];
    if (movie.source !== "framed") return movie.image;
    const preferred = movie.id < 33 ? ".jpg" : ".jpeg";
    const extension = alternate ? (preferred === ".jpg" ? ".jpeg" : ".jpg") : preferred;
    return `${FRAME_HOST}/images/${movie.id}/${String(frame + 1).padStart(3, "0")}${extension}`;
  }

  function loadFrame(frame) {
    state.viewedFrame = frame;
    state.imageAttempt = 0;
    elements.movieFrame.classList.remove("is-ready");
    elements.frameLoading.hidden = false;
    elements.frameError.hidden = true;
    const source = frameUrl(state.movie, frame);
    if (elements.movieFrame.src === source && elements.movieFrame.complete && elements.movieFrame.naturalWidth) {
      elements.frameLoading.hidden = true;
      elements.movieFrame.classList.add("is-ready");
    } else elements.movieFrame.src = source;
    renderTabs();
  }

  elements.movieFrame.addEventListener("load", () => {
    elements.frameLoading.hidden = true;
    elements.frameError.hidden = true;
    elements.movieFrame.classList.add("is-ready");
  });

  elements.movieFrame.addEventListener("error", () => {
    if (state.movie.source === "framed" && state.imageAttempt === 0) {
      state.imageAttempt = 1;
      elements.movieFrame.src = frameUrl(state.movie, state.viewedFrame, true);
      return;
    }
    if (state.movie.source === "framed" && state.imageAttempt === 1 && state.movie.image) {
      state.imageAttempt = 2;
      elements.movieFrame.src = state.movie.image;
      return;
    }
    elements.frameLoading.hidden = true;
    elements.movieFrame.classList.remove("is-ready");
    elements.frameError.hidden = false;
  });

  function renderTabs() {
    elements.frameTabs.replaceChildren();
    for (let index = 0; index < MAX_GUESSES; index += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "frame-tab";
      button.textContent = index + 1;
      const isUnlocked = state.ended || index <= state.currentFrame;
      button.disabled = !isUnlocked;
      if (isUnlocked) button.classList.add("is-revealed");
      if (index === state.viewedFrame) button.classList.add("is-current");
      if (index < state.guesses.length) button.classList.add(state.guesses[index].correct ? "is-correct" : "is-wrong");
      button.addEventListener("click", () => {
        if (state.ended || index <= state.currentFrame) loadFrame(index);
      });
      elements.frameTabs.append(button);
    }
  }

  function renderHistory() {
    elements.guessHistory.replaceChildren();
    state.guesses.forEach((guess) => {
      const row = document.createElement("div");
      row.className = `guess-row${guess.correct ? " is-correct" : ""}${guess.skipped ? " is-skip" : ""}`;
      const marker = document.createElement("span");
      marker.textContent = guess.correct ? "✓" : "×";
      row.append(marker, document.createTextNode(guess.skipped ? "Passé" : guess.title));
      elements.guessHistory.append(row);
    });
  }

  function getStats() {
    try {
      return { played: 0, wins: 0, streak: 0, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch {
      return { played: 0, wins: 0, streak: 0 };
    }
  }

  function renderStats() {
    const stats = getStats();
    elements.stats.played.textContent = stats.played;
    elements.stats.wins.textContent = stats.wins;
    elements.stats.rate.textContent = stats.played ? `${Math.round((stats.wins / stats.played) * 100)}%` : "0%";
    elements.stats.streak.textContent = stats.streak;
  }

  function saveResult(won) {
    const stats = getStats();
    stats.played += 1;
    if (won) {
      stats.wins += 1;
      stats.streak += 1;
    } else stats.streak = 0;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    renderStats();
  }

  function finish(won) {
    state.ended = true;
    state.currentFrame = MAX_GUESSES - 1;
    elements.guessInput.disabled = true;
    elements.submitButton.disabled = true;
    elements.guessForm.hidden = true;
    elements.resultEyebrow.textContent = won ? "BIEN JOUÉ" : "C'ÉTAIT";
    const director = String(state.movie.director || "").trim();
    elements.answerTitle.textContent = director
      ? `${state.movie.title} — ${director}`
      : state.movie.title;
    elements.resultOverlay.classList.toggle("is-lost", !won);
    elements.resultOverlay.hidden = false;
    renderTabs();
    saveResult(won);
  }

  function resolveTypedMovie(typed) {
    const normalizedTyped = normalize(typed);
    if (!normalizedTyped) return null;
    if (state.selectedMovie) {
      const selectedValues = [state.selectedMovie.displayTitle, ...state.selectedMovie.answerKeys];
      if (selectedValues.some((value) => normalize(value) === normalizedTyped)) return state.selectedMovie;
    }

    const yearMatch = typed.match(/\b(?:18|19|20)\d{2}\b/);
    const typedWithoutYear = normalize(typed.replace(/\b(?:18|19|20)\d{2}\b/, ""));
    const exactMatches = searchableMovies.filter((movie) => {
      if (!movie.answerKeys.includes(yearMatch ? typedWithoutYear : normalizedTyped)) return false;
      return !yearMatch || movie.year === Number(yearMatch[0]);
    });
    return exactMatches.length === 1 ? exactMatches[0] : null;
  }

  function submitGuess() {
    if (state.ended) return;
    const typed = elements.guessInput.value.trim();
    const selected = resolveTypedMovie(typed);
    const skipped = !typed;
    const correct = Boolean(selected && selected.index === state.movie.index);

    if (typed && !selected) {
      showToast("Choisissez un film dans la liste");
      return;
    }

    state.guesses.push({ title: selected?.title || "Passé", correct, skipped });
    elements.guessInput.value = "";
    state.selectedMovie = null;
    closeSuggestions();
    renderHistory();
    elements.remainingCount.textContent = Math.max(0, MAX_GUESSES - state.guesses.length);

    if (correct) {
      state.currentFrame = Math.max(state.currentFrame, state.guesses.length - 1);
      renderTabs();
      finish(true);
      return;
    }

    if (state.guesses.length >= MAX_GUESSES) {
      state.currentFrame = MAX_GUESSES - 1;
      loadFrame(state.currentFrame);
      window.setTimeout(() => finish(false), 350);
      return;
    }

    state.currentFrame = state.guesses.length;
    loadFrame(state.currentFrame);
    elements.guessInput.focus();
  }

  function rankMovies(query) {
    const normalized = normalize(query);
    if (!normalized) return [];
    const tokens = normalized.split(" ");
    return searchableMovies
      .filter((movie) => tokens.every((token) => movie.normalized.includes(token)))
      .sort((a, b) => {
        const aStart = a.normalized.startsWith(normalized) ? 0 : 1;
        const bStart = b.normalized.startsWith(normalized) ? 0 : 1;
        return aStart - bStart
          || a.title.length - b.title.length
          || a.title.localeCompare(b.title)
          || (b.year || 0) - (a.year || 0);
      })
      .slice(0, 8);
  }

  function renderSuggestions() {
    const results = rankMovies(elements.guessInput.value);
    elements.suggestions.replaceChildren();
    state.activeSuggestion = -1;
    state.suggestionResults = results;
    elements.guessInput.removeAttribute("aria-activedescendant");
    if (!results.length) {
      closeSuggestions();
      return;
    }
    results.forEach((movie, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestion";
      button.role = "option";
      button.id = `suggestion-${index}`;
      button.setAttribute("aria-selected", "false");
      button.textContent = movie.displayTitle;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        selectSuggestion(movie);
      });
      button.addEventListener("mouseenter", () => setActiveSuggestion(index));
      elements.suggestions.append(button);
    });
    elements.suggestions.hidden = false;
    elements.guessInput.setAttribute("aria-expanded", "true");
  }

  function selectSuggestion(movie) {
    elements.guessInput.value = movie.displayTitle;
    state.selectedMovie = movie;
    closeSuggestions();
    elements.guessInput.focus();
  }

  function closeSuggestions() {
    elements.suggestions.hidden = true;
    state.activeSuggestion = -1;
    state.suggestionResults = [];
    elements.guessInput.setAttribute("aria-expanded", "false");
    elements.guessInput.removeAttribute("aria-activedescendant");
  }

  function setActiveSuggestion(index) {
    const choices = [...elements.suggestions.querySelectorAll(".suggestion")];
    if (!choices.length) return;
    state.activeSuggestion = ((index % choices.length) + choices.length) % choices.length;
    choices.forEach((choice, choiceIndex) => {
      const active = choiceIndex === state.activeSuggestion;
      choice.classList.toggle("is-active", active);
      choice.setAttribute("aria-selected", String(active));
    });
    const activeChoice = choices[state.activeSuggestion];
    elements.guessInput.setAttribute("aria-activedescendant", activeChoice.id);
    activeChoice.scrollIntoView({ block: "nearest" });
  }

  function navigateSuggestions(event) {
    const isDown = event.key === "ArrowDown" || event.key === "Down" || event.code === "ArrowDown";
    const isUp = event.key === "ArrowUp" || event.key === "Up" || event.code === "ArrowUp";
    if (isDown || isUp) {
      if (elements.suggestions.hidden && elements.guessInput.value.trim()) renderSuggestions();
      const choices = [...elements.suggestions.querySelectorAll(".suggestion")];
      if (!choices.length || elements.suggestions.hidden) return;
      event.preventDefault();
      const nextIndex = isDown
        ? state.activeSuggestion + 1
        : (state.activeSuggestion < 0 ? choices.length - 1 : state.activeSuggestion - 1);
      setActiveSuggestion(nextIndex);
    } else if (event.key === "Enter" && state.activeSuggestion >= 0) {
      event.preventDefault();
      const movie = state.suggestionResults[state.activeSuggestion];
      if (movie) selectSuggestion(movie);
    } else if (event.key === "Escape") closeSuggestions();
  }

  function startGame(movie, mode) {
    state.movie = movie;
    state.mode = mode;
    state.currentFrame = 0;
    state.viewedFrame = 0;
    state.guesses = [];
    state.ended = false;
    state.selectedMovie = null;
    elements.challengeTitle.textContent = mode === "daily" ? `FILM DU JOUR · #${movie.index}` : `CARNET · #${movie.index}`;
    elements.modeTag.textContent = mode === "daily" ? "DU JOUR" : "ARCHIVE";
    elements.resultOverlay.hidden = true;
    elements.resultOverlay.classList.remove("is-lost");
    elements.guessForm.hidden = false;
    elements.guessInput.disabled = false;
    elements.submitButton.disabled = false;
    elements.guessInput.value = "";
    elements.remainingCount.textContent = MAX_GUESSES;
    renderHistory();
    setUrl(movie, mode);
    loadFrame(0);
    closeDrawer();
  }

  function startDaily() {
    state.navigationPool = null;
    startGame(MOVIES[getDailyIndex()], "daily");
  }

  function startRandom() {
    state.navigationPool = null;
    let movie = MOVIES[Math.floor(Math.random() * MOVIES.length)];
    if (movie.index === state.movie?.index) movie = MOVIES[movie.index % MOVIES.length];
    startGame(movie, "random");
  }

  function startAdjacent(direction) {
    const pool = state.navigationPool?.length ? state.navigationPool : MOVIES;
    const current = pool.findIndex((movie) => movie.index === state.movie.index);
    const position = current >= 0 ? current : 0;
    const nextIndex = (position + direction + pool.length) % pool.length;
    startGame(pool[nextIndex], "random");
  }

  function startAnother() {
    if (state.navigationPool?.length) startAdjacent(1);
    else startRandom();
  }

  function appendFilterOptions(select, values) {
    [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "fr"))
      .forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.append(option);
      });
  }

  function initializeCatalog() {
    appendFilterOptions(elements.catalog.genre, MOVIES.flatMap((movie) => movie.genres || []));
    appendFilterOptions(elements.catalog.country, MOVIES.flatMap((movie) => movie.countries || []));
    appendFilterOptions(elements.catalog.era, MOVIES.map((movie) => movie.era));
    appendFilterOptions(elements.catalog.movement, MOVIES.map((movie) => movie.movement));
  }

  function filteredCatalog() {
    const genre = elements.catalog.genre.value;
    const country = elements.catalog.country.value;
    const era = elements.catalog.era.value;
    const movement = elements.catalog.movement.value;
    return MOVIES.filter((movie) => {
      return (!genre || movie.genres?.includes(genre))
        && (!country || movie.countries?.includes(country))
        && (!era || movie.era === era)
        && (!movement || movie.movement === movement);
    });
  }

  function renderCatalog(resetPage = false) {
    if (resetPage) state.catalogPage = 0;
    const results = filteredCatalog();
    const totalPages = Math.max(1, Math.ceil(results.length / CATALOG_PAGE_SIZE));
    state.catalogPage = Math.min(state.catalogPage, totalPages - 1);
    const start = state.catalogPage * CATALOG_PAGE_SIZE;
    const page = results.slice(start, start + CATALOG_PAGE_SIZE);
    elements.catalog.list.replaceChildren();

    if (!page.length) {
      const empty = document.createElement("div");
      empty.className = "catalog-empty";
      empty.textContent = "Aucun film ne correspond à ces filtres.";
      elements.catalog.list.append(empty);
    }

    page.forEach((movie) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "catalog-item";
      const number = document.createElement("span");
      number.className = "catalog-item__number";
      number.textContent = `#${String(movie.index).padStart(4, "0")}`;
      const content = document.createElement("span");
      const title = document.createElement("span");
      title.className = "catalog-item__title";
      title.textContent = "FILM MYSTÈRE";
      const meta = document.createElement("span");
      meta.className = "catalog-item__meta";
      const details = [movie.year, movie.genres?.[0], movie.countries?.[0]].filter(Boolean).join(" · ");
      meta.textContent = details;
      if (movie.movement) {
        const movement = document.createElement("span");
        movement.className = "catalog-item__movement";
        movement.textContent = ` · ${movie.movement}`;
        meta.append(movement);
      }
      content.append(title, meta);
      const arrow = document.createElement("span");
      arrow.className = "catalog-item__arrow";
      arrow.textContent = "→";
      button.append(number, content, arrow);
      button.addEventListener("click", () => {
        state.navigationPool = results.slice();
        document.querySelector("#catalogModal").close();
        startGame(movie, "random");
      });
      elements.catalog.list.append(button);
    });

    elements.catalog.count.textContent = `${results.length.toLocaleString("fr-FR")} film${results.length > 1 ? "s" : ""}`;
    elements.catalog.page.textContent = `PAGE ${state.catalogPage + 1} / ${totalPages}`;
    elements.catalog.previous.disabled = state.catalogPage === 0;
    elements.catalog.next.disabled = state.catalogPage >= totalPages - 1;
    elements.catalog.list.scrollTop = 0;
  }

  function clearCatalogFilters() {
    elements.catalog.genre.value = "";
    elements.catalog.country.value = "";
    elements.catalog.era.value = "";
    elements.catalog.movement.value = "";
    renderCatalog(true);
  }

  function openDrawer() {
    elements.drawer.classList.add("is-open");
    elements.drawer.setAttribute("aria-hidden", "false");
    elements.backdrop.hidden = false;
  }

  function closeDrawer() {
    elements.drawer.classList.remove("is-open");
    elements.drawer.setAttribute("aria-hidden", "true");
    elements.backdrop.hidden = true;
  }

  function openModal(id) {
    closeDrawer();
    if (id === "statsModal") renderStats();
    if (id === "catalogModal") renderCatalog();
    const modal = document.getElementById(id);
    if (modal && !modal.open) modal.showModal();
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
  }

  async function shareResult() {
    const won = state.guesses.some((guess) => guess.correct);
    const squares = Array.from({ length: MAX_GUESSES }, (_, index) => {
      if (index >= state.guesses.length) return "⬛";
      return state.guesses[index].correct ? "🟩" : "🟥";
    }).join("");
    const label = state.mode === "daily" ? `du jour #${state.movie.index}` : `archive #${state.movie.index}`;
    const text = `Framed Local ${label}\n🎬 ${squares}\n${won ? `Trouvé en ${state.guesses.length}/6` : "Pas trouvé"}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Résultat copié !");
    } catch {
      showToast("Copie impossible dans ce navigateur");
    }
  }

  elements.guessForm.addEventListener("submit", (event) => { event.preventDefault(); submitGuess(); });
  elements.guessInput.addEventListener("input", () => { state.selectedMovie = null; renderSuggestions(); });
  elements.guessInput.addEventListener("keydown", navigateSuggestions);
  elements.guessInput.addEventListener("blur", () => window.setTimeout(closeSuggestions, 120));
  elements.menuButton.addEventListener("click", openDrawer);
  elements.backdrop.addEventListener("click", closeDrawer);
  elements.shareButton.addEventListener("click", shareResult);
  document.querySelector("#nextButton").addEventListener("click", startAnother);
  document.querySelector("#randomButton").addEventListener("click", startRandom);
  document.querySelector("#randomIcon").addEventListener("click", startRandom);
  document.querySelector("#catalogButton").addEventListener("click", () => openModal("catalogModal"));
  document.querySelector("#dailyButton").addEventListener("click", startDaily);
  document.querySelector("#brandButton").addEventListener("click", startDaily);
  document.querySelector("#previousMovie").addEventListener("click", () => startAdjacent(-1));
  document.querySelector("#nextMovieHeader").addEventListener("click", () => startAdjacent(1));

  document.querySelector("#jumpForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const number = Number(document.querySelector("#jumpInput").value);
    if (!Number.isInteger(number) || number < 1 || number > MOVIES.length) {
      showToast(`Choisissez un numéro entre 1 et ${MOVIES.length}`);
      return;
    }
    state.navigationPool = null;
    document.querySelector("#catalogModal").close();
    startGame(MOVIES[number - 1], "random");
  });
  [elements.catalog.genre, elements.catalog.country, elements.catalog.era, elements.catalog.movement]
    .forEach((control) => control.addEventListener("input", () => renderCatalog(true)));
  elements.catalog.previous.addEventListener("click", () => { state.catalogPage -= 1; renderCatalog(); });
  elements.catalog.next.addEventListener("click", () => { state.catalogPage += 1; renderCatalog(); });
  document.querySelector("#clearFilters").addEventListener("click", clearCatalogFilters);

  document.querySelectorAll("[data-open]").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.open)));
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => {
    const dialog = button.closest("dialog");
    if (dialog) dialog.close();
    else closeDrawer();
  }));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  }));
  window.addEventListener("popstate", () => {
    const selection = getMovieFromUrl();
    startGame(selection.movie, selection.mode);
  });

  initializeCatalog();
  elements.headerMovieCount.textContent = `${MOVIES.length.toLocaleString("fr-FR")} FILMS`;
  renderStats();
  const selection = getMovieFromUrl();
  startGame(selection.movie, selection.mode);
  if (location.hash === "#catalog") openModal("catalogModal");
})();
