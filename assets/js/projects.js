/* Renders project highlights from data/projects.json onto #project-list. */
(function () {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      function (ch) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[ch];
      }
    );
  }

  function projectHtml(project) {
    var tags = (project.tags || [])
      .map(function (tag) {
        return "<span>" + esc(tag) + "</span>";
      })
      .join("");

    return (
      '<article class="project">' +
      "<h3>" +
      esc(project.title) +
      "</h3>" +
      "<p>" +
      esc(project.summary) +
      "</p>" +
      (tags ? '<div class="tags">' + tags + "</div>" : "") +
      "</article>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("project-list");
    if (!host) return;

    fetch("data/projects.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var projects = (data.projects || []).filter(function (p) {
          return p.published !== false;
        });
        host.innerHTML = projects.length
          ? projects.map(projectHtml).join("")
          : '<p class="state">No projects listed yet.</p>';
      })
      .catch(function () {
        host.innerHTML =
          '<p class="state">Could not load projects. If you opened this file directly, run a local server instead (see README).</p>';
      });
  });
})();
