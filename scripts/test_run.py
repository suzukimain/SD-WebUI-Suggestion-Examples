from modules import scripts
from fastapi import APIRouter
from starlette.responses import JSONResponse

router = APIRouter()

FRUIT_DICT = {
    "apple": "リンゴ",
    "banana": "バナナ",
    "cherry": "サクランボ",
    "grape": "ぶどう",
    "orange": "オレンジ"
}

@router.get("/my_test_autocomplete/fruits")
def get_fruits(q: str = ""):
    results = []
    for k, v in FRUIT_DICT.items():
        if q == "" or q.lower() in k.lower():
            results.append({"key": k, "label": v})
    return JSONResponse(content={"items": results})

class TestTabScript(scripts.Script):
    def title(self):
        return "Test Autocomplete (injected)"

    def show(self, is_img2img):
        return scripts.AlwaysVisible

    def ui(self, is_img2img):
        return ""  # もしくは None

    def run(self, p, *args):
        return None

def on_app_started(app, **kwargs):
    app.include_router(router, prefix="/extensions/my_test_autocomplete")

scripts.on_app_started(on_app_started)
