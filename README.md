# Markdown Slides

A small slide maker built with plain HTML, CSS and JavaScript. You write all the slides in one Markdown text area, and a live preview shows the current slide next to it.

## How to run

Open `index.html` in a browser. There is nothing to install and no server is needed.

## How it works

Slides are separated by a line containing three dashes (`---`). Each part before or after that line becomes its own slide.

```
# This is Slide 01
## This is Heading 02 in slide 01
This is your content on slide 01

---

# This is Slide 02
## This is Heading 02 in slide 02
This is your content on slide 02
```

Supported Markdown: headings, paragraphs, bold, italic, inline code, code blocks, bullet and numbered lists, blockquotes, links and images.

## Features

- Create and edit slides in the left section, with a live preview on the right
- Save slides in the browser's localStorage, so they load again after the browser is closed and reopened
- Present slides in full screen
- Left and Right buttons (Left is disabled on the first slide, Right on the last)
- Full Screen button that changes to Exit Full Screen while presenting
- Slide counter at the bottom in the format `current / total`

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Right arrow | Next slide |
| Left arrow | Previous slide |
| F11 | Enter or exit presentation mode |
| Ctrl + S | Save slides |
| Esc | Leave presentation mode |

While the cursor is inside the editor, the arrow keys move the text cursor as usual. Click outside the editor to use them for slides.

## Files

- `index.html` page structure
- `style.css` styling
- `script.js` Markdown parsing, slide navigation, saving and presentation logic

## Pushing to GitHub

```
git init
git add .
git commit -m "Markdown slides assignment"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```
