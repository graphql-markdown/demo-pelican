// GraphQL-Markdown emits field/argument names as self links (`href="#"`).
// Point each one at the heading id so the name works as a permalink.
(function () {
  function link() {
    document
      .querySelectorAll("main#content :is(h3, h4, h5)[id] > a[href='#']")
      .forEach(function (a) {
        a.href = "#" + a.parentElement.id;
        a.classList.add("gqlmd-permalink");
      });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", link);
  else link();
})();
