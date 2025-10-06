// 候補リスト（固定）
const fruits = [
  "apple", "apricot", "banana", "blueberry", "cherry",
  "grape", "kiwi", "lemon", "mango", "melon",
  "orange", "peach", "pear", "pineapple", "strawberry", "watermelon"
];

function setupFruitAutocomplete() {
  const input = document.querySelector("#fruit-input textarea");
  if (!input) return;

  // サジェスト用のコンテナ
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

  // 入力欄の親に配置
  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(dropdown);

  input.addEventListener("input", () => {
    const query = input.value.toLowerCase();
    dropdown.innerHTML = "";
    if (!query) {
      dropdown.hidden = true;
      return;
    }

    const matches = fruits.filter(f => f.startsWith(query));
    if (matches.length === 0) {
      dropdown.hidden = true;
      return;
    }

    matches.forEach(fruit => {
      const li = document.createElement("li");
      li.textContent = fruit;
      li.style.padding = "4px";
      li.style.cursor = "pointer";
      li.addEventListener("mousedown", () => {
        input.value = fruit;
        dropdown.hidden = true;
      });
      dropdown.appendChild(li);
    });

    dropdown.hidden = false;
  });

  // フォーカス外れたら閉じる
  input.addEventListener("blur", () => {
    setTimeout(() => dropdown.hidden = true, 200);
  });
}

// WebUIロード時に実行
onUiLoaded(setupFruitAutocomplete);
