(() => {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");

  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!isOpen));
      nav.setAttribute("data-open", String(!isOpen));
      document.body.style.overflow = isOpen ? "" : "hidden";
    });
  }

  const closeMobileNav = () => {
    if (!navToggle || !nav) return;
    navToggle.setAttribute("aria-expanded", "false");
    nav.setAttribute("data-open", "false");
    document.body.style.overflow = "";
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileNav();
  });

  const isDesktop = () => window.matchMedia("(min-width: 1200px)").matches;

  document.querySelectorAll(".nav__item--dropdown > .nav__link").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      if (isDesktop()) return;
      event.preventDefault();
      const item = trigger.closest(".nav__item--dropdown");
      const isOpen = item.getAttribute("data-open") === "true";
      item.setAttribute("data-open", String(!isOpen));
      trigger.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  document.querySelectorAll(".nav__link:not(.nav__item--dropdown > .nav__link)").forEach((link) => {
    link.addEventListener("click", () => {
      if (!isDesktop()) closeMobileNav();
    });
  });

  document.querySelectorAll(".nav__dropdown-link").forEach((link) => {
    link.addEventListener("click", () => {
      if (!isDesktop()) closeMobileNav();
    });
  });

  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__link[href], .nav__dropdown-link[href]").forEach((link) => {
    const linkPath = link.getAttribute("href");
    if (linkPath === currentPath) {
      link.setAttribute("aria-current", "page");
      const parentItem = link.closest(".nav__item");
      if (parentItem) parentItem.classList.add("nav__item--current");
    }
  });

  document.querySelectorAll(".faq__question").forEach((question) => {
    question.addEventListener("click", () => {
      const item = question.closest(".faq__item");
      const isOpen = item.getAttribute("data-open") === "true";
      document.querySelectorAll(".faq__item").forEach((other) => other.setAttribute("data-open", "false"));
      item.setAttribute("data-open", String(!isOpen));
      question.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  const heroVideos = ["hero-video-1", "hero-video-2", "hero-video-3"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (heroVideos.length) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    const dataSaverOn = Boolean(connection && (connection.saveData || /2g/.test(connection.effectiveType || "")));

    if (!prefersReducedMotion && !dataSaverOn) {
      const crossfadeSeconds = 1.6;
      let activeIndex = 0;
      let switching = false;

      const startCrossfade = () => {
        if (switching || heroVideos.length < 2) return;
        switching = true;
        const outgoing = heroVideos[activeIndex];
        const nextIndex = (activeIndex + 1) % heroVideos.length;
        const incoming = heroVideos[nextIndex];

        incoming.currentTime = 0;
        incoming.play().catch(() => {});
        incoming.classList.add("is-visible");
        outgoing.classList.remove("is-visible");

        window.setTimeout(() => {
          outgoing.pause();
          outgoing.currentTime = 0;
          activeIndex = nextIndex;
          switching = false;
        }, crossfadeSeconds * 1000);
      };

      heroVideos.forEach((video) => {
        video.addEventListener("timeupdate", () => {
          if (video !== heroVideos[activeIndex] || switching || !video.duration) return;
          if (video.duration - video.currentTime <= crossfadeSeconds) startCrossfade();
        });
        video.addEventListener("ended", () => {
          if (video === heroVideos[activeIndex]) startCrossfade();
        });
      });

      heroVideos[0].play().catch(() => {});
    }
  }

  let lastScroll = window.scrollY;
  window.addEventListener("scroll", () => {
    if (!header) return;
    const currentScroll = window.scrollY;
    header.classList.toggle("site-header--scrolled", currentScroll > 8);
    lastScroll = currentScroll;
  });

  const thisWeekList = document.getElementById("thisweek-list");

  if (thisWeekList) {
    const isNthWeekdayOfMonth = (date, n) => Math.ceil(date.getDate() / 7) === n;

    const formatDay = (date) => date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

    const buildThisWeekEvents = () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const events = [];

      for (let i = 0; i < 7; i += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dow = date.getDay();

        if (dow === 0) events.push({ date, name: "Sunday LiveLife Gathering", time: "9:00 AM" });
        if (dow === 6) events.push({ date, name: "Life-Class Bible Study", time: "10:00 AM â€“ 12:00 PM" });
        if (dow === 4) events.push({ date, name: "In-Person Tutoring Service", time: "4:30 â€“ 6:30 PM" });
        if (dow === 2 && isNthWeekdayOfMonth(date, 3)) events.push({ date, name: "Life-Line Night of Prayer", time: "7:00 â€“ 9:00 PM" });
        if (dow === 3 && isNthWeekdayOfMonth(date, 4)) events.push({ date, name: "Life-Pathways Empowerment", time: "7:00 â€“ 9:00 PM" });
      }

      return events.sort((a, b) => a.date - b.date);
    };

    const events = buildThisWeekEvents();
    const rangeLabel = document.getElementById("thisweek-range");

    if (rangeLabel) {
      const end = new Date();
      end.setDate(end.getDate() + 6);
      const rangeStart = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const rangeEnd = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      rangeLabel.textContent = `${rangeStart} â€“ ${rangeEnd}`;
    }

    thisWeekList.innerHTML = events
      .map(
        (event) => `
          <li class="card">
            <div class="card__body">
              <h3 class="card__title">${event.name}</h3>
              <p>${formatDay(event.date)} &middot; ${event.time}</p>
            </div>
          </li>
        `
      )
      .join("");
  }

  const groupFilter = document.getElementById("group-filter");

  if (groupFilter) {
    const groupSections = document.querySelectorAll("[data-group-day]");
    const filterButtons = groupFilter.querySelectorAll("[data-filter]");

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;

        filterButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn === button)));

        groupSections.forEach((section) => {
          const matches = filter === "all" || section.dataset.groupDay === filter;
          section.hidden = !matches;
        });
      });
    });
  }

  const marquee = document.querySelector("[data-marquee]");

  if (marquee) {
    marquee.querySelectorAll(".marquee__track").forEach((track) => {
      Array.from(track.children).forEach((card) => {
        const copy = card.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        track.appendChild(copy);
      });
    });

    const pauseButton = document.querySelector("[data-marquee-pause]");
    const setPaused = (isPaused) => {
      marquee.classList.toggle("is-paused", isPaused);
      pauseButton.setAttribute("aria-pressed", String(isPaused));
      pauseButton.textContent = isPaused ? "Play" : "Pause";
    };

    pauseButton.addEventListener("click", () => {
      setPaused(!marquee.classList.contains("is-paused"));
    });

    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
})();