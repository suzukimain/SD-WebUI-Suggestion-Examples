function setupCivitaiAutocomplete() {
  const input = document.querySelector("#civitai-input textarea");
  if (!input) return;

  const dropdown = document.createElement("ul");
  dropdown.style.position = "absolute";
  dropdown.style.background = "white";
  dropdown.style.border = "1px solid #ccc";
  dropdown.style.listStyle = "none";
  dropdown.style.padding = "0";
  dropdown.style.margin = "0";
  dropdown.style.maxHeight = "150px";
  dropdown.style.overflowY = "auto";
  dropdown.style.zIndex = "1000";
  dropdown.hidden = true;

  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(dropdown);

  let timer = null;
  let selectedIndex = -1;

  async function updateSuggestions(query) {
    try {
      const res = await fetch(`/civitai_suggest?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      dropdown.innerHTML = "";
      selectedIndex = -1;

      if (!data.results || data.results.length === 0) {
        dropdown.hidden = true;
        return;
      }

      data.results.forEach((name, idx) => {
        const li = document.createElement("li");
        li.textContent = name;
        li.style.padding = "4px";
        li.style.cursor = "pointer";

        li.addEventListener("mousedown", () => {
          input.value = name;
          dropdown.hidden = true;
        });

        dropdown.appendChild(li);
      });

      dropdown.hidden = false;
    } catch (err) {
      console.error("API error", err);
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (!query) {
      dropdown.hidden = true;
      return;
    }
    timer = setTimeout(() => updateSuggestions(query), 300);
  });

  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll("li");
    if (dropdown.hidden || items.length === 0) return;

    if (e.key === "Tab") {
      e.preventDefault();
      selectedIndex = 0;
      items.forEach((li, idx) => {
        li.style.background = idx === selectedIndex ? "#def" : "white";
      });
      items[selectedIndex].scrollIntoView({ block: "nearest" });

    } else if (e.key === "Enter" || e.key === " ") {
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        e.preventDefault();
        input.value = items[selectedIndex].textContent;
        dropdown.hidden = true;
      }

    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      items.forEach((li, idx) => {
        li.style.background = idx === selectedIndex ? "#def" : "white";
      });
      items[selectedIndex].scrollIntoView({ block: "nearest" });

    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      items.forEach((li, idx) => {
        li.style.background = idx === selectedIndex ? "#def" : "white";
      });
      items[selectedIndex].scrollIntoView({ block: "nearest" });
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(() => dropdown.hidden = true, 200);
  });
}

onUiLoaded(setupCivitaiAutocomplete);