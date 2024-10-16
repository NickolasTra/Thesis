import pygame
import logging
import webbrowser
import time
import os
import sys
from game.board import Board
from game.player import Player
from game.bot import Bot, create_bot
from network.network_manager import NetworkManager
from core.game_renderer import GameRenderer
from core.info_renderer import InfoRenderer
from core.event_handler import EventHandler
from core.game_logic import GameLogic
from utils.chat import Chat
from core.end_game_modal import EndGameModal
from pygame import mixer

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(__file__)
    return os.path.join(base_path, relative_path)

class LudoGame:
    def __init__(self):
        pygame.init()
        mixer.init()

        self.window_size = (1200, 800)
        self.screen = pygame.display.set_mode(self.window_size)
        pygame.display.set_caption("Ludo Game")

        self.board_area = pygame.Rect(0, 0, 800, 800)
        self.info_area = pygame.Rect(800, 0, 400, 800)

        self.board = None
        self.players = []
        self.status_message = ""
        self.win_message = ""
        self.game_started = False
        self.game_id = None
        self.game_ended = False

        self.network_manager = NetworkManager()
        self.network_manager.connect("https://tragiannis.site")
        self.app_token = self.network_manager.generate_app_token()

        self.font = pygame.font.Font(None, 24)
        self.chat = Chat(self.screen, self.font, self.send_chat_message)
        self.renderer = GameRenderer(self.screen.subsurface(self.board_area), self.font)
        self.info_renderer = InfoRenderer(self.screen.subsurface(self.info_area), self.font)

        self.game_logic = None
        self.event_handler = EventHandler(self)

        self.clock = pygame.time.Clock()

        self.end_game_modal = EndGameModal(self.screen, self.window_size)

        self.is_bot_turn = False
        self.bot_state = "IDLE"
        self.bot_waiting_start_time = 0
        self.bot_waiting_timeout = 5000 

        self.setup_callbacks()

    def setup_game_board(self, game_data):
        self.board = Board((800, 800), resource_path("./assets/images/background.jfif"))
        self.game_id = game_data['gameId']

        player_colors = [(0, 0, 255), (255, 255, 0), (0, 255, 0), (255, 0, 0)] 
        player_start_positions = [
            [(1, 1), (1, 3), (3, 1), (3, 3)],
            [(1, 11), (1, 13), (3, 11), (3, 13)],
            [(11, 1), (11, 3), (13, 1), (13, 3)],
            [(11, 11), (11, 13), (13, 11), (13, 13)]
        ]
        
        self.players = []
        for i, player_id in enumerate(game_data['players'].split(',')):
            if player_id.startswith('bot'):
                # Bot player
                player = create_bot(player_colors[i], player_start_positions[i], player_id)
                logging.info(f"Created bot player: {player_id}")
            else:
                # Human player
                is_host= game_data['is_host'] = game_data['host'] == player_id
                player = Player(player_colors[i], player_start_positions[i], player_id, is_host)
                logging.info(f"Created human player: {player_id} (Host: {is_host})")
            self.players.append(player)
        
        pieces_data = game_data.get('pieces', {})
        for player in self.players:
            player_pieces = pieces_data.get(player.player_id, [])
            if not player_pieces:
                player_pieces = [{'position': None, 'is_home': True, 'is_finished': False} for _ in range(4)]
            player.setup_pieces(player_pieces)
        
        self.game_logic = GameLogic(self.renderer, self.board, self.players, game_data['gameId'])
        self.game_logic.previous_game_state= game_data
        self.game_logic.update_game_state(game_data)
        self.game_started = True

        logging.info(f"Game board set up completed. Current player: {self.game_logic.current_player_id}")
        self.render()

    def run(self):
        max_retries = 3
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                success = webbrowser.open(f"https://tragiannis.site/login?appToken={self.app_token}")
                if success:
                    self.game_loop()
                    return
                else:
                    logging.warning(f"Attempt {attempt + 1} to open web browser failed.")
            except Exception as e:
                logging.exception(f"An error occurred during attempt {attempt + 1}: {e}")
            
            pygame.time.wait(retry_delay)
        
        logging.error("Failed to open web browser after multiple attempts.")

    def game_loop(self):
        running = True

        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif self.game_ended:
                    self.end_game_modal.handle_event(event)
                else:
                    self.event_handler.handle_event(event)

            if self.game_started and not self.game_ended:
                current_player = self.game_logic.get_current_player()

                if current_player and current_player.player_id.startswith('bot'):
                    self.handle_bot_turn(current_player)

            if not self.renderer.is_animating:
                self.render()
                self.renderer.update(self.players)
 
            self.chat.update(self.clock.tick(20))
            self.clock.tick(30)

        self.network_manager.disconnect()
        pygame.quit()

    def handle_bot_turn(self, bot_player):
        if self.renderer.is_animating:
            return
        
        local_player_id = self.network_manager.user_data.get('playerId')
        local_player = next((player for player in self.players if player.player_id == local_player_id), None)
        
        if local_player and not local_player.is_host:
            return
    
        current_player = self.game_logic.get_current_player()
        if current_player != bot_player or not current_player.player_id.startswith('bot'):
            return
    
        current_time = pygame.time.get_ticks()
    
        if self.bot_state == "IDLE":
            if not hasattr(self, 'bot_idle_start_time'):
                self.bot_idle_start_time = current_time
            if current_time - self.bot_idle_start_time > 1000:
                if self.game_logic.dice_value == 0:
                    self.network_manager.request_dice_roll()
                    self.info_renderer.roll_dice_animation(10, 90)
                    self.bot_state = "WAITING_FOR_DICE"
                    self.bot_waiting_start_time = current_time
                else:
                    self.bot_state = "READY_TO_MOVE"
                del self.bot_idle_start_time
    
        elif self.bot_state == "WAITING_FOR_DICE":
            if self.game_logic.dice_value != 0:
                self.bot_state = "READY_TO_MOVE"
            elif current_time - self.bot_waiting_start_time > self.bot_waiting_timeout:
                logging.warning("Bot timed out waiting for dice roll. Resetting to IDLE state.")
                self.bot_state = "IDLE"
    
        elif self.bot_state == "READY_TO_MOVE":
            if not hasattr(self, 'bot_ready_start_time'):
                self.bot_ready_start_time = current_time
            if current_time - self.bot_ready_start_time > 2000:
                move_made = bot_player.make_move(self.game_logic)
                if move_made:
                    self.network_manager.send_move(self.game_logic.get_board_state())
                    self.bot_state = "WAITING_FOR_UPDATE"
                    self.bot_waiting_start_time = current_time
                else:
                    logging.info(f"Bot {bot_player.player_id} couldn't make a move. Skipping turn.")
                    self.network_manager.skip_turn()
                    self.game_logic.next_turn()
                    self.bot_state = "WAITING_FOR_UPDATE"
                    self.bot_waiting_start_time = current_time
                del self.bot_ready_start_time
    
        elif self.bot_state == "WAITING_FOR_UPDATE":
            if current_time - self.bot_waiting_start_time > self.bot_waiting_timeout:
                logging.warning("Bot timed out waiting for game state update. Resetting to IDLE state.")
                self.bot_state = "IDLE"

    def render(self):
        if self.game_logic and self.board:
            self.status_message = ""
            possible_moves = self.event_handler.get_possible_moves()

            piece, path = self.renderer.get_current_animated_piece()
            index = None
            player_id = None
            if piece is not None and piece.index is not None and piece.player_id is not None:
                index = piece.index
                player_id = piece.player_id
            
            self.renderer.render_game_board(self.board, self.players, self.game_logic.selected_piece, possible_moves, index, player_id)
            current_player = self.game_logic.get_current_player()
            if current_player and current_player.player_id.startswith('bot'):
                self.status_message = f"{current_player.get_player_name_by_color()} (Bot) is thinking..."
            elif self.game_logic.dice_value != 0 and not self.game_logic.can_current_player_move():
                self.status_message = "No possible moves. Click to pass turn."
            
            current_player_id = self.network_manager.user_data.get('playerId')
            self.info_renderer.render_info(current_player, self.game_logic.is_current_player(current_player_id), self.game_logic.dice_value, self.event_handler.dice_roll_in_progress, self.status_message)
            self.chat.draw()

        if self.game_ended:
            self.end_game_modal.render(self.win_message)

        pygame.display.update()

    def setup_callbacks(self):
        self.network_manager.set_game_state_callback(self.handle_game_state_update)
        self.network_manager.set_skip_turn_callback(self.handle_game_state_update)
        self.network_manager.set_dice_rolled_callback(self.handle_dice_rolled)
        self.network_manager.set_chat_message_callback(self.handle_chat_message)
        self.network_manager.set_app_token_used_callback(self.handle_app_token_used)
        self.network_manager.set_game_join_callback(self.handle_game_join)
        self.network_manager.set_game_start_callback(self.handle_game_start)
        self.network_manager.set_reconnect_callback(self.handle_reconnect)
        self.network_manager.set_game_end_callback(self.handle_game_end)

    def handle_app_token_used(self, data):
        logging.info(f"App token used: {data}")
        self.network_manager.user_data = data

    def handle_game_join(self, data):
        logging.info(f"User joined game: {data}")
        if self.game_started or data['status'] == 1:
            self.setup_game_board(data)

    def handle_game_start(self, data):
        logging.info(f"Game started: {data}")
        self.setup_game_board(data)

    def handle_reconnect(self, data):
        logging.info(f"Reconnected to game: {data}")
        if self.game_started or data['status'] == 1:
            self.setup_game_board(data)

    def handle_game_state_update(self, data):
        if self.game_logic:
            self.game_logic.update_game_state(data)

            if len(data)>3:
                self.game_logic.previous_game_state= data
            
            current_player = self.game_logic.get_current_player()
            if current_player and current_player.player_id.startswith('bot'):
                self.is_bot_turn = True
                if self.bot_state == "WAITING_FOR_UPDATE":
                    self.bot_state = "IDLE"
            else:
                self.is_bot_turn = False
                self.bot_state = "IDLE"
        
        self.render()

    def handle_dice_rolled(self, data):
        if self.renderer.is_animating:
            return
        
        if self.game_logic:
            local_player_id = self.network_manager.user_data.get('playerId')
            if not self.game_logic.is_current_player(local_player_id):
                self.info_renderer.roll_dice_animation(10, 90)

            self.game_logic.dice_value = data['value']
        self.event_handler.dice_roll_in_progress = False
        self.render()
        
        current_player = self.game_logic.get_current_player()
        if current_player and current_player.player_id.startswith('bot'):
            self.handle_bot_turn(current_player)

    def handle_game_end(self, data):
        mixer.Sound(resource_path('assets/effects/gameover.mp3')).play()
        player = next((player for player in self.players if player.player_id == data['winner']), None)
        if player:
            player.has_won = True
        self.win_message = f"Winner is {player.get_player_name_by_color()}"
        self.game_ended = True
        self.render()

    def handle_chat_message(self, message_data):
        self.chat.receive_message(message_data)
        self.render()

    def send_chat_message(self, message):
        self.network_manager.send_chat_message(message)

    def update_game_state(self):
        if self.game_logic:
            self.network_manager.send_move(self.game_logic.get_board_state())
        self.render()