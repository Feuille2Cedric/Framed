(() => {
  "use strict";

  const FRAME_GUESSES = 6;
  const POSTER_GUESSES = 4;
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
    catalogEyebrow: document.querySelector("#catalogEyebrow"),
    challengeCount: document.querySelector("#challengeCount"),
    challengeTitle: document.querySelector("#challengeTitle"),
    drawer: document.querySelector("#drawer"),
    frameError: document.querySelector("#frameError"),
    frameErrorText: document.querySelector("#frameErrorText"),
    frameLoading: document.querySelector("#frameLoading"),
    frameStage: document.querySelector("#frameStage"),
    frameTabs: document.querySelector("#frameTabs"),
    framesGameButton: document.querySelector("#framesGameButton"),
    guessForm: document.querySelector("#guessForm"),
    guessHistory: document.querySelector("#guessHistory"),
    guessInput: document.querySelector("#guessInput"),
    headerMovieCount: document.querySelector("#headerMovieCount"),
    menuButton: document.querySelector("#menuButton"),
    modeTag: document.querySelector("#modeTag"),
    movieFrame: document.querySelector("#movieFrame"),
    posterGameButton: document.querySelector("#posterGameButton"),
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
    gameType: "frames",
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

  const maxGuesses = () => state.gameType === "poster" ? POSTER_GUESSES : FRAME_GUESSES;

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

  const moviesByImdbId = new Map(MOVIES.map((movie) => [movie.imdbId, movie]));
  const posterMovies = POSTER_MOVIE_IDS.map((id) => moviesByImdbId.get(id)).filter(Boolean);
  const posterMovieIds = new Set(posterMovies.map((movie) => movie.imdbId));
  const moviesForGame = (gameType = state.gameType) => gameType === "poster" ? posterMovies : MOVIES;

  function getDailyIndex(pool = moviesForGame()) {
    const now = new Date();
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return ((Math.floor((todayUtc - EPOCH) / DAY_MS) % pool.length) + pool.length) % pool.length;
  }

  function getMovieFromUrl() {
    const params = new URLSearchParams(location.search);
    const requested = Number(params.get("film"));
    const gameType = params.get("jeu") === "affiche" ? "poster" : "frames";
    const requestedMovie = Number.isInteger(requested) ? MOVIES[requested - 1] : null;
    const allowed = requestedMovie && (gameType === "frames" || posterMovieIds.has(requestedMovie.imdbId));
    if (allowed) {
      return { movie: MOVIES[requested - 1], mode: "random", gameType };
    }
    const pool = moviesForGame(gameType);
    return { movie: pool[getDailyIndex(pool)], mode: "daily", gameType };
  }

  function setUrl(movie, mode) {
    const url = new URL(location.href);
    if (mode === "daily") url.searchParams.delete("film");
    else url.searchParams.set("film", movie.index);
    if (state.gameType === "poster") url.searchParams.set("jeu", "affiche");
    else url.searchParams.delete("jeu");
    history.replaceState(null, "", url);
  }

  function frameUrl(movie, frame, alternate = false) {
    if (movie.frames?.length >= FRAME_GUESSES) return movie.frames[frame];
    if (movie.source !== "framed") return movie.image;
    const preferred = movie.id < 33 ? ".jpg" : ".jpeg";
    const extension = alternate ? (preferred === ".jpg" ? ".jpeg" : ".jpg") : preferred;
    return `${FRAME_HOST}/images/${movie.id}/${String(frame + 1).padStart(3, "0")}${extension}`;
  }

  function posterUrl(movie) {
    return movie.imdbId ? `https://images.metahub.space/poster/medium/${movie.imdbId}/img` : "";
  }

  function applyPosterReveal() {
    const posterGame = state.gameType === "poster";
    elements.frameStage.classList.toggle("is-poster-game", posterGame);
    elements.frameStage.dataset.reveal = posterGame ? String(state.viewedFrame) : "0";
    elements.frameStage.classList.toggle("is-fully-revealed", posterGame && state.ended);
  }

  function loadFrame(frame) {
    state.viewedFrame = frame;
    state.imageAttempt = 0;
    elements.movieFrame.classList.remove("is-ready");
    elements.frameLoading.hidden = false;
    elements.frameError.hidden = true;
    applyPosterReveal();
    const source = state.gameType === "poster" ? posterUrl(state.movie) : frameUrl(state.movie, frame);
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
    if (state.gameType === "frames" && state.movie.source === "framed" && state.imageAttempt === 0) {
      state.imageAttempt = 1;
      elements.movieFrame.src = frameUrl(state.movie, state.viewedFrame, true);
      return;
    }
    if (state.gameType === "frames" && state.movie.source === "framed" && state.imageAttempt === 1 && state.movie.image) {
      state.imageAttempt = 2;
      elements.movieFrame.src = state.movie.image;
      return;
    }
    elements.frameLoading.hidden = true;
    elements.movieFrame.classList.remove("is-ready");
    elements.frameError.hidden = false;
    elements.frameErrorText.textContent = state.gameType === "poster"
      ? "L’affiche officielle n’est pas disponible pour le moment. Passez à un autre film."
      : "Essayez une autre frame avec les boutons ci-dessous.";
  });

  function renderTabs() {
    elements.frameTabs.replaceChildren();
    elements.frameTabs.setAttribute("aria-label", state.gameType === "poster" ? "Niveaux de netteté" : "Frames révélées");
    for (let index = 0; index < maxGuesses(); index += 1) {
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
    state.currentFrame = maxGuesses() - 1;
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
    applyPosterReveal();
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
    elements.remainingCount.textContent = Math.max(0, maxGuesses() - state.guesses.length);

    if (correct) {
      state.currentFrame = Math.max(state.currentFrame, state.guesses.length - 1);
      renderTabs();
      finish(true);
      return;
    }

    if (state.guesses.length >= maxGuesses()) {
      state.currentFrame = maxGuesses() - 1;
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

  function startGame(movie, mode, gameType = state.gameType) {
    state.movie = movie;
    state.mode = mode;
    state.gameType = gameType;
    state.currentFrame = 0;
    state.viewedFrame = 0;
    state.guesses = [];
    state.ended = false;
    state.selectedMovie = null;
    const posterGame = gameType === "poster";
    elements.challengeTitle.textContent = mode === "daily"
      ? `${posterGame ? "AFFICHE" : "FILM"} DU JOUR · #${movie.index}`
      : `${posterGame ? "AFFICHE" : "CARNET"} · #${movie.index}`;
    elements.modeTag.textContent = mode === "daily" ? "DU JOUR" : "ARCHIVE";
    elements.framesGameButton.classList.toggle("is-active", !posterGame);
    elements.posterGameButton.classList.toggle("is-active", posterGame);
    elements.framesGameButton.setAttribute("aria-pressed", String(!posterGame));
    elements.posterGameButton.setAttribute("aria-pressed", String(posterGame));
    elements.movieFrame.alt = posterGame ? "Affiche floutée du film à deviner" : "Image extraite du film à deviner";
    elements.headerMovieCount.textContent = posterGame ? `${posterMovies.length} AFFICHES` : `${MOVIES.length.toLocaleString("fr-FR")} FILMS`;
    elements.challengeCount.innerHTML = posterGame
      ? `<span>◉</span> ${posterMovies.length} FILMS INCONTOURNABLES`
      : `<span>◉</span> ${MOVIES.length.toLocaleString("fr-FR")} FILMS · MONDE ENTIER`;
    elements.resultOverlay.hidden = true;
    elements.resultOverlay.classList.remove("is-lost");
    elements.guessForm.hidden = false;
    elements.guessInput.disabled = false;
    elements.submitButton.disabled = false;
    elements.guessInput.value = "";
    elements.remainingCount.textContent = maxGuesses();
    renderHistory();
    setUrl(movie, mode);
    loadFrame(0);
    closeDrawer();
  }

  function switchGame(gameType) {
    if (gameType === state.gameType) return;
    const pool = moviesForGame(gameType);
    const currentMovie = pool.find((movie) => movie.imdbId === state.movie.imdbId);
    const target = currentMovie || (state.mode === "daily"
      ? pool[getDailyIndex(pool)]
      : pool[Math.floor(Math.random() * pool.length)]);
    state.navigationPool = null;
    startGame(target, state.mode, gameType);
    renderCatalog(true);
  }

  function startDaily() {
    state.navigationPool = null;
    const pool = moviesForGame();
    startGame(pool[getDailyIndex(pool)], "daily");
  }

  function startRandom() {
    state.navigationPool = null;
    const pool = moviesForGame();
    let movie = pool[Math.floor(Math.random() * pool.length)];
    if (movie.index === state.movie?.index) movie = pool[(pool.indexOf(movie) + 1) % pool.length];
    startGame(movie, "random");
  }

  function startAdjacent(direction) {
    const pool = state.navigationPool?.length ? state.navigationPool : moviesForGame();
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
    return moviesForGame().filter((movie) => {
      return (!genre || movie.genres?.includes(genre))
        && (!country || movie.countries?.includes(country))
        && (!era || movie.era === era)
        && (!movement || movie.movement === movement);
    });
  }

  function renderCatalog(resetPage = false) {
    if (resetPage) state.catalogPage = 0;
    const results = filteredCatalog();
    elements.catalogEyebrow.textContent = state.gameType === "poster"
      ? `${posterMovies.length} FILMS INCONTOURNABLES`
      : `${MOVIES.length.toLocaleString("fr-FR")} FILMS À PARCOURIR`;
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
    const limit = maxGuesses();
    const squares = Array.from({ length: limit }, (_, index) => {
      if (index >= state.guesses.length) return "⬛";
      return state.guesses[index].correct ? "🟩" : "🟥";
    }).join("");
    const label = state.mode === "daily" ? `du jour #${state.movie.index}` : `archive #${state.movie.index}`;
    const gameLabel = state.gameType === "poster" ? "Affiche Local" : "Framed Local";
    const text = `${gameLabel} ${label}\n🎬 ${squares}\n${won ? `Trouvé en ${state.guesses.length}/${limit}` : "Pas trouvé"}`;
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
  elements.framesGameButton.addEventListener("click", () => switchGame("frames"));
  elements.posterGameButton.addEventListener("click", () => switchGame("poster"));
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
    if (state.gameType === "poster" && !posterMovieIds.has(MOVIES[number - 1].imdbId)) {
      showToast("Ce film ne fait pas partie des 500 affiches incontournables");
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
    startGame(selection.movie, selection.mode, selection.gameType);
  });

  initializeCatalog();
  renderStats();
  const selection = getMovieFromUrl();
  startGame(selection.movie, selection.mode, selection.gameType);
  if (location.hash === "#catalog") openModal("catalogModal");
})();
