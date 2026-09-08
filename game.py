import math
import random
import sys

import numpy as np
import pygame

WIDTH, HEIGHT = 800, 600
FPS = 60
LIVES = 3


# ---------------------------------------------------------------- звук (процедурный)
def make_sound(freq_start, freq_end, duration, vol=0.4, wave="sine", noise=0.0):
    sr = 22050
    n = int(sr * duration)
    samples = np.zeros(n, dtype=np.float32)
    for i in range(n):
        t = i / sr
        frac = i / max(n - 1, 1)
        freq = freq_start + (freq_end - freq_start) * frac
        phase = 2 * math.pi * freq * t
        if wave == "sine":
            v = math.sin(phase)
        elif wave == "square":
            v = 1.0 if math.sin(phase) >= 0 else -1.0
        else:
            v = math.sin(phase) + 0.5 * math.sin(2 * phase)
        v += (random.random() * 2 - 1) * noise
        fade = min(1.0, i / (sr * 0.005), (n - i) / (sr * 0.01))
        samples[i] = v * fade * vol
    peak = np.max(np.abs(samples)) or 1.0
    samples = (samples / peak * 32767).astype(np.int16)
    stereo = np.column_stack((samples, samples))
    return pygame.sndarray.make_sound(stereo)


def build_sounds():
    sounds = {}
    sounds["shoot"] = make_sound(880, 240, 0.09, 0.22, "square", 0.2)
    sounds["shoot_big"] = make_sound(520, 140, 0.12, 0.26, "square", 0.25)
    sounds["explode"] = make_sound(220, 40, 0.4, 0.5, "sine", 0.8)
    sounds["explode_small"] = make_sound(260, 50, 0.25, 0.4, "sine", 0.7)
    sounds["hit"] = make_sound(160, 35, 0.7, 0.6, "sine", 0.9)
    sounds["life"] = make_sound(300, 60, 0.8, 0.5, "sine", 0.8)
    return sounds


def build_ambient():
    sr = 22050
    dur = 8.0
    n = int(sr * dur)
    rng = np.random.default_rng(7)
    t = np.arange(n) / sr
    chord = 0.0
    for f in (55.0, 82.5, 110.0):
        chord += np.sin(2 * math.pi * f * t)
    wob = 0.5 + 0.5 * np.sin(2 * math.pi * 0.15 * t)
    amp = 0.08 * wob
    noise = rng.standard_normal(n) * 0.02
    signal = (chord / 3.0 + noise) * amp
    fade = np.minimum(np.ones(n), np.minimum(t / 1.0, (dur - t) / 1.0))
    signal = signal * fade
    peak = np.max(np.abs(signal)) or 1.0
    data = (signal / peak * 32767 * 0.5).astype(np.int16)
    stereo = np.column_stack((data, data))
    sound = pygame.sndarray.make_sound(stereo)
    return sound


# ---------------------------------------------------------------- звёздный фон (параллакс)
class Star:
    def __init__(self, layer):
        self.layer = layer
        self.reset(initial=True)

    def reset(self, initial=False):
        self.size = 1 if self.layer > 0 else 2
        self.r = self.size if self.layer < 2 else random.choice((1, 2, 3))
        self.x = random.randrange(WIDTH)
        self.y = random.randrange(HEIGHT) if initial else -5
        self.speed = (self.layer + 1) * random.uniform(0.3, 0.8)
        self.color = random.choice(((200, 205, 220), (170, 175, 200), (230, 235, 250)))
        self.twinkle = random.uniform(0, math.tau)
        self.tw_speed = random.uniform(1, 3)

    def update(self, dt):
        self.y += self.speed * dt * 60
        if self.y > HEIGHT + 5:
            self.reset()

    def draw(self, screen):
        bright = int(140 + 100 * (0.5 + 0.5 * math.sin(self.twinkle)))
        self.twinkle += self.tw_speed * 0.02
        color = tuple(min(255, min(255, c * bright // 200)) for c in self.color)
        pygame.draw.circle(screen, color, (int(self.x), int(self.y)), self.r)
        if self.r == 3:
            pygame.draw.circle(screen, (color[0], color[1], color[2]), (int(self.x), int(self.y)), 1)


# ---------------------------------------------------------------- корабль
class Ship:
    def __init__(self):
        self.x = WIDTH // 2
        self.y = HEIGHT - 70
        self.speed = 8
        self.fire_timer = 0.0
        self.thrust = 0.0
        self.body_color = (90, 160, 255)

    def update(self, keys, dt):
        if keys[pygame.K_LEFT]:
            self.x -= self.speed * dt * 60
        if keys[pygame.K_RIGHT]:
            self.x += self.speed * dt * 60
        self.x = max(20, min(WIDTH - 20, self.x))
        self.thrust = (self.thrust + 0.08) % math.tau
        self.fire_timer = max(0.0, self.fire_timer - dt)

    def can_fire(self):
        return self.fire_timer <= 0.0

    def reset_fire(self):
        self.fire_timer = 0.15

    def nose(self):
        return (self.x, self.y - 22)

    def draw(self, screen):
        x, y = self.x, self.y
        # свечение двигателя
        glow_r = int(14 + 5 * math.sin(self.thrust * 4))
        glow_surf = pygame.Surface((glow_r * 2, glow_r * 2), pygame.SRCALPHA)
        pygame.draw.circle(glow_surf, (60, 140, 255, 120), (glow_r, glow_r), glow_r)
        screen.blit(glow_surf, (x - glow_r, y + 6 - glow_r), special_flags=pygame.BLEND_ADD)
        # пламя
        fl_len = 14 + int(6 * math.sin(self.thrust * 6))
        flame = [(x, y + 6), (x - 5, y + 8), (x, y + 8 + fl_len), (x + 5, y + 8)]
        pygame.draw.polygon(screen, (100, 190, 255), flame)
        pygame.draw.polygon(screen, (255, 190, 80), flame, 2)
        # корпус
        body = [(x, y - 22), (x - 12, y - 4), (x - 9, y + 6), (x + 9, y + 6), (x + 12, y - 4)]
        pygame.draw.polygon(screen, self.body_color, body)
        pygame.draw.polygon(screen, (210, 235, 255), body, 2)
        # кабина
        pygame.draw.circle(screen, (40, 70, 120), (x, y - 8), 4)

    def rect(self):
        return pygame.Rect(self.x - 12, self.y - 22, 24, 30)


# ---------------------------------------------------------------- астероиды
class Asteroid:
    def __init__(self, x, y, size, speed, angle=0.0, vy_factor=1.0):
        self.size = size  # "big" | "small"
        rad = random.randint(26, 36) if size == "big" else random.randint(12, 18)
        self.r = rad
        self.x = x
        self.y = y
        self.speed = speed * random.uniform(0.9, 1.2)
        self.angle = math.radians(random.uniform(-28, 28)) if angle == 0.0 else angle
        self.vx = math.sin(self.angle) * self.speed * 0.5
        self.vy = math.cos(self.angle) * self.speed * vy_factor
        self.rot = random.uniform(0, math.tau)
        self.rot_speed = random.uniform(-1.5, 1.5)
        base = random.choice(((168, 156, 140), (150, 140, 126), (176, 164, 148), (140, 132, 120)))
        self.color = base
        self.points = self._shape()

    def _shape(self):
        count = random.randint(9, 13)
        pts = []
        for i in range(count):
            a = i / count * math.tau
            rr = self.r * random.uniform(0.7, 1.15)
            pts.append((a, rr))
        return pts

    def update(self, dt):
        self.x += self.vx * dt * 60
        self.y += self.vy * dt * 60
        self.rot += self.rot_speed * dt
        if self.x < -self.r * 2:
            self.x = WIDTH + self.r * 2
        elif self.x > WIDTH + self.r * 2:
            self.x = -self.r * 2

    def bottom(self):
        return self.y - self.r >= HEIGHT

    def collide(self, x, y, radius):
        dx, dy = self.x - x, self.y - y
        return math.hypot(dx, dy) < self.r + radius

    def draw(self, screen):
        pts = []
        for a, rr in self.points:
            c, s = math.cos(a + self.rot), math.sin(a + self.rot)
            pts.append((self.x + rr * c, self.y + rr * s))
        pygame.draw.polygon(screen, self.color, pts)
        pygame.draw.polygon(screen, (85, 78, 70), pts, 2)
        # кратер
        if self.size == "big":
            pygame.draw.circle(screen, (120, 112, 100), (int(self.x - self.r * 0.2), int(self.y + self.r * 0.2)), max(2, self.r // 4))


# ---------------------------------------------------------------- лазеры и частицы
class Laser:
    def __init__(self, x, y, big=False):
        self.x = x
        self.y = y
        self.speed = 13
        self.die = False
        self.pos = (x, y)
        self.big = big

    def update(self, dt):
        self.y -= self.speed * dt * 60
        if self.y < -20:
            self.die = True

    def draw(self, screen):
        glow = pygame.Surface((12, 26), pygame.SRCALPHA)
        pygame.draw.ellipse(glow, (0, 255, 180, 90), (0, 0, 12, 26))
        screen.blit(glow, (self.x - 6, self.y - 13), special_flags=pygame.BLEND_ADD)
        pygame.draw.line(screen, (200, 255, 230), (self.x, self.y - 8), (self.x, self.y + 6), 3)
        pygame.draw.circle(screen, (255, 255, 255), (self.x, self.y - 8), 2)

    def rect(self):
        return pygame.Rect(self.x - 4, self.y - 10, 8, 18)


class Particle:
    def __init__(self, x, y, color, count=18, speed=6):
        self.parts = []
        for _ in range(count):
            a = random.uniform(0, math.tau)
            sp = random.uniform(1, speed)
            life = random.uniform(0.3, 0.6)
            self.parts.append([x, y, math.cos(a) * sp, math.sin(a) * sp, life, life, color])

    def update(self, dt):
        alive = []
        for p in self.parts:
            p[0] += p[2] * dt * 60
            p[1] += p[3] * dt * 60
            p[2] *= 0.97
            p[3] *= 0.97
            p[4] -= dt
            if p[4] > 0:
                alive.append(p)
        self.parts = alive
        return len(self.parts) > 0

    def draw(self, screen):
        for p in self.parts:
            alpha = int(255 * (p[4] / p[5]))
            color = (min(255, p[6][0] + alpha // 3), min(255, p[6][1] + alpha // 3), min(255, p[6][2] + alpha // 3))
            pygame.draw.circle(screen, color, (int(p[0]), int(p[1])), 2)


def draw_text(screen, text, x, y, size=30, color=(255, 255, 255), center=True):
    font = pygame.font.Font(None, size)
    surface = font.render(text, True, color)
    rect = surface.get_rect()
    if center:
        rect.center = (x, y)
    else:
        rect.topleft = (x, y)
    screen.blit(surface, rect)


def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Космическая астероидная оборона")
    clock = pygame.time.Clock()

    sounds = build_sounds()
    try:
        ambient = build_ambient()
        ambient.play(-1)
    except Exception:
        pass

    ship = Ship()
    stars = [Star(layer) for layer in [0, 0, 0, 1, 1, 1, 2, 2]]
    asteroids = []
    lasers = []
    particles = []
    score = 0
    lives = LIVES
    spawn_counter = 0.0
    base_speed = 3
    game_over = False
    hit_flash = 0

    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_r and game_over:
                    return main()

        keys = pygame.key.get_pressed()

        if not game_over:
            ship.update(keys, dt)

            # автоогонь
            if keys[pygame.K_SPACE] and ship.can_fire():
                ship.reset_fire()
                lasers.append(Laser(ship.x, ship.y - 24, big=True))
                sounds["shoot"].play()

            spawn_counter += dt
            if spawn_counter >= 1.4:
                spawn_counter = 0
                asteroids.append(Asteroid(random.randrange(40, WIDTH - 40), -40, "big", base_speed))
                base_speed += 0.03

            for star in stars:
                star.update(dt)

            for laser in lasers:
                laser.update(dt)
            lasers = [l for l in lasers if not l.die]

            # столкновения лазеры-астероиды
            new_asteroids = []
            for a in list(asteroids):
                for laser in list(lasers):
                    if not laser.die and a.collide(laser.x, laser.y, 8):
                        laser.die = True
                        if a.size == "big":
                            sounds["shoot_big"].play()
                            for _ in range(2):
                                ang = random.uniform(-0.6, 0.6)
                                new_asteroids.append(Asteroid(a.x, a.y, "small", base_speed * 1.3, ang))
                            particles.append(Particle(a.x, a.y, (200, 180, 160), 22, 7))
                        else:
                            sounds["explode_small"].play()
                            particles.append(Particle(a.x, a.y, (220, 200, 170), 16, 5))
                        score += 1
                        break
                else:
                    new_asteroids.append(a)
            asteroids = new_asteroids

            # обновление и столкновение с кораблём
            for a in list(asteroids):
                a.update(dt)
                if a.bottom():
                    asteroids.remove(a)
                elif a.collide(ship.x, ship.y, 14):
                    asteroids.remove(a)
                    lives -= 1
                    sounds["life"].play()
                    particles.append(Particle(a.x, a.y, (255, 120, 120), 26, 8))
                    hit_flash = 0.4
                    if lives <= 0:
                        game_over = True

            # частицы
            particles = [p for p in particles if p.update(dt)]

        screen.fill((4, 4, 10))
        for star in stars:
            star.draw(screen)

        if hit_flash > 0:
            hit_flash -= dt
            red = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
            red.fill((255, 0, 0, int(60 * (hit_flash / 0.4))))
            screen.blit(red, (0, 0))

        if not game_over:
            for laser in lasers:
                laser.draw(screen)
            for a in asteroids:
                a.draw(screen)
            for p in particles:
                p.draw(screen)
            ship.draw(screen)

            draw_text(screen, f"Очки: {score}", 15, 10, 30, (255, 255, 255), center=False)
            lives_color = (200, 120, 120) if lives <= 1 else (120, 220, 160)
            draw_text(screen, f"Жизни: {lives}", WIDTH - 120, 10, 30, lives_color, center=False)
            draw_text(screen, "Пробел — огонь, ←→ — движение, Esc — выход",
                       WIDTH // 2, HEIGHT - 20, 22, (150, 150, 160))
        else:
            particles = [p for p in particles if p.update(dt)]
            for p in particles:
                p.draw(screen)
            draw_text(screen, "КОНЕЦ ИГРЫ", WIDTH // 2, HEIGHT // 2 - 40, 70, (255, 70, 70))
            draw_text(screen, f"Очки: {score}", WIDTH // 2, HEIGHT // 2 + 25, 44)
            draw_text(screen, "Нажми R — заново, Esc — выход", WIDTH // 2, HEIGHT // 2 + 80, 28, (180, 180, 180))

        pygame.display.flip()

    try:
        ambient.stop()
    except Exception:
        pass
    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
