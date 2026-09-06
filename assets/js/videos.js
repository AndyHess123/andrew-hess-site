/* Renders the curated video library from data/videos.json.
   Works on any page containing #featured-videos and/or #video-library.
   Thumbnails are linked images (not iframes) so pages stay fast and
   nothing is loaded from YouTube until the visitor clicks through. */
(function () {
  "use strict";

  function youtubeId(url) {
    if (!url) return null;
    var patterns = [
      /[?&]v=([A-Za-z0-9_-]{11})/,
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /\/embed\/([A-Za-z0-9_-]{11})/,
      /\/shorts\/([A-Za-z0-9_-]{11})/,
      /\/live\/([A-Za-z0-9_-]{11})/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = url.match(patterns[i]);
      if (m) return m[1];
    }
    return null;
  }

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

  function isPublished(item) {
    return item.published !== false;
  }

  /* Fisher-Yates on a copy — never mutates the caller's array. */
  function shuffle(list) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /* Pick `count` random items from the `poolSize` most recent videos.
     videos.json is maintained newest-first, so array order is recency.
     The winners are re-sorted back into recency order so the rail still
     reads newest to oldest. */
  function pickRecentRandom(videos, poolSize, count) {
    var pool = videos.slice(0, poolSize);
    return shuffle(pool)
      .slice(0, count)
      .sort(function (a, b) {
        return pool.indexOf(a) - pool.indexOf(b);
      });
  }

  function cardHtml(video, categoryName, showFlag) {
    var id = youtubeId(video.youtubeUrl);
    var title = esc(video.title);
    var desc = esc(video.description);
    var meta = esc(categoryName || "");

    var thumb = id
      ? '<div class="video-thumb">' +
        '<img src="https://i.ytimg.com/vi/' +
        id +
        '/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">' +
        '<span class="play-badge"><span>&#9654;</span></span>' +
        "</div>"
      : '<div class="video-thumb is-empty"><span>Link coming soon</span></div>';

    var flag =
      showFlag !== false && video.featured
        ? ' <span class="featured-flag">&#9679; Start here</span>'
        : "";

    var inner =
      thumb +
      '<div class="video-body">' +
      "<h3>" +
      title +
      "</h3>" +
      "<p>" +
      desc +
      "</p>" +
      '<div class="video-meta">' +
      meta +
      flag +
      "</div>" +
      "</div>";

    // Only render an anchor when there is somewhere to go.
    if (id) {
      return (
        '<a class="video-card" href="' +
        esc(video.youtubeUrl) +
        '" target="_blank" rel="noopener noreferrer">' +
        inner +
        "</a>"
      );
    }
    return '<div class="video-card">' + inner + "</div>";
  }

  function render(data) {
    var categories = data.categories || [];
    var videos = (data.videos || []).filter(isPublished);

    var nameById = {};
    categories.forEach(function (cat) {
      nameById[cat.id] = cat.name;
    });

    // ---- Featured: random picks from the most recent uploads ----
    var featuredHost = document.getElementById("featured-videos");
    if (featuredHost) {
      var limit = parseInt(featuredHost.dataset.limit || "3", 10) || 3;
      var pool = parseInt(featuredHost.dataset.pool || "10", 10) || 10;
      var featured = pickRecentRandom(videos, pool, limit);

      if (featured.length) {
        featuredHost.innerHTML =
          '<div class="video-grid">' +
          featured
            .map(function (v) {
              return cardHtml(v, nameById[v.category], false);
            })
            .join("") +
          "</div>";
      } else {
        featuredHost.innerHTML =
          '<p class="state">No videos published yet.</p>';
      }
    }

    // ---- Full categorised library ----
    var libraryHost = document.getElementById("video-library");
    if (libraryHost) {
      var blocks = categories
        .map(function (cat) {
          var inCat = videos.filter(function (v) {
            return v.category === cat.id;
          });
          if (!inCat.length) return "";

          return (
            '<section class="video-cat" id="' +
            esc(cat.id) +
            '">' +
            '<div class="cat-head">' +
            "<h2>" +
            esc(cat.name) +
            "</h2>" +
            '<span class="count">' +
            inCat.length +
            (inCat.length === 1 ? " video" : " videos") +
            "</span>" +
            (cat.blurb ? "<p>" + esc(cat.blurb) + "</p>" : "") +
            "</div>" +
            '<div class="video-grid">' +
            inCat
              .map(function (v) {
                return cardHtml(v, nameById[v.category]);
              })
              .join("") +
            "</div>" +
            "</section>"
          );
        })
        .join("");

      libraryHost.innerHTML =
        blocks || '<p class="state">No videos published yet.</p>';
    }
  }

  function fail(message) {
    ["featured-videos", "video-library"].forEach(function (id) {
      var host = document.getElementById(id);
      if (host) host.innerHTML = '<p class="state">' + esc(message) + "</p>";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (
      !document.getElementById("featured-videos") &&
      !document.getElementById("video-library")
    ) {
      return;
    }

    fetch("data/videos.json", { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(render)
      .catch(function () {
        fail(
          "Could not load the video library. If you opened this file directly, run a local server instead (see README)."
        );
      });
  });
})();
