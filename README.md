# Dashboard Template

A reusable admin dashboard template built with **Tailwind CSS (Play CDN)** and **jQuery**. It's plain HTML with no framework and no build step.

| Library | Version | Used for |
|---|---|---|
| Tailwind CSS Play CDN (+ forms plugin) | 3.4.17 | Styling |
| jQuery | 3.7.1 | DOM, events, AJAX partials |
| Lucide | 0.460.0 | Icons (`<i data-lucide="name">`) |
| Chart.js | 4.4.6 | Charts (dashboard only) |
| Inter (Google Fonts) | — | Typeface |

> **Open the pages through a web server** (e.g. `http://localhost/.../dashboard-template/`). The sidebar, navbar and footer are loaded with AJAX, and browsers block that over `file://`.
> Quick option: `python -m http.server 8080` inside this folder.

## Structure

```
dashboard-template/
├── index.html          Dashboard (stat cards, charts, recent orders)
├── tables.html         Data table: search, filter, sort, paginate, add/edit/delete
├── forms.html          Form controls + validated form
├── components.html     UI gallery with "Code" / "Copy" for each block
├── login.html          Auth: sign in (no sidebar)
├── register.html       Auth: sign up with password strength + confirm
├── blank.html          ← copy this to start a new page
├── partials/
│   ├── sidebar.html
│   ├── navbar.html
│   └── footer.html
└── assets/
    ├── css/app.css               Sidebar collapse / animation styles
    └── js/
        ├── theme-init.js         Load in <head>: applies dark mode + sidebar state before paint
        ├── tailwind.config.js    Brand colors, font, dark mode = 'class'
        ├── app.js                Core: partials, theme, sidebar, dropdown, modal, tabs, toast…
        ├── charts.js             Theme-aware Chart.js helper (App.chart)
        ├── simple-table.js       $.fn.simpleTable data table plugin
        └── validate.js           $.fn.formValidate HTML5-based validation
```

## Adding a page

1. Copy `blank.html` → `reports.html`.
2. On `<body>` set `data-page="reports"` and `data-title="Reports"`.
3. In `partials/sidebar.html`, add a link with `data-nav="reports"`. It's highlighted automatically on that page.
4. Put page code inside `App.ready(function ($) { ... })` so it runs after the partials and icons are loaded.

## Re-branding

Edit `primary` in `assets/js/tailwind.config.js`. Every `primary-*` class follows it. Chart colors live in `assets/js/charts.js` (`colors` array).

## Component API (data attributes)

All handlers use event delegation, so they also work on HTML you inject later.

| Component | Markup |
|---|---|
| Dark mode | `<button data-theme-toggle>` |
| Sidebar toggle | `<button data-sidebar-toggle>` (collapses on desktop, off-canvas on mobile) |
| Collapse / submenu | `<button data-collapse-toggle="id">` + `<div id="id" class="hidden">` |
| Dropdown | `<button data-dropdown-toggle="id">` + `<div id="id" class="dropdown-menu hidden absolute …">`; add `data-dropdown-close` to items that should close it |
| Modal | `<button data-modal-open="id">` + `<div id="id" class="modal hidden fixed inset-0 …"><div class="modal-panel">…<button data-modal-close>` ; `data-static="true"` disables backdrop close |
| Tabs | `<div data-tabs>` with `<button data-tab="panelId">`; `data-tabs-style="pills"` for pill style |
| Accordion | `<button data-accordion-toggle="id" aria-expanded="false">`; wrap in `data-accordion="single"` to allow one open at a time |
| Dismissible | `<div data-dismissible>` … `<button data-dismiss>` |
| Password toggle | `<button data-password-toggle="inputId">` containing `[data-show]` and `[data-hide]` icons |
| Toast | `<button data-toast="Saved" data-toast-type="success">` |

Keyboard: `Esc` closes dropdowns, modals and the mobile sidebar. `Ctrl/⌘ + K` focuses the navbar search.

## JavaScript API

```js
App.ready(fn)                         // after partials + icons
App.toast('Saved', 'success')         // success | error | warning | info, opts: { title, duration }
App.modal.open('id'); App.modal.close('id')
App.confirm({ title, message, confirmText, danger }).then(ok => …)
App.theme.toggle(); App.theme.set('dark'); App.theme.isDark()
App.icons()                           // re-render Lucide icons after injecting HTML

// Events
$(document).on('theme:change', (e, isDark) => …)
$('#myModal').on('modal:open modal:close', …)
```

### Charts: `App.chart(selector, factory)`

```js
App.chart('#sales', function (t) {          // t = theme colors: t.text, t.grid, t.colors[], t.alpha(hex, a)
  return { type: 'bar', data: { … }, options: { … } };
});
```
The factory runs again when the theme changes, so colors always match. Requires `chart.js` and then `charts.js` after `app.js`.

### Data table: `$.fn.simpleTable`

```js
var table = $('#el').simpleTable({
  data: rows,
  columns: [
    { key: 'name', label: 'Name', render: (v, row) => $.fn.simpleTable.escape(v) },
    { key: 'id', label: '', sortable: false, className: 'text-right', render: v => '<button data-edit="'+v+'">Edit</button>' }
  ],
  pageSize: 10, search: '#search-input', searchKeys: ['name', 'email']
}).data('simpleTable');

$.getJSON('/api/users', rows => table.setData(rows));   // load from server
```
Methods: `setData(rows)`, `removeWhere(fn)`, `refresh()`, `getRows()`.
`render` output is inserted as HTML, so escape user data with `$.fn.simpleTable.escape`.

### Validation: `$.fn.formValidate`

Uses native rules (`required`, `type="email"`, `pattern`, `minlength`…) plus `data-match="#otherField"` and custom `data-error="message"`. Add `novalidate` to the form.

```js
$('#form').formValidate({
  onValid: ($form, data) => $.post('/api/save', data),
  onInvalid: ($form, $fields) => {}
});
```

## Production note

The Tailwind Play CDN compiles CSS in the browser. That's fine for internal tools and prototypes. For a public production site, switch to the Tailwind CLI: run `npx tailwindcss -i input.css -o assets/css/tailwind.css --minify` with the same config, then replace the CDN `<script>` with the generated stylesheet.
