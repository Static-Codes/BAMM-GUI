const usingOtter = navigator.userAgent.includes("Otter");

// Will be used in Create, View and Delete Script Buttons
let originalSection = null;
let currentSection = null;

// Waits for the DOM to fully load
window.onload = function () {
  setTimeout(function () {}, 2000);
  const html = document.documentElement;
  const body = document.body;

  currentSection = document.querySelector(".command-combobox-section");

  // const loadScriptBtn = document.querySelector("#loadScript");
  // const deleteScriptBtn = document.querySelector("#deleteScript");
  const collapseBtn = document.querySelector(".sidebar .collapse-btn");
  const toggleMobileMenu = document.querySelector(".toggle-mob-menu");
  const switchInput = document.querySelector(".switch input");
  const switchLabel = document.querySelector(".switch label");
  const switchLabelText = switchLabel.querySelector("span:last-child");

  if (usingOtter) {
    switchLabel.style.display = "flex";
    switchLabelText.style.marginLeft = "1rem";
  }

  const menuLinks = document.querySelectorAll(".sidebar a");

  // Error handling for required elements
  if (
    !switchLabel ||
    !menuLinks.length ||
    !collapseBtn ||
    !toggleMobileMenu ||
    !switchInput
  ) {
    console.error("Critical UI element missing. Check DOM structure.");
    document.body.innerHTML =
      "<h1>Error: Unable to load GUI, please try again.</h1>";
    return;
  }

  if (!switchLabelText) {
    console.error("Switch label text element missing.");
    document.body.innerHTML =
      "<h1>Error: Unable to load GUI, please try again.</h1>";
    return;
  }

  const collapsedClass = "collapsed";
  const lightModeClass = "light-mode";

  /* INITIAL DARK/LIGHT MODE CHECK (using localStorage) */
  const darkModeSetting = localStorage.getItem("dark-mode");

  if (darkModeSetting === "false") {
    html.classList.add(lightModeClass);
    switchInput.checked = false; // Uncheck for light mode
    switchLabelText.textContent = "Light";
  } else {
    // Default or 'true' (Dark Mode)
    switchInput.checked = true; // Check for dark mode
    switchLabelText.textContent = "Dark";
  }

  /* TOGGLE HEADER STATE (Collapse/Expand) */
  collapseBtn.addEventListener("click", function () {
    body.classList.toggle(collapsedClass);

    const isExpanded = this.getAttribute("aria-expanded") === "true";
    this.setAttribute("aria-expanded", String(!isExpanded));

    const newLabel = isExpanded ? "expand menu" : "collapse menu";
    this.setAttribute("aria-label", newLabel);
  });

  /* TOGGLE MOBILE MENU */
  toggleMobileMenu.addEventListener("click", function () {
    body.classList.toggle("mob-menu-opened");

    const isExpanded = this.getAttribute("aria-expanded") === "true";
    this.setAttribute("aria-expanded", String(!isExpanded));

    const newLabel = isExpanded ? "close menu" : "open menu";
    this.setAttribute("aria-label", newLabel);
  });

  /* Toggle for Light/Dark Mode */
  switchInput.addEventListener("input", function () {
    html.classList.toggle(lightModeClass);

    const isLightMode = html.classList.contains(lightModeClass);

    if (isLightMode) {
      switchLabelText.textContent = "Light";
      localStorage.setItem("dark-mode", "false");
    } else {
      switchLabelText.textContent = "Dark";
      localStorage.setItem("dark-mode", "true");
    }
  });
};
