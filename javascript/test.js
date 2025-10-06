(function() {
  window.addEventListener("load", () => {
    const tabsContainer = document.querySelector("#tabs");  // 実際のセレクタを要調整
    if (!tabsContainer) {
      console.warn("tabs container not found");
    } else {
      const myTab = document.createElement("button");
      myTab.textContent = "Test";
      myTab.id = "tab-my-test-autocomplete";
      myTab.classList.add("tab-button");  // 他タブと同じスタイルクラスを使う
      tabsContainer.appendChild(myTab);

      // タブクリック時に表示エリアを切り替えて、カスタム UI を inject
      myTab.addEventListener("click", () => {
        showMyTestTab();
      });
    }

    function showMyTestTab() {
      let contentArea = document.getElementById("my-test-content-area");
      if (!contentArea) {
        contentArea = document.createElement("div");
        contentArea.id = "my-test-content-area";
        const mainContainer = document.querySelector("#content"); 
        mainContainer.appendChild(contentArea);

        const input = document.createElement("input");
        input.type = "text";
        input.id = "fruit-input";
        input.placeholder = "フルーツ名を入力";
        contentArea.appendChild(input);

        const box = document.createElement("div");
        box.id = "fruit-suggestions";
        box.classList.add("autocomplete-box");
        contentArea.appendChild(box);

        setupAutocomplete(input, box);
      }
      // 必要なら contentArea.style.display = "block" など表示制御
    }

    function setupAutocomplete(input, box) {
      let suggestions = [];

      input.addEventListener("input", async () => {
        const q = input.value.trim();
        const url = `/extensions/my_test_autocomplete/fruits?q=${encodeURIComponent(q)}`;
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            suggestions = [];
          } else {
            const data = await resp.json();
            suggestions = data.items || [];
          }
        } catch (e) {
          console.error("autocomplete fetch error", e);
          suggestions = [];
        }
        renderSuggestions();
      });

      function renderSuggestions() {
        box.innerHTML = "";
        for (const item of suggestions) {
          const div = document.createElement("div");
          div.className = "autocomplete-item";
          div.textContent = `${item.key} — ${item.label}`;
          div.dataset.key = item.key;
          box.appendChild(div);

          div.addEventListener("click", () => {
            input.value = item.key;
            clearSuggestions();
          });
        }
        box.style.display = suggestions.length ? "block" : "none";
      }

      function clearSuggestions() {
        suggestions = [];
        box.innerHTML = "";
        box.style.display = "none";
      }

      input.addEventListener("blur", () => {
        setTimeout(clearSuggestions, 200);
      });
    }
  });
})();
