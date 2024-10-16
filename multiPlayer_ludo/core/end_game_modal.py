import pygame
import sys
import os

class EndGameModal:
    def __init__(self, screen, window_size):
        self.screen = screen
        self.window_size = window_size
        self.large_font = pygame.font.Font(None, 48)
        self.font = pygame.font.Font(None, 24)

    def render(self, winner_message):
        modal_surface = pygame.Surface(self.window_size, pygame.SRCALPHA)
        modal_surface.fill((0, 0, 0, 128))  # Semi-transparent black background

        modal_rect = pygame.Rect(200, 200, 800, 400)
        pygame.draw.rect(modal_surface, (255, 255, 255), modal_rect)  # White modal background

        # Render "Game Over!" text
        game_over_text = self.large_font.render("Game Over!", True, (0, 0, 0))
        game_over_rect = game_over_text.get_rect(center=(self.window_size[0] // 2, self.window_size[1] // 2 - 50))
        modal_surface.blit(game_over_text, game_over_rect)

        # Render winner message text
        winner_text = self.large_font.render(winner_message, True, (0, 0, 0))
        winner_rect = winner_text.get_rect(center=(self.window_size[0] // 2, self.window_size[1] // 2))
        modal_surface.blit(winner_text, winner_rect)

        # Render instruction text
        instruction_text = self.font.render("Click anywhere to restart the game", True, (0, 0, 0))
        instruction_rect = instruction_text.get_rect(center=(self.window_size[0] // 2, self.window_size[1] // 2 + 50))
        modal_surface.blit(instruction_text, instruction_rect)

        self.screen.blit(modal_surface, (0, 0))

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN:
            pygame.quit()
            python = sys.executable
            os.execl(python, python, *sys.argv)