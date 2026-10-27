(() => {
  const VAPID_PUBLIC_KEY = "BKx6g04ocPAUO6tkEb9y4OHQa_uOV5M2Jqf6kiD6IaxcBKGejRTGST5RBfz3Z0nMQJncjXS43QWXaagX-ledz1c";
  const SUBSCRIPTIONS_URL = "/api/v1/push-subscriptions";

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const canUseServiceWorker = "serviceWorker" in navigator && window.isSecureContext && location.protocol !== "file:";

  const tabIcon = (paths) =>
    `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const tabs = [
    { href: "index.html", label: "Home", icon: tabIcon('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>') },
    { href: "sermons.html", label: "Watch", icon: tabIcon('<rect x="3" y="5" width="18" height="14"/><path d="m10 9 5 3-5 3Z"/>') },
    { href: "events.html", label: "Events", icon: tabIcon('<rect x="3.5" y="5" width="17" height="15"/><path d="M3.5 10h17M8 3v4M16 3v4"/>') },
    { href: "give.html", label: "Give", icon: tabIcon('<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z"/>') },
    { href: "more.html", label: "More", icon: tabIcon('<path d="M4 7h16M4 12h16M4 17h16"/>') }
  ];

  const renderTabBar = () => {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const tabBar = document.createElement("nav");
    tabBar.className = "tab-bar";
    tabBar.setAttribute("aria-label", "App");
    tabBar.innerHTML = `<ul class="tab-bar__list">${tabs
      .map(
        (tab) => `<li><a class="tab-bar__link" href="${tab.href}"${tab.href === currentPath ? ' aria-current="page"' : ""}>${tab.icon}<span>${tab.label}</span></a></li>`
      )
      .join("")}</ul>`;
    document.body.appendChild(tabBar);
    document.body.classList.add("has-tab-bar");
  };

  const setupInstall = () => {
    const installButton = document.querySelector("[data-install]");
    const iosHint = document.querySelector("[data-install-ios]");
    if (isStandalone) return;
    if (iosHint && isIos) iosHint.hidden = false;
    if (!installButton) return;

    let deferredPrompt = null;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredPrompt = event;
      installButton.hidden = false;
    });
    installButton.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installButton.hidden = true;
    });
  };

  const urlBase64ToUint8Array = (base64) => {
    const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  };

  const setupPushToggle = async (registration) => {
    const toggle = document.querySelector("[data-push-toggle]");
    const status = document.querySelector("[data-push-status]");
    if (!toggle || !status) return;

    if (isIos && !isStandalone) {
      status.textContent = "Install the app to your Home Screen first, then come back here to turn on notifications.";
      return;
    }
    if (!registration || !("PushManager" in window) || !("Notification" in window)) {
      status.textContent = "Notifications aren't supported in this browser.";
      return;
    }

    const render = (subscription) => {
      toggle.hidden = false;
      toggle.textContent = subscription ? "Turn Off Notifications" : "Turn On Notifications";
      toggle.setAttribute("aria-pressed", String(Boolean(subscription)));
      if (Notification.permission === "denied") {
        toggle.hidden = true;
        status.textContent = "Notifications are blocked. Allow them for this site in your browser settings.";
      }
    };

    let subscription = await registration.pushManager.getSubscription();
    render(subscription);

    toggle.addEventListener("click", async () => {
      toggle.disabled = true;
      try {
        if (subscription) {
          await fetch(SUBSCRIPTIONS_URL, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
          await subscription.unsubscribe();
          subscription = null;
          status.textContent = "Notifications are off.";
        } else {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
          const response = await fetch(SUBSCRIPTIONS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription)
          });
          if (!response.ok) {
            await subscription.unsubscribe();
            subscription = null;
            throw new Error("Subscription was not saved");
          }
          status.textContent = "Notifications are on. We'll let you know about services and events.";
        }
      } catch {
        status.textContent = Notification.permission === "denied"
          ? "Notifications are blocked. Allow them for this site in your browser settings."
          : "Something went wrong. Please try again.";
      } finally {
        toggle.disabled = false;
        render(subscription);
      }
    });
  };

  renderTabBar();
  setupInstall();

  if (canUseServiceWorker) {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then(setupPushToggle)
      .catch(() => setupPushToggle(null));
  } else {
    setupPushToggle(null);
  }
})();
