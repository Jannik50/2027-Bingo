(function () {
    "use strict";

    var STORAGE_KEY = "2027-bingo-card-state";

    /*
     * These are placeholders for now.
     * Replace the text inside the array with your actual bingo items later.
     *
     * There must be exactly 24 items because the center square is FREE.
     */
    var items = [
        "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER",
        "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER",
        "PLACEHOLDER", "PLACEHOLDER", null,           "PLACEHOLDER", "PLACEHOLDER",
        "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER",
        "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER", "PLACEHOLDER"
    ];

    var grid = document.getElementById("bingoGrid");
    var bingoMessage = document.getElementById("bingoMessage");
    var resetButton = document.getElementById("resetButton");

    var marked = loadState();
    var previousBingo = false;
    var celebrationTimeout = null;

    function loadState() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return Array(25).fill(false);
            }

            var parsed = JSON.parse(saved);

            if (!Array.isArray(parsed) || parsed.length !== 25) {
                return Array(25).fill(false);
            }

            return parsed.map(function (value) {
                return value === true;
            });
        } catch (error) {
            console.warn("Could not load bingo state:", error);
            return Array(25).fill(false);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(marked));
        } catch (error) {
            console.warn("Could not save bingo state:", error);
        }
    }

    function createCard() {
        grid.innerHTML = "";

        for (var i = 0; i < 25; i++) {
            var square = document.createElement("button");
            square.type = "button";
            square.className = "square";

            if (i === 12) {
                square.classList.add("free");
                square.textContent = "FREE";
                square.setAttribute("aria-label", "Free square");
            } else {
                square.textContent = items[i] || "PLACEHOLDER";
                square.setAttribute("aria-label", "Bingo square " + (i + 1));
            }

            if (marked[i]) {
                square.classList.add("marked");
                square.setAttribute("aria-pressed", "true");
            } else {
                square.setAttribute("aria-pressed", "false");
            }

            square.dataset.index = i;

            square.addEventListener("click", function () {
                var index = Number(this.dataset.index);

                marked[index] = !marked[index];

                /*
                 * The center FREE square is considered permanently crossed out
                 * only when the user clicks it, just like every other square.
                 * If you want it to count automatically, change this behavior
                 * in isBingo() below.
                 */

                this.classList.toggle("marked", marked[index]);
                this.setAttribute("aria-pressed", String(marked[index]));

                saveState();
                checkForBingo();
            });

            grid.appendChild(square);
        }
    }

    function getWinningLines() {
        return [
            // Horizontal
            [0, 1, 2, 3, 4],
            [5, 6, 7, 8, 9],
            [10, 11, 12, 13, 14],
            [15, 16, 17, 18, 19],
            [20, 21, 22, 23, 24],

            // Vertical
            [0, 5, 10, 15, 20],
            [1, 6, 11, 16, 21],
            [2, 7, 12, 17, 22],
            [3, 8, 13, 18, 23],
            [4, 9, 14, 19, 24],

            // Diagonal
            [0, 6, 12, 18, 24],
            [4, 8, 12, 16, 20]
        ];
    }

    function getBingoLines() {
        var lines = getWinningLines();

        return lines.filter(function (line) {
            return line.every(function (index) {
                return marked[index];
            });
        });
    }

    function checkForBingo() {
        var bingoLines = getBingoLines();
        var hasBingo = bingoLines.length > 0;

        document.querySelectorAll(".square").forEach(function (square) {
            square.classList.remove("winning");
        });

        if (hasBingo) {
            bingoLines.forEach(function (line) {
                line.forEach(function (index) {
                    var square = grid.children[index];

                    if (square) {
                        square.classList.add("winning");
                    }
                });
            });

            bingoMessage.classList.add("show");

            /*
             * Only launch a new celebration when the card changes
             * from "no bingo" to "bingo".
             */
            if (!previousBingo) {
                launchConfetti();
            }
        } else {
            bingoMessage.classList.remove("show");
        }

        previousBingo = hasBingo;
    }

    function launchConfetti() {
        var canvas = document.createElement("canvas");
        canvas.style.position = "fixed";
        canvas.style.inset = "0";
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.pointerEvents = "none";
        canvas.style.zIndex = "9999";

        document.body.appendChild(canvas);

        var ctx = canvas.getContext("2d");
        var particles = [];
        var particleCount = 180;
        var width;
        var height;
        var animationFrame;

        function resize() {
            width = canvas.width = window.innerWidth * window.devicePixelRatio;
            height = canvas.height = window.innerHeight * window.devicePixelRatio;
            ctx.setTransform(
                window.devicePixelRatio,
                0,
                0,
                window.devicePixelRatio,
                0,
                0
            );
            width = window.innerWidth;
            height = window.innerHeight;
        }

        resize();

        for (var i = 0; i < particleCount; i++) {
            particles.push({
                x: width / 2 + (Math.random() - 0.5) * 120,
                y: height * 0.25 + (Math.random() - 0.5) * 50,
                vx: (Math.random() - 0.5) * 12,
                vy: Math.random() * -10 - 4,
                gravity: 0.25 + Math.random() * 0.15,
                rotation: Math.random() * Math.PI,
                rotationSpeed: (Math.random() - 0.5) * 0.25,
                size: 5 + Math.random() * 8,
                life: 180 + Math.random() * 100,
                shape: Math.random() > 0.5 ? "rect" : "circle"
            });
        }

        function draw() {
            ctx.clearRect(0, 0, width, height);

            var alive = false;

            particles.forEach(function (p) {
                if (p.life <= 0) {
                    return;
                }

                alive = true;

                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.rotation += p.rotationSpeed;
                p.life--;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);

                /*
                 * Intentionally uses the browser's default color cycling
                 * rather than hard-coding a single visual theme.
                 */
                var hue = Math.floor((p.x + p.y + p.life) % 360);
                ctx.fillStyle = "hsl(" + hue + ", 85%, 55%)";

                if (p.shape === "rect") {
                    ctx.fillRect(
                        -p.size / 2,
                        -p.size / 2,
                        p.size,
                        p.size * 1.8
                    );
                } else {
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });

            if (alive) {
                animationFrame = requestAnimationFrame(draw);
            } else {
                canvas.remove();
            }
        }

        window.addEventListener("resize", resize);
        draw();

        setTimeout(function () {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }

            window.removeEventListener("resize", resize);

            if (canvas.parentNode) {
                canvas.remove();
            }
        }, 5000);
    }

    resetButton.addEventListener("click", function () {
        var confirmed = window.confirm(
            "Are you sure you want to reset the entire bingo card?"
        );

        if (!confirmed) {
            return;
        }

        marked = Array(25).fill(false);
        saveState();
        previousBingo = false;
        createCard();
        checkForBingo();
    });

    createCard();
    checkForBingo();
})();