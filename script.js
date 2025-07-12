// Game State
const gameState = {
  currentScreen: "welcome",
  selectedCharacter: null,
  score: 0,
  level: 1,
  lives: 3,
  gameStartTime: null,
  adShown: false,
  bonusReceived: false,
  gameRunning: false,
  gamePaused: false,
}

// Game Objects
let canvas, ctx
let pacman, ghosts, dots, cherries
let gameLoop
let touchDirection = null

// Level configurations
const levelConfigs = [
  { background: "#000080", wallColor: "#0000ff", dotColor: "#ffff00" }, // Blue
  { background: "#800080", wallColor: "#ff00ff", dotColor: "#ffff00" }, // Purple
  { background: "#008000", wallColor: "#00ff00", dotColor: "#ffff00" }, // Green
  { background: "#800000", wallColor: "#ff0000", dotColor: "#ffff00" }, // Red
  { background: "#008080", wallColor: "#00ffff", dotColor: "#ffff00" }, // Teal
  { background: "#808000", wallColor: "#ffff00", dotColor: "#ffffff" }, // Olive
  { background: "#000040", wallColor: "#4040ff", dotColor: "#ffff00" }, // Dark Blue
  { background: "#400040", wallColor: "#ff40ff", dotColor: "#ffff00" }, // Dark Purple
  { background: "#004000", wallColor: "#40ff40", dotColor: "#ffff00" }, // Dark Green
  { background: "#400000", wallColor: "#ff4040", dotColor: "#ffff00" }, // Dark Red
]

// Initialize Telegram WebApp
if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.ready()
  window.Telegram.WebApp.expand()
}

// Screen Management
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active")
  })
  document.getElementById(screenId).classList.add("active")
  gameState.currentScreen = screenId
}

function showCharacterSelect() {
  showScreen("character-screen")
}

function selectCharacter(color) {
  gameState.selectedCharacter = color

  // Update UI
  document.querySelectorAll(".character-option").forEach((option) => {
    option.classList.remove("selected")
  })
  document.querySelector(`[data-color="${color}"]`).classList.add("selected")
  document.getElementById("play-btn").disabled = false
}

function startGame() {
  if (!gameState.selectedCharacter) return

  showScreen("game-screen")
  initializeGame()
  gameState.gameStartTime = Date.now()
  gameState.gameRunning = true
  gameState.gamePaused = false

  // Start ad timer
  setTimeout(() => {
    if (gameState.gameRunning && !gameState.adShown) {
      showAd()
    }
  }, 60000) // 1 minute
}

function showWelcome() {
  showScreen("welcome-screen")
  resetGame()
}

function restartGame() {
  resetGame()
  startGame()
}

function resetGame() {
  gameState.score = 0
  gameState.level = 1
  gameState.lives = 3
  gameState.gameStartTime = null
  gameState.adShown = false
  gameState.bonusReceived = false
  gameState.gameRunning = false
  gameState.gamePaused = false

  if (gameLoop) {
    cancelAnimationFrame(gameLoop)
  }

  updateUI()
}

// Game Initialization
function initializeGame() {
  canvas = document.getElementById("game-canvas")
  ctx = canvas.getContext("2d")

  // Set canvas size
  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)

  // Initialize game objects
  initializePacman()
  initializeGhosts()
  initializeDots()
  initializeCherries()

  // Start game loop
  gameLoop = requestAnimationFrame(update)

  // Add keyboard controls
  document.addEventListener("keydown", handleKeyboard)

  updateUI()
}

function resizeCanvas() {
  const container = document.getElementById("game-screen")
  const header = document.querySelector(".game-header")
  const controls = document.querySelector(".game-controls")

  const availableHeight = window.innerHeight - header.offsetHeight - controls.offsetHeight
  const availableWidth = window.innerWidth

  // Maintain aspect ratio
  const gameRatio = 19 / 21 // Classic Pac-Man ratio
  let canvasWidth, canvasHeight

  if (availableWidth / availableHeight > gameRatio) {
    canvasHeight = availableHeight
    canvasWidth = canvasHeight * gameRatio
  } else {
    canvasWidth = availableWidth
    canvasHeight = canvasWidth / gameRatio
  }

  canvas.width = canvasWidth
  canvas.height = canvasHeight
}

// Game Objects
function initializePacman() {
  pacman = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: Math.min(canvas.width, canvas.height) / 30,
    direction: { x: 0, y: 0 },
    nextDirection: { x: 0, y: 0 },
    speed: 2,
    color: gameState.selectedCharacter,
    invulnerable: false,
    invulnerableTime: 0,
  }
}

function initializeGhosts() {
  const ghostColors = ["#ff0000", "#ffb8ff", "#00ffff", "#ffb852"]
  ghosts = []

  for (let i = 0; i < 4; i++) {
    ghosts.push({
      x: canvas.width / 2 + (i - 1.5) * 40,
      y: canvas.height / 2 - 60,
      size: pacman.size,
      direction: { x: Math.random() > 0.5 ? 1 : -1, y: 0 },
      speed: 1.5,
      color: ghostColors[i],
      vulnerable: false,
      vulnerableTime: 0,
      mode: "chase",
    })
  }
}

function initializeDots() {
  dots = []
  const dotSize = 3
  const spacing = 20

  for (let x = spacing; x < canvas.width - spacing; x += spacing) {
    for (let y = spacing; y < canvas.height - spacing; y += spacing) {
      // Skip center area where pacman and ghosts start
      if (Math.abs(x - canvas.width / 2) < 60 && Math.abs(y - canvas.height / 2) < 60) {
        continue
      }

      dots.push({
        x: x,
        y: y,
        size: dotSize,
        collected: false,
      })
    }
  }
}

function initializeCherries() {
  cherries = []

  // Add 2-3 cherries per level
  for (let i = 0; i < 3; i++) {
    cherries.push({
      x: Math.random() * (canvas.width - 40) + 20,
      y: Math.random() * (canvas.height - 40) + 20,
      size: 8,
      collected: false,
    })
  }
}

// Game Loop
function update() {
  if (gameState.gamePaused || !gameState.gameRunning) {
    gameLoop = requestAnimationFrame(update)
    return
  }

  // Clear canvas
  const config = levelConfigs[(gameState.level - 1) % levelConfigs.length]
  ctx.fillStyle = config.background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Update game objects
  updatePacman()
  updateGhosts()

  // Draw everything
  drawDots()
  drawCherries()
  drawPacman()
  drawGhosts()

  // Check collisions
  checkDotCollisions()
  checkCherryCollisions()
  checkGhostCollisions()

  // Check level completion
  if (dots.every((dot) => dot.collected)) {
    nextLevel()
  }

  // Check bonus
  if (gameState.score >= 50 && !gameState.bonusReceived) {
    showBonusModal()
  }

  gameLoop = requestAnimationFrame(update)
}

function updatePacman() {
  // Update direction
  if (touchDirection) {
    pacman.nextDirection = { ...touchDirection }
    touchDirection = null
  }

  // Change direction if possible
  if (pacman.nextDirection.x !== 0 || pacman.nextDirection.y !== 0) {
    pacman.direction = { ...pacman.nextDirection }
    pacman.nextDirection = { x: 0, y: 0 }
  }

  // Move pacman
  pacman.x += pacman.direction.x * pacman.speed
  pacman.y += pacman.direction.y * pacman.speed

  // Wrap around screen
  if (pacman.x < 0) pacman.x = canvas.width
  if (pacman.x > canvas.width) pacman.x = 0
  if (pacman.y < 0) pacman.y = canvas.height
  if (pacman.y > canvas.height) pacman.y = 0

  // Update invulnerability
  if (pacman.invulnerable) {
    pacman.invulnerableTime--
    if (pacman.invulnerableTime <= 0) {
      pacman.invulnerable = false
    }
  }
}

function updateGhosts() {
  ghosts.forEach((ghost) => {
    // Update vulnerable state
    if (ghost.vulnerable) {
      ghost.vulnerableTime--
      if (ghost.vulnerableTime <= 0) {
        ghost.vulnerable = false
      }
    }

    // Simple AI - move towards pacman or randomly
    if (!ghost.vulnerable && Math.random() < 0.02) {
      const dx = pacman.x - ghost.x
      const dy = pacman.y - ghost.y

      if (Math.abs(dx) > Math.abs(dy)) {
        ghost.direction = { x: dx > 0 ? 1 : -1, y: 0 }
      } else {
        ghost.direction = { x: 0, y: dy > 0 ? 1 : -1 }
      }
    } else if (Math.random() < 0.01) {
      // Random direction change
      const directions = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ]
      ghost.direction = directions[Math.floor(Math.random() * directions.length)]
    }

    // Move ghost
    ghost.x += ghost.direction.x * ghost.speed
    ghost.y += ghost.direction.y * ghost.speed

    // Wrap around screen
    if (ghost.x < 0) ghost.x = canvas.width
    if (ghost.x > canvas.width) ghost.x = 0
    if (ghost.y < 0) ghost.y = canvas.height
    if (ghost.y > canvas.height) ghost.y = 0
  })
}

// Drawing Functions
function drawPacman() {
  ctx.save()
  ctx.translate(pacman.x, pacman.y)

  // Rotate based on direction
  if (pacman.direction.x > 0) ctx.rotate(0)
  else if (pacman.direction.x < 0) ctx.rotate(Math.PI)
  else if (pacman.direction.y > 0) ctx.rotate(Math.PI / 2)
  else if (pacman.direction.y < 0) ctx.rotate(-Math.PI / 2)

  // Draw pacman
  ctx.fillStyle = getCharacterColor(pacman.color)
  if (pacman.invulnerable && Math.floor(Date.now() / 100) % 2) {
    ctx.globalAlpha = 0.5
  }

  ctx.beginPath()
  ctx.arc(0, 0, pacman.size, 0.2 * Math.PI, 1.8 * Math.PI)
  ctx.lineTo(0, 0)
  ctx.fill()

  ctx.restore()
}

function drawGhosts() {
  ghosts.forEach((ghost) => {
    ctx.fillStyle = ghost.vulnerable ? "#0000ff" : ghost.color

    // Draw ghost body
    ctx.beginPath()
    ctx.arc(ghost.x, ghost.y - ghost.size / 2, ghost.size, Math.PI, 0)
    ctx.rect(ghost.x - ghost.size, ghost.y - ghost.size / 2, ghost.size * 2, ghost.size)
    ctx.fill()

    // Draw ghost bottom (wavy)
    ctx.beginPath()
    ctx.moveTo(ghost.x - ghost.size, ghost.y + ghost.size / 2)
    for (let i = 0; i < 4; i++) {
      const x = ghost.x - ghost.size + (i * ghost.size) / 2
      const y = ghost.y + ghost.size / 2 + (i % 2 === 0 ? -5 : 0)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(ghost.x + ghost.size, ghost.y + ghost.size / 2)
    ctx.lineTo(ghost.x + ghost.size, ghost.y - ghost.size / 2)
    ctx.fill()

    // Draw eyes
    ctx.fillStyle = "white"
    ctx.beginPath()
    ctx.arc(ghost.x - ghost.size / 3, ghost.y - ghost.size / 3, 3, 0, 2 * Math.PI)
    ctx.arc(ghost.x + ghost.size / 3, ghost.y - ghost.size / 3, 3, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = "black"
    ctx.beginPath()
    ctx.arc(ghost.x - ghost.size / 3, ghost.y - ghost.size / 3, 1, 0, 2 * Math.PI)
    ctx.arc(ghost.x + ghost.size / 3, ghost.y - ghost.size / 3, 1, 0, 2 * Math.PI)
    ctx.fill()
  })
}

function drawDots() {
  const config = levelConfigs[(gameState.level - 1) % levelConfigs.length]
  ctx.fillStyle = config.dotColor

  dots.forEach((dot) => {
    if (!dot.collected) {
      ctx.beginPath()
      ctx.arc(dot.x, dot.y, dot.size, 0, 2 * Math.PI)
      ctx.fill()
    }
  })
}

function drawCherries() {
  ctx.fillStyle = "#ff0000"

  cherries.forEach((cherry) => {
    if (!cherry.collected) {
      ctx.beginPath()
      ctx.arc(cherry.x, cherry.y, cherry.size, 0, 2 * Math.PI)
      ctx.fill()

      // Draw stem
      ctx.strokeStyle = "#00ff00"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cherry.x, cherry.y - cherry.size)
      ctx.lineTo(cherry.x - 3, cherry.y - cherry.size - 5)
      ctx.stroke()
    }
  })
}

// Collision Detection
function checkDotCollisions() {
  dots.forEach((dot) => {
    if (!dot.collected) {
      const distance = Math.sqrt(Math.pow(pacman.x - dot.x, 2) + Math.pow(pacman.y - dot.y, 2))

      if (distance < pacman.size + dot.size) {
        dot.collected = true
        gameState.score++
        updateUI()
      }
    }
  })
}

function checkCherryCollisions() {
  cherries.forEach((cherry) => {
    if (!cherry.collected) {
      const distance = Math.sqrt(Math.pow(pacman.x - cherry.x, 2) + Math.pow(pacman.y - cherry.y, 2))

      if (distance < pacman.size + cherry.size) {
        cherry.collected = true
        gameState.score += 5

        // Make all ghosts vulnerable
        ghosts.forEach((ghost) => {
          ghost.vulnerable = true
          ghost.vulnerableTime = 1800 // 30 seconds at 60fps
        })

        updateUI()
      }
    }
  })
}

function checkGhostCollisions() {
  if (pacman.invulnerable) return

  ghosts.forEach((ghost, index) => {
    const distance = Math.sqrt(Math.pow(pacman.x - ghost.x, 2) + Math.pow(pacman.y - ghost.y, 2))

    if (distance < pacman.size + ghost.size) {
      if (ghost.vulnerable) {
        // Eat ghost
        gameState.score += 10
        ghost.vulnerable = false
        ghost.x = canvas.width / 2 + (index - 1.5) * 40
        ghost.y = canvas.height / 2 - 60
        updateUI()
      } else {
        // Lose life
        gameState.lives--
        pacman.invulnerable = true
        pacman.invulnerableTime = 180 // 3 seconds at 60fps

        if (gameState.lives <= 0) {
          gameOver()
        } else {
          // Reset positions
          pacman.x = canvas.width / 2
          pacman.y = canvas.height / 2
          pacman.direction = { x: 0, y: 0 }
        }

        updateUI()
      }
    }
  })
}

// Level Management
function nextLevel() {
  gameState.level++

  if (gameState.level > 10) {
    // Game completed
    gameWin()
    return
  }

  // Reset level
  initializeDots()
  initializeCherries()

  // Reset positions
  pacman.x = canvas.width / 2
  pacman.y = canvas.height / 2
  pacman.direction = { x: 0, y: 0 }

  ghosts.forEach((ghost, index) => {
    ghost.x = canvas.width / 2 + (index - 1.5) * 40
    ghost.y = canvas.height / 2 - 60
    ghost.vulnerable = false
  })

  updateUI()
}

function gameOver() {
  gameState.gameRunning = false
  document.getElementById("final-score").textContent = gameState.score

  if (!gameState.adShown) {
    showAd(() => {
      showScreen("gameover-screen")
    })
  } else {
    showScreen("gameover-screen")
  }
}

function gameWin() {
  gameState.gameRunning = false
  document.getElementById("final-score").textContent = gameState.score
  showScreen("gameover-screen")
}

// Controls
function handleKeyboard(event) {
  switch (event.key) {
    case "ArrowUp":
    case "w":
    case "W":
      touchDirection = { x: 0, y: -1 }
      break
    case "ArrowDown":
    case "s":
    case "S":
      touchDirection = { x: 0, y: 1 }
      break
    case "ArrowLeft":
    case "a":
    case "A":
      touchDirection = { x: -1, y: 0 }
      break
    case "ArrowRight":
    case "d":
    case "D":
      touchDirection = { x: 1, y: 0 }
      break
  }
  event.preventDefault()
}

function handleTouch(direction) {
  switch (direction) {
    case "up":
      touchDirection = { x: 0, y: -1 }
      break
    case "down":
      touchDirection = { x: 0, y: 1 }
      break
    case "left":
      touchDirection = { x: -1, y: 0 }
      break
    case "right":
      touchDirection = { x: 1, y: 0 }
      break
  }
}

function handleTouchEnd() {
  // Optional: stop movement when touch ends
}

// Swipe controls
let touchStartX = 0
let touchStartY = 0

document.addEventListener("touchstart", (e) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
})

document.addEventListener("touchend", (e) => {
  if (!touchStartX || !touchStartY) return

  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY

  const diffX = touchStartX - touchEndX
  const diffY = touchStartY - touchEndY

  if (Math.abs(diffX) > Math.abs(diffY)) {
    if (diffX > 0) {
      handleTouch("left")
    } else {
      handleTouch("right")
    }
  } else {
    if (diffY > 0) {
      handleTouch("up")
    } else {
      handleTouch("down")
    }
  }

  touchStartX = 0
  touchStartY = 0
})

// Bonus Modal
function showBonusModal() {
  gameState.bonusReceived = true
  gameState.gamePaused = true
  document.getElementById("bonus-modal").classList.add("active")
}

function closeBonusModal() {
  document.getElementById("bonus-modal").classList.remove("active")
  gameState.gamePaused = false
}

function claimBonus() {
  // Redirect to casino website
  window.open("https://example-casino.com", "_blank")
  closeBonusModal()
}

// Ad System
function showAd(callback) {
  gameState.adShown = true
  gameState.gamePaused = true
  showScreen("ad-screen")

  let timeLeft = 30
  document.getElementById("ad-timer").textContent = timeLeft
  document.getElementById("skip-ad-btn").disabled = true

  const adTimer = setInterval(() => {
    timeLeft--
    document.getElementById("ad-timer").textContent = timeLeft

    if (timeLeft <= 0) {
      clearInterval(adTimer)
      document.getElementById("skip-ad-btn").disabled = false
      document.getElementById("skip-ad-btn").textContent = "Продолжить"
    }
  }, 1000)

  window.adCallback = callback
}

function skipAd() {
  gameState.gamePaused = false

  if (window.adCallback) {
    window.adCallback()
    window.adCallback = null
  } else {
    showScreen("game-screen")
  }
}

// Utility Functions
function getCharacterColor(color) {
  const colors = {
    yellow: "#ffff00",
    red: "#ff4444",
    blue: "#4444ff",
    green: "#44ff44",
  }
  return colors[color] || colors.yellow
}

function updateUI() {
  document.getElementById("score").textContent = gameState.score
  document.getElementById("level").textContent = gameState.level
  document.getElementById("lives").textContent = gameState.lives
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  showScreen("welcome-screen")
})

// Prevent zoom on double tap
document.addEventListener(
  "touchend",
  (e) => {
    e.preventDefault()
  },
  { passive: false },
)

// Prevent context menu
document.addEventListener("contextmenu", (e) => {
  e.preventDefault()
})
