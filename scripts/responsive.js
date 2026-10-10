let parent = document.querySelector("head");

let tabletChild = document.createElement("link");
tabletChild.href = "styles/responsive/tablet.css";
tabletChild.rel = "stylesheet";
tabletChild.id = "tablet-style";

let widescreenChild = document.createElement("link");
widescreenChild.href = "styles/responsive/widescreen.css";
widescreenChild.rel = "stylesheet";
widescreenChild.id = "widescreen-style";

function appendStyle(styleElement) {
  if (!document.getElementById(styleElement.id)) {
    parent.appendChild(styleElement);
  }
}

function removeStyle(id) {
  let styleElement = document.getElementById(id);
  if (styleElement) {
    styleElement.remove();
  }
}

function setResponsiveness() {
  let width = window.innerWidth;
  let height = window.innerHeight;

  if (width >= 1600 && width < 1920 && height >= 1050) {
    removeStyle("tablet-style");
    appendStyle(widescreenChild);
  } else if (width >= 1024 && width <= 1600 && height >= 768 && height < 1050) {
    removeStyle("widescreen-style");
    appendStyle(tabletChild);
  } else {
    removeStyle("tablet-style");
    removeStyle("widescreen-style");
  }
}

setResponsiveness();

window.addEventListener("resize", setResponsiveness);
