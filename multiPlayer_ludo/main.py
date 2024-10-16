import pygame
import logging
import os
import sys
from core.ludo_game import LudoGame

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(__file__)
    return os.path.join(base_path, relative_path)

logging.basicConfig(level=logging.DEBUG)

if __name__ == "__main__":
    pygame.init()
    pygame_icon= pygame.image.load(resource_path('assets/images/ludo.png'))
    pygame.display.set_icon(pygame_icon)
    game = LudoGame()
    game.run()
    pygame.quit()