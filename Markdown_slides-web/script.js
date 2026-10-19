(function () {
  "use strict";

  var STORAGE_KEY = "markdown-slides:content";

  var DEFAULT_MD = [
    "# This is Slide 01",
    "## This is Heading 02 in slide 01",
    "This is your content on slide 01",
    "",
    "---",
    "",
    "# This is Slide 02",
    "## This is Heading 02 in slide 02",
    "This is your content on slide 02",
    "",
    "- First point",
    "- Second point",
    "- **Bold** and *italic* text work too",
    "",
    "---",
    "",
    "# Last Slide",
    "Press the Present button or F11 to start presenting.",
    "",
    "```",
    "console.log('code blocks work');",
    "```"
  ].join("\n");

  var editor = document.getElementById("editor");
  var previewSlide = document.getElementById("previewSlide");
  var presentSlide = document.getElementById("presentSlide");
  var previewCounter = document.getElementById("previewCounter");
  var presentCounter = document.getElementById("presentCounter");
  var presentation = document.getElementById("presentation");
  var statusEl = document.getElementById("status");

  var prevBtns = [document.getElementById("prevBtn"), document.getElementById("pPrevBtn")];
  var nextBtns = [document.getElementById("nextBtn"), document.getElementById("pNextBtn")];
  var fsBtns = [document.getElementById("fsBtn"), document.getElementById("pFsBtn")];

  var slides = [];
  var current = 0;
  var presenting = false;
  var statusTimer = null;

  /* ---------- Markdown to HTML (small built-in parser) ---------- */

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function inline(text) {
    var codes = [];
    text = escapeHtml(text);
    text = text.replace(/`([^`]+)`/g, function (_, c) {
      codes.push(c);
      return "\u0000" + (codes.length - 1) + "\u0000";
    });
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img alt="$1" src="$2">');
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    text = text.replace(/(^|[\s(])_([^_]+)_(?=[\s).,!?]|$)/g, "$1<em>$2</em>");
    text = text.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      return "<code>" + codes[Number(i)] + "</code>";
    });
    return text;
  }

  function markdownToHtml(md) {
    var lines = md.replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      // fenced code block
      if (/^```/.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        out.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
        continue;
      }

      // heading
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        out.push("<h" + h[1].length + ">" + inline(h[2].trim()) + "</h" + h[1].length + ">");
        i++;
        continue;
      }

      // blockquote
      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, "")); i++; }
        out.push("<blockquote>" + inline(q.join(" ")) + "</blockquote>");
        continue;
      }

      // unordered list
      if (/^\s*[-*+]\s+/.test(line)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          ul.push("<li>" + inline(lines[i].replace(/^\s*[-*+]\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ul>" + ul.join("") + "</ul>");
        continue;
      }

      // ordered list
      if (/^\s*\d+[.)]\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          ol.push("<li>" + inline(lines[i].replace(/^\s*\d+[.)]\s+/, "")) + "</li>");
          i++;
        }
        out.push("<ol>" + ol.join("") + "</ol>");
        continue;
      }

      // paragraph
      var p = [];
      while (
        i < lines.length &&
        !/^\s*$/.test(lines[i]) &&
        !/^(#{1,6}\s|```|>\s?|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(lines[i])
      ) {
        p.push(lines[i].trim());
        i++;
      }
      out.push("<p>" + inline(p.join(" ")) + "</p>");
    }

    return out.join("\n");
  }

  /* ---------- Slides ---------- */

  function splitSlides(md) {
    var parts = md.replace(/\r\n?/g, "\n").split(/^[ \t]*---[ \t]*$/m);
    var result = parts.filter(function (s) { return s.trim() !== ""; });
    return result.length ? result : [""];
  }

  function render() {
    slides = splitSlides(editor.value);
    if (current > slides.length - 1) current = slides.length - 1;
    if (current < 0) current = 0;

    var html = markdownToHtml(slides[current]);
    previewSlide.innerHTML = html;
    presentSlide.innerHTML = html;

    var label = (current + 1) + " / " + slides.length;
    previewCounter.textContent = label;
    presentCounter.textContent = label;

    var atFirst = current === 0;
    var atLast = current === slides.length - 1;
    prevBtns.forEach(function (b) { b.disabled = atFirst; });
    nextBtns.forEach(function (b) { b.disabled = atLast; });

    fsBtns.forEach(function (b) {
      b.textContent = presenting ? "Exit Full Screen" : "Full Screen";
      b.title = presenting ? "Exit full screen" : "Full screen";
    });
  }

  function go(delta) {
    var next = current + delta;
    if (next < 0 || next > slides.length - 1) return;
    current = next;
    render();
  }

  /* ---------- Save / load ---------- */

  function showStatus(msg) {
    statusEl.textContent = msg;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { statusEl.textContent = ""; }, 2000);
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, editor.value);
      showStatus("Saved");
    } catch (e) {
      showStatus("Save failed");
    }
  }

  function load() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved : DEFAULT_MD;
    } catch (e) {
      return DEFAULT_MD;
    }
  }

  /* ---------- Presentation mode ---------- */

  function enterPresentation() {
    if (presenting) return;
    presenting = true;
    presentation.hidden = false;
    var req = presentation.requestFullscreen || presentation.webkitRequestFullscreen;
    if (req) {
      try {
        var r = req.call(presentation);
        if (r && r.catch) r.catch(function () {});
      } catch (e) {}
    }
    render();
  }

  function exitPresentation() {
    if (!presenting) return;
    presenting = false;
    presentation.hidden = true;
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
    render();
  }

  function togglePresentation() {
    if (presenting) exitPresentation(); else enterPresentation();
  }

  // user pressed Esc (or the browser left full screen)
  document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement && presenting) {
      presenting = false;
      presentation.hidden = true;
      render();
    }
  });

  /* ---------- Events ---------- */

  editor.addEventListener("input", render);

  // allow Tab inside the editor
  editor.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      var s = editor.selectionStart;
      editor.value = editor.value.slice(0, s) + "  " + editor.value.slice(editor.selectionEnd);
      editor.selectionStart = editor.selectionEnd = s + 2;
      render();
    }
  });

  prevBtns.forEach(function (b) { b.addEventListener("click", function () { go(-1); }); });
  nextBtns.forEach(function (b) { b.addEventListener("click", function () { go(1); }); });
  fsBtns.forEach(function (b) { b.addEventListener("click", togglePresentation); });

  document.getElementById("saveBtn").addEventListener("click", save);
  document.getElementById("presentBtn").addEventListener("click", enterPresentation);
  document.getElementById("newBtn").addEventListener("click", function () {
    if (confirm("Start a new presentation? Unsaved changes in the editor will be lost.")) {
      editor.value = "# New Slide\nStart writing here.";
      current = 0;
      render();
    }
  });

  document.addEventListener("keydown", function (e) {
    var key = e.key;

    if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === "s") {
      e.preventDefault();
      save();
      return;
    }

    if (key === "F11") {
      e.preventDefault();
      togglePresentation();
      return;
    }

    // keep arrow keys for the cursor while typing in the editor
    if (document.activeElement === editor && !presenting) return;

    if (key === "ArrowRight") { e.preventDefault(); go(1); }
    else if (key === "ArrowLeft") { e.preventDefault(); go(-1); }
  });

  /* ---------- Start ---------- */

  editor.value = load();
  render();
})();
