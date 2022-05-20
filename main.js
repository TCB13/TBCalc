/**
 TBCalc v1.2 - Console Calculator
 Copyright (C) 2022 TCB13 (Tadeu Bento)
 https://tbcalc.tcb13.com | https://tcb13.com | https://tadeubento.com

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

let settings = {
    open_help: true,
    save_history: false,
    round_results: true,
    darkmode: false
}

math.import({
    tbcalc: "Welcome to TBCalc!",
    TBCalc: "Welcome to TBCalc!",
    clear: () => calc.reset(),
    reset: () => calc.reset()
});

window.onload = () => {

    const settingCheckboxes = document.querySelectorAll("form.settings input");
    window.stm = new SettingsManager(settingCheckboxes, settings);
    stm.load();

    document.querySelector("form.settings input#darkmode").addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
    });

    const input = document.querySelector(".interface .input");
    if (stm.settings.save_history && localStorage.getItem("input")) {
        input.value = localStorage.getItem("input");
    }

    const output = document.querySelector(".interface .output");
    window.calc = new TBCalc(input, output);
    calc.inputEl.focus();

    if (stm.settings.darkmode) {
        document.body.classList.add("dark-mode");
    }

    document.getElementById("refresh").onclick = () => location.reload();
    document.getElementById("reset").onclick = () => calc.reset();
    document.getElementById("save-file").onclick = () => calc.download();
    document.getElementById("save-clipboard").onclick = () => calc.clipboard();
    if (stm.settings.open_help && window.innerWidth > 760) {
        let helpPanel = new bootstrap.Offcanvas(document.querySelector(".offcanvas.help-panel"))
        helpPanel.show();
    }

    const tooltipTriggerList = [].slice.call(document.querySelectorAll("[data-bs-toggle-tooltip=\"tooltip\"]"))
    tooltipTriggerList.map(tooltipTriggerEl => {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            trigger: "hover"
        })
    });

    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        const mobileModal = new bootstrap.Modal(document.querySelector(".modal.mobile-warning"));
        mobileModal.show();
    }

}


class SettingsManager {

    constructor(checkboxEls, defaultSettings) {
        this.checkboxEls = checkboxEls;
        this.settings = defaultSettings;
    }

    load() {
        if (localStorage.getItem("settings") === null) {
            if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                this.settings.darkmode = true;
            }
            localStorage.setItem("settings", JSON.stringify(this.settings));
        }
        this.settings = {...this.settings, ...(JSON.parse(localStorage.getItem("settings")))};
        localStorage.setItem("settings", JSON.stringify(this.settings));

        for (const checkbox of this.checkboxEls) {
            checkbox.checked = this.settings[checkbox.id];
            checkbox.addEventListener("click", () => {
                for (const checkbox of this.checkboxEls) {
                    this.settings[checkbox.id] = checkbox.checked;
                }
                localStorage.setItem("settings", JSON.stringify(this.settings));
            });
        }

    }

    store() {
        localStorage.setItem("settings", JSON.stringify(this.settings));
        this.load();
    }

}


class TBCalc {

    constructor(inputEl, outputEl) {
        this.inputEl = inputEl;
        this.outputEl = outputEl;
        this.parentEl = inputEl.parentNode;

        this.raw = "";
        this.lines = [];
        this.cache = {};

        this.selection = "";
        this.selectionStart = 0;
        this.selectionEnd = 0;

        let last = 0;
        const handler = (delayed) => {
            if (last === Date.now()) {
                return;
            }
            last = Date.now();
            this.input();
            this.inputEl.style.height = Math.max(this.outputEl.clientHeight, this.parentEl.clientHeight) + "px";
        };

        handler();

        this.inputEl.oninput = handler;
        this.inputEl.onmousedown = () => window.requestAnimationFrame(handler);
        this.inputEl.onkeydown = (event) => {
            if (event.key === "Enter") {
                let line = this.lines.filter(line => line.selected).pop();

                let insert = "\n";
                if (line.summing) {
                    insert += "  ";
                }
                for (let i = 0; i < line.indent; i++) {
                    insert += "  ";
                }

                this.replaceSelection(insert, false);
                event.preventDefault();
            }

            if ((event.metaKey || event.ctrlKey) && (event.key === "d" || event.key === "в")) {
                this.duplicateSelection();
                event.preventDefault();
            }

            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                const selection = this.raw.substring(this.inputEl.selectionStart, this.inputEl.selectionEnd);
                if (selection.match(/^-?\d+\.?\d*$/)) {
                    let newValue = selection * 1;

                    if (event.key === "ArrowUp") {
                        newValue += event.shiftKey ? 10 : 1;
                    }
                    if (event.key === "ArrowDown") {
                        newValue -= event.shiftKey ? 10 : 1;
                    }

                    this.replaceSelection(newValue);
                    event.preventDefault();
                }
            }

            if (event.key === "Tab") {
                if (event.shiftKey) {
                    this.removeIndent();
                } else {
                    this.addIndent();
                }
                event.preventDefault();
            }

            window.requestAnimationFrame(handler);
        };

        setTimeout(function fn() {
            setTimeout(fn, 100);
            handler();
        }.bind(this));

        this.outputEl.scrollTop = this.inputEl.scrollTop;
    }

    input() {
        let raw = this.inputEl.value;
        if (raw !== this.raw || this.inputEl.selectionStart !== this.selectionStart || this.inputEl.selectionEnd !== this.selectionEnd) {
            this.raw = raw;
            this.recalc();
            this.readSelection();
            this.repaint();
            localStorage.setItem("input", this.raw);
        }
    }

    recalc() {
        this.lines = [];
        const scope = {
            last: null
        };

        let position = 0;
        this.raw.split("\n").forEach((code, index) => {
            const line = {
                index: index,
                code: code,
                positionStart: position,
                positionEnd: position + code.length,
                result: null,
                error: null,
                indent: 0,
                summing: null,
                closed: false,
            };

            position += code.length + 1;

            this.lines.push(line);

            if (line.code.substr(0, 2) === "  ") {
                line.indent = line.code.match(/\s+/)[0].match(/\s\s/g).length;
            }

            if (!line.code.includes("(") && !line.code.includes(")")) {
                line.code = line.code.replace(",", ".");
            }

            this.lines.forEach((line2) => {
                if (line2.summing && line2.indent >= line.indent) {
                    line2.closed = true;
                    scope[line2.summing] = line2.result;
                }
            });

            if (line.code.trim().slice(-1) === ":" && line.code.indexOf("#") < 0) {
                line.summing = line.code.trim().slice(0, -1).trim();
                line.result = 0;
                line.closed = false;
                line.children = [];
            } else {
                let cached = this.cache[line.code];
                try {

                    if (!cached) {
                        cached = {};
                        this.cache[line.code] = cached;
                        cached.parsed = math.parse(line.code);
                        cached.compiled = cached.parsed.compile();
                    }

                    line.parsed = cached.parsed;
                    line.compiled = cached.compiled;

                    if (line.compiled === undefined) {
                        line.parsed = math.parse(line.code);
                        line.compiled = cached.parsed.compile();
                    } else {
                        line.result = line.compiled.eval(scope);

                    }

                } catch (e) {
                    line.error = e.toString();
                }
            }

            if (line.result !== undefined) {
                this.lines.forEach((line2) => {
                    if (line2.summing && !line2.closed && line2.indent < line.indent) {
                        line2.children.push(line);
                        try {
                            line2.result = math.add(line2.result, line.result);
                        } catch (e) {
                            line2.error = e.toString();
                        }
                    }
                });

                scope.last = line.result;
            }
        });
    }

    /*readActiveLine() {
        let match = this.inputEl.value.substr(0, this.inputEl.selectionStart).match(/\n/g);
        let index = match ? match.length : 0;
        this.line = this.lines[index];
    }*/

    readSelection() {
        this.selectionStart = this.inputEl.selectionStart;
        this.selectionEnd = this.inputEl.selectionEnd;
        this.selection = this.raw.substring(this.selectionStart, this.selectionEnd);

        this.lines.forEach((line) => {
            line.selected = line.positionEnd >= this.selectionStart && line.positionStart <= this.selectionEnd;
        });
    }

    replaceSelection(replacement, select) {
        this.readSelection();

        select = select !== false;
        replacement = replacement.toString();

        const newSelectionStart = this.selectionStart;
        const newSelectionEnd = this.selectionStart + replacement.length;

        if (!document.execCommand("insertText", false, replacement)) {
            this.inputEl.setRangeText(replacement, this.selectionStart, this.selectionEnd, "end");
            this.input();
        }

        if (select) {
            this.inputEl.setSelectionRange(newSelectionStart, newSelectionEnd);
            return;
        }

        this.inputEl.setSelectionRange(newSelectionEnd, newSelectionEnd);
    }

    duplicateSelection() {
        if (this.selection === "") {
            let line = this.lines.find((line) => line.selected);
            this.inputEl.setSelectionRange(line.positionEnd, line.positionEnd);
            this.replaceSelection("\n" + line.code);
            this.inputEl.setSelectionRange(this.selectionStart, this.selectionStart);
            return;
        }

        let selection = this.selection;
        this.inputEl.setSelectionRange(this.selectionEnd, this.selectionEnd);
        this.replaceSelection(selection);
        this.inputEl.setSelectionRange(this.selectionStart - selection.length, this.selectionStart);

    }

    addIndent() {
        let selectionStart = Infinity;
        let selectionEnd = 0;

        let affected = 0;
        let replacement = "";

        this.lines.forEach((line) => {
            if (!line.selected) {
                return false;
            }

            affected++;
            replacement += "  " + line.code + "\n";

            if (line.positionStart <= selectionStart) {
                selectionStart = line.positionStart;
            }

            if (line.positionEnd > selectionEnd) {
                selectionEnd = line.positionEnd;
            }
        });

        if (affected === 0) {
            return;
        }

        replacement = replacement.substr(0, replacement.length - 1);

        let newSelectionStart = this.selectionStart + 2;
        let newSelectionEnd = this.selectionEnd + affected * 2;

        this.inputEl.setSelectionRange(selectionStart, selectionEnd);
        this.replaceSelection(replacement);
        this.inputEl.setSelectionRange(newSelectionStart, newSelectionEnd);
    }

    removeIndent() {
        let selectionStart = Infinity;
        let selectionEnd = 0;

        let affected = 0;
        let replacement = "";

        this.lines.forEach((line) => {
            if (!line.selected) {
                return false;
            }
            if (line.code.substr(0, 2) !== "  ") {
                return;
            }

            affected++;
            replacement += line.code.substr(2) + "\n";

            if (line.positionStart <= selectionStart) {
                selectionStart = line.positionStart;
            }

            if (line.positionEnd > selectionEnd) {
                selectionEnd = line.positionEnd;
            }
        });

        if (affected === 0) {
            return;
        }

        replacement = replacement.substr(0, replacement.length - 1);

        const newSelectionStart = this.selectionStart - 2;
        const newSelectionEnd = this.selectionEnd - affected * 2;

        this.inputEl.setSelectionRange(selectionStart, selectionEnd);
        this.replaceSelection(replacement);
        this.inputEl.setSelectionRange(newSelectionStart, newSelectionEnd);
    }

    repaint() {
        var html = "";
        let compensatoryInputText = "";

        this.lines.forEach((line, index) => {
            let type = "";
            if (line.error) {
                if (line.selected) {
                    type = "empty";
                } else {
                    if (line.summing && line.children.find(line => line.error)) {
                        type = "empty";
                    } else {
                        type = "error";
                    }
                }
            } else if (line.summing) {
                type = "result";
            } else if (line.result === undefined) {
                type = "empty";
            } else if (line.result instanceof Function) {
                type = "functype";
            } else if (line.parsed.isFunctionAssignmentNode) {
                type = "empty";
            } else if (line.parsed.isConstantNode) {
                type = "empty";
            } else if (line.parsed.isAssignmentNode && line.parsed.value.isConstantNode) {
                type = "empty";
            } else {
                type = "result";
            }

            let code = line.code || " ";
            let prefix = " ";
            for (let i = 0; i < line.indent; i++) {
                code = code.replace(/(\| )?  /, "$1| ");
            }

            let data = "";
            if (type === "result") {
                prefix += "= ";
                if (typeof line.result === "number" && stm.settings.round_results) {
                    data = math.round(line.result, 10).toString();
                } else {
                    data = line.result.toString();
                }
            } else if (type === "error") {
                prefix += "// ";
                data = line.error;
            } else if (type === "functype") {
                prefix += "// Function ";
                const parameterCnt = line.result.toTex === undefined ? 0 : Object.keys(line.result.toTex).length;
                data = line.result.name;
                if (parameterCnt === 1) {
                    data += " expects " + parameterCnt + " argument";
                } else if (parameterCnt > 1) {
                    data += " expects " + parameterCnt + " arguments";
                }
            }

            if (line.selected) {
                type += " highlight";
            }

            code = code.replace(/&/g, "&amp;")
                       .replace(/'/g, "&apos;")
                       .replace(/"/g, "&quot;")
                       .replace(/</g, "&lt;")
                       .replace(/>/g, "&gt;");

            let lineHtml = "<div class=\"" + type + "\">";
            lineHtml += "<span class=\"code\" data-code=\"" + code + "\"></span>";
            lineHtml += "<span class=\"hint\" data-prefix=\"" + prefix + "\">" + data + "</span>";
            lineHtml += "</div>";

            compensatoryInputText = "\n".repeat((data.match(/\n/g) || []).length);
            html += lineHtml;
        });

        if (compensatoryInputText.length > 0) {
            this.inputEl.value += compensatoryInputText;
        }

        this.outputEl.innerHTML = html;
    }

    reset() {
        localStorage.removeItem("input");
        this.inputEl.value = "";
        this.outputEl.innerHTML = "";
        this.repaint();
        this.inputEl.focus();
    }

    collectOutput() {
        let history = "";
        document.querySelectorAll("." + this.outputEl.className + " .code, ." + this.outputEl.className + " .hint").forEach((item => {
            if (item.classList.contains("code")) {
                history += item.dataset.code;
                return;
            }
            history += item.dataset.prefix + item.textContent + "\r\n";
        }));

        return history;
    }

    download() {
        const downlEl = document.createElement("a");
        downlEl.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(this.collectOutput()));
        downlEl.setAttribute("download", "TBCalc-History.txt");
        const event = new MouseEvent("click", {"bubbles": true, "cancelable": true});
        downlEl.dispatchEvent(event);
    }

    clipboard() {
        navigator.clipboard.writeText(this.collectOutput());
    }

}
