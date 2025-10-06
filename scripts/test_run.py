import gradio as gr
from modules import script_callbacks

def on_ui_tabs():
    with gr.Blocks() as demo:
        with gr.Tab("Auto Complete"):
            gr.Markdown("### オートコンプリート入力テスト")
            textbox = gr.Textbox(
                label="入力してください",
                elem_id="autocomplete-textbox",
                lines=5,
                placeholder="ここに入力すると候補が出ます..."
            )
    return [(demo, "Auto Complete", "autocomplete_tab")]

script_callbacks.on_ui_tabs(on_ui_tabs)
