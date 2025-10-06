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
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (!query) {
      dropdown.hidden = true;
      return;
    }

    timer = setTimeout(async () => {
      try {
        const res = await fetch(`/civitai_suggest?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        dropdown.innerHTML = "";
        if (!data.results || data.results.length === 0) {
          dropdown.hidden = true;
          return;
        }
        data.results.forEach(name => {
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
    }, 300);
  });

  input.addEventListener("blur", () => {
    setTimeout(() => dropdown.hidden = true, 200);
  });
}

onUiLoaded(setupCivitaiAutocomplete);
