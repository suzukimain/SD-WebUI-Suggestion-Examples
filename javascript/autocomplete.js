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

class TextAreaAutoComplete {
    static globalSeparator = "";
    static enabled = true;
    static insertOnTab = true;
    static insertOnEnter = true;
    static replacer = undefined;
    static suggestionCount = 20;
    static groups = {};
    static globalGroups = new Set();
    static globalWords = {};

    constructor(el, words = null, separator = null) {
        this.el = el;
        this.helper = new TextAreaCaretHelper(el, () => 1.0);
        this.dropdown = document.createElement("div");
        this.dropdown.className = "pysssss-autocomplete";
        this.overrideWords = words;
        this.overrideSeparator = separator;
        this.#setup();
    }

    get words() {
        return
