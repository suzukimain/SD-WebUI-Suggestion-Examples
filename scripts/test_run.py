import gradio as gr
from modules import script_callbacks

def on_ui_tabs():
    with gr.Blocks() as demo:
        with gr.Tab("autocomplete"):
            gr.Markdown("## 🍎 Fruit Autocomplete Sample")
            # elem_id を指定して JS 側から参照できるようにする
            gr.Textbox(label="Type a fruit name", elem_id="fruit-input")

    return [(demo, "Autocomplete", "autocomplete_tab")]

script_callbacks.on_ui_tabs(on_ui_tabs)
