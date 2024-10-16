import pygame
import os
import sys
import time
import random
from pygame import mixer


def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(__file__)
    return os.path.join(base_path, relative_path)

class InfoRenderer:
    def __init__(self, screen, font):
        self.screen = screen
        self.font = font
        mixer.init()

    def draw_dice(self, value, x, y, size=50):
        rect = pygame.Rect(x, y, size, size)
        pygame.draw.rect(self.screen, (255, 255, 255), rect)
        pygame.draw.rect(self.screen, (0, 0, 0), rect, 2)
        dot_positions = {
            1: [(x + size // 2, y + size // 2)],
            2: [(x + size // 4, y + size // 4), (x + 3 * size // 4, y + 3 * size // 4)],
            3: [(x + size // 4, y + size // 4), (x + size // 2, y + size // 2), (x + 3 * size // 4, y + 3 * size // 4)],
            4: [(x + size // 4, y + size // 4), (x + 3 * size // 4, y + size // 4), (x + size // 4, y + 3 * size // 4), (x + 3 * size // 4, y + 3 * size // 4)],
            5: [(x + size // 4, y + size // 4), (x + 3 * size // 4, y + size // 4), (x + size // 2, y + size // 2), (x + size // 4, y + 3 * size // 4), (x + 3 * size // 4, y + 3 * size // 4)],
            6: [(x + size // 4, y + size // 4), (x + 3 * size // 4, y + size // 4), (x + size // 4, y + size // 2), (x + 3 * size // 4, y + size // 2), (x + size // 4, y + 3 * size // 4), (x + 3 * size // 4, y + 3 * size // 4)]
        }
        for pos in dot_positions[value]:
            pygame.draw.circle(self.screen, (0, 0, 0), pos, size // 10)

    def roll_dice_animation(self, x, y, size=50):
        mixer.Sound(resource_path('assets/effects/dice.mp3')).play()
        
        start_time = pygame.time.get_ticks()
        last_update_time = start_time
        dice_value = 1

        while pygame.time.get_ticks() - start_time < 1000:
            current_time = pygame.time.get_ticks()
            if current_time - last_update_time >= 100:
                dice_value = random.randint(1, 6)
                self.screen.fill((255, 255, 255))
                self.draw_dice(dice_value, x, y, size)
                pygame.display.update(pygame.Rect(800, 80, 400, 80))
                last_update_time = current_time
    
        return dice_value

    def render_info(self,current_player, is_current_player, dice_value, rolling_dice=False, status_message=""):
        self.screen.fill((255, 255, 255))

        dice_x, dice_y = 10, 90
        text_x, text_y = 10, 10
        spacing = 40

        if rolling_dice:
            dice_value = self.roll_dice_animation(dice_x, dice_y)

        if dice_value > 0:
            self.draw_dice(dice_value, dice_x, dice_y)
            roll_message = "Waiting for move"
        else:
            roll_message = "Waiting for dice roll!"

        if current_player:
            player_colors = {
                (0, 0, 255): "Blue",
                (255, 255, 0): "Yellow",
                (255, 0, 0): "Red",
                (0, 255, 0): "Green"
            }
            player_name = player_colors.get(current_player.color, "Unknown Player")
            
            if is_current_player:
                player_message = f"Your Turn! ({player_name})"
            else:
                player_message = f"Current Turn: {player_name}"

            player_message_surface = pygame.font.Font(None, 32).render(player_message, True, (0, 0, 0))
            self.screen.blit(player_message_surface, (text_x, text_y + spacing))

        roll_message_surface = self.font.render(roll_message, True, (0, 0, 0))
        self.screen.blit(roll_message_surface, (text_x, text_y))

        if status_message:
            status_message_surface = self.font.render(status_message, True, (0, 0, 0))
            self.screen.blit(status_message_surface, (text_x, text_y + 2 * spacing + 75))

        return dice_value