const getCaretCoordinates = (function () {
    var properties = [
        "direction",
        "boxSizing",
        "width",
        "height",
        "overflowX",
        "overflowY",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "borderStyle",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "fontStyle",
        "fontVariant",
        "fontWeight",
        "fontStretch",
        "fontSize",
        "fontSizeAdjust",
        "lineHeight",
        "fontFamily",
        "textAlign",
        "textTransform",
        "textIndent",
        "textDecoration",
        "letterSpacing",
        "wordSpacing",
        "tabSize",
        "MozTabSize",
    ];

    var isBrowser = typeof window !== "undefined";
    var isFirefox = isBrowser && window.mozInnerScreenX != null;

    return function getCaretCoordinates(element, position, options) {
        if (!isBrowser) {
            throw new Error("textarea-caret-position#getCaretCoordinates should only be called in a browser");
        }

        var debug = (options && options.debug) || false;
        if (debug) {
            var el = document.querySelector("#input-textarea-caret-position-mirror-div");
            if (el) el.parentNode.removeChild(el);
        }

        var div = document.createElement("div");
        div.id = "input-textarea-caret-position-mirror-div";
        document.body.appendChild(div);

        var style = div.style;
        var computed = window.getComputedStyle ? window.getComputedStyle(element) : element.currentStyle;
        var isInput = element.nodeName === "INPUT";

        style.whiteSpace = "pre-wrap";
        if (!isInput) style.wordWrap = "break-word";

        style.position = "absolute";
        if (!debug) style.visibility = "hidden";

        properties.forEach(function (prop) {
            if (isInput && prop === "lineHeight") {
                if (computed.boxSizing === "border-box") {
                    var height = parseInt(computed.height);
                    var outerHeight =
                        parseInt(computed.paddingTop) +
                        parseInt(computed.paddingBottom) +
                        parseInt(computed.borderTopWidth) +
                        parseInt(computed.borderBottomWidth);
                    var targetHeight = outerHeight + parseInt(computed.lineHeight);
                    if (height > targetHeight) {
                        style.lineHeight = height - outerHeight + "px";
                    } else if (height === targetHeight) {
                        style.lineHeight = computed.lineHeight;
                    } else {
                        style.lineHeight = 0;
                    }
                } else {
                    style.lineHeight = computed.height;
                }
            } else {
                style[prop] = computed[prop];
            }
        });

        if (isFirefox) {
            if (element.scrollHeight > parseInt(computed.height)) style.overflowY = "scroll";
        } else {
            style.overflow = "hidden";
        }

        div.textContent = element.value.substring(0, position);
        if (isInput) div.textContent = div.textContent.replace(/\s/g, "\u00a0");

        var span = document.createElement("span");
        span.textContent = element.value.substring(position) || ".";
        div.appendChild(span);

        var coordinates = {
            top: span.offsetTop + parseInt(computed["borderTopWidth"]),
            left: span.offsetLeft + parseInt(computed["borderLeftWidth"]),
            height: parseInt(computed["lineHeight"]),
        };

        if (debug) {
            span.style.backgroundColor = "#aaa";
        } else {
            document.body.removeChild(div);
        }

        return coordinates;
    };
})();

const CHAR_CODE_ZERO = "0".charCodeAt(0);
const CHAR_CODE_NINE = "9".charCodeAt(0);

class TextAreaCaretHelper {
    constructor(el, getScale) {
        this.el = el;
        this.getScale = getScale;
    }

    #calculateElementOffset() {
        const rect = this.el.getBoundingClientRect();
        const owner = this.el.ownerDocument;
        if (owner == null) throw new Error("Given element does not belong to document");
        const { defaultView, documentElement } = owner;
        if (defaultView == null) throw new Error("Given element does not belong to window");
        const offset = {
            top: rect.top + defaultView.pageYOffset,
            left: rect.left + defaultView.pageXOffset,
        };
        if (documentElement) {
            offset.top -= documentElement.clientTop;
            offset.left -= documentElement.clientLeft;
        }
        return offset;
    }

    #isDigit(charCode) {
        return CHAR_CODE_ZERO <= charCode && charCode <= CHAR_CODE_NINE;
    }

    #getLineHeightPx() {
        const computedStyle = getComputedStyle(this.el);
        const lineHeight = computedStyle.lineHeight;
        if (this.#isDigit(lineHeight.charCodeAt(0))) {
            const floatLineHeight = parseFloat(lineHeight);
            return this.#isDigit(lineHeight.charCodeAt(lineHeight.length - 1))
                ? floatLineHeight * parseFloat(computedStyle.fontSize)
                : floatLineHeight;
        }
        return this.#calculateLineHeightPx(this.el.nodeName, computedStyle);
    }

    #calculateLineHeightPx(nodeName, computedStyle) {
        const body = document.body;
        if (!body) return 0;
        const tempNode = document.createElement(nodeName);
        tempNode.innerHTML = "&nbsp;";
        Object.assign(tempNode.style, {
            fontSize: computedStyle.fontSize,
            fontFamily: computedStyle.fontFamily,
            padding: "0",
            position: "absolute",
        });
        body.appendChild(tempNode);
        if (tempNode instanceof HTMLTextAreaElement) {
            tempNode.rows = 1;
        }
        const height = tempNode.offsetHeight;
        body.removeChild(tempNode);
        return height;
    }

    getCursorOffset() {
        const scale = this.getScale();
        const elOffset = this.#calculateElementOffset();
        const elScroll = this.#getElScroll();
        const cursorPosition = this.#getCursorPosition();
        const lineHeight = this.#getLineHeightPx();
        const top = elOffset.top - (elScroll.top * scale) + (cursorPosition.top + lineHeight) * scale;
        const left = elOffset.left - elScroll.left + cursorPosition.left;
        const clientTop = this.el.getBoundingClientRect().top;
        if (this.el.dir !== "rtl") {
            return { top, left, lineHeight, clientTop };
        } else {
            const right = document.documentElement ? document.documentElement.clientWidth - left : 0;
            return { top, right, lineHeight, clientTop };
        }
    }

    #getElScroll() {
        return { top: this.el.scrollTop, left: this.el.scrollLeft };
    }

    #getCursorPosition() {
        return getCaretCoordinates(this.el, this.el.selectionEnd);
    }

    getBeforeCursor() {
        return this.el.selectionStart !== this.el.selectionEnd ? null : this.el.value.substring(0, this.el.selectionEnd);
    }

    getAfterCursor() {
        return this.el.value.substring(this.el.selectionEnd);
    }

    insertAtCursor(value, offset, finalOffset) {
        if (this.el.selectionStart != null) {
            const startPos = this.el.selectionStart;
            this.el.selectionStart = this.el.selectionStart + offset;
            let pasted = true;
            try {
                if (!document.execCommand("insertText", false, value)) {
                    pasted = false;
                }
            } catch (e) {
                pasted = false;
            }
            if (!pasted) {
                this.el.setRangeText(value, this.el.selectionStart, this.el.selectionEnd, 'end');
            }
            this.el.selectionEnd = this.el.selectionStart = startPos + value.length + offset + (finalOffset ?? 0);
        } else {
            let pasted = true;
            try {
                if (!document.execCommand("insertText", false, value)) {
                    pasted = false;
                }
            } catch (e) {
                pasted = false;
            }
            if (!pasted) {
                this.el.value += value;
            }
        }
    }
}

export class TextAreaAutoComplete {
	static globalSeparator = "";
	static enabled = true;
	static insertOnTab = true;
	static insertOnEnter = true;
	static replacer = undefined;
	static lorasEnabled = false;
	static suggestionCount = 20;

	/** @type {Record<string, Record<string, AutoCompleteEntry>>} */
	static groups = {};
	/** @type {Set<string>} */
	static globalGroups = new Set();
	/** @type {Record<string, AutoCompleteEntry>} */
	static globalWords = {};
	/** @type {Record<string, AutoCompleteEntry>} */
	static globalWordsExclLoras = {};

	/** @type {HTMLTextAreaElement} */
	el;

	/** @type {Record<string, AutoCompleteEntry>} */
	overrideWords;
	overrideSeparator = "";

	get words() {
		return this.overrideWords ?? TextAreaAutoComplete.globalWords;
	}

	get separator() {
		return this.overrideSeparator ?? TextAreaAutoComplete.globalSeparator;
	}

	/**
	 * @param {HTMLTextAreaElement} el
	 */
	constructor(el, words = null, separator = null) {
		this.el = el;
		this.helper = new TextAreaCaretHelper(el, () => app.canvas.ds.scale);
		this.dropdown = $el("div.pysssss-autocomplete");
		this.overrideWords = words;
		this.overrideSeparator = separator;

		this.#setup();
	}

	#setup() {
		this.el.addEventListener("keydown", this.#keyDown.bind(this));
		this.el.addEventListener("keypress", this.#keyPress.bind(this));
		this.el.addEventListener("keyup", this.#keyUp.bind(this));
		this.el.addEventListener("click", this.#hide.bind(this));
		this.el.addEventListener("blur", () => setTimeout(() => this.#hide(), 150));
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	#keyDown(e) {
		if (!TextAreaAutoComplete.enabled) return;

		if (this.dropdown.parentElement) {
			// We are visible
			switch (e.key) {
				case "ArrowUp":
					e.preventDefault();
					if (this.selected.index) {
						this.#setSelected(this.currentWords[this.selected.index - 1].wordInfo);
					} else {
						this.#setSelected(this.currentWords[this.currentWords.length - 1].wordInfo);
					}
					break;
				case "ArrowDown":
					e.preventDefault();
					if (this.selected.index === this.currentWords.length - 1) {
						this.#setSelected(this.currentWords[0].wordInfo);
					} else {
						this.#setSelected(this.currentWords[this.selected.index + 1].wordInfo);
					}
					break;
				case "Tab":
					if (TextAreaAutoComplete.insertOnTab) {
						this.#insertItem();
						e.preventDefault();
					}
					break;
			}
		}
	}

	/**
	 * @param {KeyboardEvent} e
	 */
	#keyPress(e) {
		if (!TextAreaAutoComplete.enabled) return;
		if (this.dropdown.parentElement) {
			// We are visible
			switch (e.key) {
				case "Enter":
					if (!e.ctrlKey) {
						if (TextAreaAutoComplete.insertOnEnter) {
							this.#insertItem();
							e.preventDefault();
						}
					}
					break;
			}
		}

		if (!e.defaultPrevented) {
			this.#update();
		}
	}

	#keyUp(e) {
		if (!TextAreaAutoComplete.enabled) return;
		if (this.dropdown.parentElement) {
			// We are visible
			switch (e.key) {
				case "Escape":
					e.preventDefault();
					this.#hide();
					break;
			}
		} else if (e.key.length > 1 && e.key != "Delete" && e.key != "Backspace") {
			return;
		}
		if (!e.defaultPrevented) {
			this.#update();
		}
	}

	#setSelected(item) {
		if (this.selected) {
			this.selected.el.classList.remove("pysssss-autocomplete-item--selected");
		}

		this.selected = item;
		this.selected.el.classList.add("pysssss-autocomplete-item--selected");
	}

	#insertItem() {
		if (!this.selected) return;
		this.selected.el.click();
	}

	#getFilteredWords(term) {
		term = term.toLocaleLowerCase();

		const priorityMatches = [];
		const prefixMatches = [];
		const includesMatches = [];
		for (const word of Object.keys(this.words)) {
			const lowerWord = word.toLocaleLowerCase();
			if (lowerWord === term) {
				// Dont include exact matches
				continue;
			}

			const pos = lowerWord.indexOf(term);
			if (pos === -1) {
				// No match
				continue;
			}

			const wordInfo = this.words[word];
			if (wordInfo.priority) {
				priorityMatches.push({ pos, wordInfo });
			} else if (pos) {
				includesMatches.push({ pos, wordInfo });
			} else {
				prefixMatches.push({ pos, wordInfo });
			}
		}

		priorityMatches.sort(
			(a, b) =>
				b.wordInfo.priority - a.wordInfo.priority ||
				a.wordInfo.text.length - b.wordInfo.text.length ||
				a.wordInfo.text.localeCompare(b.wordInfo.text)
		);

		const top = priorityMatches.length * 0.2;
		return priorityMatches.slice(0, top).concat(prefixMatches, priorityMatches.slice(top), includesMatches).slice(0, TextAreaAutoComplete.suggestionCount);
	}

	#update() {
		let before = this.helper.getBeforeCursor();
		if (before?.length) {
			const m = before.match(/([^,;"|{}()\n]+)$/);
			if (m) {
				before = m[0]
					.replace(/^\s+/, "")
					.replace(/\s/g, "_") || null;
			} else {
				before = null;
			}
		}

		if (!before) {
			this.#hide();
			return;
		}

		this.currentWords = this.#getFilteredWords(before);
		if (!this.currentWords.length) {
			this.#hide();
			return;
		}

		this.dropdown.style.display = "";

		let hasSelected = false;
		const items = this.currentWords.map(({ wordInfo, pos }, i) => {
			const parts = [
				$el("span", {
					textContent: wordInfo.text.substr(0, pos),
				}),
				$el("span.pysssss-autocomplete-highlight", {
					textContent: wordInfo.text.substr(pos, before.length),
				}),
				$el("span", {
					textContent: wordInfo.text.substr(pos + before.length),
				}),
			];

			if (wordInfo.hint) {
				parts.push(
					$el("span.pysssss-autocomplete-pill", {
						textContent: wordInfo.hint,
					})
				);
			}

			if (wordInfo.priority) {
				parts.push(
					$el("span.pysssss-autocomplete-pill", {
						textContent: wordInfo.priority,
					})
				);
			}

			if (wordInfo.value && wordInfo.text !== wordInfo.value && wordInfo.showValue !== false) {
				parts.push(
					$el("span.pysssss-autocomplete-pill", {
						textContent: wordInfo.value,
					})
				);
			}

			if (wordInfo.info) {
				parts.push(
					$el("a.pysssss-autocomplete-item-info", {
						textContent: "ℹ️",
						title: "View info...",
						onclick: (e) => {
							e.stopPropagation();
							wordInfo.info();
							e.preventDefault();
						},
					})
				);
			}
			const item = $el(
				"div.pysssss-autocomplete-item",
				{
				  onclick: () => {
					this.el.focus();
					let value = wordInfo.value ?? wordInfo.text;
					const use_replacer = wordInfo.use_replacer ?? true;
					if (TextAreaAutoComplete.replacer && use_replacer) {
					  value = TextAreaAutoComplete.replacer(value);
					}
					value = this.#escapeParentheses(value);
					
					const afterCursor = this.helper.getAfterCursor();
					const shouldAddSeparator = !afterCursor.trim().startsWith(this.separator.trim());
					this.helper.insertAtCursor(
					  value + (shouldAddSeparator ? this.separator : ''),
					  -before.length,
					  wordInfo.caretOffset
					);			
					setTimeout(() => {
					  this.#update();
					}, 150);
				  },
				},
				parts
			  );

			if (wordInfo === this.selected) {
				hasSelected = true;
			}

			wordInfo.index = i;
			wordInfo.el = item;

			return item;
		});

		this.#setSelected(hasSelected ? this.selected : this.currentWords[0].wordInfo);
		this.dropdown.replaceChildren(...items);

		if (!this.dropdown.parentElement) {
			document.body.append(this.dropdown);
		}

		const position = this.helper.getCursorOffset();
		this.dropdown.style.left = (position.left ?? 0) + "px";
		this.dropdown.style.top = (position.top ?? 0) + "px";
		this.dropdown.style.maxHeight = (window.innerHeight - position.top) + "px";
	}

	#escapeParentheses(text) {
		return text.replace(/\(/g, '\\(').replace(/\)/g, '\\)');
	  }

	#hide() {
		this.selected = null;
		this.dropdown.remove();
	}

	static updateWords(id, words, addGlobal = true) {
		const isUpdate = id in TextAreaAutoComplete.groups;
		TextAreaAutoComplete.groups[id] = words;
		if (addGlobal) {
			TextAreaAutoComplete.globalGroups.add(id);
		}

		if (isUpdate) {
			// Remerge all words
			TextAreaAutoComplete.globalWords = Object.assign(
				{},
				...Object.keys(TextAreaAutoComplete.groups)
					.filter((k) => TextAreaAutoComplete.globalGroups.has(k))
					.map((k) => TextAreaAutoComplete.groups[k])
			);
		} else if (addGlobal) {
			// Just insert the new words
			Object.assign(TextAreaAutoComplete.globalWords, words);
		}
	}
}

onUiLoaded(() => {
  const textarea = document.querySelector("#autocomplete-textbox textarea");
  if (!textarea) return;

  TextAreaAutoComplete.updateWords("default", {
    "apple": { text: "apple", hint: "フルーツ" },
    "banana": { text: "banana", hint: "フルーツ" },
    "blueberry": { text: "blueberry", hint: "ベリー系" },
  });

  new TextAreaAutoComplete(textarea);
});
