/* Renders visual infographics from data/infographics.json onto #infographic-list
   and provides a lightweight lightbox viewer. */
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

  function infographicCardHtml(item) {
    var tags = (item.tags || [])
      .map(function (tag) {
        return "<span>" + esc(tag) + "</span>";
      })
      .join("");

    var numberBadge = item.number
      ? '<span class="infographic-badge">#' + esc(item.number) + "</span>"
      : "";

    var imgSrc = esc(item.image);
    var downloadSrc = esc(item.downloadImage || item.image);
    var title = esc(item.title);

    return (
      '<article class="infographic-card" data-title="' +
      title +
      '" data-img="' +
      imgSrc +
      '">' +
      '<div class="infographic-thumb-wrap" role="button" tabindex="0" aria-label="View ' +
      title +
      ' in high resolution">' +
      '<img src="' +
      imgSrc +
      '" alt="' +
      title +
      ' infographic" loading="lazy" decoding="async">' +
      numberBadge +
      '<div class="infographic-zoom-overlay"><span>&#128269; View High-Res</span></div>' +
      "</div>" +
      '<div class="infographic-body">' +
      "<h3>" +
      title +
      "</h3>" +
      "<p>" +
      esc(item.summary) +
      "</p>" +
      (tags ? '<div class="tags">' + tags + "</div>" : "") +
      '<div class="infographic-actions">' +
      '<button class="btn btn-primary btn-sm view-btn" type="button" data-title="' +
      title +
      '" data-img="' +
      imgSrc +
      '">' +
      "<span>&#128269; Preview</span>" +
      "</button>" +
      '<a class="btn btn-sm" href="' +
      downloadSrc +
      '" download="' +
      title +
      '.png" target="_blank" rel="noopener noreferrer">' +
      "<span>&#8681; Download</span>" +
      "</a>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function setupLightbox() {
    var backdrop = document.getElementById("lightbox-backdrop");
    var img = document.getElementById("lightbox-img");
    var title = document.getElementById("lightbox-title");
    var closeBtn = document.getElementById("lightbox-close");
    var downloadLink = document.getElementById("lightbox-download");

    if (!backdrop || !img || !title) return;

    function openLightbox(src, caption) {
      img.src = src;
      img.alt = caption;
      title.textContent = caption;
      if (downloadLink) {
        downloadLink.href = src;
        downloadLink.download = caption + ".png";
      }
      backdrop.removeAttribute("hidden");
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
    }

    function closeLightbox() {
      backdrop.setAttribute("hidden", "");
      img.src = "";
      document.body.style.overflow = "";
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", closeLightbox);
    }

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !backdrop.hasAttribute("hidden")) {
        closeLightbox();
      }
    });

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest(".infographic-thumb-wrap, .view-btn");
      if (trigger) {
        var card = trigger.closest(".infographic-card");
        var src = trigger.getAttribute("data-img") || (card && card.getAttribute("data-img"));
        var cap = trigger.getAttribute("data-title") || (card && card.getAttribute("data-title")) || "Infographic";
        if (src) {
          e.preventDefault();
          openLightbox(src, cap);
        }
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        var trigger = document.activeElement && document.activeElement.closest(".infographic-thumb-wrap");
        if (trigger) {
          var card = trigger.closest(".infographic-card");
          var src = card && card.getAttribute("data-img");
          var cap = (card && card.getAttribute("data-title")) || "Infographic";
          if (src) {
            e.preventDefault();
            openLightbox(src, cap);
          }
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("infographic-list");
    setupLightbox();

    if (!host) return;

    fetch("data/infographics.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        var list = (data.infographics || []).filter(function (item) {
          return item.published !== false;
        });
        host.innerHTML = list.length
          ? list.map(infographicCardHtml).join("")
          : '<p class="state">No infographics listed yet.</p>';
      })
      .catch(function () {
        host.innerHTML =
          '<p class="state">Could not load infographics. If you opened this file directly, run a local server instead (see README).</p>';
      });
  });
})();
