async function fetchSharedDict() {
  const resp = await fetch("/api/get-dict");
  if (!resp.ok) {
    console.error("取得エラー", resp.status);
    return null;
  }
  const obj = await resp.json();
  return obj;  
}


fetchSharedDict().then(dict => {
  console.log("取得した辞書:", dict);
});
