import gradio as gr
from modules import script_callbacks

# 補完候補の果物リスト
FRUITS = ["apple", "apricot", "banana", "blueberry", "cherry",
          "grape", "kiwi", "lemon", "mango", "melon",
          "orange", "peach", "pear", "pineapple", "strawberry", "watermelon"]

def on_ui_tabs():
    with gr.Blocks() as demo:
        with gr.Tab("autocomplete"):
            gr.Markdown("## 🍎 Fruit Autocomplete Sample")

            textbox = gr.Textbox(label="Type a fruit name", elem_id="fruit-input")
            output = gr.Textbox(label="Selected fruit")

            # JS 側から選択結果を受け取るためのダミー
            btn = gr.Button("Submit")
            btn.click(fn=lambda x: x, inputs=textbox, outputs=output)

    return [(demo, "Autocomplete", "autocomplete_tab")]

script_callbacks.on_ui_tabs(on_ui_tabs)
